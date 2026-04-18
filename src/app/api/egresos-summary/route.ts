import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

function getCurrentMonth(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  return `${yyyy}-${mm}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const edificioId = searchParams.get("edificioId");

    if (!edificioId) {
      return NextResponse.json({ error: "Falta edificioId" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const currentMes = getCurrentMonth();

    // Query current month from egresos table
    const { data: allEgresos, error } = await supabase
      .from("egresos")
      .select("monto, fecha, mes")
      .eq("edificio_id", edificioId)
      .like("mes", `${currentMes}%`);

    if (error) {
      console.error("Egresos query error:", error);
      return NextResponse.json({ monto: 0, cantidad: 0, error: error.message });
    }

    console.log("DEBUG egresos-summary: current month:", currentMes, "found:", allEgresos?.length);

    // Calculate total for current month
    const monto = allEgresos?.reduce((sum, e) => sum + Number(e.monto), 0) || 0;
    const cantidad = allEgresos?.length || 0;

    console.log("DEBUG egresos-summary:", { totalInTable: allEgresos?.length || 0, monto, cantidad });

    return NextResponse.json({ monto, cantidad });
  } catch (error: any) {
    console.error("Egresos summary error:", error);
    return NextResponse.json({ monto: 0, cantidad: 0 }, { status: 200 });
  }
}