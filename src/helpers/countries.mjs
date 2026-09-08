// UK nations offered as flags, as w3champions does for Scotland; flagpack ships them under these codes
export const NATIONS = [
  { name: 'England', a2: 'GB-ENG' },
  { name: 'Northern Ireland', a2: 'GB-NIR' },
  { name: 'Scotland', a2: 'GB-SCT' },
  { name: 'Wales', a2: 'GB-WLS' },
];

export function withNations(base) {
  return [...base, ...NATIONS].sort((a, b) => a.name.localeCompare(b.name));
}

export function findCountry(list, code) {
  if (!code) return null;
  const key = String(code).toUpperCase();
  return list.find((c) => c.a2 === key) ?? null;
}
