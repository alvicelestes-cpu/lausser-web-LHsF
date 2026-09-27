import { createClient } from '@supabase/supabase-js';

// Fallback hardcodeado directo para garantizar que la app siempre conecte a Supabase
const FALLBACK_SUPABASE_URL = 'https://qtffopcnvuggcolrdbqc.supabase.co';
const FALLBACK_SUPABASE_KEY = 'sb_publishable_WgGlaPitiuAalfWNUKWvhQ_iZqKe0D_';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
