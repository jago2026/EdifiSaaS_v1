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
    // Obtener historial de disponibilidad y flujos de los últimos 180 días
    const { data: history, error } = await supabase
      .from("control_diario")
      .select("fecha, disponibilidad_total_usd, ingresos_usd, egresos_usd")
      .eq("edificio_id", edificioId)
      .order("fecha", { ascending: false })
      .limit(180);

    if (error) throw error;

    if (!history || history.length === 0) {
        return NextResponse.json({ error: "No hay historial suficiente" }, { status: 404 });
    }

    const currentDisponibilidadUsd = history[0].disponibilidad_total_usd;

    // Calcular excedente mensual promedio
    // Agrupamos por mes
    const monthlyStats: Record<string, { ingresos: number, egresos: number }> = {};
    history.forEach(h => {
        const month = h.fecha.substring(0, 7);
        if (!monthlyStats[month]) monthlyStats[month] = { ingresos: 0, egresos: 0 };
        monthlyStats[month].ingresos += Number(h.ingresos_usd || 0);
        monthlyStats[month].egresos += Number(h.egresos_usd || 0);
    });

    const excedentes = Object.values(monthlyStats).map(m => m.ingresos - m.egresos);
    const excedentePromedioUsd = excedentes.reduce((sum, val) => sum + val, 0) / excedentes.length;

    // Fondo de Reserva (Asumimos 10% de la disponibilidad actual o buscamos en balances)
    const { data: balance } = await supabase
        .from("balances")
        .select("fondo_reserva_usd")
        .eq("edificio_id", edificioId)
        .order("mes", { ascending: false })
        .limit(1)
        .single();

    const fondoReservaUsd = balance?.fondo_reserva_usd || 0;
    const disponibleSinReservaUsd = Math.max(0, currentDisponibilidadUsd - fondoReservaUsd);

    return NextResponse.json({
      disponibilidadActualUsd: currentDisponibilidadUsd,
      fondoReservaUsd,
      disponibleParaInvertirUsd: disponibleSinReservaUsd,
      excedentePromedioUsd,
      historial: history.slice(0, 30).reverse() // Últimos 30 días para gráfico
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
