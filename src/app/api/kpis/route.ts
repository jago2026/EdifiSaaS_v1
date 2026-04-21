import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSmartTasa } from "@/lib/tasa-helper";

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

function formatLabel(mes: string | null | undefined): string {
  if (!mes) return "";
  const normalized = normalizeMonth(mes);
  if (!normalized) return "";
  const [year, month] = normalized.split("-");
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const monthIndex = parseInt(month, 10) - 1;
  return (monthIndex >= 0 && monthIndex <= 11) ? `${monthNames[monthIndex]} ${year}` : mes;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const edificioId = searchParams.get("edificioId");
    if (!edificioId) return NextResponse.json({ error: "Falta edificioId" }, { status: 400 });

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Obtener datos básicos
    const { data: building } = await supabase.from("edificios").select("unidades").eq("id", edificioId).single();
    const { data: alicuotas } = await supabase.from("alicuotas").select("unidad").eq("edificio_id", edificioId);
    const { data: recibos } = await supabase.from("recibos").select("unidad, deuda").eq("edificio_id", edificioId);
    const { data: balances } = await supabase.from("balances").select("*").eq("edificio_id", edificioId).order("mes", { ascending: true });
    const { data: egresos } = await supabase.from("egresos").select("fecha, monto, mes").eq("edificio_id", edificioId).not("descripcion", "ilike", "%TOTAL%");
    const { data: gastos } = await supabase.from("gastos").select("fecha, monto, mes").eq("edificio_id", edificioId).not("descripcion", "ilike", "%TOTAL%");

    // 2. DETERMINAR NÚMERO DE UNIDADES REAL (Lógica de Excelencia)
    const countAlicuotas = alicuotas?.length || 0;
    const countRecibosActivos = new Set((recibos || []).filter(r => r.deuda > 0).map(r => r.unidad)).size;
    const manualUnits = building?.unidades || 0;

    // Prioridad: 1. Alícuotas, 2. Recibos Activos, 3. Manual (si es sensato)
    let realUnits = countAlicuotas > 0 ? countAlicuotas : (countRecibosActivos > 0 ? countRecibosActivos : (manualUnits > 0 && manualUnits < 200 ? manualUnits : 25));
    if (realUnits > 250) realUnits = countRecibosActivos > 0 ? countRecibosActivos : 25;
    if (realUnits <= 0) realUnits = 1;

    console.log(`[KPIs] Calculando para ${edificioId}. Unidades detectadas: ${realUnits}`);

    // 3. Procesar Balances Históricos
    const today = new Date();
    const currentMesNorm = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    const balancesProcessed = await Promise.all((balances || [])
      .filter((b: any) => normalizeMonth(b.mes) < currentMesNorm)
      .map(async (b: any) => {
        const normalized = normalizeMonth(b.mes);
        const tasa = await getSmartTasa(normalized + "-01");
        
        return {
          ...b,
          mes_normalizado: normalized,
          label: formatLabel(b.mes),
          saldo_disponible_usd: b.saldo_disponible / tasa,
          cobranza_mes_usd: b.cobranza_mes / tasa,
          gastos_facturados_usd: Math.abs(b.gastos_facturados) / tasa,
          recibos_mes_usd: b.recibos_mes / tasa,
          // EL KPI CRÍTICO: Monto por unidad
          recibo_promedio_usd: (b.recibos_mes / tasa) / realUnits,
          tasa_bcv: tasa
        };
      }));

    // 4. Agrupar Egresos y Gastos por Mes
    const processGroup = async (items: any[]) => {
      const grouped: any = {};
      for (const item of items) {
        const mesNorm = normalizeMonth(item.mes);
        if (!grouped[mesNorm]) grouped[mesNorm] = { mes: mesNorm, label: formatLabel(item.mes), monto: 0, monto_usd: 0 };
        const tasa = await getSmartTasa(item.fecha || (mesNorm + "-01"));
        grouped[mesNorm].monto += item.monto;
        grouped[mesNorm].monto_usd += item.monto / tasa;
      }
      return Object.values(grouped).sort((a: any, b: any) => a.mes.localeCompare(b.mes));
    };

    const egresosData = await processGroup(egresos || []);
    const gastosData = await processGroup(gastos || []);

    // 5. Deuda Total
    const currentTasa = await getSmartTasa(new Date().toISOString().split('T')[0]);
    const deudaTotal = (recibos || []).reduce((sum, r) => sum + (r.deuda || 0), 0);

    return NextResponse.json({
      egresos: egresosData,
      gastos: gastosData,
      balances: balancesProcessed,
      deudaTotal,
      deudaTotalUsd: deudaTotal / currentTasa,
      unidadesCount: realUnits,
      alicuotaPromedio: 100 / realUnits
    });

  } catch (error: any) {
    console.error("KPIs API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
