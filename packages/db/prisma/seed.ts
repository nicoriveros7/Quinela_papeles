import { MatchStage, PrismaClient, SystemRole } from '@prisma/client';

import { fifa2026Venues } from './data/fifa-2026-venues.data';
import { fifa2026GroupMatches } from './data/fifa-2026-group-matches.data';
import { fifa2026KnockoutMatches } from './data/fifa-2026-knockout-matches.data';

const prisma = new PrismaClient();
const TOURNAMENT_SLUG = 'world-cup-2026';

const countryToIsoCode: Record<string, string> = {
  USA: 'US',
  Mexico: 'MX',
  Canada: 'CA',
};

function mapKnockoutStageToMatchStage(stage: (typeof fifa2026KnockoutMatches)[number]['stage']): MatchStage {
  if (stage === 'ROUND_OF_32') return MatchStage.ROUND_OF_32;
  if (stage === 'ROUND_OF_16') return MatchStage.ROUND_OF_16;
  if (stage === 'QUARTER_FINAL') return MatchStage.QUARTER_FINAL;
  if (stage === 'SEMI_FINAL') return MatchStage.SEMI_FINAL;
  if (stage === 'THIRD_PLACE') return MatchStage.THIRD_PLACE;
  return MatchStage.FINAL;
}

async function seedQuinelaDemoPool(tournamentId: string) {
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@quinela.demo' },
    update: {
      displayName: 'Admin User',
      systemRole: SystemRole.ADMIN,
      isActive: true,
    },
    create: {
      email: 'admin@quinela.demo',
      displayName: 'Admin User',
      passwordHash: '$2b$10$demo.placeholder.hash.for.mvp.only',
      systemRole: SystemRole.ADMIN,
      isActive: true,
    },
  });

  const userAna = await prisma.user.upsert({
    where: { email: 'ana@quinela.demo' },
    update: {
      displayName: 'Ana Torres',
      systemRole: SystemRole.USER,
      isActive: true,
    },
    create: {
      email: 'ana@quinela.demo',
      displayName: 'Ana Torres',
      passwordHash: '$2b$10$demo.placeholder.hash.for.mvp.only',
      systemRole: SystemRole.USER,
      isActive: true,
    },
  });

  const userLeo = await prisma.user.upsert({
    where: { email: 'leo@quinela.demo' },
    update: {
      displayName: 'Leo Ramos',
      systemRole: SystemRole.USER,
      isActive: true,
    },
    create: {
      email: 'leo@quinela.demo',
      displayName: 'Leo Ramos',
      passwordHash: '$2b$10$demo.placeholder.hash.for.mvp.only',
      systemRole: SystemRole.USER,
      isActive: true,
    },
  });

  const demoPool = await prisma.pool.upsert({
    where: { slug: 'quinela-demo-2026' },
    update: {
      tournamentId,
      ownerUserId: adminUser.id,
      name: 'Quinela Demo 2026',
      description: 'Pool demo para predecir todo el calendario del Mundial 2026',
      visibility: 'PRIVATE',
      status: 'ACTIVE',
      joinCode: 'DEMO2026',
      maxEntriesPerMember: 1,
      lockMinutesBeforeKickoff: 15,
      pointsExactScore: 3,
      pointsMatchOutcome: 1,
      pointsBonusCorrect: 2,
      pointsConfig: {
        match: {
          exactScore: 3,
          outcome: 1,
        },
        bonus: {
          default: 2,
        },
      },
    },
    create: {
      tournamentId,
      ownerUserId: adminUser.id,
      slug: 'quinela-demo-2026',
      name: 'Quinela Demo 2026',
      description: 'Pool demo para predecir todo el calendario del Mundial 2026',
      visibility: 'PRIVATE',
      status: 'ACTIVE',
      joinCode: 'DEMO2026',
      maxEntriesPerMember: 1,
      lockMinutesBeforeKickoff: 15,
      pointsExactScore: 3,
      pointsMatchOutcome: 1,
      pointsBonusCorrect: 2,
      pointsConfig: {
        match: {
          exactScore: 3,
          outcome: 1,
        },
        bonus: {
          default: 2,
        },
      },
    },
  });

  await prisma.poolMember.upsert({
    where: {
      poolId_userId: {
        poolId: demoPool.id,
        userId: adminUser.id,
      },
    },
    update: {
      role: 'OWNER',
      status: 'ACTIVE',
      leftAt: null,
    },
    create: {
      poolId: demoPool.id,
      userId: adminUser.id,
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });

  for (const member of [userAna, userLeo]) {
    await prisma.poolMember.upsert({
      where: {
        poolId_userId: {
          poolId: demoPool.id,
          userId: member.id,
        },
      },
      update: {
        role: 'MEMBER',
        status: 'ACTIVE',
        leftAt: null,
      },
      create: {
        poolId: demoPool.id,
        userId: member.id,
        role: 'MEMBER',
        status: 'ACTIVE',
      },
    });
  }

  for (const entry of [
    { userId: adminUser.id, entryName: 'Admin Entry' },
    { userId: userAna.id, entryName: 'Ana Picks' },
    { userId: userLeo.id, entryName: 'Leo Picks' },
  ]) {
    await prisma.poolEntry.upsert({
      where: {
        poolId_userId: {
          poolId: demoPool.id,
          userId: entry.userId,
        },
      },
      update: {
        entryName: entry.entryName,
        entryNumber: 1,
        status: 'ACTIVE',
      },
      create: {
        poolId: demoPool.id,
        userId: entry.userId,
        entryNumber: 1,
        entryName: entry.entryName,
        status: 'ACTIVE',
      },
    });
  }

  return demoPool;
}

async function seedFifa2026Calendar() {
  const kickoffValues = [...fifa2026GroupMatches, ...fifa2026KnockoutMatches].map((m) => new Date(m.kickoffEt).getTime());
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

  for (const code of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const) {
    await prisma.tournamentGroup.upsert({
      where: {
        tournamentId_code: {
          tournamentId: tournament.id,
          code,
        },
      },
      update: {
        name: `Group ${code}`,
      },
      create: {
        tournamentId: tournament.id,
        code,
        name: `Group ${code}`,
        sortOrder: code.charCodeAt(0) - 64,
      },
    });
  }

  const venueByName = new Map<string, { id: string; name: string }>();
  for (const venueSeed of fifa2026Venues) {
    const venue = await prisma.venue.upsert({
      where: {
        slug: venueSeed.slug,
      },
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
      select: {
        id: true,
        name: true,
      },
    });

    venueByName.set(venue.name, venue);
  }

  const groupRows = await prisma.tournamentGroup.findMany({
    where: {
      tournamentId: tournament.id,
      code: { in: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] },
    },
    select: {
      id: true,
      code: true,
    },
  });

  const groupByCode = new Map(groupRows.map((group) => [group.code, group]));

  const groupByTeamCode = new Map<string, string>();
  for (const match of fifa2026GroupMatches) {
    if (!groupByTeamCode.has(match.homeCode)) {
      groupByTeamCode.set(match.homeCode, match.groupCode);
    }
    if (!groupByTeamCode.has(match.awayCode)) {
      groupByTeamCode.set(match.awayCode, match.groupCode);
    }
  }

  const allTeamCodes = Array.from(
    new Set(fifa2026GroupMatches.flatMap((m) => [m.homeCode, m.awayCode])),
  );

  for (const code of allTeamCodes) {
    const team = await prisma.team.upsert({
      where: { code },
      update: {},
      create: {
        code,
        slug: code.toLowerCase(),
        name: code,
      },
      select: {
        id: true,
      },
    });

    const groupCode = groupByTeamCode.get(code);
    if (!groupCode) {
      continue;
    }

    const group = groupByCode.get(groupCode);
    if (!group) {
      continue;
    }

    await prisma.tournamentTeam.upsert({
      where: {
        tournamentId_teamId: {
          tournamentId: tournament.id,
          teamId: team.id,
        },
      },
      update: {
        groupId: group.id,
      },
      create: {
        tournamentId: tournament.id,
        teamId: team.id,
        groupId: group.id,
      },
    });
  }

  const teamRows = await prisma.tournamentTeam.findMany({
    where: { tournamentId: tournament.id },
    select: {
      id: true,
      team: {
        select: {
          code: true,
        },
      },
    },
  });

  const tournamentTeamByCode = new Map(teamRows.map((row) => [row.team.code, row]));

  for (const groupMatch of fifa2026GroupMatches) {
    const group = groupByCode.get(groupMatch.groupCode);
    if (!group) {
      throw new Error(`Missing TournamentGroup code ${groupMatch.groupCode} for tournament ${TOURNAMENT_SLUG}.`);
    }

    const homeTeam = tournamentTeamByCode.get(groupMatch.homeCode);
    const awayTeam = tournamentTeamByCode.get(groupMatch.awayCode);
    if (!homeTeam || !awayTeam) {
      throw new Error(
        `Missing TournamentTeam mapping for group match ${groupMatch.matchNumber}: ${groupMatch.homeCode} vs ${groupMatch.awayCode}.`,
      );
    }

    const venue = venueByName.get(groupMatch.venueName);
    if (!venue) {
      throw new Error(`Missing venue mapping for group match ${groupMatch.matchNumber}: ${groupMatch.venueName}.`);
    }

    await prisma.match.upsert({
      where: {
        tournamentId_matchNumber: {
          tournamentId: tournament.id,
          matchNumber: groupMatch.matchNumber,
        },
      },
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

  for (const knockoutMatch of fifa2026KnockoutMatches) {
    const venue = venueByName.get(knockoutMatch.venueName);
    if (!venue) {
      throw new Error(`Missing venue mapping for knockout match ${knockoutMatch.matchNumber}: ${knockoutMatch.venueName}.`);
    }

    await prisma.match.upsert({
      where: {
        tournamentId_matchNumber: {
          tournamentId: tournament.id,
          matchNumber: knockoutMatch.matchNumber,
        },
      },
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

  const [totalMatches, groupMatches, knockoutMatches] = await Promise.all([
    prisma.match.count({ where: { tournamentId: tournament.id } }),
    prisma.match.count({ where: { tournamentId: tournament.id, stage: MatchStage.GROUP } }),
    prisma.match.count({
      where: {
        tournamentId: tournament.id,
        stage: {
          in: [
            MatchStage.ROUND_OF_32,
            MatchStage.ROUND_OF_16,
            MatchStage.QUARTER_FINAL,
            MatchStage.SEMI_FINAL,
            MatchStage.THIRD_PLACE,
            MatchStage.FINAL,
          ],
        },
      },
    }),
  ]);

  if (groupByCode.size !== 12) {
    throw new Error(`Validation failed: expected 12 groups, found ${groupByCode.size}.`);
  }

  if (fifa2026GroupMatches.length !== 72) {
    throw new Error(`Validation failed in dataset: expected 72 group matches, found ${fifa2026GroupMatches.length}.`);
  }

  if (fifa2026KnockoutMatches.length !== 32) {
    throw new Error(`Validation failed in dataset: expected 32 knockout matches, found ${fifa2026KnockoutMatches.length}.`);
  }

  if (totalMatches !== 104 || groupMatches !== 72 || knockoutMatches !== 32) {
    throw new Error(
      `Validation failed after seeding: total=${totalMatches}, group=${groupMatches}, knockout=${knockoutMatches}.`,
    );
  }

  const demoPool = await seedQuinelaDemoPool(tournament.id);
  const demoPoolMatches = await prisma.match.count({ where: { tournamentId: demoPool.tournamentId } });

  console.info('FIFA World Cup 2026 calendar seeded successfully.');
  console.info(
    JSON.stringify(
      {
        tournamentSlug: tournament.slug,
        groups: groupByCode.size,
        venues: fifa2026Venues.length,
        groupMatches: fifa2026GroupMatches.length,
        knockoutMatches: fifa2026KnockoutMatches.length,
        totalMatches,
        demoPoolSlug: demoPool.slug,
        demoPoolTournamentMatches: demoPoolMatches,
      },
      null,
      2,
    ),
  );
  console.info('kickoffEt values are ET offsets and are persisted as UTC DateTime via new Date(kickoffEt).');
}

seedFifa2026Calendar()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
