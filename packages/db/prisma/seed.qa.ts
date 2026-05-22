/**
 * QA seed — reutiliza el seed oficial con un subconjunto reducido de partidos.
 *
 * Principio: seed oficial → mismo torneo → mismos equipos → mismos jugadores
 *            → mismas reglas → 10 partidos seleccionados.
 *
 * Crea:
 *   - Mismo torneo: world-cup-2026
 *   - Misma pool: world-cup-2026-main (mismo slug, misma config de scoring)
 *   - Todos los grupos (A–L)
 *   - Todos los venues oficiales
 *   - Solo los equipos presentes en los 10 partidos QA
 *   - Todos los jugadores de esos equipos (del lot oficial, sin truncar)
 *   - 10 partidos: 9 de grupos + 1 de eliminatorias (slot dinámico)
 *   - 1 SUPER_ADMIN desde variables de entorno
 *
 * NO crea:
 *   - Bonus questions (el admin las crea manualmente desde el panel)
 *   - Usuarios demo
 *   - Predicciones
 *   - Resultados cerrados
 *
 * Partidos QA:
 *   #1   MEX vs RSA    (Grupo A, Matchday 1)  Jun 11
 *   #2   KOR vs CZE    (Grupo A, Matchday 1)  Jun 11
 *   #3   CAN vs BIH    (Grupo B, Matchday 1)  Jun 12
 *   #4   USA vs PAR    (Grupo D, Matchday 1)  Jun 12
 *   #8   QAT vs SUI    (Grupo B, Matchday 1)  Jun 13
 *   #7   BRA vs MAR    (Grupo C, Matchday 1)  Jun 13
 *   #10  GER vs CUW    (Grupo E, Matchday 1)  Jun 14
 *   #11  NED vs JPN    (Grupo F, Matchday 1)  Jun 14
 *   #19  ARG vs ALG    (Grupo J, Matchday 1)  Jun 16
 *   #73  '2A' vs '2B'  (Round of 32, slot dinámico)  Jun 28
 *
 * Required env variables:
 *   DATABASE_URL       — PostgreSQL connection string
 *   ADMIN_EMAIL        — Email para la cuenta SUPER_ADMIN
 *   ADMIN_PASSWORD     — Contraseña en texto plano (mín. 12 caracteres)
 *   ADMIN_DISPLAY_NAME — Nombre visible del SUPER_ADMIN
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

// ── QA match selection ────────────────────────────────────────────────────────
//
// 9 group matches  → real teams, confirmed fixtures, distributed across dates
// 1 knockout match → slot dinámico ('2A' vs '2B') para probar ese flujo en QA
//
const QA_GROUP_MATCH_NUMBERS    = new Set([1, 2, 3, 4, 7, 8, 10, 11, 19]);
const QA_KNOCKOUT_MATCH_NUMBERS = new Set([73]);

const qaGroupMatches    = fifa2026GroupMatches.filter((m) => QA_GROUP_MATCH_NUMBERS.has(m.matchNumber));
const qaKnockoutMatches = fifa2026KnockoutMatches.filter((m) => QA_KNOCKOUT_MATCH_NUMBERS.has(m.matchNumber));

// Teams used by the 9 group matches (18 teams: A, B, C, D, E, F, J)
const QA_TEAM_CODES = new Set(
  qaGroupMatches.flatMap((m) => [m.homeCode, m.awayCode]),
);

const QA_MATCH_ORDER = [1, 2, 3, 4, 7, 8, 10, 11, 19, 73];
const BOGOTA_TIMEZONE = 'America/Bogota';
const BOGOTA_UTC_OFFSET_HOURS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

type BogotaDateParts = { year: number; month: number; day: number };

function getBogotaDateParts(date: Date): BogotaDateParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BOGOTA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const lookup: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') lookup[part.type] = part.value;
  }

  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
  };
}

function getBogotaWeekdayIndex(date: Date): number {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: BOGOTA_TIMEZONE,
    weekday: 'short',
  }).format(date);

  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return map[weekday] ?? 0;
}

function getBogotaMidnightUtc(date: Date): Date {
  const { year, month, day } = getBogotaDateParts(date);
  return new Date(Date.UTC(year, month - 1, day, BOGOTA_UTC_OFFSET_HOURS, 0, 0));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function buildBogotaKickoffDate(baseBogotaMidnightUtc: Date, hour: number, minute: number): Date {
  return new Date(baseBogotaMidnightUtc.getTime() + (hour * 60 + minute) * 60 * 1000);
}

function getQaKickoffDates(): Date[] {
  const now = new Date();
  const bogotaMidnightUtc = getBogotaMidnightUtc(now);
  const tomorrowBogotaMidnightUtc = addDays(bogotaMidnightUtc, 1);

  let daysUntilSunday = (7 - getBogotaWeekdayIndex(now)) % 7;
  if (daysUntilSunday === 0) daysUntilSunday = 7;
  const sundayBogotaMidnightUtc = addDays(bogotaMidnightUtc, daysUntilSunday);

  const slots: Array<[number, number]> = [
    [9, 0],
    [10, 30],
    [12, 0],
    [14, 0],
    [16, 0],
  ];

  return [
    ...slots.map(([hour, minute]) => buildBogotaKickoffDate(tomorrowBogotaMidnightUtc, hour, minute)),
    ...slots.map(([hour, minute]) => buildBogotaKickoffDate(sundayBogotaMidnightUtc, hour, minute)),
  ];
}

const qaKickoffDates = getQaKickoffDates();
if (qaKickoffDates.length !== QA_MATCH_ORDER.length) {
  throw new Error('QA kickoff schedule mismatch: expected 10 dates.');
}

const qaKickoffByMatchNumber = new Map<number, Date>(
  QA_MATCH_ORDER.map((matchNumber, index) => [matchNumber, qaKickoffDates[index]]),
);

// ── Main seed ─────────────────────────────────────────────────────────────────

async function seedQA() {
  const adminEmail       = requireEnv('ADMIN_EMAIL');
  const adminPassword    = requireEnv('ADMIN_PASSWORD');
  const adminDisplayName = requireEnv('ADMIN_DISPLAY_NAME');

  if (adminPassword.length < 12) {
    console.error('\n❌  ADMIN_PASSWORD must be at least 12 characters.\n');
    process.exit(1);
  }

  console.info('🚀  Starting QA seed...\n');
  console.info(`📋  QA match selection: ${qaGroupMatches.length} group + ${qaKnockoutMatches.length} knockout = ${qaGroupMatches.length + qaKnockoutMatches.length} total`);
  console.info(`👥  Teams in QA: ${Array.from(QA_TEAM_CODES).sort().join(', ')}\n`);

  // 1. Hash admin password
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  // 2. Upsert SUPER_ADMIN
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

  // 3. Tournament — mismos datos que producción, fechas derivadas de los 10 partidos QA
  const kickoffValues = qaKickoffDates.map((kickoff) => kickoff.getTime());

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

  // 4. Groups — todos A–L (misma estructura que producción)
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

  console.info(`✅  Groups: ${GROUP_CODES.length} (A–L)`);

  // 5. Venues — todos los venues oficiales (los partidos QA referencian varios)
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

  console.info(`✅  Venues: ${venueByName.size}`);

  // 6. Teams + TournamentTeams — solo los 18 equipos de los partidos QA
  const groupRows = await prisma.tournamentGroup.findMany({
    where: { tournamentId: tournament.id },
    select: { id: true, code: true },
  });
  const groupByCode = new Map(groupRows.map((g) => [g.code, g]));

  // Mapa equipo → grupo, derivado únicamente de los partidos QA
  const groupByTeamCode = new Map<string, string>();
  for (const match of qaGroupMatches) {
    if (!groupByTeamCode.has(match.homeCode)) groupByTeamCode.set(match.homeCode, match.groupCode);
    if (!groupByTeamCode.has(match.awayCode)) groupByTeamCode.set(match.awayCode, match.groupCode);
  }

  for (const code of QA_TEAM_CODES) {
    const teamInfo = TEAM_DATA[code];
    if (!teamInfo) throw new Error(`No team data for: ${code}`);

    const team = await prisma.team.upsert({
      where: { code },
      update: {
        name: teamInfo.name,
        countryCode: teamInfo.countryCode,
        flagEmoji: teamInfo.flagEmoji,
      },
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

  console.info(`✅  Teams: ${QA_TEAM_CODES.size} (solo equipos de los partidos QA)`);

  // 7. Players — solo jugadores de los equipos QA (del lot oficial, sin truncar)
  const qaPlayersLot1 = fifa2026PlayersLot1.filter((t) => QA_TEAM_CODES.has(t.teamCode));

  const playersLot1Stats = await seedTournamentPlayers(prisma, tournament.id, qaPlayersLot1);
  const fallbackStats    = await seedFallbackPlayerForMissingTeams(prisma, tournament.id);

  console.info(
    `✅  Players: ${playersLot1Stats.playersUpserted} upserted, ${fallbackStats.createdFallbackPlayers} fallbacks created`,
  );

  // 8. Group matches QA (9 partidos)
  const ttRows  = await prisma.tournamentTeam.findMany({
    where: { tournamentId: tournament.id },
    select: { id: true, team: { select: { code: true } } },
  });
  const ttByCode = new Map(ttRows.map((r) => [r.team.code, r.id]));

  for (const gm of qaGroupMatches) {
    const group      = groupByCode.get(gm.groupCode);
    if (!group) throw new Error(`Missing group ${gm.groupCode}`);

    const homeTeamId = ttByCode.get(gm.homeCode);
    const awayTeamId = ttByCode.get(gm.awayCode);
    if (!homeTeamId || !awayTeamId) {
      throw new Error(`Missing TournamentTeam for match ${gm.matchNumber}: ${gm.homeCode} vs ${gm.awayCode}`);
    }

    const venue = venueByName.get(gm.venueName);
    if (!venue) throw new Error(`Missing venue for match ${gm.matchNumber}: ${gm.venueName}`);

    const kickoffAt = qaKickoffByMatchNumber.get(gm.matchNumber);
    if (!kickoffAt) throw new Error(`Missing kickoff schedule for match ${gm.matchNumber}`);

    await prisma.match.upsert({
      where: { tournamentId_matchNumber: { tournamentId: tournament.id, matchNumber: gm.matchNumber } },
      update: {
        groupId:              group.id,
        homeTournamentTeamId: homeTeamId,
        awayTournamentTeamId: awayTeamId,
        homeSlotLabel: null,
        awaySlotLabel: null,
        venueId:    venue.id,
        stage:      MatchStage.GROUP,
        roundLabel: gm.roundLabel,
        kickoffAt,
        status:     'SCHEDULED',
      },
      create: {
        tournamentId:         tournament.id,
        groupId:              group.id,
        homeTournamentTeamId: homeTeamId,
        awayTournamentTeamId: awayTeamId,
        homeSlotLabel: null,
        awaySlotLabel: null,
        venueId:     venue.id,
        stage:       MatchStage.GROUP,
        roundLabel:  gm.roundLabel,
        matchNumber: gm.matchNumber,
        kickoffAt,
        status:      'SCHEDULED',
      },
    });
  }

  // 9. Knockout match QA (1 partido con slot dinámico)
  for (const km of qaKnockoutMatches) {
    const venue = venueByName.get(km.venueName);
    if (!venue) throw new Error(`Missing venue for knockout match ${km.matchNumber}: ${km.venueName}`);

    const kickoffAt = qaKickoffByMatchNumber.get(km.matchNumber);
    if (!kickoffAt) throw new Error(`Missing kickoff schedule for match ${km.matchNumber}`);

    await prisma.match.upsert({
      where: { tournamentId_matchNumber: { tournamentId: tournament.id, matchNumber: km.matchNumber } },
      update: {
        groupId:              null,
        homeTournamentTeamId: null,
        awayTournamentTeamId: null,
        homeSlotLabel: km.homeSlotLabel,
        awaySlotLabel: km.awaySlotLabel,
        venueId:    venue.id,
        stage:      mapKnockoutStageToMatchStage(km.stage),
        roundLabel: km.roundLabel,
        kickoffAt,
        status:     'SCHEDULED',
      },
      create: {
        tournamentId:         tournament.id,
        groupId:              null,
        homeTournamentTeamId: null,
        awayTournamentTeamId: null,
        homeSlotLabel: km.homeSlotLabel,
        awaySlotLabel: km.awaySlotLabel,
        venueId:     venue.id,
        stage:       mapKnockoutStageToMatchStage(km.stage),
        roundLabel:  km.roundLabel,
        matchNumber: km.matchNumber,
        kickoffAt,
        status:      'SCHEDULED',
      },
    });
  }

  const totalMatches = await prisma.match.count({ where: { tournamentId: tournament.id } });
  console.info(
    `✅  Matches: ${totalMatches} total (${qaGroupMatches.length} group + ${qaKnockoutMatches.length} knockout)`,
  );

  // 10. Main pool — mismo slug y misma configuración que producción
  const mainPool = await prisma.pool.upsert({
    where:  { slug: MAIN_POOL_SLUG },
    update: { tournamentId: tournament.id, ownerUserId: adminUser.id, ...MAIN_POOL_CONFIG },
    create: { tournamentId: tournament.id, ownerUserId: adminUser.id, slug: MAIN_POOL_SLUG, ...MAIN_POOL_CONFIG },
    select: { id: true, slug: true },
  });

  await prisma.poolMember.upsert({
    where:  { poolId_userId: { poolId: mainPool.id, userId: adminUser.id } },
    update: { role: 'OWNER', status: 'ACTIVE', leftAt: null },
    create: { poolId: mainPool.id, userId: adminUser.id, role: 'OWNER', status: 'ACTIVE' },
  });

  console.info(`✅  Main pool: ${mainPool.slug}`);

  // ── Summary ───────────────────────────────────────────────────────────────

  console.info('\n✅  QA seed completed successfully.\n');
  console.info(
    JSON.stringify(
      {
        env: 'QA',
        tournamentSlug: tournament.slug,
        groups: GROUP_CODES.length,
        teams: QA_TEAM_CODES.size,
        playersFromLot1: playersLot1Stats.playersUpserted,
        fallbackPlayers: fallbackStats.createdFallbackPlayers,
        matches: {
          total: totalMatches,
          group: qaGroupMatches.length,
          knockout: qaKnockoutMatches.length,
        },
        matchList: [
          ...qaGroupMatches.map((m) => `#${m.matchNumber} ${m.homeCode} vs ${m.awayCode} [Group ${m.groupCode}]`),
          ...qaKnockoutMatches.map((m) => `#${m.matchNumber} ${m.homeSlotLabel} vs ${m.awaySlotLabel} [${m.stage}]`),
        ],
        mainPoolSlug: mainPool.slug,
        adminEmail: adminUser.email,
        adminRole: SystemRole.SUPER_ADMIN,
        bonusQuestions: 'none — create manually from admin panel',
      },
      null,
      2,
    ),
  );
}

seedQA()
  .catch((error) => {
    console.error('\n❌  QA seed failed:\n', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
