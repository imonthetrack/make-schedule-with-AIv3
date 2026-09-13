// src/utils/tabAlert.ts

/**
 * Tab Alert & Strobe Manager
 * Flashes the browser Tab title (e.g. 🚨 (1) WAKTUNYA NADI! ⏰ <-> ⚡ JADWAL KILAT)
 * and dynamically swaps the Favicon when the user is on another tab (e.g. YouTube).
 */

let originalTitle = typeof document !== 'undefined' ? document.title || 'Jadwal Kilat' : 'Jadwal Kilat';
let strobeInterval: number | null = null;
let isStrobeActive = false;

// Generate a glowing red alert favicon via Canvas
function createAlertFaviconDataUrl(): string {
  if (typeof document === 'undefined') return '';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Outer glow
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(16, 16, 15, 0, Math.PI * 2);
    ctx.fill();

    // Inner bright center
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(16, 16, 10, 0, Math.PI * 2);
    ctx.fill();

    // Exclamation mark
    ctx.fillStyle = '#7f1d1d';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', 16, 16);

    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
}

let defaultFaviconHref = '/icon-192.svg';

export function startTabStrobeAlert(taskTitle: string, time: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Save original title if not already active
  if (!isStrobeActive) {
    originalTitle = document.title || 'Jadwal Kilat & Rest Guard';
  }

  stopTabStrobeAlert(); // reset if already running
  isStrobeActive = true;

  const alertTitleA = `🚨 [WAKTUNYA: ${taskTitle.toUpperCase()}!] ⏰`;
  const alertTitleB = `⚡ (1) JADWAL KILAT - BUKA SEKARANG! ⚡`;
  let toggle = false;

  const alertFavicon = createAlertFaviconDataUrl();
  const faviconLink = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
  if (faviconLink && !faviconLink.dataset.originalHref) {
    faviconLink.dataset.originalHref = faviconLink.href;
  }

  // Flash every 700ms
  strobeInterval = window.setInterval(() => {
    toggle = !toggle;
    document.title = toggle ? alertTitleA : alertTitleB;

    if (faviconLink && alertFavicon) {
      faviconLink.href = toggle ? alertFavicon : (faviconLink.dataset.originalHref || defaultFaviconHref);
    }
  }, 700);

  // Stop strobe when user clicks/focuses back on this tab
  const handleWindowFocus = () => {
    stopTabStrobeAlert();
    window.removeEventListener('focus', handleWindowFocus);
    document.removeEventListener('visibilitychange', handleVisibility);
  };

  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      stopTabStrobeAlert();
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    }
  };

  window.addEventListener('focus', handleWindowFocus);
  document.addEventListener('visibilitychange', handleVisibility);
}

export function stopTabStrobeAlert() {
  if (strobeInterval !== null) {
    clearInterval(strobeInterval);
    strobeInterval = null;
  }
  isStrobeActive = false;

  if (typeof document !== 'undefined') {
    document.title = originalTitle;
    const faviconLink = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (faviconLink && faviconLink.dataset.originalHref) {
      faviconLink.href = faviconLink.dataset.originalHref;
    }
  }
}
