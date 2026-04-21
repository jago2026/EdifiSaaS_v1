import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export async function getSmartTasa(fechaBusqueda: string): Promise<number> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const [year, month, day] = fechaBusqueda.split("-");

  try {
    // 1. Intentar fecha exacta
    let { data } = await supabase
      .from("tasas_cambio")
      .select("tasa_dolar")
      .eq("fecha", fechaBusqueda)
      .maybeSingle();

    if (data?.tasa_dolar) return parseFloat(data.tasa_dolar);

    // 2. Intentar fecha más cercana (inferior o superior)
    let { data: cercana } = await supabase
      .from("tasas_cambio")
      .select("tasa_dolar")
      .order("fecha", { ascending: false })
      .filter("fecha", "lte", fechaBusqueda)
      .limit(1)
      .maybeSingle();
    
    if (cercana?.tasa_dolar) return parseFloat(cercana.tasa_dolar);

    // 3. Intentar último día del mes del movimiento
    const ultimoDiaMes = new Date(parseInt(year), parseInt(month), 0).toISOString().split("T")[0];
    let { data: mesTasa } = await supabase
      .from("tasas_cambio")
      .select("tasa_dolar")
      .eq("fecha", ultimoDiaMes)
      .maybeSingle();

    if (mesTasa?.tasa_dolar) return parseFloat(mesTasa.tasa_dolar);

    // 4. Intentar tasa más reciente del sistema (Cualquier fecha)
    let { data: ultima } = await supabase
      .from("tasas_cambio")
      .select("tasa_dolar")
      .order("fecha", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ultima?.tasa_dolar) return parseFloat(ultima.tasa_dolar);

    // 5. Fallback definitivo (Actualizado a tasa real reciente)
    return 481.70;
  } catch (e) {
    console.error("Error en getSmartTasa:", e);
    return 481.70;
  }
}
