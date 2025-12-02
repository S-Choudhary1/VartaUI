import api from './api';
import type { Campaign } from '../types';

export const createCampaign = async (formData: FormData): Promise<Campaign> => {
  const response = await api.post<Campaign>('/campaigns/upload-csv', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  // The backend response structure map matches Campaign partially, but let's assume it returns the created campaign object or ID
  // The controller returns Map<String, Object> with status, id, name.
  // Ideally we should fetch the full campaign or just return what we got.
  // For now, let's cast it.
  return response.data as unknown as Campaign;
};

export const getCampaign = async (id: string): Promise<Campaign> => {
  const response = await api.get<Campaign>(`/campaigns/${id}`);
  return response.data;
};

// Note: There isn't a "get all campaigns" endpoint in the controller yet.
// I will add a placeholder function, but it will need backend support.
export const getAllCampaigns = async (): Promise<Campaign[]> => {
  const response = await api.get<Campaign[]>('/campaigns');
  return response.data;
};

