import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const edificioId = searchParams.get("edificioId");

  if (!edificioId) {
    return NextResponse.json({ error: "edificioId required" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's movements
    const { data: movimientosDia, error } = await supabase
      .from("movimientos_dia")
      .select("*")
      .eq("edificio_id", edificioId)
      .eq("detectado_en", today)
      .order("creado_en", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ movimientos: movimientosDia || [] });
  } catch (error: any) {
    console.error("Error loading movimientos dia:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}