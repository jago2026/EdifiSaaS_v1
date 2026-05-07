import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";


export async function POST(request: Request) {
  try {
    const { edificioId } = await request.json();

    if (!edificioId) {
      return NextResponse.json({ error: "ID de edificio requerido" }, { status: 400 });
    }

    
    
    const { error } = await supabase
      .from("edificios")
      .update({ onboarding_completed: true })
      .eq("id", edificioId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error" }, { status: 500 });
  }
}
