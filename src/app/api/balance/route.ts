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

    const { data: balances, error } = await supabase
      .from("balances")
      .select("*")
      .eq("edificio_id", edificioId)
      .order("fecha", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Balance query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const tasa = await getLatestTasa();
    const balance = balances?.[0] || null;
    
    if (balance) {
      balance.saldo_anterior_usd = Number(balance.saldo_anterior) / tasa;
      balance.cobranza_mes_usd = Number(balance.cobranza_mes) / tasa;
      balance.gastos_facturados_usd = Number(balance.gastos_facturados) / tasa;
      balance.saldo_disponible_usd = Number(balance.saldo_disponible) / tasa;
      balance.total_por_cobrar_usd = Number(balance.total_por_cobrar) / tasa;
      balance.fondo_reserva_usd = Number(balance.fondo_reserva) / tasa;
      balance.fondo_prestaciones_usd = Number(balance.fondo_prestaciones) / tasa;
      balance.fondo_trabajos_varios_usd = Number(balance.fondo_trabajos_varios) / tasa;
      balance.fondo_intereses_usd = Number(balance.fondo_intereses) / tasa;
      balance.fondo_diferencial_cambiario_usd = Number(balance.fondo_diferencial_cambiario) / tasa;
      balance.tasa_bcv = tasa;
    }

    return NextResponse.json({ balance, tasa });
  } catch (error: any) {
    console.error("Balance API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}