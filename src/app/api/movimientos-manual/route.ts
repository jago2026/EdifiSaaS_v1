import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const edificioId = searchParams.get("edificioId");

  if (!edificioId) {
    return NextResponse.json({ error: "Falta edificioId" }, { status: 400 });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from("movimientos_manual")
      .select("*")
      .eq("edificio_id", edificioId)
      .order("fecha_corte", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ movimientos: data || [] });
  } catch (error: any) {
    console.error("Get movimientos manual error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;
    if (userId === "00000000-0000-0000-0000-000000000000") {
      return NextResponse.json({ error: "Operación no permitida en cuenta demo" }, { status: 403 });
    }

    const body = await request.json();
    const { edificio_id, fecha_corte, saldo_inicial, egresos, ingresos, obs_egresos, obs_ingresos, tasa_bcv, saldo_segun_administradora } = body;

    if (!edificio_id || !fecha_corte) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    // PROTECTION FOR DEMO MODE
    if (edificio_id === "d0000000-0000-0000-0000-000000000001") {
      return NextResponse.json({ error: "No se permite registrar movimientos en modo demo" }, { status: 403 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const saldoFinal = (saldo_inicial || 0) - (egresos || 0) + (ingresos || 0);
    const saldoFinalUSD = tasa_bcv ? saldoFinal / tasa_bcv : 0;

    const { data, error } = await supabase
      .from("movimientos_manual")
      .insert({
        edificio_id,
        fecha_corte,
        saldo_inicial: saldo_inicial || 0,
        egresos: egresos || 0,
        ingresos: ingresos || 0,
        saldo_final: saldoFinal,
        obs_egresos,
        obs_ingresos,
        tasa_bcv,
        saldo_final_usd: saldoFinalUSD,
        saldo_segun_administradora,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, movimiento: data });
  } catch (error: any) {
    console.error("Create movimiento manual error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}