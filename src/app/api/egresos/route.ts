import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";


async function getTasaForFecha(fecha: string): Promise<number> {
  
  
  try {
    const { data } = await supabase
      .from("tasas_cambio")
      .select("tasa_dolar")
      .lte("fecha", fecha)
      .order("fecha", { ascending: false })
      .limit(1)
      .single();
    
    return data?.tasa_dolar || 45.50;
  } catch {
    return 45.50;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const edificioId = searchParams.get("edificioId");
    const mes = searchParams.get("mes");

    if (!edificioId) {
      return NextResponse.json({ error: "Falta edificioId" }, { status: 400 });
    }

    
    const todayMes = new Date().toISOString().substring(0, 7); // "2026-04"

    let query = supabase
      .from("egresos")
      .select("id, fecha, mes, beneficiario, descripcion, monto, hash")
      .eq("edificio_id", edificioId)
      .order("fecha", { ascending: false });

    if (mes) {
      query = query.eq("mes", mes);
    } else {
      // SI NO HAY MES, FILTRAR ESTRICTAMENTE POR EL MES ACTUAL (Rango de Fechas)
      const now = new Date();
      const currentMesStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const firstDay = `${currentMesStr}-01`;
      const lastDay = `${currentMesStr}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate().toString().padStart(2, '0')}`;
      
      query = query.gte("fecha", firstDay).lte("fecha", lastDay);
    }

    const { data: egresos, error } = await query;

    if (error) {
      throw error;
    }

    // ELIMINAR DUPLICADOS POR HASH (Importante para evitar ver filas repetidas)
    const uniqueEgresosMap = new Map();
    (egresos || []).forEach((e: any) => {
      if (!uniqueEgresosMap.has(e.hash)) {
        uniqueEgresosMap.set(e.hash, e);
      }
    });
    const uniqueEgresos = Array.from(uniqueEgresosMap.values());

    // Obtener meses disponibles
    const { data: mesesData } = await supabase.from("egresos")
      .select("mes")
      .eq("edificio_id", edificioId)
      .order("mes", { ascending: false });
    const mesesDisponibles = Array.from(new Set(mesesData?.map(m => m.mes).filter(Boolean)));

    const egresosConUSD = await Promise.all(
      uniqueEgresos.map(async (egreso: any) => {
        const tasa = await getTasaForFecha(egreso.fecha);
        // Mark totals by checking for special hash or date
        const isTotal = egreso.hash === "TOTAL-EGRESOS" || egreso.fecha === "2099-12-31";
        return {
          ...egreso,
          monto_bs: egreso.monto,
          monto_usd: Number(egreso.monto) / tasa,
          tasa_bcv: tasa,
          isTotal,
        };
      })
    );

    return NextResponse.json({ egresos: egresosConUSD, mesesDisponibles });
  } catch (error: any) {
    console.error("Egresos error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}