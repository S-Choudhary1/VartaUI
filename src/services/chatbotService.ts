import api from './api';
import type {
  AiChatbotConfig,
  AiConversation,
  AiMessageLog,
  PaginatedResponse,
} from '../types';

export const getChatbotConfig = async (): Promise<AiChatbotConfig | null> => {
  try {
    const response = await api.get<AiChatbotConfig>('/ai-chatbot/config');
    return response.data;
  } catch (err: unknown) {
    // If no config exists yet, the backend returns 404 — treat as null
    if (
      err instanceof Error &&
      (err.message?.includes('404') || err.message?.includes('not found') || err.message?.includes('Not Found'))
    ) {
      return null;
    }
    throw err;
  }
};

export const saveChatbotConfig = async (
  config: Partial<AiChatbotConfig>
): Promise<AiChatbotConfig> => {
  const response = await api.post<AiChatbotConfig>('/ai-chatbot/config', config);
  return response.data;
};

export const toggleChatbot = async (enabled: boolean): Promise<void> => {
  await api.patch('/ai-chatbot/config/toggle', { enabled });
};

export const testChatbot = async (
  message: string
): Promise<{ response: string; tokensInput: number; tokensOutput: number; latencyMs: number }> => {
  const res = await api.post<{
    response: string;
    tokensInput: number;
    tokensOutput: number;
    latencyMs: number;
  }>('/ai-chatbot/test', { message });
  return res.data;
};

export const getConversations = async (
  page = 0,
  size = 20
): Promise<PaginatedResponse<AiConversation>> => {
  const response = await api.get<PaginatedResponse<AiConversation>>(
    '/ai-chatbot/conversations',
    { params: { page, size } }
  );
  return response.data;
};

export const getConversationMessages = async (
  convId: string
): Promise<AiMessageLog[]> => {
  const response = await api.get<AiMessageLog[]>(
    `/ai-chatbot/conversations/${convId}/messages`
  );
  return response.data;
};

export interface AiAnalytics {
  totalConversations: number;
  activeConversations: number;
  handedOffConversations: number;
  totalMessages: number;
  totalTokensUsed: number;
  estimatedCostUsd: number;
  humanHandoffRate: number;
  avgMessagesPerConversation: number;
  provider: string;
  model: string;
}

export const getAnalytics = async (): Promise<AiAnalytics> => {
  const response = await api.get<AiAnalytics>('/ai-chatbot/analytics');
  return response.data;
};
