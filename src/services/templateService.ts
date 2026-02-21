import api from './api';
import type { AdvancedTemplateRequest, Template, TemplateRequest } from '../types';

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

// V2 endpoints for full WhatsApp template components/categories support.
// Backend can map this shape to Graph API payload.
export const createAdvancedTemplate = async (data: AdvancedTemplateRequest): Promise<Template> => {
  const response = await api.post<Template>('/templates/v2', data);
  return response.data;
};

export const updateAdvancedTemplate = async (id: string, data: AdvancedTemplateRequest): Promise<Template> => {
  const response = await api.put<Template>(`/templates/v2/${id}`, data);
  return response.data;
};

export const previewAdvancedTemplate = async (data: AdvancedTemplateRequest): Promise<{ previewText: string }> => {
  const response = await api.post<{ previewText: string }>('/templates/v2/preview', data);
  return response.data;
};

