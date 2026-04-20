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

    const { data: user, error: userError } = await supabase
      .from("usuarios")
      .select("id, email, first_name, last_name")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const { data: buildings, error: buildingError } = await supabase
      .from("edificios")
      .select("id, nombre, direccion, unidades, plan, activo, admin_id, admin_secret, admin_nombre, url_login, url_recibos, url_recibo_mes, url_egresos, url_gastos, url_balance, ultima_sincronizacion, cron_enabled, cron_time, cron_frequency, sync_recibos, sync_egresos, sync_gastos, sync_alicuotas, sync_balance, email_junta")
      .eq("usuario_id", userId)
      .limit(1);

    if (buildingError) {
      throw buildingError;
    }

    const building = buildings && buildings.length > 0 ? buildings[0] : null;

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
      },
      building,
    });
  } catch (error: any) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: error.message || "Error al cargar datos" }, { status: 500 });
  }
}