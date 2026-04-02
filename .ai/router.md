# Router: Skill Selection & Execution Protocol

## Goal
Route each user request to exactly ONE most relevant skill in `.ai/skills/`
and produce the required artifact consistently.

## Step 0 — Task classification (mandatory)
Classify the request into exactly ONE primary category based on the final
deliverable:

- **product**: PRD, requirements, MVP scope, user stories, acceptance
  criteria, roadmap
- **engineering**: implementation, refactoring, debugging, backend changes,
  architecture, PR changes
- **frontend**: frontend architecture, React/TypeScript implementation,
  component logic, state, performance
- **design**: UI polish, layout refinement, design system, spacing,
  typography, reusable visual patterns
- **testing**: e2e/ui tests, Playwright, test plan, QA steps,
  screenshots/logs
- **research**: competitor analysis, tech landscape, tool comparison,
  cited summaries
- **writing**: article drafts, posts, editing tone, structure,
  storytelling

If multiple categories apply, choose the one that best matches the final
artifact the user expects.

## Step 1 — Skill mapping (choose ONE)
Choose the best matching skill file using this order of precedence:

1. Explicit user instruction
   - If the user explicitly asks to use a specific skill, use that skill.

2. Strong deliverable match
   - Match the request to the closest expected artifact.

3. Trigger/keyword match
   - Use the skill whose purpose, triggers, and output format best fit the
     request.

4. Tie-break by specificity
   - Prefer the more specific skill over the more general one.

## Skill table
| Category | Skill file | Use when |
|---|---|---|
| product | `.ai/skills/prd_mvp_nocode.md` | PRD/MVP, feature scope, user flows, no-code/vibe-first planning |
| engineering | `.ai/skills/code_review.md` | Review existing code/PRs, find bugs, assess risks, spot missing tests |
| design | `.ai/skills/frontend_design.md` | Frontend UX/UI refinement, layout fixes, component structure, visual polish |
| research | `.ai/skills/research.md` | Research topics, compare approaches, collect references, summarize findings |
| engineering | `.ai/skills/senior_architect.md` | System design, architecture decisions, service boundaries, trade-offs, scaling |
| engineering | `.ai/skills/senior_backend.md` | Backend design, APIs, DB, Go services, performance, reliability, debugging |
| frontend | `.ai/skills/senior_frontend.md` | Frontend architecture, React/TypeScript patterns, state, performance, maintainability |
| design | `.ai/skills/ui_design_system.md` | Design system, tokens, spacing, typography, reusable UI patterns and consistency |
| testing | `.ai/skills/webapp_testing.md` | Local webapp testing, QA scenarios, Playwright/browser validation, bug reproduction |

## Step 1A — Disambiguation rules (mandatory)
Use these hard rules when skills are close.

### engineering
- Use `.ai/skills/code_review.md` when the task is to review existing code,
  diff, PR, bug risks, regressions, or test gaps.
- Use `.ai/skills/senior_backend.md` when the task is to implement, fix, or
  debug backend code, APIs, DB logic, services, performance, or reliability.
- Use `.ai/skills/senior_architect.md` when the task is mainly high-level
  system design, service boundaries, scaling, or architecture trade-offs.

### frontend vs design
- Use `.ai/skills/senior_frontend.md` when the task is frontend
  implementation, component logic, state management, rendering,
  performance, or maintainability.
- Use `.ai/skills/frontend_design.md` when the task is mainly UI polish,
  layout issues, visual hierarchy, spacing, readability, or interaction UX.
- Use `.ai/skills/ui_design_system.md` when the task is about design
  tokens, reusable patterns, typography scale, spacing rules, or
  system-wide consistency.

## Step 1B — Fallback
If no skill clearly matches:
- follow `AGENTS.md` default rules,
- still choose the closest category,
- still follow the Output Contract below.

## Step 2 — Execution rules (mandatory)
After selecting the skill:

- Read the chosen skill file fully.
- Follow its Process section internally, step by step.
- Produce output strictly following its Output format.
- Apply the skill’s Anti-patterns as hard constraints.
- Do not mix multiple skills in one response.

## Output Contract (default)
Unless the selected skill overrides this, format every answer as:

1. **Plan** — 2 to 6 bullets
2. **Deliverable** — the requested artifact
3. **Self-check** — 3 to 7 checklist items

If the user explicitly asks for "just the final result", omit Plan and keep
only Deliverable + Self-check.

## Safety / Quality gates (always-on)
- Do not invent files, APIs, metrics, or behavior.
- If uncertain, state uncertainty briefly and propose verification.
- Prefer the smallest viable diff when editing code.
- Be direct, concise, and artifact-first.
- Do not output internal routing reasoning unless asked.