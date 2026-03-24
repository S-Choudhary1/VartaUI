import api from './api';
import type { AccountAlert } from '../types';

export const getUnresolvedAlerts = async (): Promise<AccountAlert[]> => {
  const response = await api.get<AccountAlert[]>('/alerts/unresolved');
  return response.data;
};

export const getAlertCount = async (): Promise<number> => {
  const response = await api.get<{ count: number }>('/alerts/count');
  return response.data.count;
};

export const resolveAlert = async (alertId: string): Promise<void> => {
  await api.post(`/alerts/${alertId}/resolve`);
};

export const resolveAllAlerts = async (): Promise<void> => {
  await api.post('/alerts/resolve-all');
};
