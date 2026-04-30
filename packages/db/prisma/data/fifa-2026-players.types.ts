export type TournamentPlayerSeed = {
  fullName: string;
  shortName?: string;
  externalRef: string;
  nationalityCode: string;
  preferredPosition: 'GK' | 'DF' | 'MF' | 'FW';
  position?: 'GK' | 'DF' | 'MF' | 'FW';
  isGoalkeeper?: boolean;
  isCaptain?: boolean;
  shirtNumber?: number;
};

export type TeamPlayersSeed = {
  teamCode: string;
  sourceNote: string;
  players: TournamentPlayerSeed[];
};
