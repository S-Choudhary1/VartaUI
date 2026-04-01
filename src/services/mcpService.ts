import api from './api';
import type { McpServerRegistry, McpConnection } from '../types';

export const listMcpServers = async (): Promise<McpServerRegistry[]> => {
  const response = await api.get<McpServerRegistry[]>('/mcp/servers');
  return response.data;
};

export const getMcpServer = async (id: string): Promise<McpServerRegistry> => {
  const response = await api.get<McpServerRegistry>(`/mcp/servers/${id}`);
  return response.data;
};

export const listMcpConnections = async (): Promise<McpConnection[]> => {
  const response = await api.get<McpConnection[]>('/mcp/connections');
  return response.data;
};

export const connectMcpServer = async (
  mcpServerId: string,
  credentials?: Record<string, string>,
  config?: Record<string, string>
): Promise<McpConnection> => {
  const response = await api.post<McpConnection>('/mcp/connections', {
    mcpServerId,
    credentials,
    config,
  });
  return response.data;
};

export const updateMcpConnection = async (
  connectionId: string,
  credentials?: Record<string, string>,
  config?: Record<string, string>
): Promise<McpConnection> => {
  const response = await api.put<McpConnection>(`/mcp/connections/${connectionId}`, {
    credentials,
    config,
  });
  return response.data;
};

export const disconnectMcpServer = async (connectionId: string): Promise<void> => {
  await api.delete(`/mcp/connections/${connectionId}`);
};

export const testMcpConnection = async (connectionId: string): Promise<McpConnection> => {
  const response = await api.post<McpConnection>(`/mcp/connections/${connectionId}/test`);
  return response.data;
};
