import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

function formatNumber(num: number, decimals: number = 2): string {
  if (num === undefined || num === null || isNaN(num)) return "-";
  const parts = num.toFixed(decimals).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return parts.join(',');
}

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
      let { data: recurrentes, error } = await supabase
        .from("gastos_recurrentes")
        .select("*")
        .eq("edificio_id", edificioId)
        .order("descripcion", { ascending: true });

      if (error) throw error;

      // AUTO-SANACIÓN: Si no hay registros en gastos_recurrentes, intentar extraer de recibos_detalle
      if (!recurrentes || recurrentes.length === 0) {
        console.log("Gastos recurrentes vacíos, intentando auto-sanación desde recibos_detalle...");
        const { data: fromDetails } = await supabase
          .from("recibos_detalle")
          .select("codigo, descripcion")
          .eq("edificio_id", edificioId);
        
        if (fromDetails && fromDetails.length > 0) {
          const uniqueCodes = new Map();
          fromDetails.forEach((d: any) => {
            if (d.codigo && d.codigo !== '&nbsp;' && !uniqueCodes.has(d.codigo)) {
              uniqueCodes.set(d.codigo, d.descripcion);
            }
          });

          // Insertar automáticamente los conceptos encontrados
          for (const [code, desc] of Array.from(uniqueCodes.entries())) {
            await supabase.from("gastos_recurrentes").upsert({
              edificio_id: edificioId,
              codigo: code,
              descripcion: desc,
              activo: true,
              categoria: 'otros'
            }, { onConflict: 'edificio_id,codigo' });
          }

          // Volver a cargar la lista ya poblada
          const { data: retryData } = await supabase
            .from("gastos_recurrentes")
            .select("*")
            .eq("edificio_id", edificioId)
            .order("descripcion", { ascending: true });
          recurrentes = retryData;
        }
      }

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

      // 1. Obtener tasas desde control_diario
      const { data: tasasControl } = await supabase
        .from("control_diario")
        .select("fecha, tasa_cambio")
        .eq("edificio_id", edificioId)
        .order("fecha", { ascending: true });

      // 2. Obtener tasas maestras como respaldo
      const { data: tasasMaestras } = await supabase
        .from("tasas_cambio")
        .select("fecha, tasa_dolar")
        .order("fecha", { ascending: true });

      // Mapear tasas por mes (YYYY-MM)
      const tasaMesMap = new Map();
      
      // Llenar con tasas maestras primero
      (tasasMaestras || []).forEach((t: any) => {
        const mesStr = t.fecha.substring(0, 7);
        tasaMesMap.set(mesStr, Number(t.tasa_dolar));
      });

      // Sobrescribir con tasas de control_diario si existen (más precisas por edificio)
      (tasasControl || []).forEach((t: any) => {
        const mesStr = t.fecha.substring(0, 7);
        tasaMesMap.set(mesStr, Number(t.tasa_cambio));
      });

      // Tasa por defecto (última conocida)
      const lastTasa = Array.from(tasaMesMap.values()).pop() || 45.50;

      // Agrupar por mes y categoría
      const mapRecurrente = new Map();
      recurrentes.forEach((r: any) => mapRecurrente.set(r.codigo, r.categoria));

      const evolucion: any = {};
      (detalles || []).forEach((d: any) => {
        if (!evolucion[d.mes]) {
          const mesKey = d.mes.includes("-") && d.mes.split("-")[0].length === 4 ? d.mes : 
                         d.mes.includes("-") ? `${d.mes.split("-")[1]}-${d.mes.split("-")[0]}` : d.mes;
          
          evolucion[d.mes] = { 
            mes: d.mes, 
            total: 0, 
            total_usd: 0, 
            categorias: {}, 
            categorias_usd: {},
            tasa: tasaMesMap.get(mesKey) || lastTasa
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

    if (action === "auditoria") {
      const alerts: any[] = [];

      // 1. Números de Operación Reutilizados
      const { data: refsMov } = await supabase.from("movimientos").select("nro_referencia, fecha, descripcion, monto").not("nro_referencia", "is", null);
      const { data: refsPagos } = await supabase.from("pagos_recibos").select("nro_referencia, fecha_pago, monto").not("nro_referencia", "is", null);
      
      const refCounts = new Map();
      [...(refsMov || []), ...(refsPagos || [])].forEach((r: any) => {
        if (!r.nro_referencia || r.nro_referencia === '0' || r.nro_referencia === '') return;
        const existing = refCounts.get(r.nro_referencia) || [];
        refCounts.set(r.nro_referencia, [...existing, r]);
      });

      for (const [ref, occurrences] of Array.from(refCounts.entries())) {
        if (occurrences.length > 1) {
          alerts.push({
            tipo: 'Duplicidad',
            severidad: 'alta',
            titulo: `Referencia Bancaria Reutilizada: ${ref}`,
            descripcion: `Se detectaron ${occurrences.length} movimientos con el mismo número de operación en distintas fechas o montos.`,
            detalles: occurrences
          });
        }
      }

      // 2. Gastos "Huérfanos" (Facturación sin Egreso)
      const { data: allGastos } = await supabase.from("gastos").select("mes, descripcion, monto").eq("edificio_id", edificioId);
      const { data: allEgresos } = await supabase.from("egresos").select("mes, beneficiario, monto").eq("edificio_id", edificioId);

      const mesGastoMap = new Map();
      (allGastos || []).forEach(g => {
        const key = `${g.mes}_${Number(g.monto).toFixed(2)}`;
        mesGastoMap.set(key, (mesGastoMap.get(key) || 0) + 1);
      });

      const egresosHuerfanos = (allEgresos || []).filter(e => {
        const key = `${e.mes}_${Number(e.monto).toFixed(2)}`;
        return !mesGastoMap.has(key);
      });

      if (egresosHuerfanos.length > 0) {
        alerts.push({
          tipo: 'Descuadre',
          severidad: 'media',
          titulo: 'Egresos sin Gasto Facturado',
          descripcion: `Hay ${egresosHuerfanos.length} egresos bancarios que no tienen un gasto común equivalente registrado en el mes.`,
          detalles: egresosHuerfanos.slice(0, 5)
        });
      }

      // 3. Análisis de "Caja Negra"
      const genericKeywords = ['VARIOS', 'AJUSTE', 'TRANSFERENCIA', 'PAGO', 'S/D', 'VARIO'];
      const cajaNegra = (allEgresos || []).filter(e => 
        genericKeywords.some(kw => e.beneficiario?.toUpperCase().includes(kw)) || !e.beneficiario
      );

      if (cajaNegra.length > 0) {
        alerts.push({
          tipo: 'Transparencia',
          severidad: 'baja',
          titulo: 'Análisis de Caja Negra',
          descripcion: `Se detectaron ${cajaNegra.length} egresos con descripciones genéricas que dificultan la auditoría.`,
          detalles: cajaNegra.slice(0, 5)
        });
      }

      // 4. Desvío del Gasto Fijo Recurrente (> 15%)
      const { data: recs } = await supabase.from("gastos_recurrentes").select("codigo, descripcion").eq("edificio_id", edificioId).eq("activo", true);
      const { data: dets } = await supabase.from("recibos_detalle").select("mes, codigo, monto").eq("edificio_id", edificioId).order("mes", { ascending: false });

      if (recs && recs.length > 0 && dets && dets.length > 0) {
        recs.forEach(r => {
          const historial = dets.filter(d => d.codigo === r.codigo).map(d => Number(d.monto));
          if (historial.length >= 2) {
            const actual = historial[0];
            const promedioAnterior = historial.slice(1, 7).reduce((a, b) => a + b, 0) / Math.min(historial.length - 1, 6);
            if (promedioAnterior > 0) {
              const desviacion = Math.abs((actual - promedioAnterior) / promedioAnterior);
              if (desviacion > 0.15) {
                alerts.push({
                  tipo: 'Presupuesto',
                  severidad: 'media',
                  titulo: `Desvío en Gasto Recurrente: ${r.descripcion}`,
                  descripcion: `El monto actual (Bs. ${formatNumber(actual)}) se desvía un ${(desviacion * 100).toFixed(1)}% del promedio histórico.`,
                  valor_actual: actual,
                  promedio: promedioAnterior
                });
              }
            }
          }
        });
      }

      return NextResponse.json({ data: alerts });
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
