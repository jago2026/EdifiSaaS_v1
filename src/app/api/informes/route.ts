import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const edificioId = searchParams.get("edificioId");

    if (!edificioId) {
      return NextResponse.json({ error: "Falta edificioId" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === "resumen_fecha") {
      const fecha = searchParams.get("fecha");
      if (!fecha) {
        return NextResponse.json({ error: "Falta fecha" }, { status: 400 });
      }

      const { data, error } = await supabase
        .from("control_diario")
        .select("*")
        .eq("edificio_id", edificioId)
        .eq("fecha", fecha)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is 0 rows returned
        throw error;
      }

      return NextResponse.json({ data: data || null });
    }

    if (action === "gastos_recurrentes") {
      const { data: recurrentes, error } = await supabase
        .from("gastos_recurrentes")
        .select("*")
        .eq("edificio_id", edificioId)
        .order("descripcion", { ascending: true });

      if (error) throw error;

      // Calcular frecuencia desde recibos_detalle
      const { data: freqData } = await supabase
        .from("recibos_detalle")
        .select("codigo")
        .eq("edificio_id", edificioId);
      
      const freqMap = new Map();
      (freqData || []).forEach((f: any) => {
        const count = freqMap.get(f.codigo) || 0;
        freqMap.set(f.codigo, count + 1);
      });

      const result = (recurrentes || []).map((r: any) => ({
        ...r,
        frecuencia: freqMap.get(r.codigo) || 0
      }));

      return NextResponse.json({ data: result });
    }

    if (action === "evolucion_recurrentes") {
      // Obtener detalles de recibos filtrando solo por códigos activos en gastos_recurrentes
      const { data: recurrentes } = await supabase
        .from("gastos_recurrentes")
        .select("codigo, descripcion, categoria")
        .eq("edificio_id", edificioId)
        .eq("activo", true);
      
      if (!recurrentes || recurrentes.length === 0) {
        return NextResponse.json({ data: [] });
      }

      const codigos = recurrentes.map((r: any) => r.codigo);

      const { data: detalles, error } = await supabase
        .from("recibos_detalle")
        .select("mes, codigo, descripcion, monto, cuota_parte")
        .eq("edificio_id", edificioId)
        .in("codigo", codigos)
        .order("mes", { ascending: true });

      if (error) throw error;

      // Obtener tasas de cambio históricas desde control_diario para cada mes
      const { data: tasas } = await supabase
        .from("control_diario")
        .select("fecha, tasa_cambio")
        .eq("edificio_id", edificioId)
        .order("fecha", { ascending: true });

      // Mapear el último día de cada mes a su tasa
      const tasaMesMap = new Map();
      (tasas || []).forEach((t: any) => {
        const mesStr = t.fecha.substring(0, 7); // YYYY-MM
        tasaMesMap.set(mesStr, Number(t.tasa_cambio));
      });

      // Agrupar por mes y categoría
      const mapRecurrente = new Map();
      recurrentes.forEach((r: any) => mapRecurrente.set(r.codigo, r.categoria));

      const evolucion: any = {};
      (detalles || []).forEach((d: any) => {
        if (!evolucion[d.mes]) {
          evolucion[d.mes] = { 
            mes: d.mes, 
            total: 0, 
            total_usd: 0, 
            categorias: {}, 
            categorias_usd: {},
            tasa: tasaMesMap.get(d.mes) || 0
          };
        }
        const cat = mapRecurrente.get(d.codigo) || 'otros';
        if (!evolucion[d.mes].categorias[cat]) {
          evolucion[d.mes].categorias[cat] = 0;
          evolucion[d.mes].categorias_usd[cat] = 0;
        }
        
        const monto = Number(d.monto);
        const tasa = evolucion[d.mes].tasa;
        const montoUsd = tasa > 0 ? monto / tasa : 0;

        evolucion[d.mes].total += monto;
        evolucion[d.mes].total_usd += montoUsd;
        evolucion[d.mes].categorias[cat] += monto;
        evolucion[d.mes].categorias_usd[cat] += montoUsd;
      });

      return NextResponse.json({ data: Object.values(evolucion) });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error: any) {
    console.error("Informes API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, edificioId, data } = body;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === "update_recurrentes") {
      // data: { codigo, activo, categoria }
      const { error } = await supabase
        .from("gastos_recurrentes")
        .upsert({
          edificio_id: edificioId,
          codigo: data.codigo,
          descripcion: data.descripcion,
          activo: data.activo,
          categoria: data.categoria
        }, { onConflict: 'edificio_id,codigo' });

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error: any) {
    console.error("Informes API POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
