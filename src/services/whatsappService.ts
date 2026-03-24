import api from './api';
import type { WhatsAppOnboardRequest, WhatsAppStatus } from '../types';

export const onboardWhatsApp = async (data: WhatsAppOnboardRequest): Promise<WhatsAppStatus> => {
  const response = await api.post<WhatsAppStatus>('/whatsapp/onboard', data);
  return response.data;
};

export const getWhatsAppStatus = async (): Promise<WhatsAppStatus> => {
  const response = await api.get<WhatsAppStatus>('/whatsapp/status');
  return response.data;
};

export const retryProvisioning = async (): Promise<WhatsAppStatus> => {
  const response = await api.post<WhatsAppStatus>('/whatsapp/retry-provisioning');
  return response.data;
};
