/**
 * make-schedule-with-AI - Service Worker
 * Handles High-Impact Background Notifications (with Large Image Banners & Rich Actions),
 * Scheduled Timers (Drift-free OS Pop-ups on Other Tabs/Lock Screen), and Tab Focus.
 */

const CACHE_NAME = 'jadwal-kilat-pwa-v5';
const PRECACHE_ASSETS = [
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg',
  './alert-banner.svg',
  './rest-banner.svg',
];

// Active Background Timers Queue (Runs in Service Worker Thread independently of DOM throttling)
const activeTimers = new Map();

// 1. Install Event: Precache static icons and skip waiting immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Precache warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Delete all old caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Only cache static icons & manifest, NEVER intercept HTML or scripts
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Always bypass Service Worker for navigation (HTML), Vite scripts, and API calls
  if (
    event.request.mode === 'navigate' ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/src') ||
    url.pathname.startsWith('/@') ||
    url.pathname.includes('node_modules') ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.tsx') ||
    url.pathname.endsWith('.ts') ||
    url.pathname.endsWith('.js')
  ) {
    return;
  }

  // Cache static image & manifest assets only
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        return cachedResponse;
      });
    })
  );
});

/**
 * Trigger High-Impact Native OS System Notification via Service Worker Registration
 * Includes: Large Banner Image, High-Contrast Icon, Strong Haptic Pattern, and Rich Actions
 */
function triggerNotification(title, body, tag, vibrate, options = {}) {
  const isRestGuard = tag && tag.includes('rest');
  const bannerImage = options.image || (isRestGuard ? '/rest-banner.svg' : '/alert-banner.svg');

  const notificationOptions = {
    body: body || 'Pemberitahuan dari Jadwal Kilat',
    icon: options.icon || '/icon-192.svg',
    badge: options.badge || '/icon-192.svg',
    image: bannerImage, // 🌟 MENCOLOK: Renders a large wide banner card in Windows & Android
    tag: tag || 'jadwal-alert',
    vibrate: vibrate || [400, 150, 400, 150, 600, 200, 800],
    requireInteraction: true, // Crucial: Banner stays visible until dismissed by user
    renotify: true,
    data: options.data || { time: Date.now(), tag, title },
    actions: [
      { action: 'open_app', title: '⚡ Buka & Kerjakan' },
      { action: 'snooze_15m', title: '⏱️ Tunda +15m' },
      { action: 'dismiss', title: '❌ Tutup' }
    ]
  };

  return self.registration.showNotification(title || '🚨 ALARM JADWAL KILAT', notificationOptions);
}

// 4. Message Handler for Direct Notifications & Background Scheduled Timers
self.addEventListener('message', (event) => {
  if (!event.data || !event.data.type) return;

  const { type, title, body, tag, vibrate, targetTimestamp, timerId, schedules, image } = event.data;

  // A. Instant Notification Trigger
  if (type === 'SHOW_NOTIFICATION') {
    event.waitUntil(
      triggerNotification(title, body, tag, vibrate, { image, data: event.data })
    );
  }

  // B. Schedule Background Timer (Runs even when tab is backgrounded / minimized / lock screen)
  if (type === 'SCHEDULE_TIMER') {
    if (!targetTimestamp || !timerId) return;

    // Clear existing timer if any
    if (activeTimers.has(timerId)) {
      clearTimeout(activeTimers.get(timerId));
      activeTimers.delete(timerId);
    }

    const delayMs = Math.max(0, targetTimestamp - Date.now());
    console.log(`[ServiceWorker] Scheduling background timer "${timerId}" in ${Math.round(delayMs / 1000)}s`);

    const timeoutId = setTimeout(() => {
      activeTimers.delete(timerId);
      console.log(`[ServiceWorker] Background timer "${timerId}" expired. Showing Rich OS Notification!`);

      triggerNotification(
        title || '🚨 ALARM: WAKTU ISTIRAHAT HABIS!',
        body || 'Waktu hitung mundur Anda telah selesai. Segera kembali fokus ke kegiatan berikutnya!',
        timerId,
        vibrate || [400, 150, 400, 150, 600, 200, 800],
        { image: '/rest-banner.svg' }
      );

      // Broadcast to open clients if tab wakes up
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'TIMER_EXPIRED',
            timerId,
            title,
          });
        });
      });
    }, delayMs);

    activeTimers.set(timerId, timeoutId);
  }

  // C. Cancel Scheduled Background Timer
  if (type === 'CANCEL_TIMER') {
    if (timerId && activeTimers.has(timerId)) {
      clearTimeout(activeTimers.get(timerId));
      activeTimers.delete(timerId);
      console.log(`[ServiceWorker] Cancelled background timer "${timerId}"`);
    }
  }

  // D. Batch Schedule Daily Tasks
  if (type === 'SCHEDULE_TASKS' && Array.isArray(schedules)) {
    // Clear old task timers
    for (const [key, id] of activeTimers.entries()) {
      if (key.startsWith('task-')) {
        clearTimeout(id);
        activeTimers.delete(key);
      }
    }

    const now = new Date();
    schedules.forEach((task) => {
      if (task.completed || !task.time) return;

      const [hours, minutes] = task.time.split(':').map(Number);
      const targetDate = new Date();
      targetDate.setHours(hours, minutes, 0, 0);

      const delayMs = targetDate.getTime() - now.getTime();
      // If task is in the future today (or within next 24 hours)
      if (delayMs > 0) {
        const taskId = `task-${task.id}-${task.time}`;
        const timeoutId = setTimeout(() => {
          activeTimers.delete(taskId);
          triggerNotification(
            `🚨 WAKTUNYA: ${task.title.toUpperCase()}! ⏰`,
            `Jadwal pukul ${task.time} WIB siap dimulai. Buka Jadwal Kilat sekarang untuk mencatat progres!`,
            taskId,
            [400, 150, 400, 150, 600, 200, 800],
            { image: '/alert-banner.svg', data: { taskId: task.id, title: task.title, time: task.time } }
          );

          // Broadcast to client tabs
          self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            clients.forEach((client) => {
              client.postMessage({
                type: 'TASK_ALERT_TRIGGERED',
                task,
              });
            });
          });
        }, delayMs);

        activeTimers.set(taskId, timeoutId);
      }
    });
  }
});

// 5. Notification Click Action Handler: Focus or Open Window & Handle Action Buttons
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const notifData = event.notification.data || {};

  if (action === 'dismiss') {
    return;
  }

  // If user clicked "Snooze / Tunda +15m"
  if (action === 'snooze_15m') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url && 'postMessage' in client) {
            client.postMessage({
              type: 'SNOOZE_TASK_15M',
              data: notifData,
            });
          }
        }
      })
    );
    return;
  }

  // Open / focus client window
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            tag: event.notification.tag,
            data: notifData,
          });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
