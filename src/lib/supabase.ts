import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pnjqltmeygtlelrkmbdq.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuanFsdG1leWd0bGVscmttYmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NjE3MDMsImV4cCI6MjEwNTIzNzcwM30.2eRGQcEXzDgQVM9OluiFjbcVp18Iq0o4huORK9xuG48';

export const isSupabaseConfigured = true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

