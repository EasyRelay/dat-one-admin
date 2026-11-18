export type TollSiteOnlineWindow = 1 | 5 | 10;

export type TollSiteOnline = {
  online: number;
  windowMinutes: TollSiteOnlineWindow;
  now: string;
};
