/**
 * Web Notifications API utility for Schedule Alerts.
 */

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return Notification.permission;
  }
}

export function showScheduleNotification(title: string, body: string): boolean {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    const notification = new Notification(title, {
      body,
      icon: 'favicon.ico',
      badge: 'favicon.ico',
      tag: 'jadwal-alert',
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto close after 6 seconds
    setTimeout(() => {
      notification.close();
    }, 6000);

    return true;
  } catch (err) {
    console.warn('Failed to show notification:', err);
    return false;
  }
}
