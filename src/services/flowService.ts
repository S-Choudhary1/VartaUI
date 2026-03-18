import api from './api';
import type { FlowDefinition, FlowRun, FlowVersion } from '../types';

const normalizeVersions = (value: unknown): FlowVersion[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const raw = item as Record<string, unknown>;
      const id = typeof raw.id === 'string' ? raw.id : '';
      if (!id) return null;
      return {
        id,
        version: typeof raw.version === 'number' ? raw.version : undefined,
        status: typeof raw.status === 'string' ? raw.status : undefined,
        published: typeof raw.published === 'boolean' ? raw.published : undefined,
        createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : undefined,
        raw,
      } as FlowVersion;
    })
    .filter(Boolean) as FlowVersion[];
};

const normalizeFlows = (payload: unknown): FlowDefinition[] => {
  const list = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as Record<string, unknown>).data)
      ? ((payload as Record<string, unknown>).data as unknown[])
      : [];

  return list
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const raw = item as Record<string, unknown>;
      const id = typeof raw.id === 'string' ? raw.id : '';
      const name = typeof raw.name === 'string' ? raw.name : '';
      if (!id || !name) return null;
      return {
        id,
        name,
        description: typeof raw.description === 'string' ? raw.description : undefined,
        status: typeof raw.status === 'string' ? raw.status : undefined,
        latestVersionId:
          typeof raw.latestVersionId === 'string'
            ? raw.latestVersionId
            : typeof raw.latest_version_id === 'string'
              ? raw.latest_version_id
              : undefined,
        versions: normalizeVersions(raw.versions),
        raw,
      } as FlowDefinition;
    })
    .filter(Boolean) as FlowDefinition[];
};

export const getFlows = async (): Promise<FlowDefinition[]> => {
  const response = await api.get<unknown>('/flows');
  return normalizeFlows(response.data);
};

export const createFlow = async (data: { name: string; description?: string }): Promise<FlowDefinition> => {
  const response = await api.post<unknown>('/flows', data);
  const normalized = normalizeFlows([response.data]);
  return normalized[0];
};

export const createFlowWithVersion = async (data: Record<string, unknown>): Promise<FlowDefinition> => {
  const response = await api.post<unknown>('/flows/with-version', data);
  const normalized = normalizeFlows([response.data]);
  return normalized[0];
};

export const createFlowVersion = async (
  flowId: string,
  data: Record<string, unknown>
): Promise<FlowVersion> => {
  const response = await api.post<unknown>(`/flows/${flowId}/versions`, data);
  const raw = response.data as Record<string, unknown>;
  const versions = normalizeVersions([raw]);
  if (!versions[0]) {
    throw new Error('Invalid flow version response');
  }
  return versions[0];
};

export const publishFlowVersion = async (versionId: string): Promise<void> => {
  await api.post(`/flows/versions/${versionId}/publish`);
};

export const getCampaignFlowRuns = async (campaignId: string): Promise<FlowRun[]> => {
  const response = await api.get<FlowRun[]>(`/campaigns/${campaignId}/flow-runs`);
  return response.data || [];
};
