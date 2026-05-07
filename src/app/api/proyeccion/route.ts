import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const edificioId = searchParams.get("edificioId");

    if (!edificioId) {
      return NextResponse.json({ error: "Falta edificioId" }, { status: 400 });
    }

    

    // Get current month for debt snapshot
    const today = new Date();
    const currentMes = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    // 1. Fetch historical payments (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsAgoStr = sixMonthsAgo.toISOString().split("T")[0];

    const { data: historicalPagos, error: errorPagos } = await supabase
      .from("pagos_recibos")
      .select("fecha_pago, monto, unidad")
      .eq("edificio_id", edificioId)
      .gte("fecha_pago", sixMonthsAgoStr);

    if (errorPagos) throw errorPagos;

    // 2. Fetch current pending receipts (ONLY current month snapshot)
    const { data: currentRecibos, error: errorRecibos } = await supabase
      .from("recibos")
      .select("unidad, propietario, num_recibos, deuda, deuda_usd")
      .eq("edificio_id", edificioId)
      .eq("mes", currentMes)
      .gt("num_recibos", 0);

    if (errorRecibos) throw errorRecibos;

    return NextResponse.json({
      historicalPagos,
      currentRecibos,
      fechaAnalisis: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Proyeccion API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
