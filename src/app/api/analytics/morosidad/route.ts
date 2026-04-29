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
    // Calcular "ayer" en hora Venezuela (UTC-4) — el gráfico de evolución NUNCA incluye
    // el día de hoy porque su snapshot es parcial e incompleto, generando picos falsos.
    // Usamos "ayer" como límite superior ESTRICTO en la query a Supabase.
    const nowCaracas = new Date(new Date().getTime() - 4 * 60 * 60 * 1000); // UTC-4 fijo
    const ayerCaracas = new Date(nowCaracas);
    ayerCaracas.setUTCDate(ayerCaracas.getUTCDate() - 1);
    const ayerStr = ayerCaracas.toISOString().split('T')[0]; // YYYY-MM-DD de ayer en VET

    // El snapshot "current" (para los KPIs de grupos) sí puede ser de hoy,
    // así que hacemos dos queries: una para los KPIs (lte hoy) y otra para el gráfico (lte ayer).
    const todayCaracas = nowCaracas.toISOString().split('T')[0];

    // Query principal para KPIs — incluye hoy
    const { data: snapshots, error } = await supabase
      .from("historico_cobranza")
      .select("*")
      .eq("edificio_id", edificioId)
      .lte("fecha", todayCaracas)
      .order("fecha", { ascending: false });

    // Query para el gráfico — excluye hoy, solo hasta ayer inclusive
    const { data: snapshotsGrafico, error: errorGrafico } = await supabase
      .from("historico_cobranza")
      .select("fecha, monto_pendiente_total, tasa_cambio, aptos_pendientes_total, pct_pendiente")
      .eq("edificio_id", edificioId)
      .lte("fecha", ayerStr)          // ← tope: ayer (hoy excluido por diseño)
      .order("fecha", { ascending: false })
      .limit(60);

    if (error) throw error;
    if (!snapshots || snapshots.length === 0) {
        return NextResponse.json({ error: "No hay datos suficientes para el análisis" }, { status: 404 });
    }

    const current = snapshots[0];
    const tasaActual = Number(current.tasa_cambio || 36);
    
    // Buscar el snapshot de hace aproximadamente un mes
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(new Date().getMonth() - 1);
    const lastMonthStr = lastMonthDate.toISOString().split('T')[0];
    
    const previous = snapshots.find(s => s.fecha <= lastMonthStr) || snapshots[snapshots.length - 1];

    // Agrupar por categorías: 1 recibo, 2-3 recibos, 4-6 recibos, 7-11 recibos, 12+ recibos
    const getGrouped = (snap: any) => {
        if (!snap) return null;
        
        const g1_aptos = (snap.aptos_1_recibo || 0);
        const g1_monto = (snap.monto_1_recibo || 0);

        const g2_3_aptos = (snap.aptos_2_recibo || 0) + (snap.aptos_3_recibo || 0);
        const g2_3_monto = (snap.monto_2_recibo || 0) + (snap.monto_3_recibo || 0);
        
        const g4_6_aptos = (snap.aptos_4_recibo || 0) + (snap.aptos_5_recibo || 0) + (snap.aptos_6_recibo || 0);
        const g4_6_monto = (snap.monto_4_recibo || 0) + (snap.monto_5_recibo || 0) + (snap.monto_6_recibo || 0);
        
        const g7_11_aptos = (snap.aptos_7_recibo || 0) + (snap.aptos_8_recibo || 0) + (snap.aptos_9_recibo || 0) + (snap.aptos_10_recibo || 0) + (snap.aptos_11_recibo || 0);
        const g7_11_monto = (snap.monto_7_recibo || 0) + (snap.monto_8_recibo || 0) + (snap.monto_9_recibo || 0) + (snap.monto_10_recibo || 0) + (snap.monto_11_recibo || 0);
        
        const g12_mas_aptos = (snap.aptos_12_mas_recibo || 0);
        const g12_mas_monto = (snap.monto_12_mas_recibo || 0);
        
        return {
            g1: { aptos: g1_aptos, monto: g1_monto },
            g2_3: { aptos: g2_3_aptos, monto: g2_3_monto },
            g4_6: { aptos: g4_6_aptos, monto: g4_6_monto },
            g7_11: { aptos: g7_11_aptos, monto: g7_11_monto },
            g12_mas: { aptos: g12_mas_aptos, monto: g12_mas_monto },
            total_aptos: snap.aptos_pendientes_total,
            total_monto: snap.monto_pendiente_total
        };
    };

    const currentGroups = getGrouped(current);
    const previousGroups = getGrouped(previous);

    // Calcular desplazamiento
    const desplazamiento = previousGroups ? {
        g1: currentGroups!.g1.aptos - previousGroups.g1.aptos,
        g2_3: currentGroups!.g2_3.aptos - previousGroups.g2_3.aptos,
        g4_6: currentGroups!.g4_6.aptos - previousGroups.g4_6.aptos,
        g7_11: currentGroups!.g7_11.aptos - previousGroups.g7_11.aptos,
        g12_mas: currentGroups!.g12_mas.aptos - previousGroups.g12_mas.aptos,
    } : null;

    // Costo de morosidad (calculado en USD para evitar confusión)
    const calcularCostoUSD = (montoBs: number, meses: number) => {
        const tasaDevalMensual = 0.03; 
        const montoUSD = montoBs / tasaActual;
        // El costo es cuánto más valdría hoy ese dinero si se hubiera cobrado a tiempo
        // pero aquí lo calculamos como pérdida de poder adquisitivo proyectada.
        const valorOriginalUSD = montoUSD / Math.pow(1 - tasaDevalMensual, meses);
        return valorOriginalUSD - montoUSD;
    };

    const costoMorosidadUSD = {
        g1: calcularCostoUSD(currentGroups!.g1.monto, 1),
        g2_3: calcularCostoUSD(currentGroups!.g2_3.monto, 2.5), // Promedio entre 2 y 3
        g4_6: calcularCostoUSD(currentGroups!.g4_6.monto, 5),   // Promedio entre 4 y 6
        g7_11: calcularCostoUSD(currentGroups!.g7_11.monto, 9),
        g12_mas: calcularCostoUSD(currentGroups!.g12_mas.monto, 18),
    };

    // ── Gráfico de barras: mes anterior vs mes actual ──────────────────────────
    // Calculamos el mes actual y el mes anterior en hora Caracas
    const mesActualStr  = `${nowCaracas.getUTCFullYear()}-${String(nowCaracas.getUTCMonth() + 1).padStart(2, '0')}`;
    const prevDate      = new Date(nowCaracas);
    prevDate.setUTCMonth(prevDate.getUTCMonth() - 1);
    const mesAnteriorStr = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, '0')}`;

    // Filtrar snapshots de cada mes (snapshotsGrafico ya excluye hoy)
    const snapsMesActual   = (snapshotsGrafico || []).filter((s: any) => s.fecha.startsWith(mesActualStr));
    const snapsMesAnterior = (snapshotsGrafico || []).filter((s: any) => s.fecha.startsWith(mesAnteriorStr));

    // Para cada mes construimos un mapa fecha→valor para los 3 modos
    const buildBarPoints = (snaps: any[]) =>
      [...snaps]
        .sort((a: any, b: any) => a.fecha.localeCompare(b.fecha))
        .map((s: any) => {
          const t    = Number(s.tasa_cambio || tasaActual) || tasaActual || 1;
          const monto = Math.max(0, Number(s.monto_pendiente_total) || 0);
          const pctRaw = Number(s.pct_pendiente || 0);
          return {
            fecha:      s.fecha,
            dia:        Number(s.fecha.split('-')[2]),   // día del mes (1-31)
            monto,
            montoUsd:   monto / t,
            porcentaje: (pctRaw > 0 && pctRaw <= 150) ? pctRaw : null,
          };
        });

    const barMesActual   = buildBarPoints(snapsMesActual);
    const barMesAnterior = buildBarPoints(snapsMesAnterior);

    // Unir por día para el gráfico agrupado (eje X = día del mes)
    const allDias = Array.from(new Set([
      ...barMesActual.map((d: any) => d.dia),
      ...barMesAnterior.map((d: any) => d.dia),
    ])).sort((a, b) => a - b);

    const barData = allDias.map(dia => {
      const act = barMesActual.find((d: any) => d.dia === dia);
      const ant = barMesAnterior.find((d: any) => d.dia === dia);
      return {
        dia,
        mesActual_monto:      act?.monto      ?? null,
        mesActual_montoUsd:   act?.montoUsd   ?? null,
        mesActual_porcentaje: act?.porcentaje ?? null,
        mesAnterior_monto:      ant?.monto      ?? null,
        mesAnterior_montoUsd:   ant?.montoUsd   ?? null,
        mesAnterior_porcentaje: ant?.porcentaje ?? null,
      };
    });

    // También mantenemos evolution lineal (últimos 30 días hasta ayer) para compatibilidad
    const evolution = (snapshotsGrafico || [])
        .slice(0, 30)
        .reverse()
        .map((s: any) => {
            const t = Number(s.tasa_cambio || tasaActual) || tasaActual || 1;
            const montoTotal = Math.max(0, Number(s.monto_pendiente_total) || 0);
            const pctRaw = Number(s.pct_pendiente || 0);
            const porcentaje = (pctRaw > 0 && pctRaw <= 150) ? pctRaw : null;
            return {
                fecha: s.fecha,
                monto: montoTotal,
                montoUsd: montoTotal / t,
                aptos: Number(s.aptos_pendientes_total) || 0,
                porcentaje
            };
        })
        .filter((s: any) => s.monto > 0);

    return NextResponse.json({
      current: currentGroups,
      previous: previousGroups,
      desplazamiento,
      costoMorosidad: costoMorosidadUSD,
      evolution,
      barData,
      mesActualLabel:   mesActualStr,
      mesAnteriorLabel: mesAnteriorStr,
      tasaBCV: tasaActual,
      fecha: current.fecha
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
