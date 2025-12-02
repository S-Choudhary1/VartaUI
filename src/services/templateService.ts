import api from './api';
import type { Template, TemplateRequest } from '../types';

export const getTemplates = async (): Promise<Template[]> => {
  const response = await api.get<Template[]>('/templates');
  return response.data || [];
};

export const createTemplate = async (data: TemplateRequest): Promise<Template> => {
  const response = await api.post<Template>('/templates', data);
  return response.data;
};

export const updateTemplate = async (id: string, data: TemplateRequest): Promise<Template> => {
  const response = await api.put<Template>(`/templates/${id}`, data);
  return response.data;
};

export const deleteTemplate = async (id: string): Promise<void> => {
  await api.delete(`/templates/${id}`);
};

export const getTemplateById = async (id: string): Promise<Template> => {
  const response = await api.get<Template>(`/templates/${id}`);
  return response.data;
};

