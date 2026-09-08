import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://wcbzmpnvcjamlgljsksk.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjYnptcG52Y2phbWxnbGpza3NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjA2NjEsImV4cCI6MjA5NjU5NjY2MX0.Q_neXx3sFZG2TCvO3pHfSWJaDLvTI5o6i7dHGUkRl5M';

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_SUPABASE_URL) || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_SUPABASE_ANON_KEY) || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

