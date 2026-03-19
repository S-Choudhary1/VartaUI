import api from './api';
import type { ContactRequest, ContactResponse, PaginatedResponse } from '../types';

export const getContacts = async (): Promise<ContactResponse[]> => {
  const response = await api.get<PaginatedResponse<ContactResponse> | ContactResponse[]>('/contacts', {
    params: { size: 500 }
  });
  const data = response.data;
  if (Array.isArray(data)) return data;
  if (data && 'content' in data) return data.content;
  return [];
};

export const createContact = async (data: ContactRequest): Promise<ContactResponse> => {
  const response = await api.post<ContactResponse>('/contacts', data);
  return response.data;
};

export const updateContact = async (id: string, data: ContactRequest): Promise<ContactResponse> => {
  const response = await api.put<ContactResponse>(`/contacts/${id}`, data);
  return response.data;
};

export const deleteContact = async (id: string): Promise<void> => {
  await api.delete(`/contacts/${id}`);
};
