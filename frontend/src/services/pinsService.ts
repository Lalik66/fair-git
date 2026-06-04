import api from './api';

export type PinLabel = 'car' | 'picnic' | 'stroller';

export interface UserPin {
  id: string;
  label: PinLabel;
  latitude: number;
  longitude: number;
  createdAt: string;
  updatedAt: string;
}

export async function listPins(): Promise<UserPin[]> {
  const res = await api.get<{ pins: UserPin[] }>('/pins');
  return res.data.pins;
}

export async function savePin(
  label: PinLabel,
  latitude: number,
  longitude: number,
): Promise<UserPin> {
  const res = await api.post<{ pin: UserPin }>('/pins', { label, latitude, longitude });
  return res.data.pin;
}

export async function deletePin(label: PinLabel): Promise<void> {
  await api.delete(`/pins/${label}`);
}
