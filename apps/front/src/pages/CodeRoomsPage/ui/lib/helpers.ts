export function pluralizeRu(count: number, one: string, few: string, many: string) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function pickRandomValue<T>(values: T[]): T | null {
  if (values.length === 0) {
    return null;
  }
  return values[Math.floor(Math.random() * values.length)];
}

export function shuffledValues<T>(values: T[]): T[] {
  return [...values].sort(() => Math.random() - 0.5);
}
