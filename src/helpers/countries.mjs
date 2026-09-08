// Flags w3champions offers that the ISO list has no code for: Kosovo and the UK nations.
// flagpack ships all five under these codes.
export const EXTRA = [
  { name: 'England', a2: 'GB-ENG' },
  { name: 'Kosovo', a2: 'XK' },
  { name: 'Northern Ireland', a2: 'GB-NIR' },
  { name: 'Scotland', a2: 'GB-SCT' },
  { name: 'Wales', a2: 'GB-WLS' },
];

// flagpack ships no Antarctica flag, so the field would show a blank gap
export const WITHOUT = ['AQ'];

export function withExtras(base) {
  const kept = base.filter((c) => !WITHOUT.includes(c.a2));
  return [...kept, ...EXTRA].sort((a, b) => a.name.localeCompare(b.name));
}

export function findCountry(list, code) {
  if (!code) return null;
  const key = String(code).toUpperCase();
  return list.find((c) => c.a2 === key) ?? null;
}
