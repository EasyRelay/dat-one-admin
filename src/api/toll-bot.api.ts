import { api } from './client';
import type {
  TollBotGroup,
  TollBotGroups,
  TollBotSettings,
  TollBotUser,
  TollBotUsers,
  UpdateTollBotSettings,
  UpdateTollBotUser,
} from '../types/toll-bot';

const BASE = '/ext-admin/toll-bot/users';
const SETTINGS = '/ext-admin/toll-bot/settings';
const GROUPS = '/ext-admin/toll-bot/groups';

export async function listTollBotUsers(params: {
  skip: number;
  limit: number;
  search?: string;
  blocked?: boolean;
}): Promise<TollBotUsers> {
  const { data } = await api.get<TollBotUsers>(BASE, { params });
  return data;
}

/** Block / unblock and/or set the user's own lanes per day. */
export async function updateTollBotUser(
  telegramId: number,
  body: UpdateTollBotUser,
): Promise<TollBotUser> {
  const { data } = await api.patch<TollBotUser>(`${BASE}/${telegramId}`, body);
  return data;
}

/** Give the user today back; `notify` tells them in Telegram. */
export async function resetTollBotUserToday(
  telegramId: number,
  notify: boolean,
): Promise<TollBotUser> {
  const { data } = await api.post<TollBotUser>(`${BASE}/${telegramId}/reset-today`, {
    notify,
  });
  return data;
}

export async function getTollBotSettings(): Promise<TollBotSettings> {
  const { data } = await api.get<TollBotSettings>(SETTINGS);
  return data;
}

export async function updateTollBotSettings(
  body: UpdateTollBotSettings,
): Promise<TollBotSettings> {
  const { data } = await api.patch<TollBotSettings>(SETTINGS, body);
  return data;
}

export async function listTollBotGroups(params: {
  skip: number;
  limit: number;
  search?: string;
  enabled?: boolean;
}): Promise<TollBotGroups> {
  const { data } = await api.get<TollBotGroups>(GROUPS, { params });
  return data;
}

/** Switch a group on or off (effective on its next message). */
export async function setTollBotGroupEnabled(
  chatId: number,
  enabled: boolean,
): Promise<TollBotGroup> {
  const { data } = await api.patch<TollBotGroup>(`${GROUPS}/${chatId}`, { enabled });
  return data;
}
