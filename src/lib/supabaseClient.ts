import { createClient } from '@supabase/supabase-js';

// URL base do projeto no Supabase
export const SUPABASE_URL = 'https://wcbzmpnvcjamlgljsksk.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjYnptcG52Y2phbWxnbGpza3NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjA2NjEsImV4cCI6MjA5NjU5NjY2MX0.Q_neXx3sFZG2TCvO3pHfSWJaDLvTI5o6i7dHGUkRl5M';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
