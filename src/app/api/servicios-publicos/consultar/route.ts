import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

// HIDROCAPITAL SCRAPER
async function consultarHidrocapital(nic: string) {
  const URL_BASE = 'https://pagoenlinea.hidrocapital.gob.ve/multistep.php';
  console.log(`[SP][HIDROCAPITAL] Iniciando consulta para N° de Contrato/NIC: ${nic}`);
  try {
    const formData = new URLSearchParams();
    formData.append('nombre', nic);

    const response = await fetch(URL_BASE, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
    });

    console.log(`[SP][HIDROCAPITAL] HTTP Status: ${response.status}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const html = await response.text();
    console.log(`[SP][HIDROCAPITAL] Respuesta recibida (${html.length} bytes). Extrayendo datos...`);
    
    const contratoMatch = html.match(/id="nic"[^>]*value='([^']+)'/);
    const recibosMatch = html.match(/id="numerorecibos"[^>]*value='([^']+)'/);
    const deudaMatch = html.match(/id="deudatotal"[^>]*value='([^']+)'/);

    if (contratoMatch && recibosMatch && deudaMatch) {
      const deuda = parseFloat(deudaMatch[1].replace(/,/g, ''));
      const recibos = parseInt(recibosMatch[1]);
      console.log(`[SP][HIDROCAPITAL] ✅ Datos extraídos: Contrato=${contratoMatch[1]}, Recibos=${recibos}, Deuda=${deuda}`);
      return {
        exitoso: true,
        contrato: contratoMatch[1],
        recibos,
        deuda,
      };
    }
    
    if (html.includes("No se encontraron registros") || html.includes("Cero deuda")) {
      console.log(`[SP][HIDROCAPITAL] ✅ Sin deuda registrada para NIC: ${nic}`);
      return { exitoso: true, contrato: nic, recibos: 0, deuda: 0 };
    }

    console.error(`[SP][HIDROCAPITAL] ❌ No se pudieron extraer los datos. El HTML puede haber cambiado. NIC: ${nic}`);
    return { exitoso: false, error: "No se pudieron extraer los datos del portal de Hidrocapital. El formato de la página puede haber cambiado." };
  } catch (error: any) {
    console.error(`[SP][HIDROCAPITAL] ❌ Excepción: ${error.message}`);
    return { exitoso: false, error: error.message };
  }
}

// CORPOELEC SCRAPER
async function consultarCorpoelec(nic: string) {
  const URL_CONSULTA = 'https://ov-capital.corpoelec.gob.ve/index.php/Login/consultaSaldo';
  console.log(`[SP][CORPOELEC] Iniciando consulta para N° de Cuenta Contrato (NCC): ${nic}`);
  try {
    const formData = new URLSearchParams();
    formData.append('ncc', nic);
    formData.append('id', '');

    const response = await fetch(URL_CONSULTA, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0'
      },
    });

    console.log(`[SP][CORPOELEC] HTTP Status: ${response.status}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const html = await response.text();
    console.log(`[SP][CORPOELEC] Respuesta recibida (${html.length} bytes). Extrayendo datos...`);
    
    const getTxt = (id: string) => {
      let m = html.match(new RegExp(`id=${id}>([^<]+)`, 'i'));
      if (m) return m[1].replace(/&nbsp;/g, ' ').trim();
      m = html.match(new RegExp(`id="${id}">([^<]+)`, 'i'));
      if (m) return m[1].replace(/&nbsp;/g, ' ').trim();
      return null;
    };

    const totalPagarStr = getTxt('l0012051');
    const titular = getTxt('l0004018');
    const cuentaContrato = getTxt('l0003018') || getTxt('l0003002');
    const energiaVencida = getTxt('l0011013') || '0,00';
    const energiaVigente = getTxt('l0011032') || '0,00';
    const totalVencido = getTxt('l0012013') || '0,00';
    const totalVigente = getTxt('l0012032') || '0,00';

    if (totalPagarStr) {
      const deuda = parseFloat(totalPagarStr.replace(/\./g, '').replace(',', '.'));
      console.log(`[SP][CORPOELEC] ✅ Datos extraídos: Titular=${titular}, Cta.Contrato=${cuentaContrato}, Total a Pagar=${totalPagarStr}`);
      return {
        exitoso: true,
        titular,
        cuentaContrato,
        deuda,
        totalPagarStr,
        energiaVencida,
        energiaVigente,
        totalVencido,
        totalVigente,
      };
    }
    console.error(`[SP][CORPOELEC] ❌ El portal no devolvió un saldo válido para NCC: ${nic}`);
    return { exitoso: false, error: "El portal de Corpoelec no devolvió un saldo válido. Verifique el N° de Cuenta Contrato." };
  } catch (error: any) {
    console.error(`[SP][CORPOELEC] ❌ Excepción: ${error.message}`);
    return { exitoso: false, error: error.message };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { configId, edificioId } = body;
    
    console.log(`[SP] POST /consultar - configId=${configId}, edificioId=${edificioId}`);
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: config, error: configError } = await supabase
      .from("servicios_publicos_config")
      .select("*, edificios(nombre, email_junta)")
      .eq("id", configId)
      .single();

    if (configError || !config) {
      console.error(`[SP] Configuración no encontrada para configId=${configId}:`, configError);
      return NextResponse.json({ error: "Configuración no encontrada" }, { status: 404 });
    }

    console.log(`[SP] Procesando tipo=${config.tipo}, identificador=${config.identificador}`);
    let result: any = { exitoso: false, error: "Tipo de servicio no soportado" };

    if (config.tipo === 'hidrocapital') {
      result = await consultarHidrocapital(config.identificador);
    } else if (config.tipo === 'corpoelec') {
      result = await consultarCorpoelec(config.identificador);
    } else if (config.tipo === 'cantv') {
      // CANTV: no tiene portal de consulta directa, registramos la intención
      console.log(`[SP][CANTV] Registro de consulta para N° de Línea: ${config.identificador}`);
      result = { exitoso: true, recordatorio: true, deuda: 0, msg: "CANTV no dispone de portal de consulta en línea. Use el botón 'Enviar Email' para solicitar información a la administradora." };
    }

    console.log(`[SP] Resultado final tipo=${config.tipo}:`, JSON.stringify(result));

    // Guardar en historial usando el schema correcto
    const { error: insertError } = await supabase
      .from("servicios_publicos_consultas")
      .insert({
        config_id: config.id,
        edificio_id: config.edificio_id,
        monto: result.deuda || 0,
        detalle: result,
        exitoso: result.exitoso,
        error: result.error || null,
      });

    if (insertError) {
      console.error(`[SP] Error al guardar historial de consulta:`, insertError);
    } else {
      console.log(`[SP] ✅ Historial de consulta guardado.`);
    }

    if (result.exitoso) {
      const { error: updateError } = await supabase
        .from("servicios_publicos_config")
        .update({
          ultimo_monto: result.deuda || 0,
          ultima_consulta: new Date().toISOString()
        })
        .eq("id", config.id);
      
      if (updateError) {
        console.error(`[SP] Error al actualizar ultima_consulta:`, updateError);
      }
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("[SP] Error general en /consultar:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
