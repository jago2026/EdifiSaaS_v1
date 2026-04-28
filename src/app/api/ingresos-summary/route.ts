import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const edificioId = searchParams.get("edificioId");

    if (!edificioId) {
      return NextResponse.json({ error: "Falta edificioId" }, { status: 400 });
    }

    // Query ALL from balances table
    const { data: balances, error: balanceError } = await supabase
      .from("balances")
      .select("cobranza_mes, saldo_disponible, fondo_reserva, gastos_facturados")
      .eq("edificio_id", edificioId)
      .order("created_at", { ascending: false });

    if (balanceError) {
      console.error("Balance query error:", balanceError);
      return NextResponse.json({ monto: 0, cantidad: 0, error: balanceError.message });
    }

    console.log("DEBUG ingresos-summary: all data:", balances?.slice(0, 5));

    // Get latest balance
    const latest = balances && balances.length > 0 ? balances[0] : null;
    const monto = latest ? Number(latest.cobranza_mes) || 0 : 0;

    console.log("DEBUG ingresos-summary:", { latest, monto, balances: balances?.length });

    return NextResponse.json({ monto, cantidad: monto > 0 ? 1 : 0 });
  } catch (error: any) {
    console.error("Ingresos summary error:", error);
    return NextResponse.json({ monto: 0, cantidad: 0 }, { status: 200 });
  }
}