import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const passwordHash = await hashPassword(password);
    console.log(`[LOGIN] Intento para: ${cleanEmail}`);

    // 1. Intentar login como administrador principal
    let { data: users, error: usersError } = await supabase
      .from("usuarios")
      .select("*")
      .ilike("email", cleanEmail)
      .eq("password_hash", passwordHash)
      .limit(1);

    let user = users && users.length > 0 ? users[0] : null;
    let isMember = false;
    let memberData = null;

    // 2. Si no es admin, intentar login como miembro de junta
    if (!user) {
      console.log(`[LOGIN] No es admin, buscando en junta...`);
      const { data: members, error: memberError } = await supabase
        .from("junta")
        .select("*")
        .ilike("email", cleanEmail)
        .eq("password_hash", passwordHash)
        .limit(1);

      if (members && members.length > 0) {
        memberData = members[0];
        console.log(`[LOGIN] Miembro encontrado: ${memberData.id}`);
        user = {
          id: memberData.id,
          email: memberData.email,
          first_name: memberData.nombre?.split(" ")[0] || "Miembro",
          last_name: memberData.nombre?.split(" ").slice(1).join(" ") || "Junta"
        };
        isMember = true;
      }
    }

    if (!user) {
      console.log(`[LOGIN] Error: Credenciales inválidas para ${cleanEmail}`);
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    // 3. Obtener edificio
    let building = null;
    if (isMember) {
      const { data: b } = await supabase.from("edificios").select("*").eq("id", memberData.edificio_id).single();
      building = b;
    } else {
      const { data: buildings } = await supabase.from("edificios").select("*").eq("usuario_id", user.id).limit(1);
      building = buildings && buildings.length > 0 ? buildings[0] : null;
    }

    console.log(`[LOGIN] Login exitoso. Edificio: ${building?.nombre || 'Ninguno'}. Miembro: ${isMember}`);

    const cookieStore = await cookies();
    cookieStore.set("user_id", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });
    
    if (isMember) {
      cookieStore.set("is_member", "true", { maxAge: 60 * 60 * 24 * 7 });
      cookieStore.set("member_building_id", building.id, { maxAge: 60 * 60 * 24 * 7 });
    } else {
      // Limpiar cookies de miembro si es admin
      cookieStore.delete("is_member");
      cookieStore.delete("member_building_id");
    }

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        isMember,
        isAdmin: isMember ? memberData.es_propietario : true,
        nivelAcceso: isMember ? (memberData.nivel_acceso || 'board') : 'admin',
        requiereCambioClave: isMember ? memberData.requiere_cambio_clave : false
      },
      building,
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json({ error: error.message || "Error al iniciar sesión" }, { status: 500 });
  }
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}