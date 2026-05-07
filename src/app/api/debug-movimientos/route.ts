import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const edificioId = searchParams.get("edificioId");

    if (!edificioId) {
      return NextResponse.json({ error: "Falta edificioId" }, { status: 400 });
    }

    

    const { data: movimientos, error, count } = await supabase
      .from("movimientos")
      .select("id, fecha, descripcion, monto, tipo, created_at", { count: "exact" as any })
      .eq("edificio_id", edificioId)
      .order("fecha", { ascending: false })
      .limit(50);

    if (error) {
      console.log("DB Error:", error);
      throw error;
    }

    return NextResponse.json({ 
      success: true,
      count: count || 0,
      movimientos: movimientos || [] 
    });
  } catch (error: any) {
    console.error("Movimientos error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}