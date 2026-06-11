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
 * Returns the most user-friendly display name for a player.
 *
 * Priority logic:
 * 1. Multi-word shortName/nameOnShirt → the FIFA jersey name is already a proper display name
 *    e.g. "CRISTIANO RONALDO" → "Cristiano Ronaldo"
 * 2. Single-word shirt that matches a first name → first given name + last surname
 *    e.g. shirt="BERNARDO", firstNames="Bernardo", lastNames="MOTA VEIGA ... SILVA" → "Bernardo Silva"
 * 3. Single-word shirt that is a popular moniker → first given name + shirt name
 *    e.g. shirt="MESSI", firstNames="Lionel" → "Lionel Messi"
 *    e.g. shirt="MBAPPÉ", firstNames="Kylian" → "Kylian Mbappé"
 * 4. No shirt info → first given name + last surname word
 * 5. Fallback → title-cased fullName
 */
export function getPlayerDisplayName(player: PlayerNameFields): string {
  const shirt = (player.shortName || player.nameOnShirt || '').trim();

  // Multi-word shirt = proper FIFA popular name (e.g. "CRISTIANO RONALDO", "VINICIUS JR.")
  if (shirt.includes(' ')) {
    return titleCase(shirt);
  }

  const firstNames = (player.firstNames || '').trim();
  const lastNames = (player.lastNames || '').trim();
  const firstNameWord = firstNames.split(/\s+/)[0] || '';

  if (firstNameWord && shirt) {
    const shirtNorm = shirt.toLowerCase();
    const firstNamesWords = firstNames.toLowerCase().split(/\s+/);

    if (firstNamesWords.includes(shirtNorm)) {
      // Shirt equals a first name (e.g. shirt="BERNARDO" matches firstNames="Bernardo")
      // Show as: first given name + last part of compound surname
      const lastSurname = lastNames.split(/\s+/).pop() || '';
      if (lastSurname) {
        return titleCase(`${firstNameWord} ${lastSurname}`);
      }
      return titleCase(firstNameWord);
    }

    // Shirt is a moniker or last name used as popular name (MESSI, MBAPPÉ, KANE, MARTÍNEZ)
    return titleCase(`${firstNameWord} ${shirt}`);
  }

  if (firstNameWord && lastNames) {
    const lastSurname = lastNames.split(/\s+/).pop() || '';
    return titleCase(`${firstNameWord} ${lastSurname}`);
  }

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
