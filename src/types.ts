export type Scout = {
  userId: string;
  username: string;
  boss: string;
  layer: string;
  timestamp: number;
};

export type BossKill = {
  boss: string;
  layer: string;
  killedAt: number;
};

export type Layer = {
  id: string;
  startTime: number;
  endTime: number;
  createdAt: number;
};

export type State = {
  boardChannelId?: string;
  boardMessageId?: string;
  scouts: Scout[];
  layers: Layer[];
  bossKills: BossKill[];
};
