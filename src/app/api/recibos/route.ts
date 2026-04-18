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

    const { data: recibos, error } = await supabase
      .from("recibos")
      .select("id, unidad, propietario, num_recibos, deuda, deuda_usd")
      .eq("edificio_id", edificioId)
      .order("unidad", { ascending: true })
      .limit(100);

    if (error) {
      throw error;
    }

    return NextResponse.json({ recibos: recibos || [] });
  } catch (error: any) {
    console.error("Recibos error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}