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

    const { data: alicuotas, error } = await supabase
      .from("alicuotas")
      .select("id, unidad, propietario, alicuota, email1, email2, telefono1, telefono2, observaciones")
      .eq("edificio_id", edificioId)
      .order("unidad");

    if (error) {
      console.error("Alicuotas query error:", error);
      return NextResponse.json({ alicuotas: [], count: 0, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ alicuotas: alicuotas || [], count: alicuotas?.length || 0 });
  } catch (error: any) {
    console.error("Alicuotas API error:", error);
    return NextResponse.json({ alicuotas: [], count: 0, error: error.message }, { status: 500 });
  }
}