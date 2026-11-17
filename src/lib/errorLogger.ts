/**
 * سامانه مدیریت و ثبت خطاهای سامانه مزرعه بوقلمون
 * ذخیره‌سازی محلی ایمن، تفکیک پیام‌های مدیریتی به زبان فارسی و حذف داده‌های حساس
 */
import { useSyncExternalStore } from 'react';
import { today } from './jalali';

export interface ErrorLogEntry {
  id: string;
  timestamp: number;
  dateTimeJalali: string;
  section: string; // نام بخش معیوب (انبار، دیتابیس، تلفات، خوراک و ...)
  type: 'network' | 'database' | 'validation' | 'calculation' | 'security' | 'general';
  message: string; // شرح قابل فهم برای مدیر مزرعه
  probableCause: string; // علت احتمالی
  suggestedAction: string; // اقدام پیشنهادی برای رفع مشکل
  technicalDetails?: string; // اطلاعات فنی پالایش‌شده (بدون توکن و کلید)
}

const STORAGE_KEY = 'tf_system_error_logs_v1';
const MAX_LOGS = 100;

// فیلتر کردن اطلاعات حساس (رمز، کلید و توکن)
function sanitizeText(input: string): string {
  if (!input) return '';
  return input
    .replace(/eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, '[REDACTED_JWT_TOKEN]')
    .replace(/(bearer\s+)[a-zA-Z0-9_\-\.]+/gi, '$1[REDACTED]')
    .replace(/(key|password|secret|apikey|anon_key|token)[:=]\s*["']?[^"'\s,]+["']?/gi, '$1=[REDACTED]');
}

let memoryLogs: ErrorLogEntry[] = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
})();

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch {
      // نادیده گرفتن خطای شنوندگان
    }
  });
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryLogs.slice(0, MAX_LOGS)));
  } catch {
    // در صورت پر بودن حافظه
  }
}

export function logError(
  entry: Omit<ErrorLogEntry, 'id' | 'timestamp' | 'dateTimeJalali'> & {
    technicalDetails?: string;
  }
): ErrorLogEntry {
  const now = new Date();
  const dateStr = today();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  const cleanTech = entry.technicalDetails ? sanitizeText(entry.technicalDetails) : undefined;

  const newLog: ErrorLogEntry = {
    id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    dateTimeJalali: `${dateStr} ساعت ${timeStr}`,
    section: entry.section,
    type: entry.type,
    message: entry.message,
    probableCause: entry.probableCause,
    suggestedAction: entry.suggestedAction,
    technicalDetails: cleanTech,
  };

  memoryLogs = [newLog, ...memoryLogs].slice(0, MAX_LOGS);
  persist();
  notify();
  return newLog;
}

export function getErrorLogs(): ErrorLogEntry[] {
  return memoryLogs;
}

export function clearErrorLogs(): void {
  memoryLogs = [];
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    //
  }
  notify();
}

export function subscribeErrorLogs(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useErrorLogs(): ErrorLogEntry[] {
  return useSyncExternalStore(
    subscribeErrorLogs,
    () => memoryLogs,
    () => memoryLogs
  );
}

// گوش‌دادن خودکار به خطاهای پیش‌بینی نشده کلاینت
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (event.message?.includes('ResizeObserver') || event.message?.includes('Script error')) {
      return;
    }
    logError({
      section: 'رابط کاربری و اسکریپت',
      type: 'general',
      message: 'یک خطای سیستمی غیرمنتظره در مرورگر رخ داد.',
      probableCause: 'ناهماهنگی مرورگر یا خطای بارگذاری اسکریپت در دستگاه کاربر.',
      suggestedAction: 'صفحه را یک بار تازه‌سازی (Refresh) کنید؛ در صورت تکرار، کش مرورگر را پاک کنید.',
      technicalDetails: `${event.message} at ${event.filename}:${event.lineno}`,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reasonStr = String(event.reason?.message || event.reason || '');
    if (reasonStr.includes('Failed to fetch') || reasonStr.includes('NetworkError')) {
      logError({
        section: 'ارتباط با سرور / شبکه',
        type: 'network',
        message: 'ارتباط برنامه با سرور اینترنتی قطع شد یا با تأخیر مواجه گردید.',
        probableCause: 'قطعی موقت اینترنت کاربر، فیلترینگ یا کندی شبکه.',
        suggestedAction: 'اتصال اینترنت دستگاه خود را بررسی کنید. اطلاعات ورودی به محض اتصال مجدد ارسال خواهند شد.',
        technicalDetails: reasonStr,
      });
      return;
    }
    logError({
      section: 'پردازش پس‌زمینه پایگاه داده',
      type: 'database',
      message: 'یکی از فرآیندهای پس‌زمینه برنامه با خطا متوقف شد.',
      probableCause: 'عدم پاسخگویی سرویس پایگاه داده یا انقضای نشست کاری.',
      suggestedAction: 'وضعیت ورود و اتصال به پایگاه داده را در منوی تنظیمات کنترل فرمایید.',
      technicalDetails: reasonStr,
    });
  });
}
