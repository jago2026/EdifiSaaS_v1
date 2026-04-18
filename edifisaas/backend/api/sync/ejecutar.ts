// backend/api/sync/ejecutar.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ejecutarSync } from '../../lib/services/syncService.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { buildingId } = req.body;
    if (!buildingId) {
      return res.status(400).json({ error: 'buildingId is required' });
    }

    const result = await ejecutarSync(buildingId);
    res.status(200).json(result);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
