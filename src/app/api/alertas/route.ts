import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const edificioId = searchParams.get("edificioId");

  if (!edificioId) {
    return NextResponse.json({ error: "edificioId required" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data: alertas, error } = await supabase
      .from("alertas")
      .select("*")
      .eq("edificio_id", edificioId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ alertas: alertas || [] });
  } catch (error: any) {
    console.error("Error loading alertas:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { edificioId, tipo, titulo, descripcion, severidad } = await request.json();
    
    if (!edificioId || !tipo || !titulo) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from("alertas")
      .insert({
        edificio_id: edificioId,
        tipo,
        titulo,
        descripcion,
        severidad: severidad || 'media',
        fecha: new Date().toISOString().split('T')[0]
      })
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, alerta: data?.[0] });
  } catch (error: any) {
    console.error("Error creating alerta:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
