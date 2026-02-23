import api from './api';
import type { AdvancedTemplateRequest, MetaTemplate, Template, TemplateRequest } from '../types';

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

export const getApprovedMetaTemplates = async (): Promise<MetaTemplate[]> => {
  const response = await api.get<unknown>('/templates/meta/approved');
  const payload = response.data as
    | MetaTemplate[]
    | { data?: MetaTemplate[]; templates?: MetaTemplate[] }
    | undefined;

  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.templates)
        ? payload.templates
        : [];

  // Normalize fields so UI can render even if backend shape differs slightly.
  return list
    .map((template) => {
      const raw = template.raw || {};
      const fallbackName = typeof raw.name === 'string' ? raw.name : undefined;
      const fallbackLanguage = typeof raw.language === 'string' ? raw.language : undefined;
      const fallbackComponents = Array.isArray(raw.components)
        ? (raw.components as MetaTemplate['components'])
        : undefined;

      return {
        ...template,
        id: template.id || String((raw as Record<string, unknown>).id || ''),
        name: template.name || fallbackName || '',
        language: template.language || fallbackLanguage || 'en',
        components: template.components || fallbackComponents || [],
      };
    })
    .filter((template) => !!template.id && !!template.name);
};

