import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

const DEFAULT_URLS_LA_IDEAL = {
  url_login: 'https://admlaideal.com.ve/condlin.php?r=1',
  url_recibos: 'https://admlaideal.com.ve/condlin.php?r=5',
  url_recibo_mes: 'https://admlaideal.com.ve/condlin.php?r=4',
  url_egresos: 'https://admlaideal.com.ve/condlin.php?r=21',
  url_gastos: 'https://admlaideal.com.ve/condlin.php?r=3',
  url_balance: 'https://admlaideal.com.ve/condlin.php?r=2',
  email_administradora: 'adm_laideal@hotmail.com',
};

const DEFAULT_URLS_ASTRI = {
  url_login: 'https://www.admastridcarrasquel.com/condlin.php',
  url_recibos: 'https://www.admastridcarrasquel.com/condlin.php?r=5',
  url_recibo_mes: 'https://www.admastridcarrasquel.com/condlin.php?r=4',
  url_egresos: 'https://www.admastridcarrasquel.com/condlin.php?r=21',
  url_gastos: 'https://www.admastridcarrasquel.com/condlin.php?r=3',
  url_balance: 'https://www.admastridcarrasquel.com/condlin.php?r=2',
  url_alicuotas: 'https://www.admastridcarrasquel.com/condlin.php?r=23',
};

const DEFAULT_URLS_ELITE = {
  url_login: 'https://www.administradoraelite.com/control.php',
  url_recibos: 'https://www.administradoraelite.com/condlin.php?r=5',
  url_recibo_mes: 'https://www.administradoraelite.com/condlin.php?r=4',
  url_egresos: 'https://www.administradoraelite.com/condlin.php?r=21',
  url_gastos: 'https://www.administradoraelite.com/condlin.php?r=3',
  url_balance: 'https://www.administradoraelite.com/condlin.php?r=2',
};

const DEFAULT_URLS_INTERCANAR = {
  url_login: 'https://www.intercanariven.com/control.php',
  url_recibos: 'https://www.intercanariven.com/condlin.php?r=5',
  url_recibo_mes: 'https://www.intercanariven.com/condlin.php?r=4',
  url_egresos: 'https://www.intercanariven.com/condlin.php?r=21',
  url_gastos: 'https://www.intercanariven.com/condlin.php?r=3',
  url_balance: 'https://www.intercanariven.com/condlin.php?r=2',
};

const DEFAULT_URLS_ACTUAL = {
  url_login: 'https://www.admactual.com/control.php',
  url_recibos: 'https://www.admactual.com/condlin.php?r=5',
  url_recibo_mes: 'https://www.admactual.com/condlin.php?r=4',
  url_egresos: 'https://www.admactual.com/condlin.php?r=21',
  url_gastos: 'https://www.admactual.com/condlin.php?r=3',
  url_balance: 'https://www.admactual.com/condlin.php?r=2',
};

const DEFAULT_URLS_CHACAO = {
  url_login: 'https://condominioschacao.com/control.php',
  url_recibos: 'https://condominioschacao.com/condlin.php?r=5',
  url_recibo_mes: 'https://condominioschacao.com/condlin.php?r=4',
  url_egresos: 'https://condominioschacao.com/condlin.php?r=21',
  url_gastos: 'https://condominioschacao.com/condlin.php?r=3',
  url_balance: 'https://condominioschacao.com/condlin.php?r=2',
};

const DEFAULT_URLS_OBELISCO = {
  url_login: 'https://www.obelisco.com.ve/condlin.php?r=1',
  url_recibos: 'https://www.obelisco.com.ve/condlin.php?r=5',
  url_recibo_mes: 'https://www.obelisco.com.ve/condlin.php?r=4',
  url_egresos: 'https://www.obelisco.com.ve/condlin.php?r=21',
  url_gastos: 'https://www.obelisco.com.ve/condlin.php?r=3',
  url_balance: 'https://www.obelisco.com.ve/condlin.php?r=2',
};

const DEFAULT_URLS_GCM = {
  url_login: 'https://administradoragcm.com/empresa.htm/control.php',
  url_recibos: 'https://administradoragcm.com/empresa.htm/condlin.php?r=5',
  url_recibo_mes: 'https://administradoragcm.com/empresa.htm/condlin.php?r=4',
  url_egresos: 'https://administradoragcm.com/empresa.htm/condlin.php?r=21',
  url_gastos: 'https://administradoragcm.com/empresa.htm/condlin.php?r=3',
  url_balance: 'https://administradoragcm.com/empresa.htm/condlin.php?r=2',
};

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    let userId = cookieStore.get("user_id")?.value;

    const body = await request.json();
    const { 
      admin_id, 
      admin_secret, 
      admin_nombre,
      email_administradora,
      url_login,
      url_recibos,
      url_recibo_mes,
      url_egresos,
      url_gastos,
      url_balance,
      fecha_inicio,
      saldo_inicial,
      saldo_inicial_usd,
      sync_recibos,
      sync_egresos,
      sync_gastos,
      sync_alicuotas,
      sync_balance,
      cron_enabled,
      cron_time,
      cron_frequency,
      unidades,
      dashboard_config,
      alert_thresholds,
      userId: bodyUserId 
    } = body;

    if (!userId && bodyUserId) {
      userId = bodyUserId;
    }

    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    let urls: Record<string, string> = {};
    if (admin_nombre === "La Ideal C.A.") {
      urls = DEFAULT_URLS_LA_IDEAL;
    } else if (admin_nombre === "Administradora Elite") {
      urls = DEFAULT_URLS_ELITE;
    } else if (admin_nombre === "Administradora AC. Condominios, C.A.") {
      urls = DEFAULT_URLS_ASTRI;
    } else if (admin_nombre === "Intercanariven") {
      urls = DEFAULT_URLS_INTERCANAR;
    } else if (admin_nombre === "Administradora Actual, C.A.") {
      urls = DEFAULT_URLS_ACTUAL;
    } else if (admin_nombre === "Condominios Chacao") {
      urls = DEFAULT_URLS_CHACAO;
    } else if (admin_nombre === "Obelisco") {
      urls = DEFAULT_URLS_OBELISCO;
    } else if (admin_nombre === "Administradora GCM") {
      urls = DEFAULT_URLS_GCM;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const updateData: any = {
      admin_secret: admin_secret || null,
      admin_nombre: admin_nombre || null,
    };

    if (fecha_inicio) updateData.fecha_inicio = fecha_inicio;
    if (saldo_inicial) updateData.saldo_inicial = saldo_inicial;
    if (saldo_inicial_usd) updateData.saldo_inicial_usd = saldo_inicial_usd;

    if (email_administradora) updateData.email_administradora = email_administradora;
    else if (urls.email_administradora) updateData.email_administradora = urls.email_administradora;

    if (url_login) updateData.url_login = url_login;
    else if (Object.keys(urls).length > 0) updateData.url_login = urls.url_login;

    if (url_recibos) updateData.url_recibos = url_recibos;
    else if (urls.url_recibos) updateData.url_recibos = urls.url_recibos;

    if (url_recibo_mes) updateData.url_recibo_mes = url_recibo_mes;
    else if (urls.url_recibo_mes) updateData.url_recibo_mes = urls.url_recibo_mes;

    if (url_egresos) updateData.url_egresos = url_egresos;
    else if (urls.url_egresos) updateData.url_egresos = urls.url_egresos;

    if (url_gastos) updateData.url_gastos = url_gastos;
    else if (urls.url_gastos) updateData.url_gastos = urls.url_gastos;

    if (url_balance) updateData.url_balance = url_balance;
    else if (urls.url_balance) updateData.url_balance = urls.url_balance;

    if (sync_recibos !== undefined) updateData.sync_recibos = sync_recibos;
    if (sync_egresos !== undefined) updateData.sync_egresos = sync_egresos;
    if (sync_gastos !== undefined) updateData.sync_gastos = sync_gastos;
    if (sync_alicuotas !== undefined) updateData.sync_alicuotas = sync_alicuotas;
    if (sync_balance !== undefined) updateData.sync_balance = sync_balance;
    if (cron_enabled !== undefined) updateData.cron_enabled = cron_enabled;
    if (cron_time) updateData.cron_time = cron_time;
    if (cron_frequency) updateData.cron_frequency = cron_frequency;
    if (unidades !== undefined) updateData.unidades = unidades;
    if (dashboard_config !== undefined) updateData.dashboard_config = dashboard_config;
    if (alert_thresholds !== undefined) updateData.alert_thresholds = alert_thresholds;

    const { data: building, error } = await supabase
      .from("edificios")
      .update(updateData)
      .eq("usuario_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Config update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, building });
  } catch (error: any) {
    console.error("Config error:", error);
    return NextResponse.json({ error: error.message || "Error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: building, error } = await supabase
      .from("edificios")
      .select("*")
      .eq("usuario_id", userId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ building });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error" }, { status: 500 });
  }
}