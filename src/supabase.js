import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nufnlvalalandxodgcpr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51Zm5sdmFsYWxhbmR4b2RnY3ByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Nzk0MDksImV4cCI6MjA5NjI1NTQwOX0.sb_publishable_qfqNxB63q60T-u-p3UlLoA_yCH9i0PS';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
