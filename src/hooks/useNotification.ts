import { useState, useEffect, useCallback } from 'react';
import {
  requestNotificationPermission,
  triggerSystemNotification,
  scheduleBackgroundTimer,
  cancelBackgroundTimer,
  syncBackgroundTasks,
  isIframeEnvironment,
} from '../services/notificationService';

export interface NotificationPayload {
  title: string;
  body?: string;
  tag?: string;
  icon?: string;
  image?: string;
  vibrate?: number[];
  requireInteraction?: boolean;
  data?: Record<string, any>;
}

export function useNotification() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isSwRegistered, setIsSwRegistered] = useState<boolean>(false);
  const [isInIframe, setIsInIframe] = useState<boolean>(false);

  // 1. Check support & register Service Worker on mount
  useEffect(() => {
    setIsInIframe(isIframeEnvironment());

    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported');
      return;
    }

    setPermission(Notification.permission);

    // Register Service Worker only in standalone/top-level window
    const inIframe = isIframeEnvironment();
    if (!inIframe && 'serviceWorker' in navigator) {
      try {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            setIsSwRegistered(true);
            console.log('[PWA] Service Worker ready on scope:', registration.scope);
          })
          .catch((error) => {
            console.warn('[PWA] Service Worker registration failed:', error);
          });

        // Listen to SW messages (e.g. when notification is clicked)
        const handleSwMessage = (event: MessageEvent) => {
          if (event.data && event.data.type === 'NOTIFICATION_CLICKED') {
            console.log('[PWA] Notification clicked by user:', event.data);
          }
        };

        navigator.serviceWorker.addEventListener('message', handleSwMessage);
        return () => {
          navigator.serviceWorker.removeEventListener('message', handleSwMessage);
        };
      } catch (err) {
        console.warn('[PWA] SW register exception caught:', err);
      }
    }
  }, []);

  // 2. Request Permission via User Gesture
  const requestPermission = useCallback(async (): Promise<boolean> => {
    const granted = await requestNotificationPermission();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
    if (granted) {
      triggerSystemNotification(
        '🔔 NOTIFIKASI JADWAL AKTIF!',
        'Alarm & pengingat kegiatan siap berbunyi di latar belakang, tab lain & lock screen.',
        {
          tag: 'welcome-notification',
          image: '/alert-banner.svg',
          vibrate: [200, 100, 200, 100, 400],
        }
      );
    }
    return granted;
  }, []);

  // 3. Send Instant Notification with large image banner
  const sendNotification = useCallback(
    async ({
      title,
      body = '',
      tag = 'jadwal-alert',
      icon = '/icon-192.svg',
      image = '/alert-banner.svg',
      vibrate = [400, 150, 400, 150, 600, 200, 800],
      requireInteraction = true,
    }: NotificationPayload): Promise<void> => {
      await triggerSystemNotification(title, body, {
        icon,
        image,
        tag,
        vibrate,
        requireInteraction,
      });
    },
    []
  );

  // Helper for schedule start alert (Bold, Eye-Catching Header + Image Banner)
  const sendScheduleAlert = useCallback(
    (taskTitle: string, time: string) => {
      return triggerSystemNotification(
        `🚨 WAKTUNYA: ${taskTitle.toUpperCase()}! ⏰`,
        `Jadwal pukul ${time} WIB siap dimulai. Buka Jadwal Kilat sekarang untuk mencatat progres!`,
        {
          tag: `task-${time}`,
          image: '/alert-banner.svg',
          taskTitle,
          time,
          vibrate: [400, 150, 400, 150, 600, 200, 800],
          requireInteraction: true,
        }
      );
    },
    []
  );

  // Helper for Rest Guard Timer finished (Bold Red Banner)
  const sendRestGuardAlarm = useCallback(
    (minutes: number) => {
      return triggerSystemNotification(
        `🚨 ALARM: ISTIRAHAT ${minutes} MENIT HABIS!`,
        'Kembali fokus ke kegiatan berikutnya untuk menjaga konsistensi streak harian Anda!',
        {
          tag: 'rest-guard-alarm',
          image: '/rest-banner.svg',
          vibrate: [400, 150, 400, 150, 600, 200, 800],
          requireInteraction: true,
        }
      );
    },
    []
  );

  // 4. Test 5-Second Background Pop-up (with Large Banner)
  const testBackgroundAlarm5s = useCallback(async () => {
    const granted = await requestPermission();
    if (!granted) {
      alert('Mohon izinkan Notifikasi Browser (Klik Allow) agar banner pop-up dapat muncul saat Anda membuka tab lain atau layar terkunci.');
      return;
    }

    const targetTime = Date.now() + 5000;
    await scheduleBackgroundTimer(
      'test-5s',
      targetTime,
      '🎉 UJI COBA BERHASIL: POP-UP MENCOLOK!',
      'Banner grafis besar ini berhasil menembus tab lain & layar terkunci (Lock Screen).',
      [400, 150, 400, 150, 600, 200, 800]
    );

    triggerSystemNotification(
      '⏳ Timer Uji Coba 5 Detik Berjalan',
      'Silakan beralih ke tab YouTube sekarang atau kunci layar. Pop-up besar akan muncul dalam 5 detik!',
      {
        tag: 'test-countdown-started',
        image: '/alert-banner.svg',
        requireInteraction: false,
      }
    );
  }, [requestPermission]);

  return {
    permission,
    isSupported: permission !== 'unsupported',
    isGranted: permission === 'granted',
    isServiceWorkerReady: isSwRegistered,
    isInIframe,
    requestPermission,
    sendNotification,
    sendScheduleAlert,
    sendRestGuardAlarm,
    testBackgroundAlarm5s,
    scheduleBackgroundTimer,
    cancelBackgroundTimer,
    syncBackgroundTasks,
  };
}

export {
  requestNotificationPermission,
  triggerSystemNotification,
  scheduleBackgroundTimer,
  cancelBackgroundTimer,
  syncBackgroundTasks,
  isIframeEnvironment,
};
