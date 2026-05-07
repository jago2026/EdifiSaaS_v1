import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";


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

    
    const currentMes = getCurrentMonth();

    // Query current month from egresos table based on fecha
    const { data: allEgresos, error } = await supabase
      .from("egresos")
      .select("monto, fecha, mes")
      .eq("edificio_id", edificioId)
      .gte("fecha", `${currentMes}-01`)
      .lte("fecha", `${currentMes}-31`)
      .not("fecha", "eq", "2099-12-31")
      .not("descripcion", "ilike", "%TOTAL%");

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