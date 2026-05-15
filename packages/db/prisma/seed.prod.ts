/**
 * Production seed — safe to run multiple times (fully idempotent via upsert).
 *
 * Creates:
 *   - FIFA World Cup 2026 tournament, groups, venues, teams, players, matches
 *   - Main pool (world-cup-2026-main)
 *   - One SUPER_ADMIN user from env variables
 *
 * Does NOT:
 *   - Create demo users (Ana, Leo) or demo pools
 *   - Delete any existing data
 *   - Reset predictions or scoring
 *
 * Required env variables:
 *   DATABASE_URL      — PostgreSQL connection string
 *   ADMIN_EMAIL       — Email for the SUPER_ADMIN account
 *   ADMIN_PASSWORD    — Plain-text password (will be bcrypt-hashed, min 12 chars)
 *   ADMIN_DISPLAY_NAME — Display name for the SUPER_ADMIN account
 */

import { MatchStage, PrismaClient, SystemRole, TournamentPlayerStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

import { fifa2026GroupMatches } from './data/fifa-2026-group-matches.data';
import { fifa2026KnockoutMatches } from './data/fifa-2026-knockout-matches.data';
import { fifa2026PlayersLot1 } from './data/fifa-2026-players-lot-1.data';
import { TeamPlayersSeed } from './data/fifa-2026-players.types';
import { fifa2026Venues } from './data/fifa-2026-venues.data';

const prisma = new PrismaClient();

const TOURNAMENT_SLUG = 'world-cup-2026';
const MAIN_POOL_SLUG = 'world-cup-2026-main';

// ── Env validation ─────────────────────────────────────────────────────────

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val || val.trim() === '') {
    console.error(`\n❌  Missing required environment variable: ${key}`);
    console.error(`    Set ${key} before running the production seed.\n`);
    process.exit(1);
  }
  return val.trim();
}

// ── Shared data ────────────────────────────────────────────────────────────

const countryToIsoCode: Record<string, string> = {
  USA: 'US',
  Mexico: 'MX',
  Canada: 'CA',
};

const TEAM_DATA: Record<string, { name: string; countryCode: string | null; flagEmoji: string }> = {
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

function mapKnockoutStageToMatchStage(
  stage: (typeof fifa2026KnockoutMatches)[number]['stage'],
): MatchStage {
  if (stage === 'ROUND_OF_32') return MatchStage.ROUND_OF_32;
  if (stage === 'ROUND_OF_16') return MatchStage.ROUND_OF_16;
  if (stage === 'QUARTER_FINAL') return MatchStage.QUARTER_FINAL;
  if (stage === 'SEMI_FINAL') return MatchStage.SEMI_FINAL;
  if (stage === 'THIRD_PLACE') return MatchStage.THIRD_PLACE;
  return MatchStage.FINAL;
}

// ── Player helpers ─────────────────────────────────────────────────────────

async function seedTournamentPlayers(tournamentId: string, teamsSeed: TeamPlayersSeed[]) {
  const tournamentTeams = await prisma.tournamentTeam.findMany({
    where: { tournamentId },
    select: { id: true, team: { select: { code: true } } },
  });

  const tournamentTeamByCode = new Map(
    tournamentTeams.map((row) => [row.team.code, row.id]),
  );

  let processedTeams = 0;
  let playersUpserted = 0;
  let tournamentPlayersUpserted = 0;

  for (const teamSeed of teamsSeed) {
    const tournamentTeamId = tournamentTeamByCode.get(teamSeed.teamCode);
    if (!tournamentTeamId) {
      throw new Error(
        `Missing TournamentTeam for ${teamSeed.teamCode} while seeding players. Source: ${teamSeed.sourceNote}`,
      );
    }
    processedTeams += 1;

    for (const playerSeed of teamSeed.players) {
      const isGoalkeeper = playerSeed.isGoalkeeper ?? playerSeed.preferredPosition === 'GK';
      const position = playerSeed.position ?? playerSeed.preferredPosition;

      const player = await prisma.player.upsert({
        where: { externalRef: playerSeed.externalRef },
        update: {
          fullName: playerSeed.fullName,
          shortName: playerSeed.shortName ?? null,
          nationalityCode: playerSeed.nationalityCode,
          preferredPosition: playerSeed.preferredPosition,
        },
        create: {
          fullName: playerSeed.fullName,
          shortName: playerSeed.shortName ?? null,
          externalRef: playerSeed.externalRef,
          nationalityCode: playerSeed.nationalityCode,
          preferredPosition: playerSeed.preferredPosition,
        },
        select: { id: true },
      });

      playersUpserted += 1;

      await prisma.tournamentPlayer.upsert({
        where: {
          tournamentId_tournamentTeamId_playerId: { tournamentId, tournamentTeamId, playerId: player.id },
        },
        update: {
          shirtNumber: playerSeed.shirtNumber ?? null,
          position,
          squadStatus: TournamentPlayerStatus.PROVISIONAL,
          isCaptain: playerSeed.isCaptain ?? false,
          isGoalkeeper,
        },
        create: {
          tournamentId,
          tournamentTeamId,
          playerId: player.id,
          shirtNumber: playerSeed.shirtNumber ?? null,
          position,
          squadStatus: TournamentPlayerStatus.PROVISIONAL,
          isCaptain: playerSeed.isCaptain ?? false,
          isGoalkeeper,
        },
      });

      tournamentPlayersUpserted += 1;
    }
  }

  return { processedTeams, playersUpserted, tournamentPlayersUpserted };
}

async function seedFallbackPlayerForMissingTeams(tournamentId: string) {
  const tournamentTeams = await prisma.tournamentTeam.findMany({
    where: { tournamentId },
    select: {
      id: true,
      team: { select: { code: true, name: true, countryCode: true } },
      _count: { select: { players: true } },
    },
  });

  let createdFallbackPlayers = 0;
  let updatedFallbackPlayers = 0;

  for (const tournamentTeam of tournamentTeams) {
    const fallbackExternalRef = `wc2026-${tournamentTeam.team.code.toLowerCase()}-fallback-1`;
    const fallbackFullName = `${tournamentTeam.team.name} Player 1`;
    const fallbackNationality = tournamentTeam.team.countryCode ?? tournamentTeam.team.code;

    const existingFallback = await prisma.player.findUnique({
      where: { externalRef: fallbackExternalRef },
      select: { id: true },
    });

    if (!existingFallback && tournamentTeam._count.players > 0) continue;

    const player = await prisma.player.upsert({
      where: { externalRef: fallbackExternalRef },
      update: {
        fullName: fallbackFullName,
        shortName: `${tournamentTeam.team.code} P1`,
        nationalityCode: fallbackNationality,
        preferredPosition: 'FW',
      },
      create: {
        fullName: fallbackFullName,
        shortName: `${tournamentTeam.team.code} P1`,
        externalRef: fallbackExternalRef,
        nationalityCode: fallbackNationality,
        preferredPosition: 'FW',
      },
      select: { id: true },
    });

    await prisma.tournamentPlayer.upsert({
      where: {
        tournamentId_tournamentTeamId_playerId: {
          tournamentId,
          tournamentTeamId: tournamentTeam.id,
          playerId: player.id,
        },
      },
      update: { shirtNumber: null, position: 'FW', squadStatus: TournamentPlayerStatus.PROVISIONAL, isCaptain: false, isGoalkeeper: false },
      create: { tournamentId, tournamentTeamId: tournamentTeam.id, playerId: player.id, shirtNumber: null, position: 'FW', squadStatus: TournamentPlayerStatus.PROVISIONAL, isCaptain: false, isGoalkeeper: false },
    });

    if (existingFallback) {
      updatedFallbackPlayers += 1;
    } else {
      createdFallbackPlayers += 1;
    }
  }

  return { createdFallbackPlayers, updatedFallbackPlayers, totalTournamentTeams: tournamentTeams.length };
}

// ── Main seed ──────────────────────────────────────────────────────────────

async function seedProduction() {
  // Validate required env vars before touching the DB
  const adminEmail = requireEnv('ADMIN_EMAIL');
  const adminPassword = requireEnv('ADMIN_PASSWORD');
  const adminDisplayName = requireEnv('ADMIN_DISPLAY_NAME');

  if (adminPassword.length < 12) {
    console.error('\n❌  ADMIN_PASSWORD must be at least 12 characters.\n');
    process.exit(1);
  }

  console.info('🚀  Starting production seed...\n');

  // 1. Hash admin password
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  // 2. Upsert SUPER_ADMIN — update name/role on re-runs, never reset password if user exists
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail }, select: { id: true } });

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      displayName: adminDisplayName,
      systemRole: SystemRole.SUPER_ADMIN,
      isActive: true,
      // Only update password if the user didn't already exist (first run)
      ...(existingAdmin ? {} : { passwordHash }),
    },
    create: {
      email: adminEmail,
      displayName: adminDisplayName,
      passwordHash,
      systemRole: SystemRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  console.info(`✅  SUPER_ADMIN: ${adminUser.email} (${existingAdmin ? 'updated' : 'created'})`);

  // 3. Tournament
  const kickoffValues = [...fifa2026GroupMatches, ...fifa2026KnockoutMatches].map(
    (m) => new Date(m.kickoffEt).getTime(),
  );

  const tournament = await prisma.tournament.upsert({
    where: { slug: TOURNAMENT_SLUG },
    update: {
      name: 'FIFA World Cup 2026',
      shortName: 'WC 2026',
      status: 'PUBLISHED',
      startDate: new Date(Math.min(...kickoffValues)),
      endDate: new Date(Math.max(...kickoffValues)),
      timezone: 'UTC',
    },
    create: {
      slug: TOURNAMENT_SLUG,
      name: 'FIFA World Cup 2026',
      shortName: 'WC 2026',
      sport: 'FOOTBALL',
      status: 'PUBLISHED',
      startDate: new Date(Math.min(...kickoffValues)),
      endDate: new Date(Math.max(...kickoffValues)),
      timezone: 'UTC',
    },
    select: { id: true, slug: true },
  });

  console.info(`✅  Tournament: ${tournament.slug}`);

  // 4. Groups
  for (const code of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const) {
    await prisma.tournamentGroup.upsert({
      where: { tournamentId_code: { tournamentId: tournament.id, code } },
      update: { name: `Group ${code}` },
      create: { tournamentId: tournament.id, code, name: `Group ${code}`, sortOrder: code.charCodeAt(0) - 64 },
    });
  }

  // 5. Venues
  const venueByName = new Map<string, { id: string; name: string }>();
  for (const venueSeed of fifa2026Venues) {
    const venue = await prisma.venue.upsert({
      where: { slug: venueSeed.slug },
      update: {
        slug: venueSeed.slug,
        name: venueSeed.name,
        city: venueSeed.city,
        countryCode: countryToIsoCode[venueSeed.country] ?? null,
        timezone: 'America/New_York',
      },
      create: {
        slug: venueSeed.slug,
        name: venueSeed.name,
        city: venueSeed.city,
        countryCode: countryToIsoCode[venueSeed.country] ?? null,
        timezone: 'America/New_York',
      },
      select: { id: true, name: true },
    });
    venueByName.set(venue.name, venue);
  }

  // 6. Teams + TournamentTeams
  const groupRows = await prisma.tournamentGroup.findMany({
    where: { tournamentId: tournament.id },
    select: { id: true, code: true },
  });
  const groupByCode = new Map(groupRows.map((g) => [g.code, g]));

  const groupByTeamCode = new Map<string, string>();
  for (const match of fifa2026GroupMatches) {
    if (!groupByTeamCode.has(match.homeCode)) groupByTeamCode.set(match.homeCode, match.groupCode);
    if (!groupByTeamCode.has(match.awayCode)) groupByTeamCode.set(match.awayCode, match.groupCode);
  }

  const allTeamCodes = Array.from(
    new Set(fifa2026GroupMatches.flatMap((m) => [m.homeCode, m.awayCode])),
  );

  for (const code of allTeamCodes) {
    const teamInfo = TEAM_DATA[code];
    if (!teamInfo) throw new Error(`No team data found for code: ${code}`);

    const team = await prisma.team.upsert({
      where: { code },
      update: { name: teamInfo.name, countryCode: teamInfo.countryCode, flagEmoji: teamInfo.flagEmoji },
      create: { code, slug: code.toLowerCase(), name: teamInfo.name, countryCode: teamInfo.countryCode, flagEmoji: teamInfo.flagEmoji },
      select: { id: true },
    });

    const groupCode = groupByTeamCode.get(code);
    if (!groupCode) continue;
    const group = groupByCode.get(groupCode);
    if (!group) continue;

    await prisma.tournamentTeam.upsert({
      where: { tournamentId_teamId: { tournamentId: tournament.id, teamId: team.id } },
      update: { groupId: group.id },
      create: { tournamentId: tournament.id, teamId: team.id, groupId: group.id },
    });
  }

  console.info(`✅  Teams: ${allTeamCodes.length} teams`);

  // 7. Players
  const tournamentTeamRows = await prisma.tournamentTeam.findMany({
    where: { tournamentId: tournament.id },
    select: { id: true, team: { select: { code: true } } },
  });
  const tournamentTeamByCode = new Map(tournamentTeamRows.map((row) => [row.team.code, row]));

  const playersLot1Stats = await seedTournamentPlayers(tournament.id, fifa2026PlayersLot1);
  const fallbackStats = await seedFallbackPlayerForMissingTeams(tournament.id);

  console.info(
    `✅  Players: ${playersLot1Stats.playersUpserted} upserted, ${fallbackStats.createdFallbackPlayers} fallbacks created`,
  );

  // 8. Group matches
  for (const groupMatch of fifa2026GroupMatches) {
    const group = groupByCode.get(groupMatch.groupCode);
    if (!group) throw new Error(`Missing group ${groupMatch.groupCode}`);

    const homeTeam = tournamentTeamByCode.get(groupMatch.homeCode);
    const awayTeam = tournamentTeamByCode.get(groupMatch.awayCode);
    if (!homeTeam || !awayTeam) {
      throw new Error(`Missing TournamentTeam for match ${groupMatch.matchNumber}: ${groupMatch.homeCode} vs ${groupMatch.awayCode}`);
    }

    const venue = venueByName.get(groupMatch.venueName);
    if (!venue) throw new Error(`Missing venue for match ${groupMatch.matchNumber}: ${groupMatch.venueName}`);

    await prisma.match.upsert({
      where: { tournamentId_matchNumber: { tournamentId: tournament.id, matchNumber: groupMatch.matchNumber } },
      update: {
        groupId: group.id,
        homeTournamentTeamId: homeTeam.id,
        awayTournamentTeamId: awayTeam.id,
        homeSlotLabel: null,
        awaySlotLabel: null,
        venueId: venue.id,
        stage: MatchStage.GROUP,
        roundLabel: groupMatch.roundLabel,
        kickoffAt: new Date(groupMatch.kickoffEt),
        status: 'SCHEDULED',
      },
      create: {
        tournamentId: tournament.id,
        groupId: group.id,
        homeTournamentTeamId: homeTeam.id,
        awayTournamentTeamId: awayTeam.id,
        homeSlotLabel: null,
        awaySlotLabel: null,
        venueId: venue.id,
        stage: MatchStage.GROUP,
        roundLabel: groupMatch.roundLabel,
        matchNumber: groupMatch.matchNumber,
        kickoffAt: new Date(groupMatch.kickoffEt),
        status: 'SCHEDULED',
      },
    });
  }

  // 9. Knockout matches
  for (const knockoutMatch of fifa2026KnockoutMatches) {
    const venue = venueByName.get(knockoutMatch.venueName);
    if (!venue) throw new Error(`Missing venue for knockout match ${knockoutMatch.matchNumber}: ${knockoutMatch.venueName}`);

    await prisma.match.upsert({
      where: { tournamentId_matchNumber: { tournamentId: tournament.id, matchNumber: knockoutMatch.matchNumber } },
      update: {
        groupId: null,
        homeTournamentTeamId: null,
        awayTournamentTeamId: null,
        homeSlotLabel: knockoutMatch.homeSlotLabel,
        awaySlotLabel: knockoutMatch.awaySlotLabel,
        venueId: venue.id,
        stage: mapKnockoutStageToMatchStage(knockoutMatch.stage),
        roundLabel: knockoutMatch.roundLabel,
        kickoffAt: new Date(knockoutMatch.kickoffEt),
        status: 'SCHEDULED',
      },
      create: {
        tournamentId: tournament.id,
        groupId: null,
        homeTournamentTeamId: null,
        awayTournamentTeamId: null,
        homeSlotLabel: knockoutMatch.homeSlotLabel,
        awaySlotLabel: knockoutMatch.awaySlotLabel,
        venueId: venue.id,
        stage: mapKnockoutStageToMatchStage(knockoutMatch.stage),
        roundLabel: knockoutMatch.roundLabel,
        matchNumber: knockoutMatch.matchNumber,
        kickoffAt: new Date(knockoutMatch.kickoffEt),
        status: 'SCHEDULED',
      },
    });
  }

  const totalMatches = await prisma.match.count({ where: { tournamentId: tournament.id } });
  console.info(`✅  Matches: ${totalMatches} total (${fifa2026GroupMatches.length} group + ${fifa2026KnockoutMatches.length} knockout)`);

  // 10. Main pool
  const mainPool = await prisma.pool.upsert({
    where: { slug: MAIN_POOL_SLUG },
    update: {
      tournamentId: tournament.id,
      ownerUserId: adminUser.id,
      name: 'Quiniela Mundial 2026',
      description: 'La quiniela oficial del FIFA World Cup 2026. Predice todos los partidos y compite con todos.',
      visibility: 'PUBLIC',
      status: 'ACTIVE',
      joinCode: null,
      maxEntriesPerMember: 1,
      lockMinutesBeforeKickoff: 15,
      pointsExactScore: 5,
      pointsMatchOutcome: 1,
      pointsBonusCorrect: 5,
      pointsConfig: {
        match: { exactScore: 5, goalDifference: 3, winner: 1, loser: 1, homeGoals: 2, awayGoals: 2, totalGoals: 1 },
        bonus: { default: 5 },
      },
    },
    create: {
      tournamentId: tournament.id,
      ownerUserId: adminUser.id,
      slug: MAIN_POOL_SLUG,
      name: 'Quiniela Mundial 2026',
      description: 'La quiniela oficial del FIFA World Cup 2026. Predice todos los partidos y compite con todos.',
      visibility: 'PUBLIC',
      status: 'ACTIVE',
      joinCode: null,
      maxEntriesPerMember: 1,
      lockMinutesBeforeKickoff: 15,
      pointsExactScore: 5,
      pointsMatchOutcome: 1,
      pointsBonusCorrect: 5,
      pointsConfig: {
        match: { exactScore: 5, goalDifference: 3, winner: 1, loser: 1, homeGoals: 2, awayGoals: 2, totalGoals: 1 },
        bonus: { default: 5 },
      },
    },
    select: { id: true, slug: true },
  });

  await prisma.poolMember.upsert({
    where: { poolId_userId: { poolId: mainPool.id, userId: adminUser.id } },
    update: { role: 'OWNER', status: 'ACTIVE', leftAt: null },
    create: { poolId: mainPool.id, userId: adminUser.id, role: 'OWNER', status: 'ACTIVE' },
  });

  console.info(`✅  Main pool: ${mainPool.slug}`);

  console.info('\n✅  Production seed completed successfully.\n');
  console.info(
    JSON.stringify(
      {
        tournamentSlug: tournament.slug,
        totalMatches,
        mainPoolSlug: mainPool.slug,
        adminEmail: adminUser.email,
        adminRole: SystemRole.SUPER_ADMIN,
      },
      null,
      2,
    ),
  );
}

seedProduction()
  .catch((error) => {
    console.error('\n❌  Production seed failed:\n', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
