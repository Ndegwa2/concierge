import { apiClient } from './client';
import type {
  ApiResponse,
  Notification,
} from './types';

export const notificationsApi = {
  async getNotifications(unreadOnly = false): Promise<ApiResponse<{ notifications: Notification[]; unread_count: number }>> {
    const query = unreadOnly ? '?unread_only=true' : '';
    return apiClient.request(`/notifications/${query}`);
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
