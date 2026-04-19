import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

function normalizeMonth(mes: string | null | undefined): string {
  if (!mes) return "";
  const trimmed = mes.trim();
  
  // If already YYYY-MM, return it
  if (/^\d{4}-\d{2}$/.test(trimmed)) return trimmed;

  const parts = trimmed.split(/[-/]/);
  if (parts.length !== 2) return trimmed;
  
  let monthPart = parts[0];
  let yearPart = parts[1];
  
  // If first part is 4 digits, assume it's YYYY-MM
  if (monthPart.length === 4) {
    return `${monthPart}-${yearPart.padStart(2, "0")}`;
  }

  const month = parseInt(monthPart, 10);
  if (month >= 1 && month <= 12) {
    monthPart = month.toString().padStart(2, "0");
  }
  return `${yearPart}-${monthPart}`;
}

function formatLabel(mes: string | null | undefined): string {
  if (!mes) return "";
  const normalized = normalizeMonth(mes);
  if (!normalized) return "";
  const [year, month] = normalized.split("-");
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const monthIndex = parseInt(month, 10) - 1;
  if (monthIndex >= 0 && monthIndex <= 11) {
    return `${monthNames[monthIndex]} ${year}`;
  }
  return mes;
}

async function logTasaWarning(supabase: any, edificioId: string, targetDate: string, tasa: number, tasaDate: string | null) {
  try {
    const formatDate = (dateStr: string) => {
      const [year, month, day] = dateStr.split("-");
      return `${day}/${month}/${year}`;
    };

    const targetFormatted = formatDate(targetDate);
    const tasaDateFormatted = tasaDate ? formatDate(tasaDate) : "N/A";

    await supabase.from("alertas").insert({
      edificio_id: edificioId,
      tipo: "warning",
      titulo: `Tasa Estimada para ${targetFormatted}`,
      descripcion: `No se encontró tasa BCV para ${targetFormatted}. Se está usando una tasa de Bs. ${tasa} de fecha ${tasaDateFormatted} para los cálculos de USD.`,
      fecha: new Date().toISOString().split('T')[0]
    });
  } catch (e) {
    console.error("Error logging tasa warning:", e);
  }
}

function getTasaBCVParaFecha(fechaStr: string, tasasHistoricas: any[]): { tasa: number, fecha: string | null } {
  if (!tasasHistoricas || tasasHistoricas.length === 0) return { tasa: 45, fecha: null };

  // Try to find exact rate for that day
  const exact = tasasHistoricas.find((t: any) => t.fecha === fechaStr);
  if (exact) return { tasa: parseFloat(exact.tasa_dolar), fecha: exact.fecha };

  // Fallback: Find closest rate BEFORE that day
  const fallbackTasa = tasasHistoricas.find((t: any) => t.fecha && t.fecha < fechaStr);
  if (fallbackTasa) return { tasa: parseFloat(fallbackTasa.tasa_dolar), fecha: fallbackTasa.fecha };

  // Ultimate fallback: Use the most recent rate we have
  return { tasa: parseFloat(tasasHistoricas[0]?.tasa_dolar || "45"), fecha: tasasHistoricas[0]?.fecha || null };
}

function getTasaBCVParaMes(mes: string, tasasHistoricas: any[]): number {
  if (!tasasHistoricas || tasasHistoricas.length === 0) return 45;
  const normalized = normalizeMonth(mes);
  if (!normalized) return parseFloat(tasasHistoricas[0]?.tasa_dolar || "45");
  
  const [year, month] = normalized.split("-");
  const prefix = `${year}-${month}`;
  
  // Find all rates for that month and sort by date descending to get the last day available
  const ratesOfMonth = tasasHistoricas
    .filter((t: any) => t.fecha && t.fecha.startsWith(prefix))
    .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  
  if (ratesOfMonth.length > 0) return parseFloat(ratesOfMonth[0].tasa_dolar);

  // Fallback: Find closest rate BEFORE that month
  const fallbackTasa = tasasHistoricas
    .filter((t: any) => t.fecha && t.fecha < `${prefix}-01`)
    .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
    
  if (fallbackTasa.length > 0) return parseFloat(fallbackTasa[0].tasa_dolar);

  // Ultimate fallback: Use the most recent rate we have
  return parseFloat(tasasHistoricas[0]?.tasa_dolar || "45");
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const edificioId = searchParams.get("edificioId");

    if (!edificioId) {
      return NextResponse.json({ error: "Falta edificioId" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get more rates to ensure we reach 2025
    const { data: tasasHistoricas } = await supabase
      .from("tasas_cambio")
      .select("fecha, tasa_dolar")
      .order("fecha", { ascending: false })
      .limit(1000);

    const { data: egresos } = await supabase
      .from("egresos")
      .select("fecha, monto, mes, descripcion")
      .eq("edificio_id", edificioId)
      .not("fecha", "eq", "2099-12-31")
      .not("descripcion", "ilike", "%TOTAL%")
      .order("fecha", { ascending: true });

    const { data: gastos } = await supabase
      .from("gastos")
      .select("fecha, monto, mes, descripcion")
      .eq("edificio_id", edificioId)
      .not("codigo", "eq", "TOTAL")
      .not("codigo", "eq", "RESERVA")
      .not("descripcion", "ilike", "%TOTAL%")
      .order("fecha", { ascending: true });

    const { data: balances } = await supabase
      .from("balances")
      .select("mes, fecha, saldo_disponible, cobranza_mes, gastos_facturados, fondo_reserva, total_por_cobrar, fondo_prestaciones, fondo_trabajos_varios, fondo_intereses, fondo_diferencial_cambiario, saldo_anterior, recibos_mes")
      .eq("edificio_id", edificioId)
      .order("mes", { ascending: true });

    const { data: movimientos } = await supabase
      .from("movimientos_manual")
      .select("fecha_corte, saldo_final, saldo_final_usd, saldo_segun_administradora, comparado")
      .eq("edificio_id", edificioId)
      .order("fecha_corte", { ascending: true });

    const { data: recibos } = await supabase
      .from("recibos")
      .select("unidad, deuda, num_recibos")
      .eq("edificio_id", edificioId);

    const { data: alicuotas } = await supabase
      .from("alicuotas")
      .select("unidad, alicuota")
      .eq("edificio_id", edificioId);

    const { data: pagos } = await supabase
      .from("pagos_recibos")
      .select("fecha_pago, monto")
      .eq("edificio_id", edificioId)
      .order("fecha_pago", { ascending: true });

    const getTasaForMonth = (mes: string) => getTasaBCVParaMes(mes, tasasHistoricas || []);

    // Daily cash flow (pagos vs egresos)
    const dailyFlow: any = {};
    (pagos || []).forEach((p: any) => {
      const f = p.fecha_pago;
      if (!f) return;
      if (!dailyFlow[f]) dailyFlow[f] = { fecha: f, ingresos: 0, egresos: 0 };
      dailyFlow[f].ingresos += parseFloat(p.monto || 0);
    });
    (egresos || []).forEach((e: any) => {
      const f = e.fecha;
      if (!f) return;
      if (!dailyFlow[f]) dailyFlow[f] = { fecha: f, ingresos: 0, egresos: 0 };
      dailyFlow[f].egresos += parseFloat(e.monto || 0);
    });

    const cashFlowData = Object.values(dailyFlow).sort((a: any, b: any) => a.fecha.localeCompare(b.fecha));

    const balancesWithLabel = (balances || []).map((b: any) => {
      const normalized = normalizeMonth(b.mes);
      const tasa = getTasaBCVParaMes(b.mes, tasasHistoricas || []);

      return {
        ...b,
        mes_normalizado: normalized,
        label: formatLabel(b.mes),
        saldo_disponible: b.saldo_disponible || 0,
        saldo_disponible_usd: tasa > 0 ? (b.saldo_disponible || 0) / tasa : 0,
        cobranza_mes: b.cobranza_mes || 0,
        cobranza_mes_usd: tasa > 0 ? (b.cobranza_mes || 0) / tasa : 0,
        gastos_facturados: b.gastos_facturados || 0,
        gastos_facturados_usd: tasa > 0 ? Math.abs(b.gastos_facturados || 0) / tasa : 0,
        fondo_reserva: b.fondo_reserva || 0,
        fondo_reserva_usd: tasa > 0 ? (b.fondo_reserva || 0) / tasa : 0,
        fondo_prestaciones: b.fondo_prestaciones || 0,
        fondo_prestaciones_usd: tasa > 0 ? (b.fondo_prestaciones || 0) / tasa : 0,
        fondo_trabajos_varios: b.fondo_trabajos_varios || 0,
        fondo_trabajos_varios_usd: tasa > 0 ? (b.fondo_trabajos_varios || 0) / tasa : 0,
        fondo_intereses: b.fondo_intereses || 0,
        fondo_intereses_usd: tasa > 0 ? (b.fondo_intereses || 0) / tasa : 0,
        fondo_diferencial_cambiario: b.fondo_diferencial_cambiario || 0,
        fondo_diferencial_cambiario_usd: tasa > 0 ? (b.fondo_diferencial_cambiario || 0) / tasa : 0,
        saldo_anterior: b.saldo_anterior || 0,
        saldo_anterior_usd: tasa > 0 ? (b.saldo_anterior || 0) / tasa : 0,
        total_por_cobrar: b.total_por_cobrar || 0,
        total_por_cobrar_usd: tasa > 0 ? (b.total_por_cobrar || 0) / tasa : 0,
        recibos_mes: b.recibos_mes || 0,
        recibos_mes_usd: tasa > 0 ? (b.recibos_mes || 0) / tasa : 0,
        tasa_bcv: tasa,
        efectividad_recaudacion: b.recibos_mes ? ((b.cobranza_mes || 0) / b.recibos_mes) * 100 : 0,
        indice_morosidad: b.total_por_cobrar && b.recibos_mes ? ((b.total_por_cobrar || 0) / ((b.recibos_mes || 0)*2)) * 100 : 0, // Estimación basada en recibos promedio
        cobertura_gastos: b.gastos_facturados ? ((b.cobranza_mes || 0) / Math.abs(b.gastos_facturados)) * 100 : 0,
      };
    }).sort((a, b) => (a.mes_normalizado || "").localeCompare(b.mes_normalizado || ""));

    const egresosAgrupados = (egresos || []).reduce((acc: any, e: any) => {
      const mesNorm = normalizeMonth(e.mes);
      const tasa = getTasaForMonth(e.mes);
      if (!acc[mesNorm]) {
        acc[mesNorm] = { mes: mesNorm, label: formatLabel(e.mes), monto: 0, monto_usd: 0, cantidad: 0 };
      }
      const montoBs = parseFloat(e.monto || 0);
      acc[mesNorm].monto += montoBs;
      acc[mesNorm].monto_usd += tasa > 0 ? montoBs / tasa : 0;
      acc[mesNorm].cantidad += 1;
      return acc;
    }, {});

    const gastosAgrupados = (gastos || []).reduce((acc: any, g: any) => {
      const mesNorm = normalizeMonth(g.mes);
      const tasa = getTasaForMonth(g.mes);
      if (!acc[mesNorm]) {
        acc[mesNorm] = { mes: mesNorm, label: formatLabel(g.mes), monto: 0, monto_usd: 0, cantidad: 0 };
      }
      const montoBs = parseFloat(g.monto || 0);
      acc[mesNorm].monto += montoBs;
      acc[mesNorm].monto_usd += tasa > 0 ? Math.abs(montoBs) / tasa : 0;
      acc[mesNorm].cantidad += 1;
      return acc;
    }, {});

    const currentTasa = tasasHistoricas && tasasHistoricas.length > 0 ? parseFloat(tasasHistoricas[0].tasa_dolar) : 45;
    const deudaTotal = (recibos || []).reduce((sum, r: any) => sum + parseFloat(r.deuda || 0), 0);
    const deudaTotalUsd = (recibos || []).reduce((sum, r: any) => {
      return sum + (parseFloat(r.deuda || 0) / currentTasa);
    }, 0);
    const unidadesCount = alicuotas?.length || 0;
    const alicuotaPromedio = unidadesCount > 0 
      ? (alicuotas || []).reduce((sum, a: any) => sum + parseFloat(a.alicuota || 0), 0) / unidadesCount 
      : 0;

    return NextResponse.json({
      egresos: Object.values(egresosAgrupados).sort((a: any, b: any) => a.mes.localeCompare(b.mes)),
      gastos: Object.values(gastosAgrupados).sort((a: any, b: any) => a.mes.localeCompare(b.mes)),
      balances: balancesWithLabel,
      movimientos: movimientos || [],
      cashFlow: cashFlowData,
      deudaTotal,
      deudaTotalUsd,
      unidadesCount,
      alicuotaPromedio
    });
  } catch (error: any) {
    console.error("KPIs API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
