import api from './api';
import type { Campaign, PaginatedResponse } from '../types';

export const createCampaign = async (formData: FormData): Promise<Campaign> => {
  const response = await api.post<Campaign>('/campaigns/upload-csv', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data as unknown as Campaign;
};

export const getCampaign = async (id: string): Promise<Campaign> => {
  const response = await api.get<Campaign>(`/campaigns/${id}`);
  return response.data;
};

export const getAllCampaigns = async (): Promise<Campaign[]> => {
  const response = await api.get<PaginatedResponse<Campaign> | Campaign[]>('/campaigns', {
    params: { size: 200 }
  });
  const data = response.data;
  if (Array.isArray(data)) return data;
  if (data && 'content' in data) return data.content;
  return [];
};

const getFilenameFromContentDisposition = (contentDisposition?: string): string => {
  if (!contentDisposition) return 'campaign-responses.csv';
  const match = contentDisposition.match(/filename="?([^"]+)"?/i);
  return match?.[1] || 'campaign-responses.csv';
};

export const exportCampaignResponsesCsv = async (id: string): Promise<{ blob: Blob; filename: string }> => {
  const response = await api.get<Blob>(`/campaigns/${id}/responses/export`, {
    responseType: 'blob',
    headers: {
      Accept: 'text/plain',
    },
  });

  const filename = getFilenameFromContentDisposition(response.headers['content-disposition']);
  return { blob: response.data, filename };
};
