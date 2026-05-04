import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const edificioId = searchParams.get("edificioId");

    if (!edificioId) {
      return NextResponse.json({ error: "Falta edificioId" }, { status: 400 });
    }

    // Get current month in YYYY-MM format
    const now = new Date();
    const currentMes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Query current month activity from pagos_recibos table based on fecha_pago
    const { data: pagos, error: pagosError } = await supabase
      .from("pagos_recibos")
      .select("monto")
      .eq("edificio_id", edificioId)
      .gte("fecha_pago", `${currentMes}-01`)
      .lte("fecha_pago", `${currentMes}-31`);

    if (pagosError) {
      console.error("Pagos query error:", pagosError);
      return NextResponse.json({ monto: 0, cantidad: 0, error: pagosError.message });
    }

    const monto = pagos?.reduce((sum, p) => sum + Number(p.monto || 0), 0) || 0;
    const cantidad = pagos?.length || 0;

    console.log(`DEBUG ingresos-summary for ${currentMes}:`, { monto, cantidad });

    return NextResponse.json({ monto, cantidad, mes: currentMes });
  } catch (error: any) {
    console.error("Ingresos summary error:", error);
    return NextResponse.json({ monto: 0, cantidad: 0 }, { status: 200 });
  }
}