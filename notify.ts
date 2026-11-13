export type NotifySupport = 'unsupported' | 'default' | 'granted' | 'denied';

export function notificationSupport(): NotifySupport {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission as NotifySupport;
}

/** فقط با کلیک کاربر فراخوانی شود. */
export async function requestNotificationPermission(): Promise<NotifySupport> {
  if (notificationSupport() === 'unsupported') return 'unsupported';
  try {
    return (await Notification.requestPermission()) as NotifySupport;
  } catch {
    return notificationSupport();
  }
}

/** اعلان مرورگر فقط وقتی برنامه باز است و مجوز داده شده؛ اعلان پس‌زمینه (Push) پیاده‌سازی نشده است. */
export function notifyBrowser(title: string, body: string): void {
  if (notificationSupport() !== 'granted') return;
  try {
    new Notification(title, { body, icon: '/icons/icon-192.png', lang: 'fa', dir: 'rtl' });
  } catch {
    /* برخی مرورگرهای موبایل سازنده‌ی Notification را مسدود می‌کنند */
  }
}
