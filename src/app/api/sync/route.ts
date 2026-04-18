import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function parseMonto(text: string): number {
  if (!text) return 0;
  let cleaned = text.replace(/[^\d.,-]/g, "");
  if (!cleaned) return 0;
  let numStr = cleaned.replace(/\./g, "").replace(",", ".");
  return parseFloat(numStr) || 0;
}

async function generateHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function normalizeFecha(fecha: string): string {
  const match = fecha?.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  return new Date().toISOString().split('T')[0];
}

function normalizeMes(mesStr: string): string {
  const match = mesStr?.match(/^(\d{2})-(\d{4})$/);
  return match ? `${match[2]}-${match[1]}` : "2026-04";
}

function cleanHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&Aacute;/g, "Á")
    .replace(/&Eacute;/g, "É")
    .replace(/&Iacute;/g, "Í")
    .replace(/&Oacute;/g, "Ó")
    .replace(/&Uacute;/g, "Ú")
    .replace(/&aacute;/g, "á")
    .replace(/&eacute;/g, "é")
    .replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó")
    .replace(/&uacute;/g, "ú")
    .replace(/&ntilde;/g, "ñ")
    .replace(/&Ntilde;/g, "Ñ")
    .replace(/\s+/g, " ")
    .trim();
}

async function loginToRascaCielo(urlLogin: string, password: string): Promise<{ cookie: string, sid: string } | null> {
  try {
    const baseUrl = new URL(urlLogin).origin;
    const formData = new URLSearchParams();
    formData.append("contrasena", password);
    formData.append("contrasena11", password);
    formData.append("B1", "Entrar");
    const res = await fetch(`${baseUrl}/control.php`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT, "Referer": `${baseUrl}/indice.htm` },
      body: formData.toString(),
      redirect: "manual",
    });
    const setCookies = res.headers.get("set-cookie") || "";
    const sidMatch = setCookies.match(/PHPSESSID=([^;]+)/);
    if (!sidMatch) return null;
    const sid = sidMatch[1];
    const cookieHeader = `PHPSESSID=${sid}`;
    await fetch(`${baseUrl}/indice.htm`, { headers: { "Cookie": cookieHeader, "User-Agent": USER_AGENT } });
    return { cookie: cookieHeader, sid };
  } catch (error) { return null; }
}

async function fetchPageWithCookie(url: string, session: { cookie: string, sid: string }): Promise<string | null> {
  try {
    const separator = url.includes('?') ? '&' : '?';
    const res = await fetch(`${url}${separator}PHPSESSID=${session.sid}`, {
      method: "GET",
      headers: { "Cookie": session.cookie, "User-Agent": USER_AGENT, "Referer": "https://admlaideal.com.ve/condlin.php" },
    });
    return await res.text();
  } catch (error) { return null; }
}

// --- EXTRACTORES ---

function parseRecibosTableAll(html: string): any[] {
  const results: any[] = [];
<<<<<<< HEAD
  console.log("[DEBUG RECIBOS] HTML length:", html.length);
  // Localizar tabla según doc
=======
>>>>>>> cf3af33 (Correcciones Egresos, Gastos, KPIs y Alertas - Proyecto EdifiSaaS_v1)
  const tableMatch = html.match(/<table[^>]*class="table table-bordered"[^>]*>([\s\S]*?)<\/table>/i) || 
                     html.match(/<table[^>]*class="table-bordered"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) {
    console.log("[DEBUG RECIBOS] No se encontró tabla");
    return results;
  }
  console.log("[DEBUG RECIBOS] Tabla encontrada");
  const rows = tableMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
  console.log("[DEBUG RECIBOS] Filas encontradas:", rows.length);
  let tUSD = 0, tBS = 0, tCount = 0;
  for (const row of rows) {
    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
    if (!cells || cells.length < 4) continue;
    const unidad = cleanHtml(cells[0]);
    const propietario = cleanHtml(cells[1]);
    const numRecibosCell = cleanHtml(cells[2]);
    const deudaCell = cleanHtml(cells[3]);
<<<<<<< HEAD
    
    // Skip total row - NO agregar duplicado
    if (propietario.includes("TOTALES")) {
      console.log("[DEBUG RECIBOS] Saltando fila TOTALES");
      continue;
    }
    if (!unidad || unidad.length > 15) {
      console.log("[DEBUG RECIBOS] Saltando unidad inválida");
      continue;
    }
    
    // Extraer valor entre paréntesis para USD según doc
=======
    if (propietario.includes("TOTALES")) continue;
    if (!unidad || unidad.length > 15) continue;
>>>>>>> cf3af33 (Correcciones Egresos, Gastos, KPIs y Alertas - Proyecto EdifiSaaS_v1)
    const matchUSD = deudaCell.match(/\(([^\)]+)\)/);
    const mUSD = matchUSD ? Math.abs(parseMonto(matchUSD[1])) : 0;
    const bsMatch = deudaCell.match(/\)\s*[&nbsp;]*\s*([\d.,]+)$/) || [null, deudaCell.split(" ").pop()];
    const mBS = parseMonto(bsMatch[1] || "");
<<<<<<< HEAD
    
    if (mUSD === 0 && mBS === 0) {
      console.log("[DEBUG RECIBOS] Saltando - montos en cero");
      continue;
    }
    
=======
    if (mUSD === 0 && mBS === 0) continue;
>>>>>>> cf3af33 (Correcciones Egresos, Gastos, KPIs y Alertas - Proyecto EdifiSaaS_v1)
    tUSD += mUSD;
    tBS += mBS;
    const nRec = parseInt(numRecibosCell) || 0;
    tCount += nRec;
    results.push({ unidad, propietario, num_recibos: nRec, deuda_usd: mUSD, deuda: mBS });
    console.log(`[DEBUG RECIBOS] Agregado: ${unidad} - ${nRec} recibos - USD: ${mUSD} - BS: ${mBS}`);
  }
<<<<<<< HEAD
  console.log("[DEBUG RECIBOS] Total final:", tCount, "recibos, USD:", tUSD, "BS:", tBS);
  // NO agregar fila TOTAL - el frontend la calcula
=======
  results.push({ unidad: "TOTAL", propietario: "TOTAL GENERAL", num_recibos: tCount, deuda_usd: tUSD, deuda: tBS, isTotal: true });
>>>>>>> cf3af33 (Correcciones Egresos, Gastos, KPIs y Alertas - Proyecto EdifiSaaS_v1)
  return results;
}

function parseEgresosTableAll(html: string): any[] {
  const results: any[] = [];
  const tableMatch = html.match(/<table[^>]*class="table table-bordered"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return results;
  const rows = tableMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
  let totalMonto = 0;
  for (const row of rows) {
    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
    if (!cells || cells.length < 4) continue;
    const texts = cells.map(c => cleanHtml(c));
    if (texts[0].includes("(G)") || texts[1].includes("TOTAL EGRESOS")) continue;
    if (!texts[0].match(/\d{2}-\d{2}-\d{4}/)) continue;
    const m = parseMonto(texts[3]);
    totalMonto += m;
    results.push({ fecha: texts[0], beneficiario: texts[1], operacion: texts[2], monto: m });
  }
<<<<<<< HEAD
  // Return ONLY real rows - no total row inserted to DB
=======
  results.push({ fecha: "2099-12-31", beneficiario: "TOTAL GENERAL", operacion: "Resumen", monto: totalMonto, isTotal: true });
>>>>>>> cf3af33 (Correcciones Egresos, Gastos, KPIs y Alertas - Proyecto EdifiSaaS_v1)
  return results;
}

function parseGastosTable(html: string): any[] {
  const results: any[] = [];
  console.log("[DEBUG GASTOS] HTML length:", html.length);
  
  const tableMatch = html.match(/<table[^>]*class="table table-bordered"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) {
    console.log("[DEBUG GASTOS] No se encontró tabla table-bordered");
    return results;
  }
  console.log("[DEBUG GASTOS] Tabla encontrada, contenido length:", tableMatch[1].length);
  
  const tableContent = tableMatch[1];
  const rows = tableContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
  console.log("[DEBUG GASTOS] Filas encontradas:", rows.length);
  
  let totalGastos = 0;
  let totalGastosFinal = 0;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
    if (!cells || cells.length < 3) continue;
    const code = cleanHtml(cells[0]);
    const desc = cleanHtml(cells[1]);
    const montoCell = cleanHtml(cells[2]);
<<<<<<< HEAD
    
    // Skip empty rows - check code first
    const codeTrimmed = code.trim();
    if (!codeTrimmed || codeTrimmed === '' || codeTrimmed === '&nbsp;') {
      // This might be a TOTAL row - check description
      if (desc.includes("TOTAL GASTOS COMUNES:")) {
        totalGastos = parseMonto(montoCell);
        continue;
=======
    if (!code || code === '&nbsp;' || code.trim() === '') continue;
    if (desc.includes("TOTAL GASTOS COMUNES:") || desc.includes("TOTAL FONDOS:") || desc.includes("TOTAL FONDOS Y GASTOS") || desc.includes("TOTAL GASTOS:")) {
      const m = parseMonto(montoCell);
      if (desc.includes("COMUNES")) totalGastos = m;
      else if (desc.includes("FONDOS:")) totalFondos = m;
      continue;
    }
    if (code === "00001" && desc.includes("FONDO DE RESERVA")) {
      totalFondos = parseMonto(montoCell);
      continue;
    }
    if (code.match(/^\d+$/)) {
      const m = parseMonto(montoCell);
      if (!desc.includes("TOTAL")) {
        results.push({ codigo: code, descripcion: desc, monto: m });
>>>>>>> cf3af33 (Correcciones Egresos, Gastos, KPIs y Alertas - Proyecto EdifiSaaS_v1)
      }
      if (desc.includes("TOTAL GASTOS:")) {
        totalGastosFinal = parseMonto(montoCell);
        continue;
      }
      continue;
    }
    if (!desc || desc.trim() === '') continue;
    
    // Skip FONDO DE RESERVA row (it's a sub-item, not a main expense)
    if (codeTrimmed === "00001" && desc.includes("FONDO DE RESERVA")) {
      continue;
    }
    
    // Only process rows with valid numeric codes (5 digits)
    if (codeTrimmed.match(/^\d{5}$/)) {
      const m = parseMonto(montoCell);
      results.push({ codigo: codeTrimmed, descripcion: desc, monto: m });
    }
  }
<<<<<<< HEAD
  
  console.log("[DEBUG GASTOS] Resultados finales:", results.length, "gastos, total:", totalGastosFinal);
  
  // NO agregar fila TOTAL - el frontend la calcula
=======
  if (totalGastos > 0) results.push({ codigo: "TOTAL", descripcion: "TOTAL GASTOS COMUNES", monto: totalGastos, isTotal: true });
  if (totalFondos > 0) results.push({ codigo: "RESERVA", descripcion: "TOTAL FONDO DE RESERVA", monto: totalFondos, isTotal: true });
>>>>>>> cf3af33 (Correcciones Egresos, Gastos, KPIs y Alertas - Proyecto EdifiSaaS_v1)
  return results;
}

function parseAlicuotasTable(html: string): any[] {
  const results: any[] = [];
  const tableMatch = html.match(/<table[^>]*class="table table-bordered"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return results;
  const rows = tableMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
  for (const row of rows) {
    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
    if (!cells || cells.length < 3) continue;
    const unidad = cleanHtml(cells[0]);
    const propietario = cleanHtml(cells[1]);
    const alicuotaVal = parseMonto(cleanHtml(cells[2]));
    if (propietario.includes("TOTALES") || !unidad || unidad.length > 15) continue;
    results.push({ unidad, propietario, alicuota: alicuotaVal, sincronizado: true });
  }
  return results;
}

function parseBalanceFull(html: string): any {
  const balance: any = {};
  console.log("[DEBUG BALANCE] HTML length:", html.length);
  const allTables = html.match(/<table[^>]*class="table table-bordered"[^>]*>([\s\S]*?)<\/table>/g) || [];
  console.log("[DEBUG BALANCE] Tablas encontradas:", allTables.length);
  for (const t of allTables) {
    if (!t.includes("SALDO DE CAJA") && !t.includes("FONDO DE RESERVA")) continue;
    console.log("[DEBUG BALANCE] Procesando tabla de balance");
    const rows = t.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
    console.log("[DEBUG BALANCE] Filas en tabla:", rows.length);
    for (const row of rows) {
      const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
      if (!cells || cells.length < 2) continue;
      const desc = cleanHtml(cells[0]).toUpperCase();
      const valCell1 = cleanHtml(cells[1]);
      
      // Skip separator rows and empty rows
      if (valCell1 === '--------------------' || valCell1.trim() === '') {
        // But check if this is a "saldo" row (description in first cell, value in second cell)
        if (cells.length >= 3) {
          const saldoCell = cleanHtml(cells[2]);
          const saldo = parseMonto(saldoCell);
          if (saldo !== 0 && desc.trim() !== '') {
            console.log(`[DEBUG BALANCE] ${desc}: saldo only = ${saldo}`);
            if (desc.includes("SALDO ACTUAL DISPONIBLE EN CAJA")) balance.saldo_disponible = saldo;
            else if (desc.includes("TOTAL CONDOMINIOS POR COBRAR")) balance.total_por_cobrar = saldo;
            else if (desc.includes("TOTAL CAJA Y POR COBRAR")) balance.total_caja_y_cobrar = saldo;
            else if (desc.includes("SALDO FONDO DE RESERVA")) balance.fondo_reserva = saldo;
            else if (desc.includes("SALDO FONDO PRESTACIONES SOCIALES")) balance.fondo_prestaciones = saldo;
            else if (desc.includes("SALDO FONDO TRABAJOS VARIOS")) balance.fondo_trabajos_varios = saldo;
            else if (desc.includes("SALDO AJUSTE DIFERENCIA ALICUOTA")) balance.ajuste_alicuota = saldo;
            else if (desc.includes("SALDO FONDO INTERESES MORATORIOS")) balance.fondo_intereses = saldo;
            else if (desc.includes("SALDO FONDO DIFERENCIAL CAMBIARIO TASA BCV")) balance.fondo_diferencial_cambiario = saldo;
            else if (desc.includes("SALDO RESERVAS")) balance.saldo_reservas = saldo;
          }
        }
        continue;
      }
      
      const val = parseMonto(valCell1);
<<<<<<< HEAD
      
      console.log(`[DEBUG BALANCE] ${desc}: val=${val}`);
      
=======
      const saldo = cells.length >= 3 ? parseMonto(cleanHtml(cells[2])) : 0;
      const hasSaldoValue = saldo !== 0 && (cells.length >= 3 && cleanHtml(cells[2]).replace(/[\s,.-]/g, '') !== '');
>>>>>>> cf3af33 (Correcciones Egresos, Gastos, KPIs y Alertas - Proyecto EdifiSaaS_v1)
      if (desc.includes("SALDO DE CAJA MES ANTERIOR")) balance.saldo_anterior = val;
      else if (desc.includes("COBRANZA DEL MES")) balance.cobranza_mes = val;
      else if (desc.includes("GASTOS FACTURADOS EN EL MES COMUNES")) balance.gastos_facturados = val;
      else if (desc.includes("DESC/DIF/CAMB/PAGO A TIEMPO")) balance.ajuste_pago_tiempo = val;
      else if (desc.includes("RECIBOS DE CONDOMINIOS DEL MES")) balance.recibos_mes = val;
      else if (desc.includes("CONDOMINIOS ATRASADOS")) balance.condominios_atrasados = val;
      else if (desc.includes("CONDOMINIOS SOBRANTES")) balance.condominios_sobrantes = val;
<<<<<<< HEAD
      else if (desc.includes("FONDO DE RESERVA MES ANTERIOR")) balance.fondo_reserva_mes_anterior = val;
      else if (desc.includes("FONDO DE PRESTACIONES SOCIALES MES ANTERIOR")) balance.fondo_prestaciones_mes_anterior = val;
      else if (desc.includes("FONDO TRABAJOS VARIOS MES ANTERIOR")) balance.fondo_trabajos_varios_mes_anterior = val;
      else if (desc.includes("AJUSTE DIFERENCIA ALICUOTA MES ANTERIOR")) balance.ajuste_alicuota_mes_anterior = val;
      else if (desc.includes("FONDO INTERESES MORATORIOS MES ANTERIOR")) balance.fondo_intereses_mes_anterior = val;
      else if (desc.includes("FONDO DIFERENCIAL CAMBIARIO TASA BCV MES ANTERIOR")) balance.fondo_diferencial_mes_anterior = val;
      else if (desc.includes("DESC/DIF/CAMB/PAGO A TIEMPO") && desc.includes("DIFERENCIAL")) balance.fondo_diferencial_ajuste = val;
=======
      else if (desc.includes("SALDO RESERVAS")) balance.saldo_reservas = hasSaldoValue ? saldo : val;
      else if (desc.includes("FONDO DE RESERVA") && !desc.includes("MES ANTERIOR")) balance.fondo_reserva = hasSaldoValue ? saldo : val;
      else if (desc.includes("PRESTACIONES SOCIALES")) balance.fondo_prestaciones = hasSaldoValue ? saldo : val;
      else if (desc.includes("TRABAJOS VARIOS")) balance.fondo_trabajos_varios = hasSaldoValue ? saldo : val;
      else if (desc.includes("INTERESES MORATORIOS")) balance.fondo_intereses = hasSaldoValue ? saldo : val;
      else if (desc.includes("DIFERENCIAL CAMBIARIO")) balance.fondo_diferencial_cambiario = hasSaldoValue ? saldo : val;
      else if (desc.includes("AJUSTE DIFERENCIA ALICUOTA")) balance.ajuste_alicuota = hasSaldoValue ? saldo : val;
>>>>>>> cf3af33 (Correcciones Egresos, Gastos, KPIs y Alertas - Proyecto EdifiSaaS_v1)
    }
  }
  return balance;
}

export async function POST(request: Request) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const today = new Date().toISOString().split('T')[0];
  let currentBuildingId: string | null = null;

  try {
    const body = await request.json();
    const { userId, mes } = body;
    const mesEstandar = normalizeMes(mes);
    const { data: building } = await supabase.from("edificios").select("*").eq("usuario_id", userId).single();
    if (!building) return NextResponse.json({ error: "Edificio no encontrado" }, { status: 404 });
    
    currentBuildingId = building.id;
    console.log(`[DEBUG] Iniciando sync para edificio ${building.id} (${building.nombre})`);

    const session = await loginToRascaCielo(building.url_login, building.admin_secret);
    if (!session) {
      await supabase.from("sincronizaciones").insert({
        edificio_id: building.id,
        tipo: "sync",
        estado: "error",
        error: "Fallo de login en Web Admin. Verifica credenciales."
      });
      return NextResponse.json({ error: "Fallo Login" }, { status: 400 });
    }

    const baseUrl = new URL(building.url_login).origin;
    const [hRec, hEgr, hGas, hBal, hAli] = await Promise.all([
      fetchPageWithCookie(`${baseUrl}/condlin.php?r=5`, session),
      fetchPageWithCookie(`${baseUrl}/condlin.php?r=21`, session),
      fetchPageWithCookie(`${baseUrl}/condlin.php?r=3`, session),
      fetchPageWithCookie(`${baseUrl}/condlin.php?r=2`, session),
      fetchPageWithCookie(`${baseUrl}/condlin.php?r=23`, session)
    ]);

    const allRecibos = hRec ? parseRecibosTableAll(hRec) : [];
    console.log("[DEBUG] Recibos extraídos:", allRecibos.length);
    const allEgresos = hEgr ? parseEgresosTableAll(hEgr) : [];
    console.log("[DEBUG] Egresos extraídos:", allEgresos.length);
    const allGastos = hGas ? parseGastosTable(hGas) : [];
    console.log("[DEBUG] Gastos extraídos:", allGastos.length);
    const balance = hBal ? parseBalanceFull(hBal) : null;
    console.log("[DEBUG] Balance extraído:", balance);
    const allAlicuotas = hAli ? parseAlicuotasTable(hAli) : [];
    console.log("[DEBUG] Alicuotas extraídas:", allAlicuotas.length);

    console.log(`[DEBUG] Extraídos: Recibos(${allRecibos.length}), Egresos(${allEgresos.length}), Gastos(${allGastos.length}), Alicuotas(${allAlicuotas.length})`);

    // --- GUARDADO ---
    // Primero: obtener recibos anteriores ANTES de guardar los nuevos
    const { data: prevRecibos } = await supabase
      .from("recibos")
      .select("unidad, deuda")
      .eq("edificio_id", building.id);
    
    const prevRecibosMap = new Map();
    if (prevRecibos) {
      for (const r of prevRecibos) {
        prevRecibosMap.set(r.unidad, r.deuda);
      }
    }
    console.log("[DEBUG] Recibos anteriores:", prevRecibosMap.size);
    
    // Calcular pagos detectados (comparación con anterior sync)
    const pagosDetectados: any[] = [];
    for (const r of allRecibos) {
      const prevDeuda = prevRecibosMap.get(r.unidad) || 0;
      if (prevDeuda > r.deuda) {
        const montoPagado = prevDeuda - r.deuda;
        console.log(`[DEBUG] Pago detectado: ${r.unidad} - Bs${montoPagado} (antes: ${prevDeuda}, ahora: ${r.deuda})`);
        pagosDetectados.push({
          unidad: r.unidad,
          propietario: r.propietario,
          monto_pagado: montoPagado,
          deuda_anterior: prevDeuda,
          deuda_actual: r.deuda
        });
      }
    }
    console.log("[DEBUG] Total pagos detectados:", pagosDetectados.length);
    
    // Guardar recibos actuales
    if (allRecibos.length > 0) {
      await supabase.from("recibos").delete().eq("edificio_id", building.id);
      await supabase.from("recibos").insert(allRecibos.map(r => ({ edificio_id: building.id, unidad: r.unidad, propietario: r.propietario, num_recibos: r.num_recibos, deuda: r.deuda, deuda_usd: r.deuda_usd, sincronizado: true, actualizado_en: today })));
    }
    
    // Guardar pagos detectados como movimientos tipo "pago" y en tabla pagos_recibos
    for (const pago of pagosDetectados) {
      const hash = await generateHash(`PAGO|${pago.unidad}|${pago.monto_pagado}|${today}`);
      await supabase.from("movimientos").upsert({
        edificio_id: building.id,
        tipo: "pago",
        descripcion: `Pago parcial/total - ${pago.unidad} - ${pago.propietario}`,
        monto: pago.monto_pagado,
        fecha: today,
        hash,
        sincronizado: true
      }, { onConflict: 'edificio_id,hash' });
      
      // Guardar en tabla pagos_recibos
      await supabase.from("pagos_recibos").insert({
        edificio_id: building.id,
        unidad: pago.unidad,
        propietario: pago.propietario,
        mes: mesEstandar,
        monto: pago.monto_pagado,
        fecha_pago: today,
        source: "web"
      });
      
      if (mesEstandar === today.substring(0, 7)) {
        await supabase.from("movimientos_dia").insert({
          edificio_id: building.id,
          tipo: "pago",
          descripcion: `Pago - ${pago.unidad}`,
          monto: pago.monto_pagado,
          fecha: today,
          fuente: "recibos",
          detectado_en: today
        });
      }
    }

    if (allAlicuotas.length > 0) {
      await supabase.from("alicuotas").delete().eq("edificio_id", building.id);
      await supabase.from("alicuotas").insert(allAlicuotas.map(a => ({ ...a, edificio_id: building.id })));
    }

// Get previous egresos hashes before saving new ones
    const { data: prevEgresos } = await supabase
      .from("egresos")
      .select("hash")
      .eq("edificio_id", building.id);
    
    const prevEgresosHashes = new Set((prevEgresos || []).map(e => e.hash));
    
    // Get previous gastos hashes before saving new ones
    const { data: prevGastos } = await supabase
      .from("gastos")
      .select("hash")
      .eq("edificio_id", building.id)
      .neq("codigo", "TOTAL");
    
    const prevGastosHashes = new Set((prevGastos || []).map(g => g.hash));

    // Clear movimientos_dia for today before saving new detected movements
    await supabase.from("movimientos_dia").delete().eq("edificio_id", building.id).eq("detectado_en", today);

    // Save egresos and detect NEW movements
    for (const e of allEgresos) {
      const fDB = normalizeFecha(e.fecha);
      const hash = await generateHash(`${fDB}|${e.beneficiario}|${e.monto}`);
      await supabase.from("egresos").upsert({ edificio_id: building.id, fecha: fDB, beneficiario: e.beneficiario, descripcion: e.operacion, monto: e.monto, hash, sincronizado: true, mes: mesEstandar }, { onConflict: 'edificio_id,hash' });
      
      const desc = `${e.operacion} - ${e.beneficiario}`;
      await supabase.from("movimientos").upsert({ edificio_id: building.id, tipo: "egreso", descripcion: desc, monto: e.monto, fecha: fDB, hash, sincronizado: true }, { onConflict: 'edificio_id,hash' });
      
      // Only save to movimientos_dia if this is a NEW movement (hash not seen before)
      if (!prevEgresosHashes.has(hash)) {
        await supabase.from("movimientos_dia").insert({ 
          edificio_id: building.id, 
          tipo: "egreso", 
          descripcion: desc, 
          monto: e.monto, 
          fecha: fDB, 
          fuente: "egresos", 
          detectado_en: today 
        });
      }
    }

    // Save gastos and detect NEW movements
    for (const g of allGastos) {
      const hash = await generateHash(`GASTO|${g.codigo}|${g.monto}|${today}`);
      console.log("[DEBUG] Guardando gasto:", g.codigo, g.descripcion, "monto:", g.monto, "mes:", mesEstandar);
      
      const { data: gastoData, error: gastoError } = await supabase.from("gastos").upsert({ 
        edificio_id: building.id, 
        mes: mesEstandar, 
        fecha: today, 
        codigo: g.codigo, 
        descripcion: g.descripcion, 
        monto: g.monto, 
        hash, 
        sincronizado: true 
      }, { onConflict: 'edificio_id,hash' });
      
      if (gastoError) {
        console.log("[DEBUG] Error guardando gasto:", gastoError);
      } else {
        console.log("[DEBUG] Gasto guardado OK:", g.codigo);
      }
      
      if (!g.isTotal) {
        const { data: movData, error: movError } = await supabase.from("movimientos").upsert({ 
          edificio_id: building.id, 
          tipo: "gasto", 
          descripcion: g.descripcion, 
          monto: g.monto, 
          fecha: today, 
          hash, 
          sincronizado: true 
        }, { onConflict: 'edificio_id,hash' });

        if (movError) {
          console.log("[DEBUG] Error guardando movimiento:", movError);
        }
        
        // Only save to movimientos_dia if this is a NEW movement (hash not seen before)
        if (!prevGastosHashes.has(hash)) {
          await supabase.from("movimientos_dia").insert({ 
            edificio_id: building.id, 
            tipo: "gasto", 
            descripcion: g.descripcion, 
            monto: g.monto, 
            fecha: today, 
            fuente: "gastos", 
            detectado_en: today 
          });
        }
      } else {
        await supabase.from("gastos").upsert({ edificio_id: building.id, mes: mesEstandar, fecha: today, codigo: "TOTAL", descripcion: "TOTAL GENERAL", monto: g.monto, hash: "TOTAL-GASTOS", sincronizado: true }, { onConflict: 'edificio_id,hash' });
      }
    }

    if (balance) {
      console.log("[DEBUG] Guardando balance:", JSON.stringify(balance, null, 2));
      await supabase.from("balances").delete().match({ edificio_id: building.id, mes: mesEstandar });
      const { data: balanceData, error: balanceError } = await supabase.from("balances").insert({ ...balance, edificio_id: building.id, mes: mesEstandar, fecha: today, sincronizado: true });
      if (balanceError) {
        console.log("[DEBUG] Error guardando balance:", balanceError);
      } else {
        console.log("[DEBUG] Balance guardado OK");
      }
    }

    // Guardar registro de sincronización
    const syncMessage = `Recibos: ${allRecibos.length}, Egresos: ${allEgresos.length}, Gastos: ${allGastos.length}, Alicuotas: ${allAlicuotas.length}, Pagos: ${pagosDetectados.length}`;
    const { data: syncData, error: syncError } = await supabase.from("sincronizaciones").insert({
      edificio_id: building.id,
      estado: "completado",
      movimientos_nuevos: allRecibos.length + allEgresos.length + allGastos.length,
      error: syncMessage
    });
    
    if (syncError) {
      console.error("[ERROR] Failed to save sincronizacion:", syncError);
    } else {
      console.log("[DEBUG] Sincronizacion guardada OK");
    }

    // Registrar éxito
    const totalRecs = allRecibos.length + allEgresos.length + allGastos.length;
    await supabase.from("sincronizaciones").insert({
      edificio_id: building.id,
      tipo: "sync",
      estado: "completado",
      movimientos_nuevos: totalRecs,
      error: `Sync completado OK. Recibos: ${allRecibos.length}, Egresos: ${allEgresos.length}, Gastos: ${allGastos.length}`,
      detalles: { stats: { recibos: allRecibos.length, egresos: allEgresos.length, gastos: allGastos.length, alicuotas: allAlicuotas.length } }
    });

    await supabase.from("edificios").update({ ultima_sincronizacion: new Date().toISOString() }).eq("id", building.id);

    return NextResponse.json({ success: true, stats: { recibos: allRecibos.length, egresos: allEgresos.length, gastos: allGastos.length, alicuotas: allAlicuotas.length } });
  } catch (error: any) {
    console.error("[ERROR] Sync catch:", error);
    if (currentBuildingId) {
      await supabase.from("sincronizaciones").insert({
        edificio_id: currentBuildingId,
        tipo: "sync",
        estado: "error",
        error: error.message || "Error desconocido durante la sincronización"
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
