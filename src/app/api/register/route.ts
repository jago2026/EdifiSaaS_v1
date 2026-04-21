import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { sendWelcomeEmail } from "@/lib/mail";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";
const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_URLS: Record<string, any> = {
  "La Ideal C.A.": {
    url_login: "https://admlaideal.com.ve/condlin.php?r=1",
    url_recibos: "https://admlaideal.com.ve/condlin.php?r=5",
    url_egresos: "https://admlaideal.com.ve/condlin.php?r=21",
    url_gastos: "https://admlaideal.com.ve/condlin.php?r=3",
    url_balance: "https://admlaideal.com.ve/condlin.php?r=2",
  },
  "Administradora AC. Condominios, C.A.": {
    url_login: "https://www.admastridcarrasquel.com/condlin.php",
    url_recibos: "https://www.admastridcarrasquel.com/condlin.php?r=5",
    url_egresos: "https://www.admastridcarrasquel.com/condlin.php?r=21",
    url_gastos: "https://www.admastridcarrasquel.com/condlin.php?r=3",
    url_balance: "https://www.admastridcarrasquel.com/condlin.php?r=2",
    url_alicuotas: "https://www.admastridcarrasquel.com/condlin.php?r=23",
  },
  "Administradora Elite": {
    url_login: "https://www.administradoraelite.com/control.php",
    url_recibos: "https://www.administradoraelite.com/condlin.php?r=5",
    url_egresos: "https://www.administradoraelite.com/condlin.php?r=21",
    url_gastos: "https://www.administradoraelite.com/condlin.php?r=3",
    url_balance: "https://www.administradoraelite.com/condlin.php?r=2",
  },
  "Intercanariven": {
    url_login: "https://www.intercanariven.com/control.php",
    url_recibos: "https://www.intercanariven.com/condlin.php?r=5",
    url_egresos: "https://www.intercanariven.com/condlin.php?r=21",
    url_gastos: "https://www.intercanariven.com/condlin.php?r=3",
    url_balance: "https://www.intercanariven.com/condlin.php?r=2",
  },
  "Administradora Actual, C.A.": {
    url_login: "https://www.admactual.com/control.php",
    url_recibos: "https://www.admactual.com/condlin.php?r=5",
    url_egresos: "https://www.admactual.com/condlin.php?r=21",
    url_gastos: "https://www.admactual.com/condlin.php?r=3",
    url_balance: "https://www.admactual.com/condlin.php?r=2",
  },
  "Condominios Chacao": {
    url_login: "https://condominioschacao.com/control.php",
    url_recibos: "https://condominioschacao.com/condlin.php?r=5",
    url_egresos: "https://condominioschacao.com/condlin.php?r=21",
    url_gastos: "https://condominioschacao.com/condlin.php?r=3",
    url_balance: "https://condominioschacao.com/condlin.php?r=2",
  },
  "Obelisco": {
    url_login: "https://www.obelisco.com.ve/control.php",
    url_recibos: "https://www.obelisco.com.ve/condlin.php?r=5",
    url_egresos: "https://www.obelisco.com.ve/condlin.php?r=21",
    url_gastos: "https://www.obelisco.com.ve/condlin.php?r=3",
    url_balance: "https://www.obelisco.com.ve/condlin.php?r=2",
  },
  "Administradora GCM": {
    url_login: "https://administradoragcm.com/empresa.htm/control.php",
    url_recibos: "https://administradoragcm.com/empresa.htm/condlin.php?r=5",
    url_egresos: "https://administradoragcm.com/empresa.htm/condlin.php?r=21",
    url_gastos: "https://administradoragcm.com/empresa.htm/condlin.php?r=3",
    url_balance: "https://administradoragcm.com/empresa.htm/condlin.php?r=2",
  },
};

function buildUrlsFromDomain(domain: string): any {
  const d = domain.trim();
  const base = d.startsWith("http") ? d : `https://${d}`;
  const cleanBase = base.endsWith("/") ? base.slice(0, -1) : base;
  return {
    url_login: `${cleanBase}/condlin.php`,
    url_recibos: `${cleanBase}/condlin.php?r=5`,
    url_egresos: `${cleanBase}/condlin.php?r=21`,
    url_gastos: `${cleanBase}/condlin.php?r=3`,
    url_balance: `${cleanBase}/condlin.php?r=2`,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, password, nombre, direccion, unidades, admin_nombre, admin_id, admin_secret, custom_domain, url_login, url_recibos, url_egresos, url_gastos, url_balance } = body;

    if (!firstName || !lastName || !email || !password || !nombre || !direccion || !unidades) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const { data: user, error: userError } = await supabase
      .from("usuarios")
      .insert({
        email,
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
      })
      .select()
      .single();

    if (userError) {
      if (userError.code === "23505") {
        return NextResponse.json({ error: "El correo ya está registrado" }, { status: 400 });
      }
      throw userError;
    }

    // Use provided URLs if available, otherwise use defaults based on admin_nombre or custom_domain
    let urls = DEFAULT_URLS[admin_nombre] || {};
    if (custom_domain && admin_nombre === "Otra") {
      urls = buildUrlsFromDomain(custom_domain);
    } else if (url_login) {
      // If custom URLs are provided directly, use those instead
      urls = { url_login, url_recibos, url_egresos, url_gastos, url_balance };
    }
    
    const { data: building, error: buildingError } = await supabase
      .from("edificios")
      .insert({
        nombre,
        direccion,
        unidades: parseInt(unidades),
        usuario_id: user.id,
        admin_nombre: admin_nombre || null,
        admin_id: admin_id || null,
        admin_secret: admin_secret || null,
        url_login: urls.url_login || null,
        url_recibos: urls.url_recibos || null,
        url_egresos: urls.url_egresos || null,
        url_gastos: urls.url_gastos || null,
        url_balance: urls.url_balance || null,
        plan: "profesional",
        activo: true,
      })
      .select()
      .single();

    if (buildingError) {
      await supabase.from("usuarios").delete().eq("id", user.id);
      throw buildingError;
    }

    // Enviar email de bienvenida (sin bloquear la respuesta)
    try {
      sendWelcomeEmail(email, firstName, nombre).catch(e => console.error("Error sending welcome email:", e));
    } catch (e) {
      console.error("Error initiating welcome email:", e);
    }

    const cookieStore = await cookies();
    cookieStore.set("user_id", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({ success: true, userId: user.id, buildingId: building.id });
  } catch (error: any) {
    console.error("Register error:", error);
    return NextResponse.json({ error: error.message || "Error al registrar" }, { status: 500 });
  }
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}