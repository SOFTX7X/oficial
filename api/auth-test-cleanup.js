import { createClient } from '@supabase/supabase-js';

const CLEANUP_TOKEN = 'vx-cleanup-8f29a11c6d4e47db9c3143c7';
const TEST_EMAIL = 'arllison001@gmail.com';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.URL_SUPABASE || 'https://wyjrjioipqfltdyupfna.supabase.co';
const ADMIN_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'POST' || req.headers['x-cleanup-token'] !== CLEANUP_TOKEN) {
    return res.status(404).json({ error: 'Not found' });
  }
  if (!ADMIN_KEY) return res.status(503).json({ error: 'Admin unavailable' });

  const admin = createClient(SUPABASE_URL, ADMIN_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return res.status(500).json({ error: 'Lookup failed' });
    const users = Array.isArray(data?.users) ? data.users : [];
    const user = users.find(item => String(item.email || '').toLowerCase() === TEST_EMAIL);
    if (user) {
      const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
      if (deleteError) return res.status(500).json({ error: 'Delete failed' });
      return res.status(200).json({ deleted: true });
    }
    if (users.length < 1000) break;
  }
  return res.status(200).json({ deleted: false });
}
