import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('saas_payments')
      .select('*, edificios(nombre)')
      .order('fecha_pago', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { edificio_id, fecha_pago, monto, moneda, metodo_pago, referencia, notas } = body;

    const { data, error } = await supabaseAdmin
      .from('saas_payments')
      .insert([{
        edificio_id,
        fecha_pago,
        monto,
        moneda: moneda || 'USD',
        metodo_pago,
        referencia,
        notas,
        verificado: true,
        created_by: 'admin'
      }])
      .select()
      .single();

    if (error) throw error;

    // Actualizar última fecha de pago en el edificio
    await supabaseAdmin
      .from('edificios')
      .update({ 
        last_payment_date: fecha_pago,
        last_payment_amount: monto,
        subscription_status: 'Activo'
      })
      .eq('id', edificio_id);

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
