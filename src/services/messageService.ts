import api from './api';
import type { Message } from '../types';

export interface SendMessageRequest {
  to: string;
  templateId?: string;
  variables?: Record<string, string>;
}

export const sendMessage = async (data: SendMessageRequest): Promise<void> => {
  await api.post('/messages/send', data);
};

export const getMessageHistory = async (phone: string): Promise<Message[]> => {
  const response = await api.get<Message[]>(`/messages/history`, {
    params: { phone }
  });
  return response.data;
};
