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
  // Extended fields from official squad lists
  firstNames?: string;
  lastNames?: string;
  nameOnShirt?: string;
  club?: string;
  heightCm?: number;
  birthDate?: Date;
};

export type TeamPlayersSeed = {
  teamCode: string;
  sourceNote: string;
  players: TournamentPlayerSeed[];
};
