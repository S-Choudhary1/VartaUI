import api from './api';
import type { ContactRequest, ContactResponse } from '../types';

// Need to define ContactRequest/Response in types first if not present
// Based on controller:
// POST /api/v1/contacts
// GET /api/v1/contacts
// DELETE /api/v1/contacts/{id}

export const getContacts = async (): Promise<ContactResponse[]> => {
  const response = await api.get<ContactResponse[]>('/contacts');
  return response.data || [];
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
