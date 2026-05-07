import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";


export async function GET() {
  try {
    
    const demoUserId = '00000000-0000-0000-0000-000000000000';
    let demoBuildingId;

    let { data: bldg } = await supabase.from('edificios').select('*').eq('usuario_id', demoUserId).single();
    if (!bldg) {
      const { data: newBldg, error } = await supabase.from('edificios').insert({
        usuario_id: demoUserId,
        codigo_edificio: 'DEMO-123',
        nombre: 'Edificio Residencial Demo',
        direccion: 'Avenida Principal Demo',
        unidades: 20,
        admin_nombre: 'Demo Admin'
      }).select().single();
      if (error) return NextResponse.json({ error: error.message });
      bldg = newBldg;
    }
    demoBuildingId = bldg.id;

    const { data: indicators } = await supabase.from('control_diario').select('id').eq('edificio_id', demoBuildingId);
    if (!indicators || indicators.length < 5) {
      const now = new Date();
      for (let i = 0; i < 30; i++) {
         const d = new Date(now);
         d.setDate(d.getDate() - i);
         await supabase.from('control_diario').upsert({
           edificio_id: demoBuildingId,
           fecha: d.toISOString().split('T')[0],
           saldo_banco_bs: 10000 + (Math.random() * 5000),
           saldo_caja_usd: 500 + (Math.random() * 100),
           reserva_usd: 1500,
           ingresos_usd: Math.random() * 200,
           egresos_usd: Math.random() * 100,
           dif_cambiaria_usd: Math.random() * -10,
           int_mora_usd: Math.random() * 20,
           monto_recibos_pendientes_usd: 2000 + (Math.random() * 500),
           cantidad_recibos_pendientes: 40 + Math.floor(Math.random() * 10),
           morosidad_dias: 45
         });
      }
    }

    const { data: balances } = await supabase.from('balances').select('id').eq('edificio_id', demoBuildingId);
    if (!balances || balances.length === 0) {
      await supabase.from('balances').upsert({
         edificio_id: demoBuildingId,
         mes: '04-2026',
         saldo_disponible: 45000,
         cobranza_mes: 35000,
         gastos_facturados: 25000,
         recibos_mes: 20
      });
    }

    const { data: alicuotas } = await supabase.from('alicuotas').select('id').eq('edificio_id', demoBuildingId);
    if (!alicuotas || alicuotas.length === 0) {
       const dummyAlicuotas = Array.from({length: 20}).map((_, i) => ({
          edificio_id: demoBuildingId,
          unidad: `Apt ${i+1}`,
          propietario: `Propietario Demo ${i+1}`,
          alicuota: 5.0,
          hash: `demo_${i}_ali`,
          saldo_pendiente: Math.random() > 0.5 ? 100 : 0,
          meses_mora: Math.random() > 0.5 ? 2 : 0
       }));
       await supabase.from('alicuotas').insert(dummyAlicuotas);
    }
    
    // Add fake movement data
    const { data: movimientos } = await supabase.from('movimientos').select('id').eq('edificio_id', demoBuildingId);
    if (!movimientos || movimientos.length === 0) {
       const dummyMovimientos = Array.from({length: 15}).map((_, i) => {
         const now = new Date();
         now.setDate(now.getDate() - i);
         return {
          edificio_id: demoBuildingId,
          hash: `demo_mov_${i}`,
          fecha: now.toISOString().split('T')[0],
          monto: Math.random() > 0.5 ? 100 : -100,
          monto_usd: Math.random() > 0.5 ? 50 : -50,
          descripcion: `Movimiento Demo ${i+1}`,
          referencia: `REF-${i+1000}`
         };
       });
       await supabase.from('movimientos').insert(dummyMovimientos);
    }

    return NextResponse.json({ success: true, demoBuildingId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
