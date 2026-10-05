import { apiClient } from './client';
import { API_BASE_URL } from './types';
import type {
  ApiResponse,
  ChatMessage,
  ChatImage,
} from './types';

export interface ChatTask<T = { response: string }> {
  task_id?: string;
  status?: 'pending' | 'processing' | 'complete' | 'failed';
  response?: T extends { response: string } ? string | null : never;
}

interface ChatPollOptions {
  timeoutMs?: number;
  intervalMs?: number;
}

const DEFAULT_TIMEOUT_MS = 90_000;
const DEFAULT_INTERVAL_MS = 1_500;

/**
 * The backend accepts an AI request asynchronously (202 + task_id) and exposes
 * a polling endpoint, so the browser no longer has to hold a request open for
 * the whole model round-trip.
 */
export const aiChatApi = {
  async chatWithAI(data: {
    message: string;
    conversation_history?: ChatMessage[];
    image_urls?: string[];
  }): Promise<ApiResponse<{ response: string | null; task_id: string; status: string }>> {
    return apiClient.request('/ai-chat/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getChatResult(
    taskId: string
  ): Promise<ApiResponse<{ response: string | null; task_id: string; status: string }>> {
    return apiClient.request(`/ai-chat/chat/${encodeURIComponent(taskId)}`);
  },

  /**
   * Upload a single image attachment to the chat.
   *
   * The file is validated server-side (format + 10 MB size limit); on success
   * a signed, short-lived URL is returned for inline display.
   */
  async uploadImage(file: File): Promise<ApiResponse<{ image: ChatImage }>> {
    const token = apiClient.getToken();
    const form = new FormData();
    form.append('file', file);

    const response = await fetch(`${API_BASE_URL}/ai-chat/images`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    return response.json();
  },

  /** List the current user's uploaded chat images. */
  async listChatImages(): Promise<ApiResponse<{ images: ChatImage[] }>> {
    return apiClient.request('/ai-chat/images');
  },

  /** Delete a chat image owned by the current user. */
  async deleteChatImage(imageId: number): Promise<ApiResponse<{ id: number }>> {
    return apiClient.request(`/ai-chat/images/${imageId}`, { method: 'DELETE' });
  },

  /**
   * Submit a message and poll until the assistant answers, the task fails, or
   * `timeoutMs` elapses.
   */
  async chatAndWait(
    data: { message: string; conversation_history?: ChatMessage[]; image_urls?: string[] },
    { timeoutMs = DEFAULT_TIMEOUT_MS, intervalMs = DEFAULT_INTERVAL_MS }: ChatPollOptions = {}
  ): Promise<ApiResponse<{ response: string }>> {
    const submitted = await this.chatWithAI(data);
    if (!submitted.success) {
      return { success: false, message: submitted.message, error: submitted.error };
    }

    const taskId = submitted.data?.task_id;
    // Backwards compatibility: if the deployment answered synchronously, use it.
    if (submitted.data?.response) {
      return { success: true, data: { response: submitted.data.response } };
    }
    if (!taskId) {
      return { success: false, message: 'AI service did not return a task id.' };
    }

    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));

      const polled = await this.getChatResult(taskId);
      if (!polled.success) {
        // `processing` answers arrive as success:true/202, so a failure here is
        // terminal (or the session expired).
        return { success: false, message: polled.message, error: polled.error };
      }

      const status = polled.data?.status;
      if (status === 'complete' && polled.data?.response) {
        return { success: true, data: { response: polled.data.response } };
      }
      if (status === 'failed') {
        return { success: false, message: polled.message || 'Failed to get response' };
      }
    }

    return { success: false, message: 'The assistant is taking too long. Please try again.' };
  },
};
