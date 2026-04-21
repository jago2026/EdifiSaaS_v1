import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";
const FALLBACK_TASA = parseFloat(process.env.BCV_FALLBACK_TASA || "481.70");

async function getLastStoredTasa() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data } = await supabase
      .from("tasas_cambio")
      .select("tasa_dolar, fecha")
      .order("fecha", { ascending: false })
      .limit(1);
    return data?.[0] || null;
  } catch (e) {
    console.log("getLastStoredTasa error:", e);
    return null;
  }
}

async function saveTasa(tasa: number, fecha: string, fuente: string) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase.from("tasas_cambio").upsert({
      fecha,
      tasa_dolar: tasa,
      tasa_euro: 0,
      fuente
    }, { onConflict: 'fecha' });
    if (error) console.log("saveTasa error:", error);
    else console.log("saveTasa success:", fecha, tasa, fuente);
  } catch (e) {
    console.log("saveTasa exception:", e);
  }
}

async function fetchWithTimeout(url: string, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

export async function GET() {
  const fechaHoy = new Date().toISOString().split("T")[0];
  const tasas = { dolar: FALLBACK_TASA, euro: 0, fecha: fechaHoy, fuente: "fallback" };
  let fetched = false;

  // Option 1: ve.dolarapi.com (primary)
  try {
    console.log("Trying ve.dolarapi.com...");
    const res = await fetchWithTimeout("https://ve.dolarapi.com/v1/cotizaciones", 5000);
    if (res.ok) {
      const data = await res.json();
      console.log("ve.dolarapi.com response:", JSON.stringify(data));
      const usd = data.find((c: any) => c.moneda === "USD");
      if (usd?.promedio) {
        tasas.dolar = usd.promedio;
        tasas.fecha = usd.fechaActualizacion?.split("T")[0] || fechaHoy;
        tasas.fuente = "ve.dolarapi.com";
        fetched = true;
        console.log("Got tasa from ve.dolarapi.com:", tasas.dolar);
        await saveTasa(tasas.dolar, tasas.fecha, tasas.fuente);
      }
    }
  } catch (e) {
    console.log("ve.dolarapi.com failed:", e);
  }

  // Option 2: bcv-api.rafnixg.dev (fallback)
  if (!fetched) {
    try {
      console.log("Trying bcv-api.rafnixg.dev...");
      const res = await fetchWithTimeout("https://bcv-api.rafnixg.dev/rates/", 5000);
      if (res.ok) {
        const data = await res.json();
        console.log("bcv-api.rafnixg.dev response:", JSON.stringify(data));
        if (data.dollar) {
          tasas.dolar = parseFloat(data.dollar);
          tasas.fecha = data.date || fechaHoy;
          tasas.fuente = "bcv-api.rafnixg.dev";
          fetched = true;
          console.log("Got tasa from bcv-api.rafnixg.dev:", tasas.dolar);
          await saveTasa(tasas.dolar, tasas.fecha, tasas.fuente);
        }
      }
    } catch (e) {
      console.log("bcv-api.rafnixg.dev failed:", e);
    }
  }

  // Option 3: fallback to last stored, then hardcoded
  if (!fetched) {
    console.log("Using fallback, fetching from database...");
    const lastStored = await getLastStoredTasa();
    if (lastStored) {
      tasas.dolar = lastStored.tasa_dolar;
      tasas.fecha = lastStored.fecha;
      tasas.fuente = "historico";
      console.log("Got tasa from database:", tasas.dolar);
    }
  }

  console.log("Final tasas response:", tasas);
  return NextResponse.json({ tasas });
}