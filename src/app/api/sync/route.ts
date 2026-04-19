import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function parseMonto(text: string): number {
  if (!text) return 0;
  let cleaned = text.replace(/[^\d.,-]/g, "");
  if (!cleaned) return 0;
  // Handle Venezuelan format: 1.178.587,11 -> 1178587.11
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
  return match ? `${match[2]}-${match[1]}` : new Date().toISOString().substring(0, 7);
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
    .replace(/&nbsp;/g, " ")
    .replace(/&TIMES;/gi, "")
    .replace(/&#8209;/g, "-")
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

function parseReciboDetalle(html: string): any[] {
  const results: any[] = [];
  const tableMatch = html.match(/<table[^>]*class="table table-bordered"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return results;

  const rows = tableMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
  
  for (const row of rows) {
    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
    if (!cells || cells.length < 3) continue;

    const code = cleanHtml(cells[0]);
    const desc = cleanHtml(cells[1]);
    const monto = parseMonto(cleanHtml(cells[2]));
    const cuotaParte = cells.length >= 4 ? parseMonto(cleanHtml(cells[3])) : 0;

    if (!code || code === "&nbsp;" || code.trim() === "") continue;
    if (!code.match(/^\d{5}$/)) continue;

    results.push({ codigo: code, descripcion: desc, monto, cuota_parte: cuotaParte });
  }
  return results;
}
function parseReceiptMonthlySummary(html: string): number {
  if (!html) return 0;
  // Basado en el HTML del usuario, el total está en una celda que sigue a "TOTAL RECIBO:"
  // Ejemplo: <tr><td>&nbsp;</td><td style='padding-left:50px;'>TOTAL RECIBO:</td><td align=right>&nbsp;</td><td align=right>31.884,99</td></tr>
  const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    const rowText = cleanHtml(row).toUpperCase();
    if (rowText.includes("TOTAL RECIBO")) {
      const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
      if (cells && cells.length > 0) {
        // Buscamos el último valor numérico en la fila
        for (let j = cells.length - 1; j >= 0; j--) {
          const val = parseMonto(cleanHtml(cells[j]));
          if (val > 0) return val;
        }
      }
    }
  }
  return 0;
}

function parseRecibosTableAll(html: string): any[] {
  const results: any[] = [];
  const tableMatch = html.match(/<table[^>]*class="table table-bordered"[^>]*>([\s\S]*?)<\/table>/i) || 
                     html.match(/<table[^>]*class="table-bordered"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return results;
  const rows = tableMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
  for (const row of rows) {
    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
    if (!cells || cells.length < 4) continue;
    const unidad = cleanHtml(cells[0]);
    const propietario = cleanHtml(cells[1]);
    const numRecibosCell = cleanHtml(cells[2]);
    const deudaCell = cleanHtml(cells[3]);
    
    if (propietario.includes("TOTALES")) continue;
    if (!unidad || unidad.length > 15) continue;

    const matchUSD = deudaCell.match(/\(([^\)]+)\)/);
    const mUSD = matchUSD ? Math.abs(parseMonto(matchUSD[1])) : 0;
    const bsMatch = deudaCell.match(/\)\s*[&nbsp;]*\s*([\d.,]+)$/) || [null, deudaCell.split(" ").pop()];
    const mBS = parseMonto(bsMatch[1] || "");

    if (mUSD === 0 && mBS === 0) continue;

    const nRec = parseInt(numRecibosCell) || 0;
    results.push({ unidad, propietario, num_recibos: nRec, deuda_usd: mUSD, deuda: mBS });
  }
  return results;
}

function parseEgresosTableAll(html: string): any[] {
  const results: any[] = [];
  const tableMatch = html.match(/<table[^>]*class="table table-bordered"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return results;
  const rows = tableMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
  for (const row of rows) {
    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
    if (!cells || cells.length < 4) continue;
    const texts = cells.map(c => cleanHtml(c));
    if (texts[0].includes("(G)") || texts[1].includes("TOTAL EGRESOS") || texts[1].includes("TOTAL GENERAL")) continue;
    if (!texts[0].match(/\d{2}-\d{2}-\d{4}/)) continue;
    const m = parseMonto(texts[3]);
    results.push({ fecha: texts[0], beneficiario: texts[1], operacion: texts[2], monto: m });
  }
  return results;
}

function parseGastosTable(html: string): any[] {
  const results: any[] = [];
  const tableMatch = html.match(/<table[^>]*class="table table-bordered"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return results;
  const tableContent = tableMatch[1];
  const rows = tableContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
  for (const row of rows) {
    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
    if (!cells || cells.length < 3) continue;
    const code = cleanHtml(cells[0]);
    const desc = cleanHtml(cells[1]);
    const montoCell = cleanHtml(cells[2]);
    if (!code || code === '&nbsp;' || code.trim() === '') continue;
    if (desc.includes("TOTAL GASTOS COMUNES:") || desc.includes("TOTAL FONDOS:") || desc.includes("TOTAL FONDOS Y GASTOS") || desc.includes("TOTAL GASTOS:")) {
      continue;
    }
    if (code === "00001" && desc.includes("FONDO DE RESERVA")) {
      continue;
    }
    if (code.match(/^\d+$/)) {
      const m = parseMonto(montoCell);
      if (!desc.includes("TOTAL")) {
        results.push({ codigo: code, descripcion: desc, monto: m });
      }
    }
  }
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
  
  // 1. ELIMINAR SCRIPTS, ESTILOS, CABECERAS Y NAVEGACIÓN
  const cleanHtmlOnly = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ');

  // 2. REEMPLAZAR ENTIDADES HTML COMUNES Y LIMPIAR ETIQUETAS
  const rawText = cleanHtmlOnly
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8209;/g, '-')
    .replace(/&times;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
    
  const text = rawText.toUpperCase();
  
  // Debug: show full cleaned text to find balance data
  console.log(`Balance Text Clean (primeros 1500 chars): ${text.substring(0, 1500)}`);
  console.log(`[Balance] Looking for: SALDO DE CAJA MES ANTERIOR at pos: ${text.indexOf('SALDO DE CAJA MES ANTERIOR')}`);
  console.log(`[Balance] Looking for: COBRANZA DEL MES at pos: ${text.indexOf('COBRANZA DEL MES')}`);
  console.log(`[Balance] Looking for: GASTOS FACTURADOS at pos: ${text.indexOf('GASTOS FACTURADOS')}`);
  console.log(`[Balance] Looking for: SALDO ACTUAL at pos: ${text.indexOf('SALDO ACTUAL')}`);
  
  // 3. FUNCIÓN DE EXTRACCIÓN POR PROXIMIDAD (Busca el primer número real después de la etiqueta)
  const extractVal = (keywords: string[]) => {
    for (const kw of keywords) {
      const idx = text.indexOf(kw.toUpperCase());
      if (idx !== -1) {
        // Mirar hasta 150 caracteres después de la palabra clave
        const sub = text.substring(idx + kw.length, idx + kw.length + 150);
        // Expresión regular para capturar números con formato Bs. (ej: 1.234,56 o 1234.56)
        const match = sub.match(/(\d[\d,.]*)/);
        if (match) {
          const val = parseMonto(match[1]);
          if (val > 0.01) return val; // Ignorar ceros técnicos
        }
      }
    }
    return null;
  };

  // Palabras clave mucho más flexibles y cortas para mayor probabilidad de éxito
  balance.saldo_anterior = extractVal(["SALDO DE CAJA MES ANTERIOR", "SALDO ANTERIOR", "CAJA ANTERIOR", "SALDO MES ANTERIOR"]);
  balance.cobranza_mes = extractVal(["COBRANZA DEL MES", "TOTAL COBRADO", "INGRESOS DEL MES", "TOTAL INGRESOS", "RECIBOS COBRADOS"]);
  balance.gastos_facturados = extractVal(["GASTOS FACTURADOS", "TOTAL GASTOS", "EGRESOS DEL MES", "TOTAL EGRESOS", "PAGOS REALIZADOS"]);
  balance.saldo_disponible = extractVal(["SALDO ACTUAL DISPONIBLE", "SALDO DISPONIBLE", "SALDO EN CAJA", "DISPONIBILIDAD EN CAJA", "SALDO ACTUAL EN CAJA"]);
  balance.recibos_mes = extractVal(["RECIBOS DE CONDOMINIOS DEL MES", "EMISION DEL MES", "TOTAL RECIBOS DEL MES", "EMISION TOTAL"]);
  balance.total_por_cobrar = extractVal(["TOTAL CONDOMINIOS POR COBRAR", "TOTAL POR COBRAR", "SALDO POR COBRAR", "CUENTAS POR COBRAR"]);
  balance.fondo_reserva = extractVal(["SALDO FONDO DE RESERVA", "FONDO DE RESERVA SALDO", "RESERVA SALDO", "SALDO RESERVA"]);

  // 4. Extraer TODOS los campos del texto (más confiable que las tablas vacías)
  const extractFromText = (keywords: string[], isNegative = false) => {
    for (const kw of keywords) {
      const idx = text.indexOf(kw);
      if (idx !== -1) {
        // Buscar número en los siguientes 100 caracteres (incluye negativo)
        const subs = text.substring(idx + kw.length, idx + kw.length + 100);
        // Captura número con signo negativo opcional
        const match = subs.match(/(-?[\d.,]+)/);
        if (match) {
          let val = parseMonto(match[1]);
          // Si el texto tiene signo negativo explícito, invertir valor
          if (subs.includes('-') && !match[1].startsWith('-')) {
            val = -Math.abs(val);
          }
          if (isNegative && val > 0) val = -val;
          return val;
        }
      }
    }
    return null;
  };

  // Extracción por texto del Balance Original
  balance.saldo_anterior = extractFromText(["SALDO DE CAJA MES ANTERIOR"]) || extractFromText(["SALDO ANTERIOR"]) || 0;
  balance.cobranza_mes = extractFromText(["COBRANZA DEL MES"]) || 0;
  balance.gastos_facturados = extractFromText(["GASTOS FACTURADOS EN EL MES COMUNES"], true) || 0;
  const gastosNoComunes = extractFromText(["GASTOS FACTURADOS EN EL MES NO COMUNES"], true);
  if (gastosNoComunes !== null) balance.gastos_facturados = (balance.gastos_facturados || 0) + gastosNoComunes;
  balance.saldo_disponible = extractFromText(["SALDO ACTUAL DISPONIBLE EN CAJA"]) || 0;
  balance.recibos_mes = extractFromText(["RECIBOS DE CONDOMINIOS DEL MES"]) || 0;
  balance.total_por_cobrar = extractFromText(["TOTAL CONDOMINIOS POR COBRAR"]) || 0;
  balance.condominios_atrasados = extractFromText(["CONDOMINIOS ATRASADOS"]) || 0;
  balance.condominios_adelantados = extractFromText(["CONDOMINIOS ADELANTADOS"], true) || 0;
  balance.condominios_sobrantes = extractFromText(["CONDOMINIOS SOBRANTES"], true) || 0;
  balance.fondo_reserva = extractFromText(["SALDO FONDO DE RESERVA"]) || extractFromText(["FONDO DE RESERVA"]) || 0;
  balance.fondo_prestaciones = extractFromText(["SALDO FONDO DE PRESTACIONES SOCIALES"]) || 0;
  balance.fondo_trabajos_varios = extractFromText(["SALDO FONDO TRABAJOS VARIOS"], true) || 0;
  balance.fondo_intereses = extractFromText(["SALDO FONDO INTERESES MORATORIOS"]) || 0;
  balance.fondo_diferencial_cambiario = extractFromText(["SALDO FONDO DIFERENCIAL CAMBIARIO TASA BCV"]) || 0;
  balance.ajuste_alicuota = extractFromText(["SALDO AJUSTE DIFERENCIA ALICUOTA"], true) || 0;

  // 5. Fallback: también intentar parsear de las tablas HTML
  const allTables = html.match(/<table[^>]*>([\s\S]*?)<\/table>/g) || [];
  for (const t of allTables) {
    if (!t.includes('Descripci') && !t.includes('Descripción')) continue;
    
    const rows = t.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
    for (const row of rows) {
      const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
      if (!cells || cells.length < 2) continue;
      
      const desc = cleanHtml(cells[0]).toUpperCase().trim();
      const monto = cells[1] ? parseMonto(cleanHtml(cells[1])) : 0;
      const saldo = cells[2] ? parseMonto(cleanHtml(cells[2])) : 0;
      
      if (desc.includes("SALDO DE CAJA MES ANTERIOR") && !balance.saldo_anterior) balance.saldo_anterior = monto;
      else if (desc.includes("COBRANZA DEL MES") && !balance.cobranza_mes) balance.cobranza_mes = monto;
      else if (desc.includes("GASTOS FACTURADOS EN EL MES COMUNES") && !balance.gastos_facturados) balance.gastos_facturados = monto;
      else if (desc.includes("SALDO ACTUAL DISPONIBLE") && !balance.saldo_disponible) balance.saldo_disponible = saldo;
      else if (desc.includes("RECIBOS DE CONDOMINIOS") && !balance.recibos_mes) balance.recibos_mes = monto;
      else if (desc.includes("TOTAL CONDOMINIOS POR COBRAR") && !balance.total_por_cobrar) balance.total_por_cobrar = saldo;
      else if (desc.includes("CONDOMINIOS ATRASADOS") && !balance.condominios_atrasados) balance.condominios_atrasados = monto;
      else if (desc.includes("CONDOMINIOS ADELANTADOS") && !balance.condominios_adelantados) balance.condominios_adelantados = monto;
      else if (desc.includes("CONDOMINIOS SOBRANTES") && !balance.condominios_sobrantes) balance.condominios_sobrantes = monto;
      else if (desc.includes("FONDO DE RESERVA") && !desc.includes("MES") && !balance.fondo_reserva) balance.fondo_reserva = saldo;
      else if (desc.includes("FONDO DE PRESTACIONES") && !balance.fondo_prestaciones) balance.fondo_prestaciones = saldo;
      else if (desc.includes("FONDO TRABAJOS VARIOS") && !balance.fondo_trabajos_varios) balance.fondo_trabajos_varios = saldo;
      else if (desc.includes("FONDO INTERESES MORATORIOS") && !desc.includes("MES") && !balance.fondo_intereses) balance.fondo_intereses = saldo;
      else if (desc.includes("FONDO DIFERENCIAL CAMBIARIO") && !balance.fondo_diferencial_cambiario) balance.fondo_diferencial_cambiario = saldo;
      else if (desc.includes("AJUSTE DIFERENCIA ALICUOTA") && !balance.ajuste_alicuota) balance.ajuste_alicuota = saldo;
    }
    break;
  }

  console.log(`[Balance] Result after table extraction:`, JSON.stringify(balance));
  
  const found = Object.values(balance).some(v => v !== null && v !== 0);
  if (found) {
    // Asegurar que no haya nulos para evitar fallos en Supabase
    const keys = ["saldo_anterior", "cobranza_mes", "gastos_facturados", "saldo_disponible", "recibos_mes", "total_por_cobrar", "fondo_reserva", "condominios_atrasados", "condominios_adelantados", "condominios_sobrantes", "fondo_prestaciones", "fondo_trabajos_varios", "fondo_intereses", "fondo_diferencial_cambiario", "ajuste_alicuota"];
    keys.forEach(k => { if (balance[k] === null || balance[k] === undefined) balance[k] = 0; });
    return balance;
  }

  console.log("No se pudo extraer balance");
  return null;
}

async function limitLogs(supabase: any, table: string, edificioId: string, limit: number = 50) {
  try {
    const { data: logs } = await supabase
      .from(table)
      .select("id")
      .eq("edificio_id", edificioId)
      .order("created_at", { ascending: false });

    if (logs && logs.length > limit) {
      const idsToDelete = logs.slice(limit).map((l: any) => l.id);
      await supabase.from(table).delete().in("id", idsToDelete);
    }
  } catch (e) {
    console.error(`Error limiting logs for ${table}:`, e);
  }
}

export async function POST(request: Request) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const today = new Date().toISOString().split('T')[0];
  let currentBuildingId: string | null = null;

  try {
    const body = await request.json();
    const { userId, mes, sync_recibos, sync_egresos, sync_gastos, sync_alicuotas, sync_balance } = body;
    const mesEstandar = normalizeMes(mes);
    
    const doSyncRecibos = sync_recibos !== false;
    const doSyncEgresos = sync_egresos !== false;
    const doSyncGastos = sync_gastos !== false;
    const doSyncAlicuotas = sync_alicuotas !== false;
    const doSyncBalance = sync_balance !== false;

    const { data: building } = await supabase.from("edificios").select("*").eq("usuario_id", userId).single();
    if (!building) return NextResponse.json({ error: "Edificio no encontrado" }, { status: 404 });
    
    currentBuildingId = building.id;
    const session = await loginToRascaCielo(building.url_login, building.admin_secret);
    if (!session) {
      await supabase.from("sincronizaciones").insert({ edificio_id: building.id, tipo: "sync", estado: "error", error: "Fallo de login" });
      await limitLogs(supabase, "sincronizaciones", building.id);
      return NextResponse.json({ error: "Fallo Login" }, { status: 400 });
    }

    const baseUrl = new URL(building.url_login).origin;
    // Convert mes (mm-yyyy) to dd-mm-yyyy (last day of month)
    let comboValue = mes;
    if (mes && mes.includes("-")) {
      const [mm, yyyy] = mes.split("-");
      const mmNum = parseInt(mm, 10);
      const yyyyNum = parseInt(yyyy, 10);
      const lastDay = new Date(yyyyNum, mmNum - 1, 0).getDate();
      comboValue = `${lastDay}-${mm}-${yyyy}`;
    }
    // Use format: ?&r=2 like the user's working URL
    const comboParam = mes ? `&combo=${comboValue}` : "";
    
    console.log(`[Sync] mes=${mes}, comboValue=${comboValue}, comboParam=${comboParam}`);
    
    // Try BOTH URL formats and compare
    const balanceUrlWithPHPSESSID = `${baseUrl}/condlin.php?&r=2&PHPSESSID=&combo=${comboValue}`;
    const balanceUrlNoPHPSESSID = `${baseUrl}/condlin.php?&r=2&combo=${comboValue}`;
    
    console.log(`[Sync] Balance URL 1 (with PHPSESSID=): ${balanceUrlWithPHPSESSID}`);
    console.log(`[Sync] Balance URL 2 (no PHPSESSID): ${balanceUrlNoPHPSESSID}`);

    // Fetch BOTH URLs and compare
    const hBal1 = doSyncBalance ? await fetchPageWithCookie(balanceUrlWithPHPSESSID, session) : null;
    const hBal2 = doSyncBalance ? await fetchPageWithCookie(balanceUrlNoPHPSESSID, session) : null;
    
    console.log(`[Balance] URL1 length: ${hBal1 ? hBal1.length : 0} chars`);
    console.log(`[Balance] URL2 length: ${hBal2 ? hBal2.length : 0} chars`);
    
    // Use the longer one (more data)
    let finalHBal = hBal1;
    if (hBal2 && (!hBal1 || hBal2.length > hBal1.length)) {
      console.log("[Balance] Using URL2 (more data)");
      finalHBal = hBal2;
    } else if (hBal1) {
      console.log("[Balance] Using URL1");
    }

    const promises = [
      doSyncRecibos ? fetchPageWithCookie(`${baseUrl}/condlin.php?r=5${comboParam}`, session) : Promise.resolve(null),
      doSyncEgresos ? fetchPageWithCookie(`${baseUrl}/condlin.php?r=21${comboParam}`, session) : Promise.resolve(null),
      doSyncGastos ? fetchPageWithCookie(`${baseUrl}/condlin.php?r=3${comboParam}`, session) : Promise.resolve(null),
      Promise.resolve(finalHBal), // Reuse already fetched
      doSyncAlicuotas ? fetchPageWithCookie(`${baseUrl}/condlin.php?r=23${comboParam}`, session) : Promise.resolve(null),
      doSyncRecibos ? fetchPageWithCookie(`${baseUrl}/condlin.php?r=4${comboParam}`, session) : Promise.resolve(null)
    ];

    const [hRec, hEgr, hGas, hBalResult, hAli, hRecSummary] = await Promise.all(promises);
    const hBal = hBalResult || finalHBal;

    console.log(`Sync Debug [${mesEstandar}]: Scraping completed.`);
    console.log(`- hRec: ${hRec ? hRec.length : 0} chars`);
    console.log(`- hBal: ${hBal ? hBal.length : 0} chars`);
    console.log(`- hRecSummary: ${hRecSummary ? hRecSummary.length : 0} chars`);
    
    // DEBUG: show full hBal content
    if (hBal) {
      const tables = hBal.split('<table');
      console.log(`[Balance] Total tables in hBal: ${tables.length}`);
      console.log(`[Balance] hBal FIRST 800 chars:`, hBal.substring(0, 800));
      console.log(`[Balance] hBal LAST 500 chars:`, hBal.substring(hBal.length - 500));
      // Search for any text containing SALDO to find where data is
      const saldoIdx = hBal.toUpperCase().indexOf('SALDO DE CAJA');
      console.log(`[Balance] indexOf('SALDO DE CAJA'): ${saldoIdx}`);
      // Search for Estado de Cuenta
      const ecIdx = hBal.toUpperCase().indexOf('ESTADO DE CUENTA');
      console.log(`[Balance] indexOf('ESTADO DE CUENTA'): ${ecIdx}`);
    }

    const allRecibos = hRec ? parseRecibosTableAll(hRec) : [];
    const allEgresos = hEgr ? parseEgresosTableAll(hEgr) : [];
    const allGastos = hGas ? parseGastosTable(hGas) : [];
    const balance = hBal ? parseBalanceFull(hBal) : null;
    const allAlicuotas = hAli ? parseAlicuotasTable(hAli) : [];
    const monthlyReceiptTotal = hRecSummary ? parseReceiptMonthlySummary(hRecSummary) : 0;
    const detailedReceiptItems = hRecSummary ? parseReciboDetalle(hRecSummary) : [];

    console.log(`- Parsed Recibos: ${allRecibos.length}`);
    console.log(`- Parsed Balance: ${balance ? "SI" : "NO"}`);
    console.log(`- Parsed Recibo Total: ${monthlyReceiptTotal}`);
    console.log(`- Parsed Detailed Items: ${detailedReceiptItems.length}`);

    if (doSyncRecibos && allRecibos.length > 0) {
      console.log(`Guardando ${allRecibos.length} recibos para ${mesEstandar}`);
      // Usar upsert para evitar errores de duplicados si la restricción es conflictiva
      const recibosToSave = allRecibos.map(r => ({ 
        edificio_id: building.id, 
        unidad: r.unidad, 
        propietario: r.propietario, 
        num_recibos: r.num_recibos, 
        deuda: r.deuda, 
        deuda_usd: r.deuda_usd, 
        sincronizado: true, 
        actualizado_en: today,
        mes: mesEstandar
      }));
      
      const { error: recErr } = await supabase.from("recibos").upsert(recibosToSave, { onConflict: 'edificio_id,unidad,mes' });
      if (recErr) {
        console.error("Error guardando recibos con upsert:", recErr);
        // Fallback: borrar e insertar si el upsert falla por falta de columna en el onConflict
        await supabase.from("recibos").delete().match({ edificio_id: building.id, mes: mesEstandar });
        await supabase.from("recibos").insert(recibosToSave);
      }
    }

    if (doSyncRecibos && detailedReceiptItems.length > 0) {
      console.log(`Guardando ${detailedReceiptItems.length} items de detalle para ${mesEstandar}`);
      
      try {
        // Primero intentar delete
        const { error: deleteError } = await supabase
          .from("recibos_detalle")
          .delete()
          .eq("edificio_id", building.id)
          .eq("mes", mesEstandar);
        
        if (deleteError) {
          console.log("Delete error, trying insert anyway:", deleteError);
        }
        
        // Esperar más tiempo
        await new Promise(r => setTimeout(r, 500));
        
        const itemsToSave = detailedReceiptItems.map(item => ({
          edificio_id: building.id,
          unidad: 'GENERAL',
          propietario: 'EDIFICIO',
          mes: mesEstandar,
          codigo: item.codigo,
          descripcion: item.descripcion,
          monto: item.monto,
          cuota_parte: item.cuota_parte,
          tipo: 'gasto_comun'
        }));
        
        const { error: detErr } = await supabase.from("recibos_detalle").insert(itemsToSave);
        
        // Si hay error de duplicado, intentar borrando todo del edificio y reintentando
        if (detErr && detErr.code === '23505') {
          console.log("Duplicate error, retrying after full delete...");
          await supabase.from("recibos_detalle").delete().eq("edificio_id", building.id).eq("mes", mesEstandar);
          await new Promise(r => setTimeout(r, 500));
          const { error: retryErr } = await supabase.from("recibos_detalle").insert(itemsToSave);
          if (retryErr) {
            console.error("Error guardando detalle recibo (retry):", retryErr);
          } else {
            console.log(`Guardados ${itemsToSave.length} items en recibos_detalle (retry)`);
          }
        } else if (detErr) {
          console.error("Error guardando detalle recibo:", detErr);
        } else {
          console.log(`Guardados ${itemsToSave.length} items en recibos_detalle`);
        }
      } catch (err) {
        console.error("Exception guardando detalle recibo:", err);
      }
    }

    if (doSyncAlicuotas && allAlicuotas.length > 0) {
      await supabase.from("alicuotas").delete().eq("edificio_id", building.id);
      await supabase.from("alicuotas").insert(allAlicuotas.map(a => ({ ...a, edificio_id: building.id })));
    }

    if (doSyncEgresos || doSyncGastos) {
      await supabase.from("movimientos_dia").delete().eq("edificio_id", building.id).eq("detectado_en", today);
    }

    if (doSyncEgresos) {
      for (const e of allEgresos) {
        const fDB = normalizeFecha(e.fecha);
        const hash = await generateHash(`${fDB}|${e.beneficiario}|${e.monto}`);
        await supabase.from("egresos").upsert({ edificio_id: building.id, fecha: fDB, beneficiario: e.beneficiario, descripcion: e.operacion, monto: e.monto, hash, sincronizado: true, mes: mesEstandar }, { onConflict: 'edificio_id,hash' });
        const desc = `${e.operacion} - ${e.beneficiario}`;
        await supabase.from("movimientos").upsert({ edificio_id: building.id, tipo: "egreso", descripcion: desc, monto: e.monto, fecha: fDB, hash, sincronizado: true }, { onConflict: 'edificio_id,hash' });
        if (fDB === today) {
          await supabase.from("movimientos_dia").insert({ edificio_id: building.id, tipo: "egreso", descripcion: desc, monto: e.monto, fecha: fDB, fuente: "egresos", detectado_en: today });
        }
      }
    }

    if (doSyncGastos) {
      for (const g of allGastos) {
        const hash = await generateHash(`GASTO|${g.codigo}|${g.monto}|${today}`);
        await supabase.from("gastos").upsert({ edificio_id: building.id, mes: mesEstandar, fecha: today, codigo: g.codigo, descripcion: g.descripcion, monto: g.monto, hash, sincronizado: true }, { onConflict: 'edificio_id,hash' });
        await supabase.from("movimientos").upsert({ edificio_id: building.id, tipo: "gasto", descripcion: g.descripcion, monto: g.monto, fecha: today, hash, sincronizado: true }, { onConflict: 'edificio_id,hash' });
        if (mesEstandar === today.substring(0, 7)) {
          await supabase.from("movimientos_dia").insert({ edificio_id: building.id, tipo: "gasto", descripcion: g.descripcion, monto: g.monto, fecha: today, fuente: "gastos", detectado_en: today });
        }
      }
    }

    if (balance) {
      console.log(`Balance detectado para ${mesEstandar}:`, balance);
      if (monthlyReceiptTotal > 0) balance.recibos_mes = monthlyReceiptTotal;
      await supabase.from("balances").delete().match({ edificio_id: building.id, mes: mesEstandar });
      await supabase.from("balances").insert({ ...balance, edificio_id: building.id, mes: mesEstandar, fecha: today, sincronizado: true });
    } else {
      console.log(`No se pudo extraer balance para ${mesEstandar}`);
    }

    const allConcepts = [...(allGastos || [])];
    detailedReceiptItems.forEach(item => {
      if (!allConcepts.find(c => c.codigo === item.codigo)) {
        allConcepts.push({ codigo: item.codigo, descripcion: item.descripcion });
      }
    });

    if (allConcepts.length > 0) {
      console.log(`Actualizando ${allConcepts.length} conceptos recurrentes para ${building.id}`);
      // Obtener estados actuales para no sobrescribir 'activo' ni 'categoria'
      const { data: existingRec } = await supabase.from("gastos_recurrentes").select("codigo, activo, categoria").eq("edificio_id", building.id);
      const existingMap = new Map(existingRec?.map(r => [r.codigo, r]) || []);

      for (const g of allConcepts) {
        const existing = existingMap.get(g.codigo);
        await supabase.from("gastos_recurrentes").upsert({ 
          edificio_id: building.id, 
          codigo: g.codigo, 
          descripcion: g.descripcion, 
          activo: existing ? existing.activo : true,
          categoria: existing ? existing.categoria : "otros"
        }, { onConflict: "edificio_id,codigo" });
      }
    }

    try {
      const { data: tasaData } = await supabase.from("tasas_cambio").select("tasa_dolar").order("fecha", { ascending: false }).limit(1).single();
      const tasa = tasaData?.tasa_dolar || 45.50;
      const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      const diaStr = dias[new Date(today).getDay()];
      const { data: recs } = await supabase.from("recibos").select("deuda").eq("edificio_id", building.id).gt("deuda", 0);
      const recPendientes = recs?.length || 0;
      const bal = balance || {};
      const dispTotalBs = Number(bal.saldo_disponible || 0) + Number(bal.fondo_reserva || 0);

      await supabase.from("control_diario").upsert({
        edificio_id: building.id, fecha: today, dia_semana: diaStr,
        saldo_inicial_bs: bal.saldo_anterior || 0, saldo_inicial_usd: tasa > 0 ? (bal.saldo_anterior || 0) / tasa : 0,
        ingresos_bs: bal.cobranza_mes || 0, ingresos_usd: tasa > 0 ? (bal.cobranza_mes || 0) / tasa : 0,
        egresos_bs: bal.gastos_facturados || 0, egresos_usd: tasa > 0 ? (bal.gastos_facturados || 0) / tasa : 0,
        ajustes_bs: bal.ajuste_pago_tiempo || 0, ajustes_usd: tasa > 0 ? (bal.ajuste_pago_tiempo || 0) / tasa : 0,
        saldo_final_bs: bal.saldo_disponible || 0, saldo_final_usd: tasa > 0 ? (bal.saldo_disponible || 0) / tasa : 0,
        tasa_cambio: tasa, recibos_pendientes: recPendientes,
        delta_saldo_bs: Number(bal.cobranza_mes || 0) - Number(bal.gastos_facturados || 0),
        fondo_reserva_bs: bal.fondo_reserva || 0, fondo_reserva_usd: tasa > 0 ? (bal.fondo_reserva || 0) / tasa : 0,
        fondo_dif_camb_bs: bal.fondo_diferencial_cambiario || 0, fondo_dif_camb_usd: tasa > 0 ? (bal.fondo_diferencial_cambiario || 0) / tasa : 0,
        fondo_int_mor_bs: bal.fondo_intereses || 0, fondo_int_mor_usd: tasa > 0 ? (bal.fondo_intereses || 0) / tasa : 0,
        total_fondos_bs: bal.fondo_reserva || 0, total_fondos_usd: tasa > 0 ? (bal.fondo_reserva || 0) / tasa : 0,
        disponibilidad_total_bs: dispTotalBs, disponibilidad_total_usd: tasa > 0 ? dispTotalBs / tasa : 0
      }, { onConflict: 'edificio_id,fecha' });
    } catch (e) {}

    const totalRecs = allRecibos.length + allEgresos.length + allGastos.length;
    
    // Crear una alerta de sincronización exitosa
    try {
      await supabase.from("alertas").insert({
        edificio_id: building.id,
        tipo: "info",
        titulo: `Sincronización ${mes ? "Histórica" : "Diaria"} Exitosa`,
        descripcion: `Se sincronizaron correctamente los datos de ${mes || "el mes actual"}. Se detectaron ${totalRecs} registros nuevos entre recibos, egresos y gastos.`,
        fecha: today
      });
    } catch (e) {
      console.error("Error creating sync alert:", e);
    }

    await supabase.from("sincronizaciones").insert({
      edificio_id: building.id, tipo: mes ? "sync_historica" : "sync_diaria", estado: "completado",
      movimientos_nuevos: totalRecs, detalles: {
        mes: mes || "actual", sync_recibos: doSyncRecibos, sync_egresos: doSyncEgresos, sync_gastos: doSyncGastos,
        sync_alicuotas: doSyncAlicuotas, sync_balance: doSyncBalance,
        stats: { recibos: allRecibos.length, egresos: allEgresos.length, gastos: allGastos.length, alicuotas: allAlicuotas.length, recibo_total: monthlyReceiptTotal }
      }
    });
    await limitLogs(supabase, "sincronizaciones", building.id);
    await limitLogs(supabase, "alertas", building.id);

    await supabase.from("edificios").update({ ultima_sincronizacion: new Date().toISOString() }).eq("id", building.id);
    return NextResponse.json({ success: true, stats: { recibos: allRecibos.length, egresos: allEgresos.length, gastos: allGastos.length, alicuotas: allAlicuotas.length, recibo_total: monthlyReceiptTotal } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
