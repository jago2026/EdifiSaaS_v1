import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get("userId");
    
    if (!userId) {
      const cookieStore = await cookies();
      userId = cookieStore.get("user_id")?.value || null;
    }

    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const cookieStore = await cookies();
    const isMember = cookieStore.get("is_member")?.value === "true";
    const memberBuildingId = cookieStore.get("member_building_id")?.value;

    console.log(`[DASHBOARD] Buscando datos para userId: ${userId}. Es Miembro: ${isMember}`);

    let user = null;
    let requiereCambioClave = false;
    let isAdmin = false;
    let nivelAcceso = 'viewer';

    if (userId === "superuser-id") {
      user = { id: "superuser-id", email: "co****go@gmail.com", first_name: "Super", last_name: "Usuario" };
      isAdmin = true;
      nivelAcceso = 'admin';
    } else if (isMember) {
      const { data: member, error: memberError } = await supabase
        .from("junta")
        .select("id, email, nombre, requiere_cambio_clave, es_propietario, nivel_acceso")
        .eq("id", userId)
        .single();
      
      if (member) {
        user = {
          id: member.id,
          email: member.email,
          first_name: member.nombre?.split(" ")[0] || "Miembro",
          last_name: member.nombre?.split(" ").slice(1).join(" ") || "Junta"
        };
        requiereCambioClave = member.requiere_cambio_clave;
        isAdmin = member.es_propietario;
        nivelAcceso = member.nivel_acceso || 'board';
      }
    } else {
      const { data: admin, error: adminError } = await supabase
        .from("usuarios")
        .select("id, email, first_name, last_name")
        .eq("id", userId)
        .single();
      user = admin;
      isAdmin = true; 
      nivelAcceso = 'admin';
    }

    if (!user) {
      console.log(`[DASHBOARD] Error: Usuario ${userId} no encontrado en ninguna tabla.`);
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const buildingQuery = supabase
      .from("edificios")
      .select("id, nombre, direccion, unidades, plan, activo, admin_id, admin_secret, admin_nombre, url_login, url_recibos, url_recibo_mes, url_egresos, url_gastos, url_balance, ultima_sincronizacion, cron_enabled, cron_time, cron_frequency, sync_recibos, sync_egresos, sync_gastos, sync_alicuotas, sync_balance, email_junta");

    if (userId === "superuser-id" && edificioId) {
      buildingQuery.eq("id", edificioId);
    } else if (isMember && memberBuildingId) {
      buildingQuery.eq("id", memberBuildingId);
    } else {
      buildingQuery.eq("usuario_id", user.id);
    }

    const { data: buildings, error: buildingError } = await buildingQuery.limit(1);

    if (buildingError) {
      throw buildingError;
    }

    const building = buildings && buildings.length > 0 ? buildings[0] : null;
    console.log(`[DASHBOARD] Datos cargados para ${user.email}. Edificio: ${building?.nombre || 'Ninguno'}`);

    return NextResponse.json({
      user: {
        ...user,
        isMember,
        isAdmin,
        nivelAcceso,
        requiereCambioClave
      },
      building,
    });
  } catch (error: any) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: error.message || "Error al cargar datos" }, { status: 500 });
  }
}