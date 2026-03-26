export enum AppSurface {
  Web = 'WEB',
  Api = 'API',
  Admin = 'ADMIN',
}

export type EntityId = string;

export interface ApiEnvelope<TData> {
  data: TData;
  timestamp: string;
}
