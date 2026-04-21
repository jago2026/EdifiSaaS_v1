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

    // IMPORTANTE: Usar Service Role para que el conteo de unidades no falle por RLS
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Obtener Datos
    const { data: building } = await supabase.from("edificios").select("unidades").eq("id", edificioId).single();
    const { data: alicuotas } = await supabase.from("alicuotas").select("unidad").eq("edificio_id", edificioId);
    const { data: recibos } = await supabase.from("recibos").select("unidad, deuda").eq("edificio_id", edificioId);
    const { data: balances } = await supabase.from("balances").select("*").eq("edificio_id", edificioId).order("mes", { ascending: true });
    
    // 2. LÓGICA DE UNIDADES (PARA EVITAR EL ERROR DE 1-2$)
    const countAlicuotas = alicuotas?.length || 0;
    // Contar unidades únicas que tienen deudas (evita contar deudas viejas como unidades nuevas)
    const countRecibosActivos = new Set((recibos || []).filter(r => (r.deuda || 0) > 0).map(r => r.unidad)).size;
    
    let realUnits = countAlicuotas > 0 ? countAlicuotas : (countRecibosActivos > 0 ? countRecibosActivos : (building?.unidades || 25));
    
    // Si el número detectado es absurdo (>300), forzamos a una base lógica basada en deudores o fallback
    if (realUnits > 300) realUnits = countRecibosActivos > 0 ? countRecibosActivos : 25;
    if (realUnits <= 0) realUnits = 1;

    console.log(`[KPIs DEBUG] Edificio: ${edificioId} | Alicuotas: ${countAlicuotas} | Deudores: ${countRecibosActivos} | Unidades Usadas: ${realUnits}`);

    // 3. Procesar Balances
    const today = new Date();
    const currentMesNorm = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    const balancesProcessed = await Promise.all((balances || [])
      .filter((b: any) => normalizeMonth(b.mes) < currentMesNorm)
      .map(async (b: any) => {
        const normalized = normalizeMonth(b.mes);
        const tasa = await getSmartTasa(normalized + "-01");
        const totalMesUsd = (b.recibos_mes || 0) / tasa;
        
        return {
          ...b,
          label: formatLabel(b.mes),
          saldo_disponible_usd: (b.saldo_disponible || 0) / tasa,
          cobranza_mes_usd: (b.cobranza_mes || 0) / tasa,
          recibos_mes_usd: totalMesUsd,
          // EL CÁLCULO CORREGIDO
          recibo_promedio_usd: totalMesUsd / realUnits,
          tasa_bcv: tasa
        };
      }));

    // 4. Egresos y Gastos
    const { data: egresos } = await supabase.from("egresos").select("monto, mes").eq("edificio_id", edificioId).not("descripcion", "ilike", "%TOTAL%");
    const egresosGrouped: any = {};
    for (const e of (egresos || [])) {
      const m = normalizeMonth(e.mes);
      if (!egresosGrouped[m]) egresosGrouped[m] = { mes: m, label: formatLabel(e.mes), monto: 0, monto_usd: 0 };
      const t = await getSmartTasa(m + "-01");
      egresosGrouped[m].monto += e.monto;
      egresosGrouped[m].monto_usd += e.monto / t;
    }

    const currentTasa = await getSmartTasa(new Date().toISOString().split('T')[0]);
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
