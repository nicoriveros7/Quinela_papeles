import { normalizeSearchText } from './utils';

export type PlayerNameFields = {
  fullName: string;
  shortName?: string | null;
  nameOnShirt?: string | null;
  firstNames?: string | null;
  lastNames?: string | null;
};

function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/**
 * Returns the player's display name.
 *
 * Priority:
 * 1. shortName — sourced from the "Player name" column of the official FIFA squad markdown.
 *    e.g. "CRISTIANO RONALDO" → "Cristiano Ronaldo", "VINICIUS JUNIOR" → "Vinicius Junior"
 * 2. fullName — firstName(s) + lastName(s) concatenated at seed time.
 */
export function getPlayerDisplayName(player: PlayerNameFields): string {
  const name = player.shortName?.trim();
  if (name) return titleCase(name);
  return titleCase(player.fullName);
}

/**
 * Returns true if the player matches the search query.
 * Searches across display name, fullName, shortName, nameOnShirt, firstNames, and lastNames.
 * Accent-insensitive and case-insensitive.
 */
export function matchesPlayerSearch(
  player: PlayerNameFields,
  query: string,
): boolean {
  if (!query.trim()) return true;
  const q = normalizeSearchText(query);
  const displayName = getPlayerDisplayName(player);
  return [
    displayName,
    player.fullName,
    player.shortName,
    player.nameOnShirt,
    player.firstNames,
    player.lastNames,
  ].some((f) => f && normalizeSearchText(f).includes(q));
}
