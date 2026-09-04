import { api } from './client';
import type {
  ExtDevice,
  ExtDeviceStatus,
  PaginatedExtDevices,
  UpdateExtDevicePayload,
} from '../types/device';

export interface ListDevicesParams {
  skip?: number;
  limit?: number;
  search?: string;
  status?: ExtDeviceStatus;
  userId?: string;
  company?: string;
}

export async function listDevices(
  params: ListDevicesParams = {},
): Promise<PaginatedExtDevices> {
  const { data } = await api.get<PaginatedExtDevices>('/ext-admin/devices', {
    params,
  });
  return data;
}

export async function updateDevice(
  id: string,
  payload: UpdateExtDevicePayload,
): Promise<ExtDevice> {
  const { data } = await api.patch<ExtDevice>(
    `/ext-admin/devices/${id}`,
    payload,
  );
  return data;
}

export async function deactivateDevice(id: string): Promise<ExtDevice> {
  const { data } = await api.post<ExtDevice>(
    `/ext-admin/devices/${id}/deactivate`,
  );
  return data;
}

export async function activateDevice(id: string): Promise<ExtDevice> {
  const { data } = await api.post<ExtDevice>(
    `/ext-admin/devices/${id}/activate`,
  );
  return data;
}

export async function deleteDevice(id: string): Promise<void> {
  await api.delete(`/ext-admin/devices/${id}`);
}
