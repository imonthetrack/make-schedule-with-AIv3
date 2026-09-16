// src/services/notificationService.ts
import { startTabStrobeAlert } from '../utils/tabAlert';

/**
 * Check if the application is currently running inside an iframe (e.g. AI Studio Preview)
 */
export function isIframeEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * 1. Minta izin notifikasi ke pengguna (Web & PWA)
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.error('Browser ini tidak mendukung System Notification.');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (err) {
      console.warn('Gagal meminta izin notifikasi (mungkin dalam iframe):', err);
      return false;
    }
  }

  return false;
}

/**
 * 2. Fungsi utama untuk memicu Native OS Banner Mencolok di Desktop / Tab Lain / Lock Screen
 * Fitur:
 * - Large Graphic Banner (`image: '/alert-banner.svg'`)
 * - High-Contrast Icon
 * - Tab Title Strobe & Favicon Flash saat berada di tab lain
 * - Action Buttons: Buka, Tunda +15m, Tutup
 */
export async function triggerSystemNotification(
  title: string,
  body: string,
  options?: {
    icon?: string;
    badge?: string;
    image?: string;
    tag?: string;
    requireInteraction?: boolean;
    vibrate?: number[];
    data?: any;
    taskTitle?: string;
    time?: string;
  }
) {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    console.warn('Izin notifikasi tidak diberikan oleh pengguna.');
    return;
  }

  const isRest = (options?.tag && options.tag.includes('rest')) || title.toLowerCase().includes('istirahat');
  const icon = options?.icon || '/icon-192.svg';
  const badge = options?.badge || '/icon-192.svg';
  const image = options?.image || (isRest ? '/rest-banner.svg' : '/alert-banner.svg');
  const tag = options?.tag || 'jadwal-alert';
  const requireInteraction = options?.requireInteraction !== undefined ? options.requireInteraction : true;
  const vibrate = options?.vibrate || [400, 150, 400, 150, 600, 200, 800];

  // 🌟 Pemicu Tambahan: Tab Bar Strobe saat user membuka tab lain (misal YouTube)
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
    const strobeLabel = options?.taskTitle || title.replace(/[^a-zA-Z0-9 ]/g, '').trim();
    startTabStrobeAlert(strobeLabel, options?.time || '');
  }

  // 1. Kirim via Service Worker Registration (Paling andal & mendukung gambar banner lebar)
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration && 'showNotification' in registration) {
        await registration.showNotification(title, {
          body,
          icon,
          badge,
          image, // 🌟 Banner grafis mencolok di Windows & Android
          tag,
          requireInteraction, // Banner Windows/Android tidak akan hilang otomatis sebelum diklik/ditutup
          silent: false,
          vibrate,
          renotify: true,
          data: options?.data || { time: Date.now(), tag },
          actions: [
            { action: 'open_app', title: '⚡ Buka & Kerjakan' },
            { action: 'snooze_15m', title: '⏱️ Tunda +15m' },
            { action: 'dismiss', title: '❌ Tutup' },
          ],
        } as NotificationOptions);
        return;
      }
    } catch (err) {
      console.warn('Service Worker showNotification error, falling back to Web API:', err);
    }
  }

  // 2. Fallback ke Web Notification API biasa jika Service Worker belum siap
  try {
    const notif = new Notification(title, {
      body,
      icon,
      badge,
      image,
      tag,
      requireInteraction,
    } as NotificationOptions & { image?: string });

    notif.onclick = () => {
      window.focus();
      notif.close();
    };

    if (navigator.vibrate) {
      navigator.vibrate(vibrate);
    }
  } catch (err) {
    console.error('Error saat menampilkan fallback Web Notification:', err);
  }
}

/**
 * Safe helper to get active registration without hanging in iframes
 */
async function getActiveRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (isIframeEnvironment()) return null;
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 800)),
    ]);
  } catch {
    return null;
  }
}

/**
 * 3. Schedule Background Timer in Service Worker
 */
export async function scheduleBackgroundTimer(
  timerId: string,
  targetTimestamp: number,
  title: string,
  body: string,
  vibrate: number[] = [400, 150, 400, 150, 600, 200, 800]
) {
  try {
    const registration = await getActiveRegistration();
    if (registration && registration.active) {
      registration.active.postMessage({
        type: 'SCHEDULE_TIMER',
        timerId,
        targetTimestamp,
        title,
        body,
        vibrate,
        image: timerId.includes('rest') ? '/rest-banner.svg' : '/alert-banner.svg',
      });
      console.log(`[NotificationService] Scheduled SW timer for ${timerId}`);
    }
  } catch (err) {
    console.warn('Gagal menjadwalkan timer background di Service Worker:', err);
  }
}

/**
 * 4. Cancel Background Timer in Service Worker
 */
export async function cancelBackgroundTimer(timerId: string) {
  try {
    const registration = await getActiveRegistration();
    if (registration && registration.active) {
      registration.active.postMessage({
        type: 'CANCEL_TIMER',
        timerId,
      });
      console.log(`[NotificationService] Cancelled SW timer for ${timerId}`);
    }
  } catch (err) {
    console.warn('Gagal membatalkan timer background di Service Worker:', err);
  }
}

/**
 * 5. Sync Daily Schedule to Service Worker for Automatic Background Alerts
 */
export async function syncBackgroundTasks(schedules: Array<{ id: string; time: string; title: string; completed?: boolean }>) {
  try {
    const registration = await getActiveRegistration();
    if (registration && registration.active) {
      registration.active.postMessage({
        type: 'SCHEDULE_TASKS',
        schedules,
      });
    }
  } catch (err) {
    console.warn('Gagal sinkronisasi jadwal ke Service Worker:', err);
  }
}
