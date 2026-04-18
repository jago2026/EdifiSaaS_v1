import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

async function getTasaForFecha(fecha: string): Promise<number> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
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

    const supabase = createClient(supabaseUrl, supabaseKey);

    let query = supabase
      .from("gastos")
      .select("id, fecha, mes, codigo, descripcion, monto")
      .eq("edificio_id", edificioId)
      .neq("codigo", "TOTAL")
      .order("fecha", { ascending: false });

    if (mes) {
      query = query.eq("mes", mes);
    } else {
      query = query.limit(100);
    }

    const { data: gastos, error } = await query;

    if (error) {
      throw error;
    }

    // Obtener meses disponibles
    const { data: mesesData } = await supabase.from("gastos")
      .select("mes")
      .eq("edificio_id", edificioId)
      .order("mes", { ascending: false });
    const mesesDisponibles = Array.from(new Set(mesesData?.map(m => m.mes).filter(Boolean)));

    const gastosConUSD = await Promise.all(
      (gastos || []).map(async (gasto) => {
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