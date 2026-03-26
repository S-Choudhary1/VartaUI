import api from './api';
import type { AdminStats, ClientDetail, ClientCreateRequest, AdminUser, Campaign, AccountAlert } from '../types';

export const getAdminStats = async (): Promise<AdminStats> => {
  const response = await api.get<AdminStats>('/admin/stats');
  return response.data;
};

export const getAdminCampaigns = async (): Promise<Campaign[]> => {
  const response = await api.get<Campaign[]>('/admin/campaigns');
  return response.data;
};

export const getAdminUsers = async (): Promise<AdminUser[]> => {
  const response = await api.get<AdminUser[]>('/admin/users');
  return response.data;
};

export const getAllClients = async (): Promise<ClientDetail[]> => {
  const response = await api.get<ClientDetail[]>('/clients');
  return response.data;
};

export const createClient = async (data: ClientCreateRequest): Promise<ClientDetail> => {
  const response = await api.post<ClientDetail>('/clients', data);
  return response.data;
};

export const updateClient = async (id: string, data: Partial<ClientDetail>): Promise<ClientDetail> => {
  const response = await api.put<ClientDetail>(`/clients/${id}`, data);
  return response.data;
};

export const deleteClient = async (id: string): Promise<void> => {
  await api.delete(`/clients/${id}`);
};

export const getClientAlerts = async (clientId: string): Promise<AccountAlert[]> => {
  const response = await api.get<AccountAlert[]>(`/admin/clients/${clientId}/alerts`);
  return response.data;
};

export const refreshClientData = async (clientId: string): Promise<ClientDetail> => {
  const response = await api.post<ClientDetail>(`/admin/clients/${clientId}/refresh`);
  return response.data;
};

export const retryClientProvisioning = async (clientId: string): Promise<ClientDetail> => {
  const response = await api.post<ClientDetail>(`/admin/clients/${clientId}/retry-provisioning`);
  return response.data;
};
