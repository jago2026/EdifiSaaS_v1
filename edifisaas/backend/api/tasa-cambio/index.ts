// backend/api/tasa-cambio/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const { data } = await supabase
      .from('tasa_cambio')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(30);
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { fecha, tasa_bcv } = req.body;
    const { error } = await supabase
      .from('tasa_cambio')
      .upsert({ fecha, tasa_bcv });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
