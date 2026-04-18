import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const edificioId = searchParams.get("edificioId");

    if (!edificioId) {
      return NextResponse.json({ error: "Falta edificioId" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === "resumen_fecha") {
      const fecha = searchParams.get("fecha");
      if (!fecha) {
        return NextResponse.json({ error: "Falta fecha" }, { status: 400 });
      }

      const { data, error } = await supabase
        .from("control_diario")
        .select("*")
        .eq("edificio_id", edificioId)
        .eq("fecha", fecha)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is 0 rows returned
        throw error;
      }

      return NextResponse.json({ data: data || null });
    }

    if (action === "gastos_recurrentes") {
      const { data, error } = await supabase
        .from("gastos_recurrentes")
        .select("*")
        .eq("edificio_id", edificioId)
        .order("descripcion", { ascending: true });

      if (error) throw error;
      return NextResponse.json({ data: data || [] });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error: any) {
    console.error("Informes API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
