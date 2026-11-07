/** One lane a bot user was shown. */
export interface TollBotRecentLane {
  lane: string;
  at: string;
  /** Served from the lane cache (TollGuru was not asked). */
  cached: boolean;
}

/** Someone who uses the Telegram toll bot. */
export interface TollBotUser {
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
  languageCode: string | null;
  /** https://t.me/<username> — only when the user has a @username. */
  profileUrl: string | null;
  /** tg://user?id=… — opens the profile in the Telegram app. */
  appUrl: string;
  blocked: boolean;
  lanesTotal: number;
  lanesToday: number;
  /** Lanes per day in force: their own limit, else the bot-wide default. */
  dailyLimit: number;
  /** Their own limit; null = the bot-wide default. */
  dailyLimitOverride: number | null;
  lastLaneAt: string | null;
  recentLanes: TollBotRecentLane[];
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface TollBotUsers {
  items: TollBotUser[];
  total: number;
  botConfigured: boolean;
  botUsername: string | null;
}

/** The bot-wide limits (Toll bot → Limits). */
export interface TollBotSettings {
  /** Lanes per user per day, in force. */
  dailyLaneLimit: number;
  /** TollGuru requests per day for all Telegram users, in force. */
  dailyFetchCap: number;
  /** Set here; null = the server's env default. */
  dailyLaneLimitSet: number | null;
  dailyFetchCapSet: number | null;
  envDailyLaneLimit: number;
  envDailyFetchCap: number;
  /** TollGuru requests the bot caused today. */
  fetchCapUsedToday: number;
}

/** Omitted = unchanged; null = back to the env default. */
export interface UpdateTollBotSettings {
  dailyLaneLimit?: number | null;
  dailyFetchCap?: number | null;
}

/** Omitted = unchanged; dailyLimit null = the bot-wide default. */
export interface UpdateTollBotUser {
  blocked?: boolean;
  dailyLimit?: number | null;
}
