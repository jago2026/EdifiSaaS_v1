import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const edificioId = searchParams.get("edificioId");

  if (!edificioId) {
    return NextResponse.json({ error: "Falta edificioId" }, { status: 400 });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from("junta")
      .select("*")
      .eq("edificio_id", edificioId)
      .eq("activo", true)
      .order("cargo", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ miembros: data || [] });
  } catch (error: any) {
    console.error("Junta API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { edificio_id, email, nombre, cargo, telefono } = body;

    if (!edificio_id || !email) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const tempPassword = "123456";
    const passwordHash = await hashPassword(tempPassword);

    const { data, error } = await supabase
      .from("junta")
      .insert({
        edificio_id,
        email,
        nombre: nombre || null,
        cargo: cargo || null,
        telefono: telefono || null,
        password_hash: passwordHash,
        requiere_cambio_clave: true,
        es_propietario: false
      })
      .select()
      .single();

    if (error) throw error;

    // Disparar email de bienvenida
    try {
      await fetch(`${new URL(request.url).origin}/api/email`, {
        method: "POST",
        body: JSON.stringify({
          action: "welcome_invitation",
          edificioId: edificio_id,
          recipient: email,
          nombreMiembro: nombre || "Miembro de la Junta",
          tempPassword: tempPassword
        })
      });
    } catch (e) {
      console.error("Error sending welcome email:", e);
    }

    return NextResponse.json({ success: true, miembro: data });
  } catch (error: any) {
    console.error("Create miembro error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}