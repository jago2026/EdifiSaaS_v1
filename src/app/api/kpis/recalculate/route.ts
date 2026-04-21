import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

function normalizeMonth(mes: string | null | undefined): string {
  if (!mes) return "";
  const trimmed = mes.trim();
  if (/^\d{4}-\d{2}$/.test(trimmed)) return trimmed;
  const parts = trimmed.split(/[-/]/);
  if (parts.length !== 2) return trimmed;
  let monthPart = parts[0];
  let yearPart = parts[1];
  if (monthPart.length === 4) return `${monthPart}-${yearPart.padStart(2, "0")}`;
  const month = parseInt(monthPart, 10);
  if (month >= 1 && month <= 12) monthPart = month.toString().padStart(2, "0");
  return `${yearPart}-${monthPart}`;
}

export async function POST(request: Request) {
  try {
    const { edificioId } = await request.json();
    if (!edificioId) return NextResponse.json({ error: "Falta edificioId" }, { status: 400 });

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Obtener datos base
    const { data: building } = await supabase.from("edificios").select("unidades").eq("id", edificioId).single();
    const totalUnidades = building?.unidades || 1;

    const { data: balances } = await supabase.from("balances").select("*").eq("edificio_id", edificioId);
    const { data: tasas } = await supabase.from("tasas_cambio").select("*").order("fecha", { ascending: false });
    const { data: egresos } = await supabase.from("egresos").select("*").eq("edificio_id", edificioId);
    const { data: pagos } = await supabase.from("pagos_recibos").select("*").eq("edificio_id", edificioId);

    if (!balances) return NextResponse.json({ message: "No hay balances para procesar" });

    const results = [];

    for (const b of balances) {
      const mesNorm = normalizeMonth(b.mes);
      const mesCierreDate = `${mesNorm}-01`;
      
      // Tasa para el mes (última del mes o anterior)
      const tasaObj = tasas?.find(t => t.fecha <= `${mesNorm}-31`) || tasas?.[0];
      const tasa = tasaObj ? parseFloat(tasaObj.tasa_dolar) : 481.70;

      // Agrupar ingresos y egresos por mes
      const ingresosMes = (pagos || [])
        .filter(p => p.fecha_pago && p.fecha_pago.startsWith(mesNorm))
        .reduce((sum, p) => sum + parseFloat(p.monto || 0), 0);
      
      const egresosMes = (egresos || [])
        .filter(e => e.fecha && e.fecha.startsWith(mesNorm))
        .reduce((sum, e) => sum + parseFloat(e.monto || 0), 0);

      const ingresosUsd = ingresosMes / tasa;
      const egresosUsd = egresosMes / tasa;

      const kpiRow = {
        edificio_id: edificioId,
        mes_cierre: mesCierreDate,
        ingresos_totales_bs: ingresosMes,
        ingresos_totales_usd: ingresosUsd,
        egresos_totales_bs: egresosMes,
        egresos_totales_usd: egresosUsd,
        resultado_operativo_usd: ingresosUsd - egresosUsd,
        saldo_disponible_usd: (b.saldo_disponible || 0) / tasa,
        total_cuentas_por_cobrar_usd: (b.total_por_cobrar || 0) / tasa,
        total_fondos_reserva_usd: ((b.fondo_reserva || 0) + (b.fondo_intereses || 0) + (b.fondo_diferencial_cambiario || 0) + (b.fondo_prestaciones || 0) + (b.fondo_trabajos_varios || 0)) / tasa,
        f_reserva_usd: (b.fondo_reserva || 0) / tasa,
        f_intereses_usd: (b.fondo_intereses || 0) / tasa,
        f_diferencial_usd: (b.fondo_diferencial_cambiario || 0) / tasa,
        f_prestaciones_usd: (b.fondo_prestaciones || 0) / tasa,
        f_otros_fondos_usd: (b.fondo_trabajos_varios || 0) / tasa,
        efectividad_recaudacion_pct: b.recibos_mes ? (ingresosMes / b.recibos_mes) * 100 : 0,
        indice_morosidad_pct: b.recibos_mes ? ((b.total_por_cobrar || 0) / (b.recibos_mes * 2)) * 100 : 0,
        cobertura_gastos_pct: b.gastos_facturados ? (ingresosMes / Math.abs(b.gastos_facturados)) * 100 : 0,
        monto_recibo_promedio_usd: b.recibos_mes ? ((b.recibos_mes / tasa) / totalUnidades) : 0,
        tasa_bcv_cierre: tasa
      };

      // Upsert
      const { error: upsertError } = await supabase
        .from("indicadores_gestion")
        .upsert(kpiRow, { onConflict: "edificio_id,mes_cierre" });

      if (upsertError) console.error("Error upserting KPI:", upsertError);
      results.push(kpiRow);
    }

    return NextResponse.json({ message: "KPIs recalculados con éxito", count: results.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
