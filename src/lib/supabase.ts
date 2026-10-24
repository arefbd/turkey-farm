/** کلاینت Supabase — پیکربندی از متغیرهای محیطی Vite با مقدار پیش‌فرض پروژه */
import { createClient } from '@supabase/supabase-js';

const FALLBACK_URL = 'https://uotuukldsyjerrqpkpsl.supabase.co';
const FALLBACK_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvdHV1a2xkc3lqZXJycXBrcHNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4NjE0MzAsImV4cCI6MjEwODQzNzQzMH0.w1mWnmHH1wr-SPF6g7uwBJPwKurXne5jR_9Rq0evVyk';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
