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
    const mesParam = searchParams.get("mes");

    if (!edificioId) {
      return NextResponse.json({ error: "Falta edificioId" }, { status: 400 });
    }

    const now = new Date();
    // Determinamos el mes de interés: el parámetro o el actual
    const targetMes = mesParam || now.toISOString().substring(0, 7);
    
    // Calculamos el rango de fechas para ese mes (YYYY-MM-01 al YYYY-MM-ultimo)
    const [year, month] = targetMes.split("-").map(Number);
    const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDayDate = new Date(year, month, 0); // día 0 del mes siguiente es el último de este
    const lastDay = `${year}-${String(month).padStart(2, "0")}-${String(lastDayDate.getDate()).padStart(2, "0")}`;

    let query = supabase
      .from("gastos")
      .select("id, fecha, mes, codigo, descripcion, monto")
      .eq("edificio_id", edificioId)
      .neq("codigo", "TOTAL")
      .gte("fecha", firstDay)
      .lte("fecha", lastDay)
      .order("fecha", { ascending: false });

    const { data: gastos, error } = await query;

    if (error) {
      throw error;
    }

    // Ya NO eliminamos duplicados manualmente, confiamos en el hash único de la DB
    const uniqueGastos = gastos || [];

    // Obtener meses disponibles
    const { data: mesesData } = await supabase.from("gastos")
      .select("mes")
      .eq("edificio_id", edificioId)
      .order("mes", { ascending: false });
    const mesesDisponibles = Array.from(new Set(mesesData?.map(m => m.mes).filter(Boolean)));

    const gastosConUSD = await Promise.all(
      uniqueGastos.map(async (gasto: any) => {
        const tasa = await getTasaForFecha(gasto.fecha);
        return {
          ...gasto,
          monto_bs: gasto.monto,
          monto_usd: Number(gasto.monto) / tasa,
          tasa_bcv: tasa,
        };
      })
    );

    return NextResponse.json({ gastos: gastosConUSD, mesesDisponibles });
  } catch (error: any) {
    console.error("Gastos error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}