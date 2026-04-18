// backend/api/dashboard/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { buildingId } = req.query;

  // Saldo actual
  const { data: balance } = await supabase
    .from('historial_balance')
    .select('saldo, fecha')
    .eq('building_id', buildingId)
    .order('fecha', { ascending: false })
    .limit(1)
    .single();

  // Nuevos recibos
  const { count: countReceipts } = await supabase
    .from('historial_recibos')
    .select('*', { count: 'exact', head: true })
    .eq('building_id', buildingId)
    .eq('is_new', true);

  // Nuevos egresos
  const { count: countExpenses } = await supabase
    .from('historial_egresos')
    .select('*', { count: 'exact', head: true })
    .eq('building_id', buildingId)
    .eq('is_new', true);

  res.status(200).json({
    saldoActual: balance?.saldo || 0,
    newMovements: (countReceipts || 0) + (countExpenses || 0),
    lastSync: balance?.fecha || null
  });
}
