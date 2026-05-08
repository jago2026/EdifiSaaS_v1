import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    // 1. Conteo de edificios por plan
    const { data: edificios, error: bError } = await supabaseAdmin
      .from('edificios')
      .select('id, plan, status, subscription_status, unidades, created_at');

    if (bError) throw bError;

    const totalEdificios = edificios.length;
    const statsPlanes: Record<string, number> = {};
    const statsStatus: Record<string, number> = {};
    let totalUnidades = 0;

    edificios.forEach(b => {
      const p = b.plan || 'Esencial';
      statsPlanes[p] = (statsPlanes[p] || 0) + 1;
      
      const s = b.subscription_status || 'Prueba';
      statsStatus[s] = (statsStatus[s] || 0) + 1;

      totalUnidades += (b.unidades || 0);
    });

    // 2. Ingresos totales (Pagos SaaS)
    const { data: pagos, error: pError } = await supabaseAdmin
      .from('saas_payments')
      .select('monto');

    if (pError) throw pError;

    const totalIngresos = pagos.reduce((acc, p) => acc + (p.monto || 0), 0);

    // 3. Últimos 10 movimientos de auditoría
    const { data: audit, error: aError } = await supabaseAdmin
      .from('audit_logs')
      .select('*, edificios(nombre)')
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      totalEdificios,
      totalUnidades,
      totalIngresos,
      statsPlanes,
      statsStatus,
      recentAudit: audit || []
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
