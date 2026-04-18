import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

function normalizeMonth(mes: string | null | undefined): string {
  if (!mes) return "";
  const trimmed = mes.trim();
  const parts = trimmed.split(/[-/]/);
  if (parts.length !== 2) return trimmed;
  let monthPart = parts[0];
  let yearPart = parts[1];
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

function getTasaBCVParaMes(mes: string, tasasHistoricas: any[]): number {
  if (!mes || !tasasHistoricas || tasasHistoricas.length === 0) return 45;
  const normalized = normalizeMonth(mes);
  if (!normalized) return 45;
  const [year, month] = normalized.split("-");
  const fechaBuscada = `${year}-${month}`;
  const tasa = tasasHistoricas.find((t: any) => t.fecha && t.fecha.startsWith(fechaBuscada));
  return tasa ? parseFloat(tasa.tasa_dolar) : 45;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const edificioId = searchParams.get("edificioId");

    if (!edificioId) {
      return NextResponse.json({ error: "Falta edificioId" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: tasasHistoricas } = await supabase
      .from("tasas_cambio")
      .select("fecha, tasa_dolar")
      .order("fecha", { ascending: false })
      .limit(500);

    const { data: egresos } = await supabase
      .from("egresos")
      .select("fecha, monto, mes")
      .eq("edificio_id", edificioId)
      .order("fecha", { ascending: true });

    const { data: gastos } = await supabase
      .from("gastos")
      .select("fecha, monto, mes")
      .eq("edificio_id", edificioId)
      .order("fecha", { ascending: true });

    const { data: balances } = await supabase
      .from("balances")
      .select("mes, fecha, saldo_disponible, cobranza_mes, gastos_facturados, fondo_reserva, total_por_cobrar, fondo_prestaciones, fondo_trabajos_varios, fondo_intereses, saldo_anterior")
      .eq("edificio_id", edificioId)
      .order("mes", { ascending: true });

    const { data: movimientos } = await supabase
      .from("movimientos_manual")
      .select("fecha_corte, saldo_final, saldo_final_usd, saldo_segun_administradora, compara")
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

    const getTasaForMonth = (mes: string) => getTasaBCVParaMes(mes, tasasHistoricas || []);

    const balancesWithLabel = (balances || []).map((b: any) => {
      const normalized = normalizeMonth(b.mes);
      const tasa = getTasaForMonth(b.mes);
      return {
        ...b,
        mes_normalizado: normalized,
        label: formatLabel(b.mes),
        saldo_disponible: b.saldo_disponible || 0,
        saldo_disponible_usd: tasa > 0 ? (b.saldo_disponible || 0) / tasa : 0,
        cobranza_mes: b.cobranza_mes || 0,
        cobranza_mes_usd: tasa > 0 ? (b.cobranza_mes || 0) / tasa : 0,
        gastos_facturados: b.gastos_facturados || 0,
        gastos_facturados_usd: tasa > 0 ? (b.gastos_facturados || 0) / tasa : 0,
        fondo_reserva: b.fondo_reserva || 0,
        fondo_reserva_usd: tasa > 0 ? (b.fondo_reserva || 0) / tasa : 0,
        fondo_prestaciones: b.fondo_prestaciones || 0,
        fondo_trabajos_varios: b.fondo_trabajos_varios || 0,
        fondo_intereses: b.fondo_intereses || 0,
        saldo_anterior: b.saldo_anterior || 0,
        saldo_anterior_usd: tasa > 0 ? (b.saldo_anterior || 0) / tasa : 0,
        total_por_cobrar: b.total_por_cobrar || 0,
        tasa_bcv: tasa
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
      acc[mesNorm].monto_usd += tasa > 0 ? montoBs / tasa : 0;
      acc[mesNorm].cantidad += 1;
      return acc;
    }, {});

    const deudaTotal = (recibos || []).reduce((sum, r: any) => sum + parseFloat(r.deuda || 0), 0);
    const deudaTotalUsd = (recibos || []).reduce((sum, r: any) => {
      const tasa = getTasaForMonth(new Date().toISOString().substring(0, 7));
      return sum + (parseFloat(r.deuda || 0) / tasa);
    }, 0);
    const unidadesCount = alicuotas?.length || 0;
    const alicuotaPromedio = unidadesCount > 0 
      ? (alicuotas || []).reduce((sum, a: any) => sum + parseFloat(a.alicuota || 0), 0) / unidadesCount 
      : 0;

    return NextResponse.json({
      egresos: Object.values(egresosAgrupados),
      gastos: Object.values(gastosAgrupados),
      balances: balancesWithLabel,
      movimientos: movimientos || [],
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