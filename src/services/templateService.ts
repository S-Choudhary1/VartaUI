import api from './api';
import type { MetaTemplate, Template, TemplateRequest, PaginatedResponse } from '../types';

export const getTemplates = async (): Promise<Template[]> => {
  const response = await api.get<PaginatedResponse<Template> | Template[]>('/templates', {
    params: { size: 500 }
  });
  const data = response.data;
  if (Array.isArray(data)) return data;
  if (data && 'content' in data) return data.content;
  return [];
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
