import { apiClient } from './client';
import type {
  ApiResponse,
} from './types';

export const aiChatApi = {
  async chatWithAI(data: {
    message: string;
    conversation_history?: Array<{ role: string; content: string }>;
  }): Promise<ApiResponse<{ response: string }>> {
    const token = apiClient.getToken();
    const response = await fetch(`${apiClient['API_BASE_URL']}/ai-chat/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    return result;
  },
};
