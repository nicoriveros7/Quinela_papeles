/**
 * Shared seed utilities — imported by seed.prod.ts and seed.qa.ts.
 *
 * Contains:
 *   - Environment validation
 *   - Tournament/pool constants and configuration
 *   - Shared TEAM_DATA catalogue
 *   - Stage mapping helper
 *   - Player seeding helpers (accept PrismaClient as parameter)
 */

import { MatchStage, PrismaClient, TournamentPlayerStatus } from '@prisma/client';

import { fifa2026KnockoutMatches } from './data/fifa-2026-knockout-matches.data';
import { TeamPlayersSeed } from './data/fifa-2026-players.types';

// ── Constants ─────────────────────────────────────────────────────────────────

export const TOURNAMENT_SLUG = 'world-cup-2026';
export const MAIN_POOL_SLUG  = 'world-cup-2026-main';

/** Shared pool configuration — identical in prod and QA. */
export const MAIN_POOL_CONFIG = {
  name: 'Quiniela Mundial 2026',
  description:
    'La quiniela oficial del FIFA World Cup 2026. Predice todos los partidos y compite con todos.',
  visibility:              'PUBLIC'  as const,
  status:                  'ACTIVE'  as const,
  joinCode:                null,
  maxEntriesPerMember:     1,
  lockMinutesBeforeKickoff: 15,
  pointsExactScore:        5,
  pointsMatchOutcome:      1,
  pointsBonusCorrect:      5,
  pointsChampionCorrect:   15,
  pointsRunnerUpCorrect:   15,
  pointsThirdPlaceCorrect: 15,
  pointsTopScorerCorrect:  10,
  pointsGoldenBallCorrect: 10,
  pointsGoldenGloveCorrect: 10,
  pointsBestThirdsExact:   20,
  pointsBestThirdsPartial: 10,
  pointsConfig: {
    match: { exactScore: 5, goalDifference: 3, winner: 1, loser: 1, homeGoals: 2, awayGoals: 2, totalGoals: 1 },
    bonus: { default: 5 },
  },
};

export const GROUP_CODES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const;

export const countryToIsoCode: Record<string, string> = {
  USA: 'US',
  Mexico: 'MX',
  Canada: 'CA',
};

// ── Environment validation ────────────────────────────────────────────────────

export function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val || val.trim() === '') {
    console.error(`\n❌  Missing required environment variable: ${key}`);
    console.error(`    Set ${key} before running the seed.\n`);
    process.exit(1);
  }
  return val.trim();
}

// ── Team catalogue ────────────────────────────────────────────────────────────

export const TEAM_DATA: Record<
  string,
  { name: string; countryCode: string | null; flagEmoji: string }
> = {
  // Group A
  MEX: { name: 'México',               countryCode: 'MX', flagEmoji: '🇲🇽' },
  RSA: { name: 'Sudáfrica',            countryCode: 'ZA', flagEmoji: '🇿🇦' },
  KOR: { name: 'Corea del Sur',        countryCode: 'KR', flagEmoji: '🇰🇷' },
  CZE: { name: 'República Checa',      countryCode: 'CZ', flagEmoji: '🇨🇿' },
  // Group B
  CAN: { name: 'Canadá',               countryCode: 'CA', flagEmoji: '🇨🇦' },
  BIH: { name: 'Bosnia y Herzegovina', countryCode: 'BA', flagEmoji: '🇧🇦' },
  QAT: { name: 'Qatar',                countryCode: 'QA', flagEmoji: '🇶🇦' },
  SUI: { name: 'Suiza',                countryCode: 'CH', flagEmoji: '🇨🇭' },
  // Group C
  HAI: { name: 'Haití',                countryCode: 'HT', flagEmoji: '🇭🇹' },
  SCO: { name: 'Escocia',              countryCode: null, flagEmoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  BRA: { name: 'Brasil',               countryCode: 'BR', flagEmoji: '🇧🇷' },
  MAR: { name: 'Marruecos',            countryCode: 'MA', flagEmoji: '🇲🇦' },
  // Group D
  USA: { name: 'Estados Unidos',       countryCode: 'US', flagEmoji: '🇺🇸' },
  PAR: { name: 'Paraguay',             countryCode: 'PY', flagEmoji: '🇵🇾' },
  AUS: { name: 'Australia',            countryCode: 'AU', flagEmoji: '🇦🇺' },
  TUR: { name: 'Türkiye',              countryCode: 'TR', flagEmoji: '🇹🇷' },
  // Group E
  CIV: { name: 'Costa de Marfil',      countryCode: 'CI', flagEmoji: '🇨🇮' },
  ECU: { name: 'Ecuador',              countryCode: 'EC', flagEmoji: '🇪🇨' },
  GER: { name: 'Alemania',             countryCode: 'DE', flagEmoji: '🇩🇪' },
  CUW: { name: 'Curazao',              countryCode: 'CW', flagEmoji: '🇨🇼' },
  // Group F
  NED: { name: 'Países Bajos',         countryCode: 'NL', flagEmoji: '🇳🇱' },
  JPN: { name: 'Japón',                countryCode: 'JP', flagEmoji: '🇯🇵' },
  SWE: { name: 'Suecia',               countryCode: 'SE', flagEmoji: '🇸🇪' },
  TUN: { name: 'Túnez',                countryCode: 'TN', flagEmoji: '🇹🇳' },
  // Group G
  IRN: { name: 'Irán',                 countryCode: 'IR', flagEmoji: '🇮🇷' },
  NZL: { name: 'Nueva Zelanda',        countryCode: 'NZ', flagEmoji: '🇳🇿' },
  BEL: { name: 'Bélgica',              countryCode: 'BE', flagEmoji: '🇧🇪' },
  EGY: { name: 'Egipto',               countryCode: 'EG', flagEmoji: '🇪🇬' },
  // Group H
  KSA: { name: 'Arabia Saudita',       countryCode: 'SA', flagEmoji: '🇸🇦' },
  URU: { name: 'Uruguay',              countryCode: 'UY', flagEmoji: '🇺🇾' },
  ESP: { name: 'España',               countryCode: 'ES', flagEmoji: '🇪🇸' },
  CPV: { name: 'Cabo Verde',           countryCode: 'CV', flagEmoji: '🇨🇻' },
  // Group I
  FRA: { name: 'Francia',              countryCode: 'FR', flagEmoji: '🇫🇷' },
  SEN: { name: 'Senegal',              countryCode: 'SN', flagEmoji: '🇸🇳' },
  IRQ: { name: 'Iraq',                 countryCode: 'IQ', flagEmoji: '🇮🇶' },
  NOR: { name: 'Noruega',              countryCode: 'NO', flagEmoji: '🇳🇴' },
  // Group J
  ARG: { name: 'Argentina',            countryCode: 'AR', flagEmoji: '🇦🇷' },
  ALG: { name: 'Argelia',              countryCode: 'DZ', flagEmoji: '🇩🇿' },
  AUT: { name: 'Austria',              countryCode: 'AT', flagEmoji: '🇦🇹' },
  JOR: { name: 'Jordania',             countryCode: 'JO', flagEmoji: '🇯🇴' },
  // Group K
  POR: { name: 'Portugal',             countryCode: 'PT', flagEmoji: '🇵🇹' },
  COD: { name: 'R.D. Congo',           countryCode: 'CD', flagEmoji: '🇨🇩' },
  UZB: { name: 'Uzbekistán',           countryCode: 'UZ', flagEmoji: '🇺🇿' },
  COL: { name: 'Colombia',             countryCode: 'CO', flagEmoji: '🇨🇴' },
  // Group L
  GHA: { name: 'Ghana',                countryCode: 'GH', flagEmoji: '🇬🇭' },
  PAN: { name: 'Panamá',               countryCode: 'PA', flagEmoji: '🇵🇦' },
  ENG: { name: 'Inglaterra',           countryCode: null, flagEmoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  CRO: { name: 'Croacia',              countryCode: 'HR', flagEmoji: '🇭🇷' },
};

// ── Stage mapping ─────────────────────────────────────────────────────────────

export function mapKnockoutStageToMatchStage(
  stage: (typeof fifa2026KnockoutMatches)[number]['stage'],
): MatchStage {
  if (stage === 'ROUND_OF_32')  return MatchStage.ROUND_OF_32;
  if (stage === 'ROUND_OF_16')  return MatchStage.ROUND_OF_16;
  if (stage === 'QUARTER_FINAL') return MatchStage.QUARTER_FINAL;
  if (stage === 'SEMI_FINAL')   return MatchStage.SEMI_FINAL;
  if (stage === 'THIRD_PLACE')  return MatchStage.THIRD_PLACE;
  return MatchStage.FINAL;
}

// ── Player seeding helpers ────────────────────────────────────────────────────

export async function seedTournamentPlayers(
  prisma: PrismaClient,
  tournamentId: string,
  teamsSeed: TeamPlayersSeed[],
  squadStatus: TournamentPlayerStatus = TournamentPlayerStatus.PROVISIONAL,
) {
  const tournamentTeams = await prisma.tournamentTeam.findMany({
    where: { tournamentId },
    select: { id: true, team: { select: { code: true } } },
  });

  const tournamentTeamByCode = new Map(
    tournamentTeams.map((row) => [row.team.code, row.id]),
  );

  const missingTeams: string[] = [];
  let processedTeams = 0;
  let playersUpserted = 0;
  let tournamentPlayersUpserted = 0;

  for (const teamSeed of teamsSeed) {
    const tournamentTeamId = tournamentTeamByCode.get(teamSeed.teamCode);
    if (!tournamentTeamId) {
      missingTeams.push(teamSeed.teamCode);
      continue;
    }
    processedTeams += 1;

    for (const playerSeed of teamSeed.players) {
      const isGoalkeeper = playerSeed.isGoalkeeper ?? playerSeed.preferredPosition === 'GK';
      const position = playerSeed.position ?? playerSeed.preferredPosition;

      const player = await prisma.player.upsert({
        where: { externalRef: playerSeed.externalRef },
        update: {
          fullName:          playerSeed.fullName,
          shortName:         playerSeed.shortName ?? null,
          nationalityCode:   playerSeed.nationalityCode,
          preferredPosition: playerSeed.preferredPosition,
          firstNames:        playerSeed.firstNames ?? null,
          lastNames:         playerSeed.lastNames ?? null,
          nameOnShirt:       playerSeed.nameOnShirt ?? null,
          club:              playerSeed.club ?? null,
          heightCm:          playerSeed.heightCm ?? null,
          birthDate:         playerSeed.birthDate ?? null,
        },
        create: {
          fullName:          playerSeed.fullName,
          shortName:         playerSeed.shortName ?? null,
          externalRef:       playerSeed.externalRef,
          nationalityCode:   playerSeed.nationalityCode,
          preferredPosition: playerSeed.preferredPosition,
          firstNames:        playerSeed.firstNames ?? null,
          lastNames:         playerSeed.lastNames ?? null,
          nameOnShirt:       playerSeed.nameOnShirt ?? null,
          club:              playerSeed.club ?? null,
          heightCm:          playerSeed.heightCm ?? null,
          birthDate:         playerSeed.birthDate ?? null,
        },
        select: { id: true },
      });

      playersUpserted += 1;

      await prisma.tournamentPlayer.upsert({
        where: {
          tournamentId_tournamentTeamId_playerId: {
            tournamentId,
            tournamentTeamId,
            playerId: player.id,
          },
        },
        update: {
          shirtNumber: playerSeed.shirtNumber ?? null,
          position,
          squadStatus,
          isCaptain:   playerSeed.isCaptain ?? false,
          isGoalkeeper,
        },
        create: {
          tournamentId,
          tournamentTeamId,
          playerId:    player.id,
          shirtNumber: playerSeed.shirtNumber ?? null,
          position,
          squadStatus,
          isCaptain:   playerSeed.isCaptain ?? false,
          isGoalkeeper,
        },
      });

      tournamentPlayersUpserted += 1;
    }
  }

  if (missingTeams.length > 0) {
    console.warn(`⚠️   Teams in markdown not found in tournament (skipped): ${missingTeams.join(', ')}`);
  }

  return { processedTeams, playersUpserted, tournamentPlayersUpserted, missingTeams };
}
