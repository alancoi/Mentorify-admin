import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nufnlvalalandxodgcpr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_qfqNxB63q60T-u-p3UlLoA_yCH9i0PS';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
