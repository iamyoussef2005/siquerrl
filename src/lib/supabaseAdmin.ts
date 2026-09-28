import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pnjqltmeygtlelrkmbdq.supabase.co';

// Hardcoded fallback to the genuine Supabase service_role key so RLS is ALWAYS bypassed on the server
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuanFsdG1leWd0bGVscmttYmRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTY2MTcwMywiZXhwIjoyMTA1MjM3NzAzfQ.PNm-TOwlPfVdOzln8RDr0nj4au_gKdr-UoUopi9LapE';

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
