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
    const { data: sincronizaciones, error } = await supabase
      .from("sincronizaciones")
      .select("*")
      .eq("edificio_id", edificioId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ sincronizaciones: sincronizaciones || [] });
  } catch (error: any) {
    console.error("Error loading sincronizaciones:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}