import type { TollBotUser } from '../../types/toll-bot';

/** @username, else first name, else the Telegram id. */
export function tollBotUserLabel(user: TollBotUser): string {
  return user.username ? `@${user.username}` : user.firstName || String(user.telegramId);
}
