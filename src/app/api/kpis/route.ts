import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSmartTasa } from "@/lib/tasa-helper";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

function normalizeMonth(mes: string | null | undefined): string {
  if (!mes) return "";
  const trimmed = mes.trim();
  if (/^\d{4}-\d{2}$/.test(trimmed)) return trimmed;
  const parts = trimmed.split(/[-/]/);
  if (parts.length !== 2) return trimmed;
  let m = parts[0].padStart(2, "0");
  let y = parts[1];
  if (m.length === 4) return `${m}-${parts[1].padStart(2, "0")}`;
  return `${y}-${m}`;
}

function formatLabel(mes: string | null | undefined): string {
  if (!mes) return "";
  const normalized = normalizeMonth(mes);
  if (!normalized) return "";
  const [year, month] = normalized.split("-");
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const idx = parseInt(month, 10) - 1;
  return (idx >= 0 && idx <= 11) ? `${monthNames[idx]} ${year}` : mes;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const edificioId = searchParams.get("edificioId");
    if (!edificioId) return NextResponse.json({ error: "Falta edificioId" }, { status: 400 });

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Obtener Datos Base y Tasa Actual en una sola ráfaga
    const [
      { data: building },
      { data: alicuotas },
      { data: recibos },
      { data: balances },
      { data: egresosRaw },
      currentTasa
    ] = await Promise.all([
      supabase.from("edificios").select("unidades").eq("id", edificioId).single(),
      supabase.from("alicuotas").select("unidad").eq("edificio_id", edificioId),
      supabase.from("recibos").select("unidad, deuda").eq("edificio_id", edificioId),
      supabase.from("balances").select("*").eq("edificio_id", edificioId).order("mes", { ascending: true }),
      supabase.from("egresos").select("monto, monto_usd, mes").eq("edificio_id", edificioId).not("descripcion", "ilike", "%TOTAL%"),
      getSmartTasa(new Date().toISOString().split('T')[0])
    ]);
    
    // 2. DETERMINAR UNIDADES REALES
    const countAlicuotas = alicuotas?.length || 0;
    const countRecibosUnicos = new Set((recibos || []).map(r => r.unidad)).size;
    let realUnits = countAlicuotas > 0 ? countAlicuotas : (countRecibosUnicos > 0 ? countRecibosUnicos : (building?.unidades || 25));
    if (realUnits <= 0) realUnits = 1;

    // 3. Procesar Balances (SIN llamadas a getSmartTasa dentro de bucles)
    const balancesProcessed = (balances || []).map((b: any) => {
      // Usamos el campo balance_usd si existe, o calculamos con la tasa actual (fallback)
      const tasaFallback = currentTasa || 36.5;
      return {
        ...b,
        label: formatLabel(b.mes),
        saldo_disponible_usd: (b.saldo_disponible_usd || (b.saldo_disponible || 0) / tasaFallback),
        cobranza_mes_usd: (b.cobranza_mes_usd || (b.cobranza_mes || 0) / tasaFallback),
        recibos_mes_usd: (b.recibos_mes_usd || (b.recibos_mes || 0) / tasaFallback),
        recibo_promedio_usd: (b.recibos_mes_usd || (b.recibos_mes || 0) / tasaFallback) / realUnits
      };
    });

    // 4. Egresos Agrupados (YA TIENEN monto_usd en la DB)
    const egresosGrouped: any = {};
    for (const e of (egresosRaw || [])) {
      const m = normalizeMonth(e.mes);
      if (!egresosGrouped[m]) egresosGrouped[m] = { mes: m, label: formatLabel(e.mes), monto: 0, monto_usd: 0 };
      egresosGrouped[m].monto += (e.monto || 0);
      egresosGrouped[m].monto_usd += (e.monto_usd || (e.monto || 0) / currentTasa); // Fallback si monto_usd es null
    }

    const dTotal = (recibos || []).reduce((sum, r) => sum + (r.deuda || 0), 0);

    return NextResponse.json({
      egresos: Object.values(egresosGrouped).sort((a: any, b: any) => a.mes.localeCompare(b.mes)),
      balances: balancesProcessed,
      deudaTotal: dTotal,
      deudaTotalUsd: dTotal / currentTasa,
      unidadesCount: realUnits
    });

  } catch (error: any) {
    console.error("KPIs API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
