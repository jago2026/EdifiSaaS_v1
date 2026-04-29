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
    // Obtener los snapshots históricos
    const { data: snapshots, error } = await supabase
      .from("historico_cobranza")
      .select("*")
      .eq("edificio_id", edificioId)
      .order("fecha", { ascending: false });

    if (error) throw error;
    if (!snapshots || snapshots.length === 0) {
        return NextResponse.json({ error: "No hay datos suficientes para el análisis" }, { status: 404 });
    }

    const current = snapshots[0];
    
    // Buscar el snapshot de hace aproximadamente un mes
    const now = new Date();
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(now.getMonth() - 1);
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

    // Costo de morosidad
    const calcularCosto = (monto: number, meses: number) => {
        const tasaDevalMensual = 0.03; 
        const valorOriginal = monto / Math.pow(1 - tasaDevalMensual, meses);
        return valorOriginal - monto;
    };

    const costoMorosidad = {
        g1: calcularCosto(currentGroups!.g1.monto, 1),
        g2_3: calcularCosto(currentGroups!.g2_3.monto, 3),
        g4_6: calcularCosto(currentGroups!.g4_6.monto, 6),
        g7_11: calcularCosto(currentGroups!.g7_11.monto, 9),
        g12_mas: calcularCosto(currentGroups!.g12_mas.monto, 18),
    };

    // Historial para el gráfico de evolución
    // Tomamos hasta 24 registros para tener una buena perspectiva si hay datos viejos
    const evolution = snapshots
        .slice(0, 24) 
        .reverse()
        .map(s => ({
            fecha: s.fecha,
            monto: Number(s.monto_pendiente_total),
            aptos: Number(s.aptos_pendientes_total)
        }));

    return NextResponse.json({
      current: currentGroups,
      previous: previousGroups,
      desplazamiento,
      costoMorosidad,
      evolution,
      tasaBCV: Number(current.tasa_cambio),
      fecha: current.fecha
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
