import api from './api';
import type { Flow, FlowRequest, FlowExecution, FlowAnalytics, PaginatedResponse } from '../types';

export const createFlow = async (data: FlowRequest): Promise<Flow> => {
  const response = await api.post<Flow>('/flows', data);
  return response.data;
};

export const getFlows = async (): Promise<Flow[]> => {
  const response = await api.get<PaginatedResponse<Flow> | Flow[]>('/flows', {
    params: { size: 200 }
  });
  const data = response.data;
  if (Array.isArray(data)) return data;
  if (data && 'content' in data) return data.content;
  return [];
};

export const getFlow = async (id: string): Promise<Flow> => {
  const response = await api.get<Flow>(`/flows/${id}`);
  return response.data;
};

export const updateFlow = async (id: string, data: FlowRequest): Promise<Flow> => {
  const response = await api.put<Flow>(`/flows/${id}`, data);
  return response.data;
};

export const deleteFlow = async (id: string): Promise<void> => {
  await api.delete(`/flows/${id}`);
};

export const activateFlow = async (id: string): Promise<Flow> => {
  const response = await api.post<Flow>(`/flows/${id}/activate`);
  return response.data;
};

export const pauseFlow = async (id: string): Promise<Flow> => {
  const response = await api.post<Flow>(`/flows/${id}/pause`);
  return response.data;
};

export const getFlowExecutions = async (flowId: string): Promise<FlowExecution[]> => {
  const response = await api.get<PaginatedResponse<FlowExecution> | FlowExecution[]>(
    `/flows/${flowId}/executions`, { params: { size: 200 } }
  );
  const data = response.data;
  if (Array.isArray(data)) return data;
  if (data && 'content' in data) return data.content;
  return [];
};

export const getFlowExecution = async (flowId: string, execId: string): Promise<FlowExecution> => {
  const response = await api.get<FlowExecution>(`/flows/${flowId}/executions/${execId}`);
  return response.data;
};

export const getFlowAnalytics = async (flowId: string): Promise<FlowAnalytics> => {
  const response = await api.get<FlowAnalytics>(`/flows/${flowId}/analytics`);
  return response.data;
};

export const enrollContact = async (flowId: string, contactId: string): Promise<void> => {
  await api.post(`/flows/${flowId}/enroll`, { contactId });
};
