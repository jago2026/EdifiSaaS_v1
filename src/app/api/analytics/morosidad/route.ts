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
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Obtener los snapshots históricos, filtrando fechas futuras
    const { data: snapshots, error } = await supabase
      .from("historico_cobranza")
      .select("*")
      .eq("edificio_id", edificioId)
      .lte("fecha", todayStr)
      .order("fecha", { ascending: false });

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

    // Historial para el gráfico de evolución
    const evolution = snapshots
        .slice(0, 30) 
        .reverse()
        .map(s => {
            const t = Number(s.tasa_cambio || tasaActual);
            return {
                fecha: s.fecha,
                monto: Number(s.monto_pendiente_total),
                montoUsd: Number(s.monto_pendiente_total) / t,
                aptos: Number(s.aptos_pendientes_total),
                porcentaje: Number(s.pct_pendiente || 0)
            };
        });

    return NextResponse.json({
      current: currentGroups,
      previous: previousGroups,
      desplazamiento,
      costoMorosidad: costoMorosidadUSD,
      evolution,
      tasaBCV: tasaActual,
      fecha: current.fecha
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
