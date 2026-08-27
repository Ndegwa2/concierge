import { useState, useEffect } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { toast } from 'sonner';
import { notificationsApi } from '@/services/api';
import type { Notification } from '@/services/api';

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await notificationsApi.getNotifications(false);
      if (response.success && response.data) {
        setNotifications(response.data.notifications);
        setUnreadCount(response.data.unread_count);
      }
    } catch (e) {
      // Silently fail - notifications are non-critical
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkRead = async (notificationId: number) => {
    try {
      await notificationsApi.markNotificationRead(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllNotificationsRead();
      setNotifications([]);
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (e) {
      toast.error('Failed to mark all as read');
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'overdue_alert':
      case 'admin_overdue_alert':
        return 'border-l-red-500 bg-red-50';
      case 'appointment_reminder':
      case 'admin_appointment_reminder':
        return 'border-l-emerald-500 bg-emerald-50';
      default:
        return 'border-l-slate-300 bg-white';
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 z-50 max-h-96 overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Notifications</h3>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={handleMarkAllRead}
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>

            <div className="overflow-y-auto max-h-72">
              {loading ? (
                <div className="p-4 text-center text-slate-500 text-sm">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-sm">No notifications</div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 border-l-4 border-b border-slate-100 hover:bg-slate-50 transition-colors ${getNotificationColor(notification.notification_type)}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{notification.title}</p>
                        <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{notification.message}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(notification.created_at).toLocaleString('en-KE', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => handleMarkRead(notification.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
