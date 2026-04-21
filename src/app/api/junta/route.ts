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
    const { edificio_id, email, nombre, cargo, telefono, nivel_acceso } = body;

    if (!edificio_id || !email) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    if (email.trim().toLowerCase() === "correojago@gmail.com") {
      return NextResponse.json({ error: "Este usuario ya está registrado como superusuario del sistema" }, { status: 400 });
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
        es_propietario: nivel_acceso === 'admin',
        nivel_acceso: nivel_acceso || 'viewer'
      })

      .select()
      .single();

    if (error) throw error;

    // Obtener nombre del edificio para el email
    const { data: edif } = await supabase.from("edificios").select("nombre").eq("id", edificio_id).single();

    // Enviar email de invitación directamente sin usar fetch interno
    try {
      const { sendInvitationEmail } = await import("@/lib/mail");
      await sendInvitationEmail(email, nombre || "Miembro de la Junta", tempPassword, edif?.nombre || "Tu Edificio");
      console.log("Welcome email sent directly to:", email);
    } catch (e) {
      console.error("Error sending welcome email directly:", e);
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