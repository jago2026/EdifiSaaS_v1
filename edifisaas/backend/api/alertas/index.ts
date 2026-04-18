// backend/api/alertas/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const { buildingId } = req.query;
    const { data } = await supabase
      .from('alertas')
      .select('*')
      .eq('building_id', buildingId)
      .order('created_at', { ascending: false })
      .limit(20);
    return res.status(200).json(data);
  }

  if (req.method === 'PATCH') {
    const { id } = req.body;
    await supabase.from('alertas').update({ read: true }).eq('id', id);
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
