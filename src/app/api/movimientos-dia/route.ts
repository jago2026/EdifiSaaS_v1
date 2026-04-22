import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const edificioId = searchParams.get("edificioId");
  const dias = parseInt(searchParams.get("dias") || "30") || 30;

  if (!edificioId) {
    return NextResponse.json({ error: "edificioId required" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - dias);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    // Get movements from last N days
    const { data: movimientosDia, error } = await supabase
      .from("movimientos_dia")
      .select("*")
      .eq("edificio_id", edificioId)
      .gte("detectado_en", startDateStr)
      .order("detectado_en", { ascending: true });

    if (error) throw error;

    // Also get pagos_recibos for the same period
    const { data: pagos } = await supabase
      .from("pagos_recibos")
      .select("*")
      .eq("edificio_id", edificioId)
      .gte("fecha_pago", startDateStr)
      .order("fecha_pago", { ascending: true });

    return NextResponse.json({ 
      movimientos: movimientosDia || [],
      pagos: pagos || [],
      fechaInicio: startDateStr
    });
  } catch (error: any) {
    console.error("Error loading movimientos dia:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}