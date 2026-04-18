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

    // Query ALL from egresos table without filter
    const { data: allEgresos, error } = await supabase
      .from("egresos")
      .select("monto, fecha")
      .eq("edificio_id", edificioId);

    if (error) {
      console.error("Egresos query error:", error);
      return NextResponse.json({ monto: 0, cantidad: 0, error: error.message });
    }

    console.log("DEBUG egresos-summary: all data:", allEgresos?.slice(0, 5).map(e => ({ fecha: e.fecha, monto: e.monto })));

    // Calculate total - no date filter
    const monto = allEgresos?.reduce((sum, e) => sum + Number(e.monto), 0) || 0;
    const cantidad = allEgresos?.length || 0;

    console.log("DEBUG egresos-summary:", { totalInTable: allEgresos?.length || 0, monto, cantidad });

    return NextResponse.json({ monto, cantidad });
  } catch (error: any) {
    console.error("Egresos summary error:", error);
    return NextResponse.json({ monto: 0, cantidad: 0 }, { status: 200 });
  }
}