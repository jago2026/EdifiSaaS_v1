import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

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
    
    const response = NextResponse.json({ miembros: data || [] });
    // Prevent caching for GET junta
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (error: any) {
    console.error("Junta API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;
    if (userId === "00000000-0000-0000-0000-000000000000") {
      return NextResponse.json({ error: "Operación no permitida en cuenta demo" }, { status: 403 });
    }

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
        nivel_acceso: nivel_acceso || 'viewer',
        recibe_email_cron: true
      })
      .select()
      .single();

    if (error) throw error;

    // Obtener nombre del edificio para el email
    const { data: edif } = await supabase.from("edificios").select("nombre").eq("id", edificio_id).single();

    // Enviar email de invitación directamente
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

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, recibe_email_cron, edificio_id, nombre, email, cargo, telefono, nivel_acceso } = body;

    if (!id) {
      return NextResponse.json({ error: "Falta ID del miembro" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";
    
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    
    // Construir objeto de actualización
    const updateData: any = {};
    if (recibe_email_cron !== undefined) updateData.recibe_email_cron = recibe_email_cron;
    if (nombre !== undefined) updateData.nombre = nombre;
    if (email !== undefined) updateData.email = email;
    if (cargo !== undefined) updateData.cargo = cargo;
    if (telefono !== undefined) updateData.telefono = telefono;
    if (nivel_acceso !== undefined) {
      updateData.nivel_acceso = nivel_acceso;
      updateData.es_propietario = nivel_acceso === 'admin';
    }

    // Actualización directa usando solo el ID para máxima precisión
    const { data: updatedData, error } = await supabaseAdmin
      .from("junta")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[PATCH JUNTA] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Auditoría
    if (edificio_id && updatedData) {
      const fieldCount = Object.keys(updateData).length;
      const desc = fieldCount === 1 && updateData.recibe_email_cron !== undefined
        ? `Se cambió preferencia de email a ${updateData.recibe_email_cron ? 'SÍ' : 'NO'} para ${updatedData.nombre || updatedData.email}`
        : `Se actualizaron datos de ${updatedData.nombre || updatedData.email}`;

      await supabaseAdmin.from("alertas").insert({
        edificio_id,
        tipo: 'info',
        titulo: fieldCount === 1 && updateData.recibe_email_cron !== undefined ? 'Preferencia de Email' : 'Miembro Actualizado',
        descripcion: desc,
        fecha: new Date().toISOString().split('T')[0]
      });
    }

    return NextResponse.json({ 
      success: true, 
      miembro: updatedData,
      newValue: updatedData.recibe_email_cron 
    });
  } catch (error: any) {
    console.error("Patch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
