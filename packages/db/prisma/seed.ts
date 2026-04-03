// @ts-nocheck

import {
  PrismaClient,
  QuestionAnswerType,
  QuestionResolutionMode,
  SystemRole,
} from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  const tournament = await prisma.tournament.upsert({
    where: { slug: 'world-cup-2026-demo' },
    update: {
      name: 'World Cup 2026 Demo',
      shortName: 'WC 2026',
      status: 'PUBLISHED',
      startDate: new Date('2026-06-11T18:00:00.000Z'),
      endDate: new Date('2026-07-19T18:00:00.000Z'),
      timezone: 'UTC',
    },
    create: {
      slug: 'world-cup-2026-demo',
      name: 'World Cup 2026 Demo',
      shortName: 'WC 2026',
      status: 'PUBLISHED',
      startDate: new Date('2026-06-11T18:00:00.000Z'),
      endDate: new Date('2026-07-19T18:00:00.000Z'),
      timezone: 'UTC',
    },
  });

  const [groupA, groupB] = await Promise.all([
    prisma.tournamentGroup.upsert({
      where: {
        tournamentId_code: {
          tournamentId: tournament.id,
          code: 'A',
        },
      },
      update: { name: 'Group A', sortOrder: 1 },
      create: {
        tournamentId: tournament.id,
        code: 'A',
        name: 'Group A',
        sortOrder: 1,
      },
    }),
    prisma.tournamentGroup.upsert({
      where: {
        tournamentId_code: {
          tournamentId: tournament.id,
          code: 'B',
        },
      },
      update: { name: 'Group B', sortOrder: 2 },
      create: {
        tournamentId: tournament.id,
        code: 'B',
        name: 'Group B',
        sortOrder: 2,
      },
    }),
  ]);

  const demoTeams = [
    { slug: 'argentina', name: 'Argentina', code: 'ARG', countryCode: 'AR', groupId: groupA.id, seed: 1 },
    { slug: 'japan', name: 'Japan', code: 'JPN', countryCode: 'JP', groupId: groupA.id, seed: 2 },
    { slug: 'france', name: 'France', code: 'FRA', countryCode: 'FR', groupId: groupB.id, seed: 1 },
    { slug: 'usa', name: 'United States', code: 'USA', countryCode: 'US', groupId: groupB.id, seed: 2 },
  ] as const;

  const teamRecords = await Promise.all(
    demoTeams.map((team) =>
      prisma.team.upsert({
        where: { code: team.code },
        update: {
          slug: team.slug,
          name: team.name,
          countryCode: team.countryCode,
        },
        create: {
          slug: team.slug,
          name: team.name,
          code: team.code,
          countryCode: team.countryCode,
        },
      }),
    ),
  );

  const tournamentTeams = await Promise.all(
    teamRecords.map((team) => {
      const teamInput = demoTeams.find((candidate) => candidate.code === team.code);
      if (!teamInput) {
        throw new Error(`Missing demo team config for code ${team.code}`);
      }

      return prisma.tournamentTeam.upsert({
        where: {
          tournamentId_teamId: {
            tournamentId: tournament.id,
            teamId: team.id,
          },
        },
        update: {
          groupId: teamInput.groupId,
          seed: teamInput.seed,
        },
        create: {
          tournamentId: tournament.id,
          teamId: team.id,
          groupId: teamInput.groupId,
          seed: teamInput.seed,
        },
      });
    }),
  );

  const tournamentTeamByCode = new Map(
    tournamentTeams.map((item) => {
      const team = teamRecords.find((candidate) => candidate.id === item.teamId);
      return [team?.code, item] as const;
    }),
  );

  const venue = await prisma.venue.upsert({
    where: {
      name_city: {
        name: 'MetLife Stadium',
        city: 'New York',
      },
    },
    update: {
      countryCode: 'US',
      timezone: 'America/New_York',
    },
    create: {
      name: 'MetLife Stadium',
      city: 'New York',
      countryCode: 'US',
      timezone: 'America/New_York',
    },
  });

  const match1 = await prisma.match.upsert({
    where: {
      tournamentId_matchNumber: {
        tournamentId: tournament.id,
        matchNumber: 1,
      },
    },
    update: {
      groupId: groupA.id,
      homeTournamentTeamId: tournamentTeamByCode.get('ARG')!.id,
      awayTournamentTeamId: tournamentTeamByCode.get('JPN')!.id,
      venueId: venue.id,
      stage: 'GROUP',
      roundLabel: 'Matchday 1',
      kickoffAt: new Date('2026-06-11T18:00:00.000Z'),
      status: 'SCHEDULED',
    },
    create: {
      tournamentId: tournament.id,
      groupId: groupA.id,
      homeTournamentTeamId: tournamentTeamByCode.get('ARG')!.id,
      awayTournamentTeamId: tournamentTeamByCode.get('JPN')!.id,
      venueId: venue.id,
      stage: 'GROUP',
      roundLabel: 'Matchday 1',
      matchNumber: 1,
      kickoffAt: new Date('2026-06-11T18:00:00.000Z'),
      status: 'SCHEDULED',
    },
  });

  const match2 = await prisma.match.upsert({
    where: {
      tournamentId_matchNumber: {
        tournamentId: tournament.id,
        matchNumber: 2,
      },
    },
    update: {
      groupId: groupB.id,
      homeTournamentTeamId: tournamentTeamByCode.get('FRA')!.id,
      awayTournamentTeamId: tournamentTeamByCode.get('USA')!.id,
      venueId: venue.id,
      stage: 'GROUP',
      roundLabel: 'Matchday 1',
      kickoffAt: new Date('2026-06-12T18:00:00.000Z'),
      status: 'SCHEDULED',
    },
    create: {
      tournamentId: tournament.id,
      groupId: groupB.id,
      homeTournamentTeamId: tournamentTeamByCode.get('FRA')!.id,
      awayTournamentTeamId: tournamentTeamByCode.get('USA')!.id,
      venueId: venue.id,
      stage: 'GROUP',
      roundLabel: 'Matchday 1',
      matchNumber: 2,
      kickoffAt: new Date('2026-06-12T18:00:00.000Z'),
      status: 'SCHEDULED',
    },
  });

  const match3 = await prisma.match.upsert({
    where: {
      tournamentId_matchNumber: {
        tournamentId: tournament.id,
        matchNumber: 3,
      },
    },
    update: {
      groupId: groupA.id,
      homeTournamentTeamId: tournamentTeamByCode.get('ARG')!.id,
      awayTournamentTeamId: tournamentTeamByCode.get('USA')!.id,
      venueId: venue.id,
      stage: 'GROUP',
      roundLabel: 'Matchday 2',
      kickoffAt: new Date('2026-06-16T18:00:00.000Z'),
      status: 'SCHEDULED',
    },
    create: {
      tournamentId: tournament.id,
      groupId: groupA.id,
      homeTournamentTeamId: tournamentTeamByCode.get('ARG')!.id,
      awayTournamentTeamId: tournamentTeamByCode.get('USA')!.id,
      venueId: venue.id,
      stage: 'GROUP',
      roundLabel: 'Matchday 2',
      matchNumber: 3,
      kickoffAt: new Date('2026-06-16T18:00:00.000Z'),
      status: 'SCHEDULED',
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@quinela.demo' },
    update: {
      displayName: 'Admin User',
      systemRole: SystemRole.ADMIN,
      isActive: true,
      lastLoginAt: new Date('2026-03-01T00:00:00.000Z'),
    },
    create: {
      email: 'admin@quinela.demo',
      displayName: 'Admin User',
      passwordHash: '$2b$10$demo.placeholder.hash.for.mvp.only',
      systemRole: SystemRole.ADMIN,
      isActive: true,
      lastLoginAt: new Date('2026-03-01T00:00:00.000Z'),
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

  const pool = await prisma.pool.upsert({
    where: { slug: 'quinela-demo-2026' },
    update: {
      tournamentId: tournament.id,
      ownerUserId: adminUser.id,
      name: 'Quinela Demo 2026',
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
          byAnswerType: {
            BOOLEAN: 1,
            SINGLE_CHOICE: 2,
            TEAM_PICK: 2,
            TIME_RANGE: 3,
          },
        },
      },
    },
    create: {
      tournamentId: tournament.id,
      ownerUserId: adminUser.id,
      slug: 'quinela-demo-2026',
      name: 'Quinela Demo 2026',
      description: 'Pool demo para validar flujo MVP',
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
          byAnswerType: {
            BOOLEAN: 1,
            SINGLE_CHOICE: 2,
            TEAM_PICK: 2,
            TIME_RANGE: 3,
          },
        },
      },
    },
  });

  const members = await Promise.all([
    prisma.poolMember.upsert({
      where: {
        poolId_userId: {
          poolId: pool.id,
          userId: adminUser.id,
        },
      },
      update: { role: 'OWNER', status: 'ACTIVE', leftAt: null },
      create: {
        poolId: pool.id,
        userId: adminUser.id,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    }),
    prisma.poolMember.upsert({
      where: {
        poolId_userId: {
          poolId: pool.id,
          userId: userAna.id,
        },
      },
      update: { role: 'MEMBER', status: 'ACTIVE', leftAt: null },
      create: {
        poolId: pool.id,
        userId: userAna.id,
        role: 'MEMBER',
        status: 'ACTIVE',
      },
    }),
    prisma.poolMember.upsert({
      where: {
        poolId_userId: {
          poolId: pool.id,
          userId: userLeo.id,
        },
      },
      update: { role: 'MEMBER', status: 'ACTIVE', leftAt: null },
      create: {
        poolId: pool.id,
        userId: userLeo.id,
        role: 'MEMBER',
        status: 'ACTIVE',
      },
    }),
  ]);

  const entryAdmin = await prisma.poolEntry.upsert({
    where: {
      poolId_userId: {
        poolId: pool.id,
        userId: adminUser.id,
      },
    },
    update: { entryName: 'Admin Entry', status: 'ACTIVE' },
    create: {
      poolId: pool.id,
      userId: adminUser.id,
      entryNumber: 1,
      entryName: 'Admin Entry',
      status: 'ACTIVE',
    },
  });

  const entryAna = await prisma.poolEntry.upsert({
    where: {
      poolId_userId: {
        poolId: pool.id,
        userId: userAna.id,
      },
    },
    update: { entryName: 'Ana Picks', status: 'ACTIVE' },
    create: {
      poolId: pool.id,
      userId: userAna.id,
      entryNumber: 1,
      entryName: 'Ana Picks',
      status: 'ACTIVE',
    },
  });

  const entryLeo = await prisma.poolEntry.upsert({
    where: {
      poolId_userId: {
        poolId: pool.id,
        userId: userLeo.id,
      },
    },
    update: { entryName: 'Leo Picks', status: 'ACTIVE' },
    create: {
      poolId: pool.id,
      userId: userLeo.id,
      entryNumber: 1,
      entryName: 'Leo Picks',
      status: 'ACTIVE',
    },
  });

  const [tplFirstTeamToScore, tplGoalInFirstHalf, tplLastGoalTimeRange] = await Promise.all([
    prisma.questionTemplate.upsert({
      where: { code: 'first_team_to_score' },
      update: {
        title: 'First team to score',
        answerType: QuestionAnswerType.TEAM_PICK,
        defaultPoints: 2,
        defaultScoringConfig: { mode: 'correct-option', points: 2 },
      },
      create: {
        code: 'first_team_to_score',
        title: 'First team to score',
        description: 'Predict which team scores the first goal in the match.',
        answerType: QuestionAnswerType.TEAM_PICK,
        defaultPoints: 2,
        defaultScoringConfig: { mode: 'correct-option', points: 2 },
      },
    }),
    prisma.questionTemplate.upsert({
      where: { code: 'goal_in_first_half' },
      update: {
        title: 'Goal in first half',
        answerType: QuestionAnswerType.BOOLEAN,
        defaultPoints: 1,
        defaultScoringConfig: { mode: 'boolean', points: 1 },
      },
      create: {
        code: 'goal_in_first_half',
        title: 'Goal in first half',
        description: 'Will there be at least one goal in the first half?',
        answerType: QuestionAnswerType.BOOLEAN,
        defaultPoints: 1,
        defaultScoringConfig: { mode: 'boolean', points: 1 },
        defaultAnswerConfig: { trueLabel: 'Yes', falseLabel: 'No' },
      },
    }),
    prisma.questionTemplate.upsert({
      where: { code: 'last_goal_time_range' },
      update: {
        title: 'Last goal time range',
        answerType: QuestionAnswerType.TIME_RANGE,
        defaultPoints: 3,
        defaultScoringConfig: { mode: 'time-range', points: 3 },
        defaultOptionsConfig: {
          ranges: ['00-30', '31-60', '61-75', '76-90+'],
        },
      },
      create: {
        code: 'last_goal_time_range',
        title: 'Last goal time range',
        description: 'Predict the minute range of the last goal.',
        answerType: QuestionAnswerType.TIME_RANGE,
        defaultPoints: 3,
        defaultScoringConfig: { mode: 'time-range', points: 3 },
        defaultOptionsConfig: {
          ranges: ['00-30', '31-60', '61-75', '76-90+'],
        },
      },
    }),
  ]);

  const qFirstTeam = await prisma.matchQuestion.upsert({
    where: {
      matchId_key: {
        matchId: match1.id,
        key: 'first_team_to_score',
      },
    },
    update: {
      templateId: tplFirstTeamToScore.id,
      questionText: 'Which team will score first?',
      answerType: QuestionAnswerType.TEAM_PICK,
      pointsOverride: 2,
      resolutionMode: QuestionResolutionMode.MATCH_RESULT_DERIVED,
      isPublished: true,
      isResolved: false,
      lockAt: new Date('2026-06-11T17:45:00.000Z'),
      resolvedAt: null,
      correctOptionId: null,
    },
    create: {
      matchId: match1.id,
      templateId: tplFirstTeamToScore.id,
      key: 'first_team_to_score',
      questionText: 'Which team will score first?',
      answerType: QuestionAnswerType.TEAM_PICK,
      pointsOverride: 2,
      resolutionMode: QuestionResolutionMode.MATCH_RESULT_DERIVED,
      isPublished: true,
      isResolved: false,
      lockAt: new Date('2026-06-11T17:45:00.000Z'),
    },
  });

  const qGoalFirstHalf = await prisma.matchQuestion.upsert({
    where: {
      matchId_key: {
        matchId: match1.id,
        key: 'goal_in_first_half',
      },
    },
    update: {
      templateId: tplGoalInFirstHalf.id,
      questionText: 'Will there be a goal in the first half?',
      answerType: QuestionAnswerType.BOOLEAN,
      pointsOverride: 1,
      answerConfig: { trueLabel: 'Yes', falseLabel: 'No' },
      resolutionMode: QuestionResolutionMode.MATCH_RESULT_DERIVED,
      isPublished: true,
      isResolved: false,
      lockAt: new Date('2026-06-11T17:45:00.000Z'),
      resolvedAt: null,
      correctOptionId: null,
    },
    create: {
      matchId: match1.id,
      templateId: tplGoalInFirstHalf.id,
      key: 'goal_in_first_half',
      questionText: 'Will there be a goal in the first half?',
      answerType: QuestionAnswerType.BOOLEAN,
      pointsOverride: 1,
      answerConfig: { trueLabel: 'Yes', falseLabel: 'No' },
      resolutionMode: QuestionResolutionMode.MATCH_RESULT_DERIVED,
      isPublished: true,
      isResolved: false,
      lockAt: new Date('2026-06-11T17:45:00.000Z'),
    },
  });

  const qLastGoalRange = await prisma.matchQuestion.upsert({
    where: {
      matchId_key: {
        matchId: match1.id,
        key: 'last_goal_time_range',
      },
    },
    update: {
      templateId: tplLastGoalTimeRange.id,
      questionText: 'In what time range will the last goal be scored?',
      answerType: QuestionAnswerType.TIME_RANGE,
      pointsOverride: 3,
      answerConfig: {
        ranges: ['00-30', '31-60', '61-75', '76-90+'],
      },
      resolutionMode: QuestionResolutionMode.MANUAL,
      isPublished: true,
      isResolved: false,
      lockAt: new Date('2026-06-11T17:45:00.000Z'),
      resolvedAt: null,
      correctOptionId: null,
    },
    create: {
      matchId: match1.id,
      templateId: tplLastGoalTimeRange.id,
      key: 'last_goal_time_range',
      questionText: 'In what time range will the last goal be scored?',
      answerType: QuestionAnswerType.TIME_RANGE,
      pointsOverride: 3,
      answerConfig: {
        ranges: ['00-30', '31-60', '61-75', '76-90+'],
      },
      resolutionMode: QuestionResolutionMode.MANUAL,
      isPublished: true,
      isResolved: false,
      lockAt: new Date('2026-06-11T17:45:00.000Z'),
    },
  });

  const firstTeamOptionArg = await prisma.matchQuestionOption.upsert({
    where: {
      matchQuestionId_key: {
        matchQuestionId: qFirstTeam.id,
        key: 'ARG',
      },
    },
    update: {
      label: 'Argentina',
      teamId: teamRecords.find((team) => team.code === 'ARG')!.id,
      sortOrder: 1,
      isActive: true,
    },
    create: {
      matchQuestionId: qFirstTeam.id,
      key: 'ARG',
      label: 'Argentina',
      teamId: teamRecords.find((team) => team.code === 'ARG')!.id,
      sortOrder: 1,
      isActive: true,
    },
  });

  const firstTeamOptionJpn = await prisma.matchQuestionOption.upsert({
    where: {
      matchQuestionId_key: {
        matchQuestionId: qFirstTeam.id,
        key: 'JPN',
      },
    },
    update: {
      label: 'Japan',
      teamId: teamRecords.find((team) => team.code === 'JPN')!.id,
      sortOrder: 2,
      isActive: true,
    },
    create: {
      matchQuestionId: qFirstTeam.id,
      key: 'JPN',
      label: 'Japan',
      teamId: teamRecords.find((team) => team.code === 'JPN')!.id,
      sortOrder: 2,
      isActive: true,
    },
  });

  const goalFirstHalfYes = await prisma.matchQuestionOption.upsert({
    where: {
      matchQuestionId_key: {
        matchQuestionId: qGoalFirstHalf.id,
        key: 'YES',
      },
    },
    update: {
      label: 'Yes',
      sortOrder: 1,
      isActive: true,
      optionConfig: { booleanValue: true },
    },
    create: {
      matchQuestionId: qGoalFirstHalf.id,
      key: 'YES',
      label: 'Yes',
      sortOrder: 1,
      isActive: true,
      optionConfig: { booleanValue: true },
    },
  });

  const goalFirstHalfNo = await prisma.matchQuestionOption.upsert({
    where: {
      matchQuestionId_key: {
        matchQuestionId: qGoalFirstHalf.id,
        key: 'NO',
      },
    },
    update: {
      label: 'No',
      sortOrder: 2,
      isActive: true,
      optionConfig: { booleanValue: false },
    },
    create: {
      matchQuestionId: qGoalFirstHalf.id,
      key: 'NO',
      label: 'No',
      sortOrder: 2,
      isActive: true,
      optionConfig: { booleanValue: false },
    },
  });

  const lastGoal00_30 = await prisma.matchQuestionOption.upsert({
    where: {
      matchQuestionId_key: {
        matchQuestionId: qLastGoalRange.id,
        key: '00_30',
      },
    },
    update: {
      label: '00-30',
      sortOrder: 1,
      isActive: true,
      optionConfig: { fromMinute: 0, toMinute: 30 },
    },
    create: {
      matchQuestionId: qLastGoalRange.id,
      key: '00_30',
      label: '00-30',
      sortOrder: 1,
      isActive: true,
      optionConfig: { fromMinute: 0, toMinute: 30 },
    },
  });

  const lastGoal31_60 = await prisma.matchQuestionOption.upsert({
    where: {
      matchQuestionId_key: {
        matchQuestionId: qLastGoalRange.id,
        key: '31_60',
      },
    },
    update: {
      label: '31-60',
      sortOrder: 2,
      isActive: true,
      optionConfig: { fromMinute: 31, toMinute: 60 },
    },
    create: {
      matchQuestionId: qLastGoalRange.id,
      key: '31_60',
      label: '31-60',
      sortOrder: 2,
      isActive: true,
      optionConfig: { fromMinute: 31, toMinute: 60 },
    },
  });

  const lastGoal61_75 = await prisma.matchQuestionOption.upsert({
    where: {
      matchQuestionId_key: {
        matchQuestionId: qLastGoalRange.id,
        key: '61_75',
      },
    },
    update: {
      label: '61-75',
      sortOrder: 3,
      isActive: true,
      optionConfig: { fromMinute: 61, toMinute: 75 },
    },
    create: {
      matchQuestionId: qLastGoalRange.id,
      key: '61_75',
      label: '61-75',
      sortOrder: 3,
      isActive: true,
      optionConfig: { fromMinute: 61, toMinute: 75 },
    },
  });

  const lastGoal76_90 = await prisma.matchQuestionOption.upsert({
    where: {
      matchQuestionId_key: {
        matchQuestionId: qLastGoalRange.id,
        key: '76_90P',
      },
    },
    update: {
      label: '76-90+',
      sortOrder: 4,
      isActive: true,
      optionConfig: { fromMinute: 76, toMinute: 130 },
    },
    create: {
      matchQuestionId: qLastGoalRange.id,
      key: '76_90P',
      label: '76-90+',
      sortOrder: 4,
      isActive: true,
      optionConfig: { fromMinute: 76, toMinute: 130 },
    },
  });

  await prisma.matchPrediction.upsert({
    where: {
      poolEntryId_matchId: {
        poolEntryId: entryAna.id,
        matchId: match1.id,
      },
    },
    update: {
      predictedHomeScore: 2,
      predictedAwayScore: 1,
      pointsAwarded: 0,
      isScored: false,
      scoredAt: null,
    },
    create: {
      poolEntryId: entryAna.id,
      matchId: match1.id,
      predictedHomeScore: 2,
      predictedAwayScore: 1,
    },
  });

  await prisma.matchPrediction.upsert({
    where: {
      poolEntryId_matchId: {
        poolEntryId: entryLeo.id,
        matchId: match1.id,
      },
    },
    update: {
      predictedHomeScore: 1,
      predictedAwayScore: 1,
      pointsAwarded: 0,
      isScored: false,
      scoredAt: null,
    },
    create: {
      poolEntryId: entryLeo.id,
      matchId: match1.id,
      predictedHomeScore: 1,
      predictedAwayScore: 1,
    },
  });

  await prisma.matchQuestionPrediction.upsert({
    where: {
      poolEntryId_matchQuestionId: {
        poolEntryId: entryAna.id,
        matchQuestionId: qFirstTeam.id,
      },
    },
    update: {
      selectedOptionId: firstTeamOptionArg.id,
      selectedTeamId: teamRecords.find((team) => team.code === 'ARG')!.id,
      selectedBoolean: null,
      selectedTimeRangeKey: null,
      pointsAwarded: 0,
      isScored: false,
      scoredAt: null,
    },
    create: {
      poolEntryId: entryAna.id,
      matchQuestionId: qFirstTeam.id,
      selectedOptionId: firstTeamOptionArg.id,
      selectedTeamId: teamRecords.find((team) => team.code === 'ARG')!.id,
    },
  });

  await prisma.matchQuestionPrediction.upsert({
    where: {
      poolEntryId_matchQuestionId: {
        poolEntryId: entryAna.id,
        matchQuestionId: qGoalFirstHalf.id,
      },
    },
    update: {
      selectedOptionId: goalFirstHalfYes.id,
      selectedBoolean: true,
      selectedTeamId: null,
      selectedTimeRangeKey: null,
      pointsAwarded: 0,
      isScored: false,
      scoredAt: null,
    },
    create: {
      poolEntryId: entryAna.id,
      matchQuestionId: qGoalFirstHalf.id,
      selectedOptionId: goalFirstHalfYes.id,
      selectedBoolean: true,
    },
  });

  await prisma.matchQuestionPrediction.upsert({
    where: {
      poolEntryId_matchQuestionId: {
        poolEntryId: entryAna.id,
        matchQuestionId: qLastGoalRange.id,
      },
    },
    update: {
      selectedOptionId: lastGoal61_75.id,
      selectedBoolean: null,
      selectedTeamId: null,
      selectedTimeRangeKey: '61_75',
      pointsAwarded: 0,
      isScored: false,
      scoredAt: null,
    },
    create: {
      poolEntryId: entryAna.id,
      matchQuestionId: qLastGoalRange.id,
      selectedOptionId: lastGoal61_75.id,
      selectedTimeRangeKey: '61_75',
    },
  });

  await prisma.matchQuestionPrediction.upsert({
    where: {
      poolEntryId_matchQuestionId: {
        poolEntryId: entryLeo.id,
        matchQuestionId: qGoalFirstHalf.id,
      },
    },
    update: {
      selectedOptionId: goalFirstHalfNo.id,
      selectedBoolean: false,
      selectedTeamId: null,
      selectedTimeRangeKey: null,
      pointsAwarded: 0,
      isScored: false,
      scoredAt: null,
    },
    create: {
      poolEntryId: entryLeo.id,
      matchQuestionId: qGoalFirstHalf.id,
      selectedOptionId: goalFirstHalfNo.id,
      selectedBoolean: false,
    },
  });

  await prisma.auditLog.deleteMany({
    where: {
      entityType: 'POOL',
      entityId: pool.id,
      metadata: {
        path: ['source'],
        equals: 'seed',
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: adminUser.id,
      action: 'CREATE',
      entityType: 'POOL',
      entityId: pool.id,
      tournamentId: tournament.id,
      poolId: pool.id,
      metadata: {
        source: 'seed',
        note: 'Demo pool bootstrapped with sample users and entries',
      },
    },
  });

  console.info('Seed MVP ejecutado correctamente.');
  console.info(
    JSON.stringify(
      {
        tournament: tournament.slug,
        groups: [groupA.code, groupB.code],
        teams: teamRecords.length,
        matches: [match1.matchNumber, match2.matchNumber, match3.matchNumber],
        users: [adminUser.email, userAna.email, userLeo.email],
        pool: pool.slug,
        members: members.length,
        entries: [entryAdmin.id, entryAna.id, entryLeo.id],
      },
      null,
      2,
    ),
  );
}

seed()
  .then(() => {
    return prisma.$disconnect();
  })
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    void prisma.$disconnect();
    process.exit(1);
  });
