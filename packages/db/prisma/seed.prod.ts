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

import { MatchStage, PrismaClient, SystemRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

import { fifa2026GroupMatches } from './data/fifa-2026-group-matches.data';
import { fifa2026KnockoutMatches } from './data/fifa-2026-knockout-matches.data';
import { fifa2026PlayersLot1 } from './data/fifa-2026-players-lot-1.data';
import { fifa2026Venues } from './data/fifa-2026-venues.data';
import {
  countryToIsoCode,
  GROUP_CODES,
  MAIN_POOL_CONFIG,
  MAIN_POOL_SLUG,
  mapKnockoutStageToMatchStage,
  requireEnv,
  seedFallbackPlayerForMissingTeams,
  seedTournamentPlayers,
  TEAM_DATA,
  TOURNAMENT_SLUG,
} from './seed.shared';

const prisma = new PrismaClient();

// ── Main seed ──────────────────────────────────────────────────────────────

async function seedProduction() {
  // Validate required env vars before touching the DB
  const adminEmail       = requireEnv('ADMIN_EMAIL');
  const adminPassword    = requireEnv('ADMIN_PASSWORD');
  const adminDisplayName = requireEnv('ADMIN_DISPLAY_NAME');

  if (adminPassword.length < 12) {
    console.error('\n❌  ADMIN_PASSWORD must be at least 12 characters.\n');
    process.exit(1);
  }

  console.info('🚀  Starting production seed...\n');

  // 1. Hash admin password
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  // 2. Upsert SUPER_ADMIN — update name/role on re-runs, never reset password if user exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      displayName: adminDisplayName,
      systemRole: SystemRole.SUPER_ADMIN,
      isActive: true,
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
  for (const code of GROUP_CODES) {
    await prisma.tournamentGroup.upsert({
      where: { tournamentId_code: { tournamentId: tournament.id, code } },
      update: { name: `Group ${code}` },
      create: {
        tournamentId: tournament.id,
        code,
        name: `Group ${code}`,
        sortOrder: code.charCodeAt(0) - 64,
      },
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
      create: {
        code,
        slug: code.toLowerCase(),
        name: teamInfo.name,
        countryCode: teamInfo.countryCode,
        flagEmoji: teamInfo.flagEmoji,
      },
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
  void tournamentTeamByCode; // used implicitly via seedTournamentPlayers

  const playersLot1Stats = await seedTournamentPlayers(prisma, tournament.id, fifa2026PlayersLot1);
  const fallbackStats    = await seedFallbackPlayerForMissingTeams(prisma, tournament.id);

  console.info(
    `✅  Players: ${playersLot1Stats.playersUpserted} upserted, ${fallbackStats.createdFallbackPlayers} fallbacks created`,
  );

  // 8. Group matches
  const groupMatchTeamRows = await prisma.tournamentTeam.findMany({
    where: { tournamentId: tournament.id },
    select: { id: true, team: { select: { code: true } } },
  });
  const ttByCode = new Map(groupMatchTeamRows.map((row) => [row.team.code, row.id]));

  for (const groupMatch of fifa2026GroupMatches) {
    const group    = groupByCode.get(groupMatch.groupCode);
    if (!group) throw new Error(`Missing group ${groupMatch.groupCode}`);

    const homeTeamId = ttByCode.get(groupMatch.homeCode);
    const awayTeamId = ttByCode.get(groupMatch.awayCode);
    if (!homeTeamId || !awayTeamId) {
      throw new Error(
        `Missing TournamentTeam for match ${groupMatch.matchNumber}: ${groupMatch.homeCode} vs ${groupMatch.awayCode}`,
      );
    }

    const venue = venueByName.get(groupMatch.venueName);
    if (!venue) throw new Error(`Missing venue for match ${groupMatch.matchNumber}: ${groupMatch.venueName}`);

    await prisma.match.upsert({
      where: { tournamentId_matchNumber: { tournamentId: tournament.id, matchNumber: groupMatch.matchNumber } },
      update: {
        groupId:              group.id,
        homeTournamentTeamId: homeTeamId,
        awayTournamentTeamId: awayTeamId,
        homeSlotLabel: null,
        awaySlotLabel: null,
        venueId:   venue.id,
        stage:     MatchStage.GROUP,
        roundLabel: groupMatch.roundLabel,
        kickoffAt: new Date(groupMatch.kickoffEt),
        status:    'SCHEDULED',
      },
      create: {
        tournamentId: tournament.id,
        groupId:              group.id,
        homeTournamentTeamId: homeTeamId,
        awayTournamentTeamId: awayTeamId,
        homeSlotLabel: null,
        awaySlotLabel: null,
        venueId:     venue.id,
        stage:       MatchStage.GROUP,
        roundLabel:  groupMatch.roundLabel,
        matchNumber: groupMatch.matchNumber,
        kickoffAt:   new Date(groupMatch.kickoffEt),
        status:      'SCHEDULED',
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
        groupId:              null,
        homeTournamentTeamId: null,
        awayTournamentTeamId: null,
        homeSlotLabel: knockoutMatch.homeSlotLabel,
        awaySlotLabel: knockoutMatch.awaySlotLabel,
        venueId:   venue.id,
        stage:     mapKnockoutStageToMatchStage(knockoutMatch.stage),
        roundLabel: knockoutMatch.roundLabel,
        kickoffAt: new Date(knockoutMatch.kickoffEt),
        status:    'SCHEDULED',
      },
      create: {
        tournamentId: tournament.id,
        groupId:              null,
        homeTournamentTeamId: null,
        awayTournamentTeamId: null,
        homeSlotLabel: knockoutMatch.homeSlotLabel,
        awaySlotLabel: knockoutMatch.awaySlotLabel,
        venueId:     venue.id,
        stage:       mapKnockoutStageToMatchStage(knockoutMatch.stage),
        roundLabel:  knockoutMatch.roundLabel,
        matchNumber: knockoutMatch.matchNumber,
        kickoffAt:   new Date(knockoutMatch.kickoffEt),
        status:      'SCHEDULED',
      },
    });
  }

  const totalMatches = await prisma.match.count({ where: { tournamentId: tournament.id } });
  console.info(
    `✅  Matches: ${totalMatches} total (${fifa2026GroupMatches.length} group + ${fifa2026KnockoutMatches.length} knockout)`,
  );

  // 10. Main pool
  const mainPool = await prisma.pool.upsert({
    where: { slug: MAIN_POOL_SLUG },
    update:  { tournamentId: tournament.id, ownerUserId: adminUser.id, ...MAIN_POOL_CONFIG },
    create:  { tournamentId: tournament.id, ownerUserId: adminUser.id, slug: MAIN_POOL_SLUG, ...MAIN_POOL_CONFIG },
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
