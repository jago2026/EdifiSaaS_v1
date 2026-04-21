import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const edificioId = searchParams.get("edificioId");

    if (!edificioId) {
      return NextResponse.json({ error: "Falta edificioId" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current month
    const today = new Date();
    const currentMes = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    // Get pagos from pagos_recibos table (detected payments from sync comparison)
// This table is populated during sync when debt decreases between syncs.
// It shows ONLY actual payments, not pending receipts.
const { data: pagos, error } = await supabase
      .from("pagos_recibos")
      .select("id, unidad, propietario, mes, monto, fecha_pago, source, verificado")
      .eq("edificio_id", edificioId)
      .eq("mes", currentMes)
      .order("fecha_pago", { ascending: false });

    if (error) {
      console.error("Error fetching pagos:", error);
      return NextResponse.json({ pagos: [], error: error.message }, { status: 500 });
    }

    // Transform pagos_recibos data into format expected by UI
    const tasaDefault = 481.70;
    const pagosFormatted = (pagos || []).map((p: any) => ({
      id: p.id,
      fecha: p.fecha_pago || new Date().toISOString().split("T")[0],
      unidad: p.unidad,
      propietario: p.propietario || "",
      numRecibos: 1,
      montoBs: p.monto || 0,
      montoUsd: p.monto ? p.monto / tasaDefault : 0,
      estado: "pagado",
      verificado: p.verificado || false
    }));

    return NextResponse.json({ pagos: pagosFormatted, mes: currentMes });
  } catch (error: any) {
    console.error("Ingresos API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}