// backend/api/sync/balance.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { buildingId } = req.query;

  const { data, error } = await supabase
    .from('historial_balance')
    .select('*')
    .eq('building_id', buildingId)
    .order('fecha', { ascending: false })
    .limit(12);

  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json(data);
}
