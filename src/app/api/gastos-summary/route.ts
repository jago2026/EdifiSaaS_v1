import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

async function getLatestTasa(): Promise<number> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  try {
    const { data } = await supabase
      .from("tasas_cambio")
      .select("tasa_dolar")
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

    if (!edificioId) {
      return NextResponse.json({ error: "Falta edificioId" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Query ALL from gastos table without date filter first
    const { data: allGastos, error } = await supabase
      .from("gastos")
      .select("monto, fecha")
      .eq("edificio_id", edificioId);

    if (error) {
      console.error("Gastos query error:", error);
      return NextResponse.json({ monto: 0, cantidad: 0, error: error.message });
    }

    // Show what dates are in the table
    console.log("DEBUG gastos-summary: all data:", allGastos?.map(g => ({ fecha: g.fecha, monto: g.monto })));

    // Calculate total - no date filter, just sum all
    const monto = allGastos?.reduce((sum, g) => sum + Number(g.monto), 0) || 0;
    const cantidad = allGastos?.length || 0;
    
    const tasa = await getLatestTasa();
    const montoUSD = monto / tasa;

    console.log("DEBUG gastos-summary:", { totalInTable: allGastos?.length || 0, monto, cantidad });

    return NextResponse.json({ monto, cantidad, monto_usd: montoUSD, tasa });
  } catch (error: any) {
    console.error("Gastos summary error:", error);
    return NextResponse.json({ monto: 0, cantidad: 0 }, { status: 200 });
  }
}