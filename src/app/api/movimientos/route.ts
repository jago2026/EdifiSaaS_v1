import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getPlanPermissions } from "@/lib/planLimits";

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

    // 1. Obtener el plan del edificio
    const { data: edificio } = await supabase
      .from("edificios")
      .select("plan")
      .eq("id", edificioId)
      .single();

    const planName = edificio?.plan || "Básico";
    const permissions = getPlanPermissions(planName);

    // 2. Aplicar filtro de fecha si el historial está limitado
    let query = supabase
      .from("movimientos")
      .select("id, fecha, descripcion, monto, tipo, unidad_apartamento")
      .eq("edificio_id", edificioId)
      .order("fecha", { ascending: false });

    if (permissions.maxHistoryMonths < 999) {
      const limitDate = new Date();
      limitDate.setMonth(limitDate.getMonth() - permissions.maxHistoryMonths);
      const limitDateStr = limitDate.toISOString().split("T")[0];
      query = query.gte("fecha", limitDateStr);
    }

    const { data: movimientos, error } = await query.limit(500);

    if (error) {
      throw error;
    }

    return NextResponse.json({ 
      movimientos: movimientos || [],
      planInfo: {
        name: planName,
        historyLimited: permissions.maxHistoryMonths < 999
      }
    });
  } catch (error: any) {
    console.error("Movimientos error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}