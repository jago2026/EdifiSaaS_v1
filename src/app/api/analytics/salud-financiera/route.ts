import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const edificioId = searchParams.get("edificioId");

  if (!edificioId) return NextResponse.json({ error: "Falta edificioId" }, { status: 400 });

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Índice de Liquidez (Último Control Diario)
    const { data: lastControl } = await supabase
      .from("control_diario")
      .select("disponibilidad_total_bs, disponibilidad_total_usd, egresos_bs, egresos_usd")
      .eq("edificio_id", edificioId)
      .order("fecha", { ascending: false })
      .limit(1)
      .single();

    // Obtener gastos del mes actual del balance
    const currentMonth = new Date().toISOString().substring(0, 7);
    const { data: balance } = await supabase
      .from("balances")
      .select("gastos_facturados")
      .eq("edificio_id", edificioId)
      .eq("mes", currentMonth)
      .single();

    const liquidez = lastControl && balance 
      ? (lastControl.disponibilidad_total_bs / (balance.gastos_facturados || 1))
      : 0;

    // 2. Efectividad de Cobranza (Pagos en primera semana)
    // Asumiremos que los recibos se emiten el día 1 de cada mes.
    // Buscamos pagos entre el día 1 y 7 del mes actual.
    const startOfMonth = `${currentMonth}-01`;
    const endOfFirstWeek = `${currentMonth}-07`;
    
    const { data: firstWeekPayments } = await supabase
      .from("movimientos_dia")
      .select("monto")
      .eq("edificio_id", edificioId)
      .eq("tipo", "ingreso")
      .gte("detectado_en", startOfMonth)
      .lte("detectado_en", endOfFirstWeek);

    const { data: building } = await supabase
        .from("edificios")
        .select("unidades")
        .eq("id", edificioId)
        .single();

    const aptosPagaronPrimeraSemana = firstWeekPayments?.length || 0;
    const efectividadCobranza = building?.unidades 
        ? (aptosPagaronPrimeraSemana / building.unidades) * 100 
        : 0;

    // 3. Día de Oro (Basado en los últimos 30 días de movimientos_dia)
    const { data: last30DaysMovements } = await supabase
        .from("movimientos_dia")
        .select("detectado_en, monto")
        .eq("edificio_id", edificioId)
        .eq("tipo", "ingreso")
        .order("detectado_en", { ascending: false })
        .limit(200);

    const daysOfWeek = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const statsByDay: Record<string, { count: number, total: number }> = {};
    
    last30DaysMovements?.forEach(m => {
        const day = new Date(m.detectado_en).getDay();
        const dayName = daysOfWeek[day];
        if (!statsByDay[dayName]) statsByDay[dayName] = { count: 0, total: 0 };
        statsByDay[dayName].count++;
        statsByDay[dayName].total += Number(m.monto);
    });

    let diaDeOro = { nombre: "-", total: 0 };
    Object.entries(statsByDay).forEach(([nombre, stats]) => {
        if (stats.total > diaDeOro.total) {
            diaDeOro = { nombre, total: stats.total };
        }
    });

    return NextResponse.json({
      liquidez: {
        valor: liquidez,
        disponibilidad: lastControl?.disponibilidad_total_bs || 0,
        gastos: balance?.gastos_facturados || 0
      },
      efectividad: {
        valor: efectividadCobranza,
        aptos: aptosPagaronPrimeraSemana,
        totalAptos: building?.unidades || 0
      },
      diaDeOro,
      statsByDay
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
