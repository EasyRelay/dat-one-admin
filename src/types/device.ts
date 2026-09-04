export type ExtDeviceStatus = 'active' | 'inactive';

export interface ExtDevice {
  id: string;
  deviceKey: string;
  userId: string;
  userEmail: string;
  company: string | null;
  status: ExtDeviceStatus;
  ipAddress: string | null;
  userAgent: string | null;
  label: string | null;
  note: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedExtDevices {
  items: ExtDevice[];
  total: number;
}

// No create payload. A device row is written by the extension itself on
// sign-in, keyed by the install's own `deviceKey` — a row invented here could
// never bind to a real install.

export interface UpdateExtDevicePayload {
  company?: string | null;
  label?: string | null;
  note?: string | null;
  status?: ExtDeviceStatus;
  ipAddress?: string | null;
}
