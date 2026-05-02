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
    return NextResponse.json({ miembros: data || [] });
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
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, recibe_email_cron, edificio_id } = body;

    if (!id) {
      return NextResponse.json({ error: "Falta ID del miembro" }, { status: 400 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;
    console.log("USANDO KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "SERVICE_ROLE_KEY ✓" : "ANON_KEY (¡SIN PERMISOS!)");
    console.log("SUPABASE_URL:", supabaseUrl);
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    
    const updateData: any = {};
    if (recibe_email_cron !== undefined) updateData.recibe_email_cron = !!recibe_email_cron;
    
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

    // Verify the member exists (GET already filtered by edificio_id)
    const { data: miembroExistente, error: verificarError } = await supabaseAdmin
      .from("junta")
      .select('id, recibe_email_cron')
      .eq("id", id)
      .single();

    console.log("VERIFICACION - Miembro:", miembroExistente, "Error:", verificarError);
    console.log("VERIFICACION - ID:", id, "Edificio:", edificio_id);

    if (verificarError || !miembroExistente) {
      console.log("VERIFICACION FALLIDA - 404");
      return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
    }

    // Perform the update - use .match() for proper filtering
    console.log("ACTUALIZACION - updateData:", updateData, "Valor actual:", miembroExistente.recibe_email_cron);
    
    // First try the update with proper filtering
    const { data: updateResult, error, count } = await supabaseAdmin
      .from("junta")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    console.log("ACTUALIZACION - Resultado:", updateResult, "Error:", error, "Count:", count);

    // Check if the value actually changed
    const valorCambioCorrecto = updateResult && updateResult.recibe_email_cron === updateData.recibe_email_cron;
    
    if (!valorCambioCorrecto) {
      console.log("UPDATE NO APLICADO. Valor en DB:", updateResult?.recibe_email_cron, "vs esperado:", updateData.recibe_email_cron);
      console.log("INTENTO ALTERNATIVO - Update directo");
      
      // Try update without .select()
      const { error: error2, count: count2 } = await supabaseAdmin
        .from("junta")
        .update(updateData)
        .eq("id", id);
      
      console.log("ALTERNATIVO - Error:", error2, "Count:", count2);
      
      if (error2) {
        console.log("ERROR:", error2);
        throw error2;
      }
      
      // Verify
      const { data: verificado } = await supabaseAdmin
        .from("junta")
        .select('id, recibe_email_cron')
        .eq("id", id)
        .single();
      
      console.log("VERIFICADO:", verificado);
      
      if (verificado && verificado.recibe_email_cron === updateData.recibe_email_cron) {
        await supabaseAdmin.from("alertas").insert({
          edificio_id: edificio_id,
          tipo: 'debug',
          titulo: 'Junta Update',
          descripcion: 'DB update success for member ID ' + id + '. Value: ' + recibe_email_cron,
          fecha: new Date().toISOString().split('T')[0]
        });
        
        return NextResponse.json({ 
          success: true, 
          updatedCount: 1,
          newValue: verificado.recibe_email_cron 
        });
      }
      
      console.log("AUN NO FUNCIONA");
      return NextResponse.json({ error: "Error" }, { status: 500 });
    }
    
    console.log("ACTUALIZACION EXITOSA");
    await supabaseAdmin.from("alertas").insert({
      edificio_id: edificio_id,
      tipo: 'debug',
      titulo: 'Junta Update',
      descripcion: 'DB update success for member ID ' + id + '. Value: ' + recibe_email_cron,
      fecha: new Date().toISOString().split('T')[0]
    });
    
    return NextResponse.json({ 
      success: true, 
      updatedCount: count,
      newValue: updateResult.recibe_email_cron 
    });
  } catch (error: any) {
    console.error("Patch junta error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
