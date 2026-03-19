import api from './api';
import type { Message, SendMessageRequest, MessageType, PaginatedResponse } from '../types';

export const sendMessage = async (data: SendMessageRequest): Promise<void> => {
  await api.post('/messages/send', data);
};

export const getMessageHistory = async (phone: string): Promise<Message[]> => {
  const response = await api.get<PaginatedResponse<Message> | Message[]>(`/messages/history`, {
    params: { phone, size: 200 }
  });
  // Handle both paginated and array responses for backward compatibility
  const data = response.data;
  if (Array.isArray(data)) return data;
  if (data && 'content' in data) return data.content;
  return [];
};

type MediaDisposition = 'inline' | 'attachment';

const getFilenameFromContentDisposition = (contentDisposition?: string): string => {
  if (!contentDisposition) return 'media';
  const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  if (!match?.[1]) return 'media';
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
};

export const fetchMessageMedia = async (
  messageId: string,
  disposition: MediaDisposition = 'inline'
): Promise<{ blob: Blob; filename: string }> => {
  const response = await api.get<Blob>(`/messages/${messageId}/media`, {
    params: { disposition },
    responseType: 'blob',
  });
  const filename = getFilenameFromContentDisposition(response.headers['content-disposition']);
  return { blob: response.data, filename };
};

/** Upload media types that require multipart file upload */
export type UploadMediaType = Extract<MessageType, 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'STICKER'>;

export const sendMediaMessage = async (data: {
  to: string;
  messageType: UploadMediaType;
  file: File;
  caption?: string;
}): Promise<void> => {
  const formData = new FormData();
  formData.append('to', data.to);
  formData.append('messageType', data.messageType);
  formData.append('file', data.file);
  if (data.caption) {
    formData.append('caption', data.caption);
  }

  await api.post('/messages/send-media', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};
