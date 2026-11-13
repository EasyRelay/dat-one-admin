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
  /**
   * Today's free full-routes card already claimed (first successful calc).
   * False = their next calc can still open every route.
   */
  freeRoutesUsedToday: boolean;
  /** Lanes per day in force: their own limit, else the bot-wide default. */
  dailyLimit: number;
  /** Their own limit; null = the bot-wide default. */
  dailyLimitOverride: number | null;
  /** May calculate in the bot's private chat while it is closed to everyone. */
  privateAllowed: boolean;
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
  /** false = no daily TollGuru cap for Telegram. */
  dailyFetchCapEnabled: boolean;
  /** Set here; null = the server's env default. */
  dailyLaneLimitSet: number | null;
  dailyFetchCapSet: number | null;
  envDailyLaneLimit: number;
  envDailyFetchCap: number;
  /** TollGuru requests the bot caused today. */
  fetchCapUsedToday: number;
  /** Promo button under every card, in force; '' = no button. */
  promoText: string;
  promoUrl: string;
  /** Set here; null = the default. */
  promoTextSet: string | null;
  promoUrlSet: string | null;
  promoDefaultText: string;
  promoDefaultUrl: string;
  /** New groups may use the bot at once (false = an admin switches them on). */
  newGroupsEnabled: boolean;
  /** Everyone may calculate in the bot's private chat (false = allowed users only). */
  privateChatEnabled: boolean;
  /**
   * true = only the first calc of the day may open every route;
   * false = every result may open every route.
   */
  fullRoutesDailyLimitEnabled: boolean;
  /** What "Get directions" on a card does. */
  directionsMode: TollBotDirectionsMode;
  /** Look of the "Get directions" page on map.easydat.us. */
  directionsPageStyle: TollBotDirectionsPageStyle;
  /** Map on that page. */
  directionsMap: TollBotDirectionsMap;
}

/** `classic` = the original copy page; `modern` = the Easy DAT site look. */
export type TollBotDirectionsPageStyle = 'classic' | 'modern';

/** `google` = Google's free embedded map; `osm` = OpenStreetMap with the exact TollGuru line. */
export type TollBotDirectionsMap = 'google' | 'osm';

/**
 * "Get directions" on a result card: `link` = a link in the caption (the copy
 * page, or the bot's private chat); `chat` = a button, and the bot posts the
 * directions in that chat — the first lines shown, the rest collapsed.
 */
export type TollBotDirectionsMode = 'link' | 'chat';

/** Omitted = unchanged; null = back to the env default. */
export interface UpdateTollBotSettings {
  dailyLaneLimit?: number | null;
  dailyFetchCap?: number | null;
  dailyFetchCapEnabled?: boolean | null;
  /** null = the default, '' = no button. */
  promoText?: string | null;
  promoUrl?: string | null;
  newGroupsEnabled?: boolean | null;
  privateChatEnabled?: boolean | null;
  fullRoutesDailyLimitEnabled?: boolean | null;
  directionsMode?: TollBotDirectionsMode | null;
  directionsPageStyle?: TollBotDirectionsPageStyle | null;
  directionsMap?: TollBotDirectionsMap | null;
}

/** A Telegram group the toll bot is in (or was). */
export interface TollBotGroup {
  chatId: number;
  title: string;
  username: string | null;
  /** https://t.me/<username> for a public group. */
  link: string | null;
  type: string;
  enabled: boolean;
  /** member / administrator / left / kicked… */
  botStatus: string | null;
  lanesTotal: number;
  lastLaneAt: string | null;
  lastSeenAt: string | null;
  firstSeenAt: string;
}

export interface TollBotGroups {
  items: TollBotGroup[];
  total: number;
}

/** Omitted = unchanged; dailyLimit null = the bot-wide default. */
export interface UpdateTollBotUser {
  blocked?: boolean;
  dailyLimit?: number | null;
  privateAllowed?: boolean;
}
