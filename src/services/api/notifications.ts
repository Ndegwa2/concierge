import { apiClient } from './client';
import type {
  ApiResponse,
  Notification,
} from './types';

export const notificationsApi = {
  async getNotifications(unreadOnly = false): Promise<ApiResponse<{ notifications: Notification[]; unread_count: number }>> {
    const params = new URLSearchParams();
    if (unreadOnly) params.set('unread_only', 'true');
    const query = params.toString();
    const endpoint = query ? `/notifications?${query}` : '/notifications';
    return apiClient.request(endpoint);
  },

  async markNotificationRead(notificationId: number): Promise<ApiResponse<{ notification: Notification }>> {
    return apiClient.request(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  },

  async markAllNotificationsRead(): Promise<ApiResponse<void>> {
    return apiClient.request(`/notifications/read-all`, {
      method: 'PUT',
    });
  },
};
