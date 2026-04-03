#!/usr/bin/env python3

from __future__ import annotations

import json
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent
INDEX_FILE = ROOT / "ozon_mock_index.json"
OUTPUT_FILE = ROOT / "interview_prep_ozon.json"
OUTPUT_VERSION = "interview-prep-ozon-v1-from-mock"


CYRILLIC_TO_LATIN = {
    "а": "a",
    "б": "b",
    "в": "v",
    "г": "g",
    "д": "d",
    "е": "e",
    "ё": "e",
    "ж": "zh",
    "з": "z",
    "и": "i",
    "й": "y",
    "к": "k",
    "л": "l",
    "м": "m",
    "н": "n",
    "о": "o",
    "п": "p",
    "р": "r",
    "с": "s",
    "т": "t",
    "у": "u",
    "ф": "f",
    "х": "h",
    "ц": "ts",
    "ч": "ch",
    "ш": "sh",
    "щ": "sch",
    "ъ": "",
    "ы": "y",
    "ь": "",
    "э": "e",
    "ю": "yu",
    "я": "ya",
}


@dataclass(frozen=True)
class PrepMapping:
    prep_type: str
    language: str
    supported_languages: list[str]


def load_index() -> dict[str, Any]:
    return json.loads(INDEX_FILE.read_text())


def load_mock_tasks() -> list[dict[str, Any]]:
    index = load_index()
    tasks: list[dict[str, Any]] = []
    for file_info in index["files"]:
        file_path = ROOT / file_info["file"]
        payload = json.loads(file_path.read_text())
        tasks.extend(payload["tasks"])
    tasks.sort(key=lambda item: int(item["number"]))
    return tasks


def transliterate(value: str) -> str:
    chars: list[str] = []
    for char in value.lower():
        chars.append(CYRILLIC_TO_LATIN.get(char, char))
    return "".join(chars)


def slugify(value: str) -> str:
    value = transliterate(value)
    value = unicodedata.normalize("NFKD", value)
    value = value.encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    value = re.sub(r"-{2,}", "-", value)
    return value or "task"


def normalize_text(value: str) -> str:
    value = value.replace("\r\n", "\n").replace("\r", "\n")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n{3,}", "\n\n", value.strip())
    return value


def build_traceability(task: dict[str, Any]) -> str:
    pages = ", ".join(str(page) for page in task.get("source_pages", []))
    tags = ", ".join(task.get("tags", []))
    return (
        "Traceability:\n"
        f"- PDF task: {task['number']}\n"
        f"- Source category: {task['source_category']}\n"
        f"- Source pages: {pages}\n"
        f"- Tags: {tags}"
    )


def extract_questions(follow_up_raw: str) -> list[dict[str, Any]]:
    text = normalize_text(follow_up_raw)
    if not text:
        return []

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    while lines and (
        lines[0].startswith("Дополнительные вопросы")
        or lines[0].startswith("Доп вопросы")
    ):
        lines.pop(0)

    questions: list[dict[str, Any]] = []
    idx = 0
    position = 1
    while idx < len(lines):
        line = lines[idx]

        if line.startswith("Q:"):
            prompt = line[2:].strip()
            idx += 1
            answer_parts: list[str] = []
            while idx < len(lines):
                current = lines[idx]
                if current.startswith("Q:"):
                    break
                if current.startswith("A:"):
                    answer_parts.append(current[2:].strip())
                else:
                    answer_parts.append(current)
                idx += 1
            questions.append(
                {
                    "position": position,
                    "prompt": normalize_text(prompt),
                    "answer": normalize_text(" ".join(answer_parts)),
                }
            )
            position += 1
            continue

        numbered = re.match(r"^(\d+)\.\s*(.*)$", line)
        if numbered:
            prompt_parts = [numbered.group(2).strip()] if numbered.group(2).strip() else []
            idx += 1
            while idx < len(lines):
                current = lines[idx]
                if re.match(r"^\d+\.\s*", current) or current.startswith("Q:"):
                    break
                if current.startswith("A:"):
                    break
                prompt_parts.append(current)
                idx += 1

            answer_parts: list[str] = []
            if idx < len(lines) and lines[idx].startswith("A:"):
                while idx < len(lines):
                    current = lines[idx]
                    if re.match(r"^\d+\.\s*", current) or current.startswith("Q:"):
                        break
                    if current.startswith("A:"):
                        answer_parts.append(current[2:].strip())
                    else:
                        answer_parts.append(current)
                    idx += 1

            prompt = normalize_text(" ".join(part for part in prompt_parts if part))
            if prompt:
                questions.append(
                    {
                        "position": position,
                        "prompt": prompt,
                        "answer": normalize_text(" ".join(answer_parts)),
                    }
                )
                position += 1
            continue

        idx += 1

    cleaned: list[dict[str, Any]] = []
    for question in questions:
        prompt = question["prompt"].strip()
        if not prompt:
            continue
        cleaned.append(question)
    return cleaned


def map_prep(task: dict[str, Any]) -> PrepMapping:
    category = task["source_category"]
    tags = set(task.get("tags", []))

    if category == "GO Базы данных":
        return PrepMapping("sql", "sql", ["sql"])
    if category == "GO Архитектура":
        return PrepMapping("system_design", "system_design", [])
    if category == "GO Go (практика)":
        return PrepMapping("coding", "go", ["go"])
    if category == "GO Go (теория)":
        return PrepMapping("coding", "go", ["go"])
    if category == "GO Скрининг":
        if "sql" in tags:
            return PrepMapping("sql", "sql", ["sql"])
        return PrepMapping("coding", "go", ["go"])
    if category == "GO ОС, сети и эксплуатация":
        return PrepMapping("system_design", "system_design", [])
    if category == "GO Структуры данных":
        return PrepMapping("coding", "go", ["go"])
    if category == "GO":
        return PrepMapping("coding", "go", ["go"])
    return PrepMapping("coding", "go", ["go"])


def build_statement(task: dict[str, Any]) -> str:
    blocks: list[str] = []
    prompt_raw = normalize_text(task.get("prompt_raw", ""))
    follow_up_raw = normalize_text(task.get("follow_up_raw", ""))

    if prompt_raw:
        blocks.append(prompt_raw)
    else:
        blocks.append(normalize_text(task.get("content_raw", "")))

    if follow_up_raw:
        blocks.append("Дополнительные вопросы:\n" + follow_up_raw)

    blocks.append(build_traceability(task))
    return "\n\n".join(block for block in blocks if block)


def convert_task(task: dict[str, Any]) -> dict[str, Any]:
    mapping = map_prep(task)
    title = normalize_text(task["title"])
    slug = f"ozon-{int(task['number']):02d}-{slugify(title)}"
    questions = extract_questions(task.get("follow_up_raw", ""))
    reference_solution = normalize_text(task.get("answer_raw", "")) or normalize_text(
        task.get("content_raw", "")
    )

    return {
        "slug": slug,
        "title": title,
        "prep_type": mapping.prep_type,
        "language": mapping.language,
        "company_tag": "ozon",
        "supported_languages": mapping.supported_languages,
        "is_executable": False,
        "execution_profile": "pure",
        "runner_mode": "function_io",
        "duration_seconds": 1800,
        "statement": build_statement(task),
        "starter_code": "",
        "reference_solution": reference_solution,
        "is_active": True,
        "questions": questions,
    }


def validate_catalog(catalog: dict[str, Any]) -> None:
    tasks = catalog["tasks"]
    assert len(tasks) == 88, f"expected 88 tasks, got {len(tasks)}"

    slugs = [task["slug"] for task in tasks]
    assert len(slugs) == len(set(slugs)), "duplicate slugs found"

    for task in tasks:
        required_fields = [
            "slug",
            "title",
            "prep_type",
            "language",
            "company_tag",
            "supported_languages",
            "is_executable",
            "execution_profile",
            "runner_mode",
            "duration_seconds",
            "statement",
            "starter_code",
            "reference_solution",
            "is_active",
            "questions",
        ]
        for field in required_fields:
            assert field in task, f"missing field {field} in {task.get('slug')}"
        assert task["company_tag"] == "ozon", f"unexpected company tag in {task['slug']}"


def main() -> None:
    source_tasks = load_mock_tasks()
    converted_tasks = [convert_task(task) for task in source_tasks]
    catalog = {
        "version": OUTPUT_VERSION,
        "tasks": converted_tasks,
    }
    validate_catalog(catalog)
    OUTPUT_FILE.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n")
    print(f"generated {OUTPUT_FILE} with {len(converted_tasks)} tasks")


if __name__ == "__main__":
    main()
