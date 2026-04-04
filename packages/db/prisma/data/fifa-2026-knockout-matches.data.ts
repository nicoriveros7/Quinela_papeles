export type KnockoutMatchSeed = {
  matchNumber: number;
  stage:
    | 'ROUND_OF_32'
    | 'ROUND_OF_16'
    | 'QUARTER_FINAL'
    | 'SEMI_FINAL'
    | 'THIRD_PLACE'
    | 'FINAL';
  roundLabel: string;
  homeSlotLabel: string;
  awaySlotLabel: string;
  venueName: string;
  kickoffEt: string;
};

export const fifa2026KnockoutMatches: KnockoutMatchSeed[] = [
  { matchNumber: 73, stage: 'ROUND_OF_32', roundLabel: 'Round of 32', homeSlotLabel: '2A', awaySlotLabel: '2B', venueName: 'Los Angeles', kickoffEt: '2026-06-28T15:00:00-04:00' },
  { matchNumber: 74, stage: 'ROUND_OF_32', roundLabel: 'Round of 32', homeSlotLabel: '1E', awaySlotLabel: '3 ABCDF', venueName: 'Boston', kickoffEt: '2026-06-29T16:30:00-04:00' },
  { matchNumber: 75, stage: 'ROUND_OF_32', roundLabel: 'Round of 32', homeSlotLabel: '1F', awaySlotLabel: '2C', venueName: 'Monterrey', kickoffEt: '2026-06-29T21:00:00-04:00' },
  { matchNumber: 76, stage: 'ROUND_OF_32', roundLabel: 'Round of 32', homeSlotLabel: '1C', awaySlotLabel: '2F', venueName: 'Houston', kickoffEt: '2026-06-29T13:00:00-04:00' },
  { matchNumber: 77, stage: 'ROUND_OF_32', roundLabel: 'Round of 32', homeSlotLabel: '1I', awaySlotLabel: '3 CDFGH', venueName: 'New York New Jersey', kickoffEt: '2026-06-30T17:00:00-04:00' },
  { matchNumber: 78, stage: 'ROUND_OF_32', roundLabel: 'Round of 32', homeSlotLabel: '2E', awaySlotLabel: '2I', venueName: 'Dallas', kickoffEt: '2026-06-30T13:00:00-04:00' },
  { matchNumber: 79, stage: 'ROUND_OF_32', roundLabel: 'Round of 32', homeSlotLabel: '1A', awaySlotLabel: '3 CEFHI', venueName: 'Mexico City', kickoffEt: '2026-06-30T21:00:00-04:00' },
  { matchNumber: 80, stage: 'ROUND_OF_32', roundLabel: 'Round of 32', homeSlotLabel: '1L', awaySlotLabel: '3 EHIJK', venueName: 'Atlanta', kickoffEt: '2026-07-01T12:00:00-04:00' },
  { matchNumber: 81, stage: 'ROUND_OF_32', roundLabel: 'Round of 32', homeSlotLabel: '1D', awaySlotLabel: '3 BEFIJ', venueName: 'San Francisco Bay Area', kickoffEt: '2026-07-01T20:00:00-04:00' },
  { matchNumber: 82, stage: 'ROUND_OF_32', roundLabel: 'Round of 32', homeSlotLabel: '1G', awaySlotLabel: '3 AEHIJ', venueName: 'Seattle', kickoffEt: '2026-07-01T16:00:00-04:00' },
  { matchNumber: 83, stage: 'ROUND_OF_32', roundLabel: 'Round of 32', homeSlotLabel: '2K', awaySlotLabel: '2L', venueName: 'Toronto', kickoffEt: '2026-07-02T19:00:00-04:00' },
  { matchNumber: 84, stage: 'ROUND_OF_32', roundLabel: 'Round of 32', homeSlotLabel: '1H', awaySlotLabel: '2J', venueName: 'Los Angeles', kickoffEt: '2026-07-02T15:00:00-04:00' },
  { matchNumber: 85, stage: 'ROUND_OF_32', roundLabel: 'Round of 32', homeSlotLabel: '1B', awaySlotLabel: '3 EFGIJ', venueName: 'Vancouver', kickoffEt: '2026-07-02T23:00:00-04:00' },
  { matchNumber: 86, stage: 'ROUND_OF_32', roundLabel: 'Round of 32', homeSlotLabel: '1J', awaySlotLabel: '2H', venueName: 'Miami', kickoffEt: '2026-07-03T18:00:00-04:00' },
  { matchNumber: 87, stage: 'ROUND_OF_32', roundLabel: 'Round of 32', homeSlotLabel: '1K', awaySlotLabel: '3 DEIJL', venueName: 'Kansas City', kickoffEt: '2026-07-03T21:30:00-04:00' },
  { matchNumber: 88, stage: 'ROUND_OF_32', roundLabel: 'Round of 32', homeSlotLabel: '2D', awaySlotLabel: '2G', venueName: 'Dallas', kickoffEt: '2026-07-03T14:00:00-04:00' },
  { matchNumber: 89, stage: 'ROUND_OF_16', roundLabel: 'Round of 16', homeSlotLabel: 'W74', awaySlotLabel: 'W77', venueName: 'Philadelphia', kickoffEt: '2026-07-04T17:00:00-04:00' },
  { matchNumber: 90, stage: 'ROUND_OF_16', roundLabel: 'Round of 16', homeSlotLabel: 'W73', awaySlotLabel: 'W75', venueName: 'Houston', kickoffEt: '2026-07-04T13:00:00-04:00' },
  { matchNumber: 91, stage: 'ROUND_OF_16', roundLabel: 'Round of 16', homeSlotLabel: 'W76', awaySlotLabel: 'W78', venueName: 'New York New Jersey', kickoffEt: '2026-07-05T16:00:00-04:00' },
  { matchNumber: 92, stage: 'ROUND_OF_16', roundLabel: 'Round of 16', homeSlotLabel: 'W79', awaySlotLabel: 'W80', venueName: 'Mexico City', kickoffEt: '2026-07-05T20:00:00-04:00' },
  { matchNumber: 93, stage: 'ROUND_OF_16', roundLabel: 'Round of 16', homeSlotLabel: 'W83', awaySlotLabel: 'W84', venueName: 'Dallas', kickoffEt: '2026-07-06T15:00:00-04:00' },
  { matchNumber: 94, stage: 'ROUND_OF_16', roundLabel: 'Round of 16', homeSlotLabel: 'W81', awaySlotLabel: 'W82', venueName: 'Seattle', kickoffEt: '2026-07-06T17:00:00-04:00' },
  { matchNumber: 95, stage: 'ROUND_OF_16', roundLabel: 'Round of 16', homeSlotLabel: 'W86', awaySlotLabel: 'W88', venueName: 'Atlanta', kickoffEt: '2026-07-07T12:00:00-04:00' },
  { matchNumber: 96, stage: 'ROUND_OF_16', roundLabel: 'Round of 16', homeSlotLabel: 'W85', awaySlotLabel: 'W87', venueName: 'Vancouver', kickoffEt: '2026-07-07T16:00:00-04:00' },
  { matchNumber: 97, stage: 'QUARTER_FINAL', roundLabel: 'Quarter-final', homeSlotLabel: 'W89', awaySlotLabel: 'W90', venueName: 'Boston', kickoffEt: '2026-07-09T16:00:00-04:00' },
  { matchNumber: 98, stage: 'QUARTER_FINAL', roundLabel: 'Quarter-final', homeSlotLabel: 'W93', awaySlotLabel: 'W94', venueName: 'Los Angeles', kickoffEt: '2026-07-10T15:00:00-04:00' },
  { matchNumber: 99, stage: 'QUARTER_FINAL', roundLabel: 'Quarter-final', homeSlotLabel: 'W91', awaySlotLabel: 'W92', venueName: 'Miami', kickoffEt: '2026-07-11T17:00:00-04:00' },
  { matchNumber: 100, stage: 'QUARTER_FINAL', roundLabel: 'Quarter-final', homeSlotLabel: 'W95', awaySlotLabel: 'W96', venueName: 'Kansas City', kickoffEt: '2026-07-11T21:00:00-04:00' },
  { matchNumber: 101, stage: 'SEMI_FINAL', roundLabel: 'Semi-final', homeSlotLabel: 'W97', awaySlotLabel: 'W98', venueName: 'Dallas', kickoffEt: '2026-07-14T15:00:00-04:00' },
  { matchNumber: 102, stage: 'SEMI_FINAL', roundLabel: 'Semi-final', homeSlotLabel: 'W99', awaySlotLabel: 'W100', venueName: 'Atlanta', kickoffEt: '2026-07-15T15:00:00-04:00' },
  { matchNumber: 103, stage: 'THIRD_PLACE', roundLabel: 'Third-place match', homeSlotLabel: 'L101', awaySlotLabel: 'L102', venueName: 'Miami', kickoffEt: '2026-07-18T17:00:00-04:00' },
  { matchNumber: 104, stage: 'FINAL', roundLabel: 'Final', homeSlotLabel: 'W101', awaySlotLabel: 'W102', venueName: 'New York New Jersey', kickoffEt: '2026-07-19T15:00:00-04:00' },
];
