import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    
    // 0. Demo Login Logic
    if (cleanEmail === "demo" && password === "demo") {
      console.log(`[LOGIN] Demo user login attempt`);
      
      const { data: building, error: bError } = await supabase
        .from("edificios")
        .select("*")
        .eq("id", "d0000000-0000-0000-0000-000000000001")
        .single();
        
      if (building && !bError) {
        console.log(`[LOGIN] Demo user success`);
        const user = {
          id: "00000000-0000-0000-0000-000000000000",
          email: "demo@edifisaas.com",
          first_name: "Usuario",
          last_name: "Demostración"
        };
        
        const cookieStore = await cookies();
        cookieStore.set("user_id", user.id, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7,
        });

        cookieStore.set("is_member", "true", { maxAge: 60 * 60 * 24 * 7 });
        cookieStore.set("member_building_id", building.id, { maxAge: 60 * 60 * 24 * 7 });
        
        return NextResponse.json({
          success: true,
          user: {
            ...user,
            isMember: true,
            isAdmin: false,
            nivelAcceso: 'observador',
            isDemo: true
          },
          building,
        });
      }
    }

    // 0. Admin Master Login Logic
    if (cleanEmail === "admin" && password === "13408559") {
      console.log(`[LOGIN] Admin Master success`);
      const user = {
        id: "superuser-id", // Permanent virtual ID for admin access
        email: "correojago@gmail.com",
        first_name: "Admin",
        last_name: "Master"
      };
      
      const cookieStore = await cookies();
      cookieStore.set("user_id", user.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });

      return NextResponse.json({
        success: true,
        user: {
          ...user,
          isAdmin: true,
          nivelAcceso: 'admin'
        }
      });
    }

    // 0. Superuser Login Logic (correojago@gmail.com + 13408559XXXXXX)
    if (cleanEmail === "correojago@gmail.com" && password.startsWith("13408559") && password.length === 14) {
      const buildingCode = password.substring(8);
      console.log(`[LOGIN] Superuser attempt for building code: ${buildingCode}`);
      
      const { data: building, error: bError } = await supabase
        .from("edificios")
        .select("*")
        .eq("codigo_edificio", buildingCode)
        .single();
        
      if (building && !bError) {
        console.log(`[LOGIN] Superuser success for building: ${building.nombre}`);
        const user = {
          id: "superuser-id", // Permanent virtual ID
          email: cleanEmail,
          first_name: "Super",
          last_name: "Usuario"
        };
        
        const cookieStore = await cookies();
        cookieStore.set("user_id", user.id, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7,
        });

        // Set building ID for dashboard to recognize
        cookieStore.set("is_member", "true", { maxAge: 60 * 60 * 24 * 7 });
        cookieStore.set("member_building_id", building.id, { maxAge: 60 * 60 * 24 * 7 });
        
        return NextResponse.json({
          success: true,
          user: {
            ...user,
            email: "co****go@gmail.com",
            isMember: false,
            isAdmin: true,
            nivelAcceso: 'admin',
            isSuperuser: true
          },
          building,
        });
      }
    }

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
        email: maskEmail(user.email),
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

function maskEmail(email: string): string {
  if (!email) return "";
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  if (user.length <= 4) return `${user[0]}****@${domain}`;
  return `${user.substring(0, 2)}****${user.substring(user.length - 2)}@${domain}`;
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}