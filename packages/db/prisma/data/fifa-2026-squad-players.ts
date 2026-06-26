/**
 * Official FIFA World Cup 2026 squad lists.
 *
 * Source: apps/web/public/mundial2026_squad_lists.md
 * Parsed at seed time from the official PDF-extracted markdown.
 *
 * 48 teams · 26 players each · 1248 total
 * externalRef format: wc2026-{TEAMCODE}-{shirtNumber}  e.g. wc2026-ARG-10
 */

import * as fs from 'fs';
import * as path from 'path';

import type { TeamPlayersSeed, TournamentPlayerSeed } from './fifa-2026-players.types';

const MARKDOWN_PATH = path.resolve(
  __dirname,
  '../../../../apps/web/public/mundial2026_squad_lists.md',
);

// FIFA 3-letter code → ISO 3166-1 alpha-2 nationality code
const FIFA_TO_NATIONALITY: Record<string, string> = {
  ALG: 'DZ', ARG: 'AR', AUS: 'AU', AUT: 'AT', BEL: 'BE', BIH: 'BA',
  BRA: 'BR', CPV: 'CV', CAN: 'CA', COL: 'CO', COD: 'CD', CIV: 'CI',
  CRO: 'HR', CUW: 'CW', CZE: 'CZ', ECU: 'EC', EGY: 'EG', ENG: 'GB',
  FRA: 'FR', GER: 'DE', GHA: 'GH', HAI: 'HT', IRN: 'IR', IRQ: 'IQ',
  JPN: 'JP', JOR: 'JO', KOR: 'KR', MEX: 'MX', MAR: 'MA', NED: 'NL',
  NZL: 'NZ', NOR: 'NO', PAN: 'PA', PAR: 'PY', POR: 'PT', QAT: 'QA',
  KSA: 'SA', SCO: 'GB', SEN: 'SN', RSA: 'ZA', ESP: 'ES', SWE: 'SE',
  SUI: 'CH', TUN: 'TN', TUR: 'TR', URU: 'UY', USA: 'US', UZB: 'UZ',
};

function parseDOB(raw: string): Date | undefined {
  const parts = raw.split('/');
  if (parts.length !== 3) return undefined;
  const [day, month, year] = parts;
  const d = new Date(Date.UTC(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10)));
  return isNaN(d.getTime()) ? undefined : d;
}

function parseSquadMarkdown(): TeamPlayersSeed[] {
  const content = fs.readFileSync(MARKDOWN_PATH, 'utf-8');
  const results: TeamPlayersSeed[] = [];

  // Split into sections at every "## " heading
  const sections = content.split(/\n(?=## )/);

  for (const section of sections) {
    const headerMatch = section.match(/^## .+?\(([A-Z]{3})\)/);
    if (!headerMatch) continue;

    const teamCode       = headerMatch[1];
    const nationalityCode = FIFA_TO_NATIONALITY[teamCode] ?? teamCode;
    const players: TournamentPlayerSeed[] = [];

    for (const line of section.split('\n')) {
      if (!line.startsWith('|')) continue;

      const cells = line.split('|').map((c) => c.trim());
      // cells layout (0-based after split):
      //  [0] empty  [1] #  [2] POS  [3] Player name  [4] First name(s)
      //  [5] Last name(s)  [6] Name on shirt  [7] DOB  [8] Club  [9] Height
      const shirtRaw = cells[1];
      if (!shirtRaw || !/^\d+$/.test(shirtRaw)) continue; // skip header/separator rows

      const shirtNumber  = parseInt(shirtRaw, 10);
      const pos          = cells[2] as 'GK' | 'DF' | 'MF' | 'FW';
      const playerName   = cells[3] ?? '';  // FIFA "Player name" column — popular display name
      const firstNames   = cells[4] ?? '';
      const lastNames    = cells[5] ?? '';
      const nameOnShirt  = cells[6] ?? '';
      const dobRaw       = cells[7] ?? '';
      const club         = cells[8] ?? '';
      const heightRaw    = cells[9] ?? '';

      const fullName    = `${firstNames} ${lastNames}`.trim();
      const heightNum   = parseInt(heightRaw, 10);
      const heightCm    = isNaN(heightNum) ? undefined : heightNum;
      const birthDate   = dobRaw ? parseDOB(dobRaw) : undefined;
      const externalRef = `wc2026-${teamCode}-${shirtNumber}`;

      // shortName = "Player name" column (cells[3]) — the FIFA official display name.
      // This is the canonical visible name used throughout the app.
      // Falls back to nameOnShirt only if Player name is missing.
      const shortName = playerName.trim() || nameOnShirt || undefined;

      players.push({
        fullName,
        shortName,
        externalRef,
        nationalityCode,
        preferredPosition: pos,
        position:          pos,
        isGoalkeeper:      pos === 'GK',
        shirtNumber,
        firstNames,
        lastNames,
        nameOnShirt,
        club:              club || undefined,
        heightCm,
        birthDate,
      });
    }

    if (players.length > 0) {
      results.push({
        teamCode,
        sourceNote: `FIFA WC 2026 official squad list — apps/web/public/mundial2026_squad_lists.md`,
        players,
      });
    }
  }

  return results;
}

export const fifa2026SquadPlayers: TeamPlayersSeed[] = parseSquadMarkdown();
