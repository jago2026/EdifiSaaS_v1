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

    // Get pagos del mes actual (último mes con movimientos o balance)
    const { data: ultimoBalance } = await supabase
      .from("balances")
      .select("mes")
      .eq("edificio_id", edificioId)
      .order("mes", { ascending: false })
      .limit(1)
      .single();

    const currentMes = ultimoBalance?.mes || "04-2026";
    const [mm, yyyy] = currentMes.split("-");
    const currentYearMonth = `${yyyy}-${mm}`;

    // Get pagos por unidad (recibos con deuda que se pagaron - comparación con sync anterior)
    const { data: pagos, error } = await supabase
      .from("recibos")
      .select("unidad, propietario, num_recibos, deuda, deuda_usd, actualizado_en")
      .eq("edificio_id", edificioId)
      .gt("num_recibos", 0)
      .order("unidad", { ascending: true });

    if (error) {
      console.error("Error fetching pagos:", error);
      return NextResponse.json({ pagos: [], error: error.message }, { status: 500 });
    }

    // Transform recibos data into pagos with format
    const pagosFormatted = (pagos || []).map((p: any) => ({
      id: p.unidad,
      fecha: p.actualizado_en || new Date().toISOString().split("T")[0],
      unidad: p.unidad,
      propietario: p.propietario || "",
      numRecibos: p.num_recibos,
      montoBs: p.deuda || 0,
      montoUsd: p.deuda_usd || 0,
      estado: p.deuda > 0 ? "pendiente" : "pagado",
    }));

    return NextResponse.json({ pagos: pagosFormatted, mes: currentMes });
  } catch (error: any) {
    console.error("Ingresos API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}