import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";
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

function parseReciboDetalle(html: string): any[] {
  if (!html) return [];
  console.log("[parseReciboDetalle] Input HTML length:", html.length);
  const results: any[] = [];
  
  // Buscar todas las tablas
  const allTables = html.match(/<table[^>]*>([\s\S]*?)<\/table>/gi) || [];
  console.log(`[parseReciboDetalle] Found ${allTables.length} tables total.`);
  
  for (const tableContent of allTables) {
    const upperT = tableContent.toUpperCase();
    // Si la tabla tiene indicios de ser de gastos o recibo
    if (upperT.includes("CONCEPTO") || upperT.includes("MONTO") || upperT.includes("DESCRIPCI") || upperT.includes("TOTAL")) {
      const rows = tableContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
      for (const row of rows) {
        const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
        if (!cells || cells.length < 2) continue;

        const code = cleanHtml(cells[0]).trim();
        const desc = cleanHtml(cells[1]).trim();
        // Intentar buscar monto en la celda 2 o 3
        const montoRaw = cells.length >= 3 ? cleanHtml(cells[2]) : "";
        const monto = parseMonto(montoRaw);

        if (!code || code === "&nbsp;" || code.length > 15) continue;
        if (code.toUpperCase().includes("COD") || code.toUpperCase().includes("CONCEPTO")) continue;
        
        // Si tenemos código y descripción, es un candidato
        if (code && desc && desc.length > 3 && !results.find(r => r.codigo === code)) {
          results.push({
            codigo: code,
            descripcion: desc,
            monto: monto,
            cuota_parte: cells.length >= 4 ? parseMonto(cleanHtml(cells[3])) : 0
          });
        }
      }
    }
  }
  
  console.log("[parseReciboDetalle] Aggressive parsing found items:", results.length);
  return results;
}

function parseReceiptMonthlySummary(html: string): number {
  if (!html) return 0;
  const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    const rowText = cleanHtml(row).toUpperCase();
    if (rowText.includes("TOTAL RECIBO")) {
      const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
      if (cells && cells.length > 0) {
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
  const tableMatch = html.match(/<table[^>]*class="[^"]*table-bordered[^"]*"[^>]*>([\s\S]*?)<\/table>/i) || 
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
  const tableMatch = html.match(/<table[^>]*class="[^"]*table-bordered[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
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

function parseIngresosTable(html: string): any[] {
  if (!html) return [];
  const results: any[] = [];
  
  // Intentar encontrar la tabla por clase primero, luego por contenido
  let tableContent = "";
  const tableMatch = html.match(/<table[^>]*class="[^"]*table-bordered[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  
  if (tableMatch) {
    tableContent = tableMatch[1];
  } else {
    // Fallback: Buscar tabla que contenga "TOTAL COBRADO" o encabezados típicos
    const allTables = html.match(/<table[^>]*>([\s\S]*?)<\/table>/gi) || [];
    for (const t of allTables) {
      const upperT = t.toUpperCase();
      if (upperT.includes("TOTAL COBRADO") || (upperT.includes("FECHA") && upperT.includes("MONTO"))) {
        tableContent = t;
        break;
      }
    }
  }

  if (!tableContent) {
    console.log("[parseIngresosTable] No se encontró la tabla de ingresos en el HTML.");
    return [];
  }

  const rows = tableContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
  for (const row of rows) {
    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
    if (!cells || cells.length < 4) continue;
    const texts = cells.map(c => cleanHtml(c));
    
    // Saltamos encabezados y totales
    if (texts[1].includes("TOTAL COBRADO") || texts[1].includes("TOTAL GENERAL") || texts[1].toUpperCase().includes("PROPIETARIO") || texts[1].toUpperCase().includes("BENEFICIARIO")) continue;
    
    // Validar que la primera celda sea una fecha
    if (!texts[0].match(/\d{2}-\d{2}-\d{4}/)) continue;

    const m = parseMonto(texts[3]);
    if (m > 0) {
      results.push({ 
        fecha: texts[0], 
        beneficiario: texts[1], 
        descripcion: texts[2], 
        monto: m 
      });
    }
  }
  return results;
}

function parseGastosTable(html: string): any[] {
  if (!html) return [];
  const results: any[] = [];
  
  const allTables = html.match(/<table[^>]*>([\s\S]*?)<\/table>/gi) || [];
  console.log(`[parseGastosTable] Aggressive scan of ${allTables.length} tables.`);
  
  for (const tableContent of allTables) {
    const upperT = tableContent.toUpperCase();
    if (upperT.includes("CONCEPTO") || upperT.includes("TOTAL") || upperT.includes("GASTO") || upperT.includes("DETALLE")) {
      const rows = tableContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
      for (const row of rows) {
        const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
        if (!cells || cells.length < 2) continue;
        
        const code = cleanHtml(cells[0]).trim();
        const desc = cleanHtml(cells[1]).trim();
        const montoRaw = cells.length >= 3 ? cleanHtml(cells[2]) : "";
        
        if (!code || code === "&nbsp;" || code.length > 15) continue;
        if (code.toUpperCase().includes("COD") || code.toUpperCase().includes("CONCEPTO") || code.toUpperCase().includes("FECHA")) continue;
        
        if (desc.includes("TOTAL") || desc.includes("TOTAL GASTOS COMUNES") || desc.toUpperCase().includes("FONDO")) continue;
        
        if (code && desc && desc.length > 3 && !results.find(r => r.codigo === code)) {
          results.push({
            codigo: code,
            descripcion: desc,
            monto: parseMonto(montoRaw)
          });
        }
      }
    }
  }
  
  console.log("[parseGastosTable] Aggressive parsing found items:", results.length);
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
  
  const cleanHtmlOnly = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ');

  const rawText = cleanHtmlOnly
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8209;/g, '-')
    .replace(/&times;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
    
  const text = rawText.toUpperCase();
  
  console.log(`Balance Text Clean (primeros 1000 chars): ${text.substring(0, 1000)}`);
  
  const extractVal = (keywords: string[]) => {
    for (const kw of keywords) {
      const idx = text.indexOf(kw.toUpperCase());
      if (idx !== -1) {
        // Extend search to 200 chars after keyword
        const start = idx + kw.length;
        const end = Math.min(start + 200, text.length);
        const sub = text.substring(start, end);
        // Check if there's a negative sign BEFORE the number
        const negMatch = sub.match(/^[\s-]+(-?[\d.,]+)/);
        const posMatch = sub.match(/^[\s]*(-?[\d.,]+)/);
        const match = negMatch || posMatch;
        if (match) {
          let val = parseMonto(match[1]);
          // If starts with negative sign, make it negative
          if (match[0].includes('-') && !match[1].startsWith('-') && val > 0) {
            val = -Math.abs(val);
          }
          return val;
        }
      }
    }
    return null;
  };

  // CAJA - extract with wider search for negatives
  balance.saldo_anterior = extractVal(["SALDO DE CAJA MES ANTERIOR", "SALDO ANTERIOR", "CAJA ANTERIOR", "SALDO MES ANTERIOR"]);
  balance.cobranza_mes = extractVal(["COBRANZA DEL MES", "TOTAL COBRADO", "INGRESOS DEL MES", "TOTAL INGRESOS", "RECIBOS COBRADOS"]);
  // GASTOS separated
  balance.gastos_comunes = extractVal(["GASTOS FACTURADOS EN EL MES COMUNES"]);
  balance.gastos_no_comunes = extractVal(["GASTOS FACTURADOS EN EL MES NO COMUNES"]);
  balance.gastos_facturados = (balance.gastos_comunes || 0) + (balance.gastos_no_comunes || 0);
  // OTROS INGRESOS/EGRESOS
  balance.ajuste_pago_tiempo = extractVal(["DESC/DIF CAMBIARIO PAGO A TIEMPO", "DESC/DIF CAMBIARIO PAGO"]) || 0;
  balance.fondo_intereses_mov = extractVal(["FONDO INTERESES MORATORIOS"]) || 0;
  balance.saldo_disponible = extractVal(["SALDO ACTUAL DISPONIBLE EN CAJA", "SALDO ACTUAL DISPONIBLE", "SALDO DISPONIBLE", "SALDO EN CAJA", "DISPONIBILIDAD EN CAJA"]);
  
  // CUENTAS POR COBRAR
  balance.recibos_mes = extractVal(["RECIBOS DE CONDOMINIOS DEL MES", "EMISION DEL MES", "TOTAL RECIBOS DEL MES", "EMISION TOTAL"]);
  balance.total_por_cobrar = extractVal(["TOTAL CONDOMINIOS POR COBRAR", "TOTAL POR COBRAR", "SALDO POR COBRAR", "CUENTAS POR COBRAR"]);
  balance.condominios_atrasados = extractVal(["CONDOMINIOS ATRASADOS"]) || 0;
  balance.condominios_adelantados = extractVal(["CONDOMINIOS ADELANTADOS"]) || 0;
  balance.condominios_sobrantes = extractVal(["CONDOMINIOS SOBRANTES"]) || 0;
  
  // RESERVAS - with historical values (mes anterior + movimiento)
  balance.fondo_reserva_mes_anterior = extractVal(["FONDO DE RESERVA MES ANTERIOR", "FONDO RESERVA MES ANTERIOR"]) || 0;
  balance.fondo_reserva_mov = extractVal(["FONDO DE RESERVA"]) || 0;
  balance.fondo_reserva = extractVal(["SALDO FONDO DE RESERVA", "FONDO DE RESERVA", "RESERVA SALDO", "SALDO RESERVA"]) || balance.fondo_reserva_mes_anterior + balance.fondo_reserva_mov;
  
  balance.fondo_prestaciones = extractVal(["SALDO FONDO DE PRESTACIONES SOCIALES", "FONDO PRESTACIONES"]) || 0;
  balance.fondo_trabajos_varios = extractVal(["SALDO FONDO TRABAJOS VARIOS", "FONDO TRABAJOS VARIOS"]) || 0;
  balance.fondo_intereses = extractVal(["SALDO FONDO INTERESES MORATORIOS", "FONDO INTERESES MORATORIOS"]) || 0;
  
  balance.fondo_diferencial_mes_anterior = extractVal(["FONDO DIFERENCIAL CAMBIARIO TASA BCV MES ANTERIOR", "DIFERENCIAL CAMBIARIO MES ANTERIOR"]) || 0;
  balance.fondo_diferencial_mov = extractVal(["FONDO DIFERENCIAL CAMBIARIO TASA BCV"]) || 0;
  balance.fondo_diferencial_cambiario = extractVal(["SALDO FONDO DIFERENCIAL CAMBIARIO TASA BCV", "FONDO DIFERENCIAL CAMBIARIO"]) || balance.fondo_diferencial_mes_anterior + balance.fondo_diferencial_mov;
  
  balance.ajuste_alicuota = extractVal(["SALDO AJUSTE DIFERENCIA ALICUOTA", "AJUSTE DIFERENCIA ALICUOTA"]) || 0;

  if (!Object.values(balance).some(v => v !== null && v !== 0)) {
    console.log("Aviso: Falló extracción por texto, intentando fallback de tablas...");
    const allTables = html.match(/<table[^>]*>([\s\S]*?)<\/table>/g) || [];
    for (const t of allTables) {
       const rows = t.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
       for (const row of rows) {
          const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
          if (!cells || cells.length < 2) continue;
          const desc = cleanHtml(cells[0]).toUpperCase();
          const val = parseMonto(cleanHtml(cells[1]));
          if (val < 0.01) continue;
          
          if (desc.includes("SALDO ANTERIOR")) balance.saldo_anterior = val;
          else if (desc.includes("COBRANZA") || desc.includes("COBRADO")) balance.cobranza_mes = val;
          else if (desc.includes("GASTOS") || desc.includes("EGRESOS")) balance.gastos_facturados = val;
          else if (desc.includes("DISPONIBLE") || desc.includes("EN CAJA")) balance.saldo_disponible = val;
       }
    }
  }

  const found = Object.values(balance).some(v => v !== null && v !== 0);
  if (found) {
    const keys = ["saldo_anterior", "cobranza_mes", "gastos_facturados", "gastos_comunes", "gastos_no_comunes", "saldo_disponible", "recibos_mes", "total_por_cobrar", "condominios_atrasados", "condominios_adelantados", "condominios_sobrantes", "fondo_reserva", "fondo_reserva_mes_anterior", "fondo_reserva_mov", "fondo_prestaciones", "fondo_trabajos_varios", "fondo_intereses", "fondo_intereses_mov", "fondo_diferencial_cambiario", "fondo_diferencial_mes_anterior", "fondo_diferencial_mov", "ajuste_pago_tiempo", "ajuste_alicuota"];
    keys.forEach(k => { if (balance[k] === null || balance[k] === undefined) balance[k] = 0; });
    return balance;
  }

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

    // PROTECTION FOR DEMO MODE
    if (userId === "00000000-0000-0000-0000-000000000000") {
      console.log("[SYNC] Simulated sync for demo user");
      return NextResponse.json({ 
        success: true, 
        isDemo: true,
        message: "Sincronización simulada exitosa en modo demo",
        stats: { recibos: 42, egresos: 12, gastos: 8, alicuotas: 40, recibo_total: 2500.50 } 
      });
    }

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

    const baseUrl = new URL(building.url_login).origin.replace("http://", "https://");
    
    // Convert mes (mm-yyyy) to dd-mm-yyyy (last day of month) for historical months
    let comboValue = mes;
    if (mes && mes.includes("-")) {
      const [mm, yyyy] = mes.split("-");
      const mmNum = parseInt(mm, 10);
      const yyyyNum = parseInt(yyyy, 10);
      const lastDay = new Date(yyyyNum, mmNum, 0).getDate();
      comboValue = `${String(lastDay).padStart(2, '0')}-${mm}-${yyyy}`;
    }

    const fetchWithRetry = async (urlPath: string) => {
      const separator = urlPath.includes('?') ? '&' : '?';
      const fullUrl = `${baseUrl}/${urlPath}${separator}PHPSESSID=${session.sid}`;
      console.log(`Fetching: ${fullUrl}`);
      
      const res = await fetch(fullUrl, {
        method: "GET",
        headers: { 
          "Cookie": session.cookie, 
          "User-Agent": USER_AGENT, 
          "Referer": `${baseUrl}/condlin.php?r=1` 
        },
      });
      let text = await res.text();
      
      // Si la página es muy corta (página de error/login), intentar con el formato MM-YYYY
      if (text.length < 5000 && urlPath.includes("combo=") && mes && mes.includes("-")) {
        console.log(`Page seems too short (${text.length}). Retrying with MM-YYYY format...`);
        const cleanPath = urlPath.split('&combo=')[0];
        const retryUrl = `${baseUrl}/${cleanPath}${separator}combo=${mes}&PHPSESSID=${session.sid}`;
        const res2 = await fetch(retryUrl, {
          method: "GET",
          headers: { "Cookie": session.cookie, "User-Agent": USER_AGENT, "Referer": `${baseUrl}/condlin.php?r=1` },
        });
        text = await res2.text();
      }
      
      // Si sigue siendo corta, no usar fallback de "sin combo", simplemente devolver lo que hay o null
      if (text.length < 5000) {
        console.log(`Warning: Content for ${urlPath} is still too short (${text.length}). Extraction might fail.`);
      }
      
      return text;
    };

    // Fetches secuenciales
    let hRec = null, hEgr = null, hGas = null, hBal = null, hAli = null, hRecSummary = null, hIng = null;
    const comboParam = mes ? `&combo=${comboValue}` : "";

    // 1. Balance (Fija el mes en la sesión de la administradora)
    hBal = await fetchWithRetry(`condlin.php?r=2${comboParam}`);
    await new Promise(r => setTimeout(r, 500));

    // 2. Ingresos (Cobranza detectada) - SIEMPRE SE EJECUTA
    hIng = await fetchWithRetry(`condlin.php?r=1${comboParam}`);
    await new Promise(r => setTimeout(r, 500));

    if (doSyncRecibos) {
      hRec = await fetchWithRetry(`condlin.php?r=5${comboParam}`);
      await new Promise(r => setTimeout(r, 500));
      hRecSummary = await fetchWithRetry(`condlin.php?r=4${comboParam}`);
      await new Promise(r => setTimeout(r, 500));
    }
    if (doSyncEgresos) {
      hEgr = await fetchWithRetry(`condlin.php?r=21${comboParam}`);
      await new Promise(r => setTimeout(r, 500));
    }
    if (doSyncGastos) {
      hGas = await fetchWithRetry(`condlin.php?r=3${comboParam}`);
      await new Promise(r => setTimeout(r, 500));
    }
    if (doSyncAlicuotas) {
      hAli = await fetchWithRetry(`condlin.php?r=23${comboParam}`);
    }

    console.log(`Sync Debug [${mesEstandar}]: Scraping completed.`);
    console.log(`- hRec: ${hRec ? hRec.length : 0} chars`);
    console.log(`- hBal: ${hBal ? hBal.length : 0} chars`);
    console.log(`- hIng (Ingresos): ${hIng ? hIng.length : 0} chars`);
    console.log(`- hGas (Gastos): ${hGas ? hGas.length : 0} chars`);

    const allRecibos = hRec ? parseRecibosTableAll(hRec) : [];
    const allEgresos = hEgr ? parseEgresosTableAll(hEgr) : [];
    const allIngresos = hIng ? parseIngresosTable(hIng) : [];
    console.log(`[DEBUG-INGRESOS] Registros encontrados en r=1: ${allIngresos.length}`);
    if (allIngresos.length > 0) {
      allIngresos.forEach((ing, i) => {
        console.log(`[DEBUG-INGRESOS] #${i+1}: ${ing.fecha} | ${ing.beneficiario} | Bs. ${ing.monto}`);
      });
    }
    const allGastos = hGas ? parseGastosTable(hGas) : [];
    const balance = hBal ? parseBalanceFull(hBal) : null;
    const allAlicuotas = hAli ? parseAlicuotasTable(hAli) : [];
    const monthlyReceiptTotal = hRecSummary ? parseReceiptMonthlySummary(hRecSummary) : 0;
    const detailedReceiptItems = hRecSummary ? parseReciboDetalle(hRecSummary) : [];

    // FALLBACK EXTREMO: Si no hay gastos ni detalles, intentar extraer del HTML del Balance (hBal)
    if (doSyncGastos && allGastos.length === 0 && detailedReceiptItems.length === 0 && hBal) {
      console.log("Fallback: Intentando extraer gastos desde el HTML del Balance...");
      const tableMatch = hBal.match(/<table[^>]*class="[^"]*table-bordered[^"]*"[^>]*>([\s\S]*?)<\/table>/i) ||
                         hBal.match(/<table[^>]*>([\s\S]*?TOTAL GASTOS COMUNES[\s\S]*?)<\/table>/i);
      if (tableMatch) {
        const fallbackGastos = parseGastosTable(hBal);
        if (fallbackGastos.length > 0) {
          console.log(`Fallback exitoso: ${fallbackGastos.length} gastos encontrados en Balance`);
          allGastos.push(...fallbackGastos);
        }
      }
    }

    console.log(`- Parsed Recibos: ${allRecibos.length}`);
    console.log(`- Parsed Ingresos: ${allIngresos.length}`);
    console.log(`- Parsed Balance: ${balance ? "SI" : "NO"}`);
    console.log(`- Parsed Gastos Table: ${allGastos.length} items`);
    console.log(`- Parsed Recibo Total: ${monthlyReceiptTotal}`);
    console.log(`- Parsed Detailed Items (Gastos): ${detailedReceiptItems.length}`);

    if (doSyncRecibos && allRecibos.length > 0) {
      console.log(`Guardando ${allRecibos.length} recibos para ${mesEstandar}`);
      
      // 1. Obtener deudores actuales en nuestra DB antes de limpiar
      const { data: deudoresAntes } = await supabase
        .from("recibos")
        .select("unidad, propietario, deuda")
        .eq("edificio_id", building.id);

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
      
      // 2. Limpieza del mes actual
      await supabase.from("recibos").delete().match({ edificio_id: building.id, mes: mesEstandar });
      
      // 3. Insertar nuevos datos
      const { error: recErr } = await supabase.from("recibos").insert(recibosToSave);
      if (recErr) console.error("Error guardando recibos:", recErr);

      // 4. DETECCIÓN DE PAGOS POR DESAPARICIÓN
      const unidadesAhora = new Set(allRecibos.map(r => r.unidad));
      const deudoresAnterioresUnicos = Array.from(new Set(deudoresAntes?.map(d => d.unidad) || []));
      
      for (const unidadPrevia of deudoresAnterioresUnicos) {
        if (!unidadesAhora.has(unidadPrevia)) {
          // Filtrar todas las deudas de esta unidad que estaban en nuestra DB
          const deudasUnidad = deudoresAntes?.filter(d => d.unidad === unidadPrevia) || [];
          const montoTotalPagado = deudasUnidad.reduce((sum, d) => sum + Number(d.deuda || 0), 0);
          const propietario = deudasUnidad[0]?.propietario || "Copropietario";

          if (montoTotalPagado > 0) {
            console.log(`[PAGO-DETECTADO] Unidad ${unidadPrevia} pagó Bs. ${montoTotalPagado}`);
            
            // A. Registrar en la tabla histórica pagos_recibos
            await supabase.from("pagos_recibos").insert({
              edificio_id: building.id,
              unidad: unidadPrevia,
              propietario: propietario,
              mes: mesEstandar,
              monto: montoTotalPagado,
              fecha_pago: today, // Se asume hoy como fecha de proceso
              source: 'deteccion_automatica',
              verificado: true
            });

            // B. Generar alerta de pago asumido
            await supabase.from("alertas").insert({
              edificio_id: building.id,
              tipo: "ingreso",
              titulo: "✅ Deuda Cancelada (Auto)",
              descripcion: `La unidad ${unidadPrevia} (${propietario}) ha saldado su deuda total de Bs. ${montoTotalPagado.toLocaleString('es-VE')}. Detectado por conciliación de lista.`,
              fecha: today
            });

            // C. Registrar en movimientos general
            const hashMov = await generateHash(`PAGO_AUTO|${building.id}|${unidadPrevia}|${montoTotalPagado}|${today}`);
            await supabase.from("movimientos").upsert({
              edificio_id: building.id,
              tipo: "ingreso",
              descripcion: `PAGO DETECTADO - Unidad ${unidadPrevia}`,
              monto: montoTotalPagado,
              fecha: today,
              hash: hashMov,
              sincronizado: true
            }, { onConflict: 'edificio_id,hash' });
          }

          // D. LIMPIEZA TOTAL: Borrar deudas de esta unidad en CUALQUIER mes previo 
          await supabase.from("recibos").delete().match({ edificio_id: building.id, unidad: unidadPrevia });
        }
      }
    }

    if (doSyncRecibos && detailedReceiptItems.length > 0) {
      console.log(`Guardando ${detailedReceiptItems.length} items de detalle para ${mesEstandar}`);
      
      try {
        const { error: deleteError } = await supabase
          .from("recibos_detalle")
          .delete()
          .eq("edificio_id", building.id)
          .eq("mes", mesEstandar);
        
        if (deleteError) {
          console.log("Delete error, trying insert anyway:", deleteError);
        }
        
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
      console.log(`Verificando ${allEgresos.length} egresos para ${mesEstandar}`);
      
      // Obtener egresos ya registrados para este mes
      const { data: egresosExistentes } = await supabase
        .from("egresos")
        .select("beneficiario, monto, descripcion")
        .eq("edificio_id", building.id)
        .eq("mes", mesEstandar);

      const existingMap = new Set(egresosExistentes?.map(e => `${e.beneficiario}|${e.monto}`) || []);

      for (const e of allEgresos) {
        // Verificar si ya existe (por beneficiario y monto)
        if (existingMap.has(`${e.beneficiario}|${e.monto}`)) {
          console.log(`[Sync] Egreso ya existe, saltando: ${e.beneficiario} - ${e.monto}`);
          continue;
        }

        const fDB = normalizeFecha(e.fecha);
        // Hash estable sin la fecha exacta de sincronización si es posible, o simplemente usar upsert con hash único
        const hash = await generateHash(`${mesEstandar}|${e.beneficiario}|${e.monto}`);
        
        await supabase.from("egresos").upsert({ 
          edificio_id: building.id, 
          fecha: fDB, 
          beneficiario: e.beneficiario, 
          descripcion: e.operacion, 
          monto: e.monto, 
          hash, 
          sincronizado: true, 
          mes: mesEstandar 
        }, { onConflict: 'edificio_id,hash' });

        const desc = `${e.operacion} - ${e.beneficiario}`;
        await supabase.from("movimientos").upsert({ 
          edificio_id: building.id, 
          tipo: "egreso", 
          descripcion: desc, 
          monto: e.monto, 
          fecha: fDB, 
          hash, 
          sincronizado: true 
        }, { onConflict: 'edificio_id,hash' });

        if (fDB === today) {
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
    }

    // PROCESAR INGRESOS DETECTADOS (PAGOS DE CONDOMINIO)
    if (allIngresos.length > 0) {
      console.log(`Verificando ${allIngresos.length} ingresos para ${mesEstandar}`);
      const { data: ingresosExistentes } = await supabase
        .from("ingresos")
        .select("hash")
        .eq("edificio_id", building.id)
        .eq("mes", mesEstandar);
      
      const existingHashes = new Set(ingresosExistentes?.map(i => i.hash) || []);

      for (const ing of allIngresos) {
        const hash = await generateHash(`ING|${mesEstandar}|${ing.beneficiario}|${ing.monto}|${ing.fecha}`);
        if (!existingHashes.has(hash)) {
          const fDB = normalizeFecha(ing.fecha);
          await supabase.from("ingresos").upsert({
            edificio_id: building.id,
            fecha: fDB,
            unidad: ing.beneficiario, // En admlaideal r=1 el beneficiario es la unidad/nombre
            descripcion: ing.descripcion,
            monto: ing.monto,
            hash,
            sincronizado: true,
            mes: mesEstandar
          }, { onConflict: 'edificio_id,hash' });

          // Registrar en movimientos general
          await supabase.from("movimientos").upsert({
            edificio_id: building.id,
            tipo: "ingreso",
            descripcion: `${ing.descripcion} - ${ing.beneficiario}`,
            monto: ing.monto,
            fecha: fDB,
            hash,
            sincronizado: true
          }, { onConflict: 'edificio_id,hash' });

          // Generar alerta de pago detectado
          await supabase.from("alertas").insert({
            edificio_id: building.id,
            tipo: "ingreso",
            titulo: "💰 Pago Detectado",
            descripcion: `Se detectó un nuevo ingreso de Bs. ${ing.monto} correspondiente a ${ing.beneficiario}.`,
            fecha: today
          });
        }
      }
    }

    if (doSyncGastos) {
      // Si estamos en un mes histórico, la fecha del gasto debe ser el último día de ese mes
      // para que aparezca correctamente en los filtros de fecha.
      let fechaGasto = today;
      if (mes && mes.includes("-")) {
        const [mm, yyyy] = mes.split("-");
        const lastDay = new Date(parseInt(yyyy), parseInt(mm), 0).getDate();
        fechaGasto = `${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`;
      }

      // Combinar gastos de la tabla de gastos con los del detalle del recibo si la tabla viene vacía
      let finalGastos = [...allGastos];
      if (finalGastos.length === 0 && detailedReceiptItems.length > 0) {
        console.log("Gastos table empty, using detailedReceiptItems as fallback");
        finalGastos = detailedReceiptItems
          .filter(item => {
             const desc = (item.descripcion || "").toUpperCase();
             // No incluir fondos en gastos comunes
             return !desc.includes("FONDO") && item.codigo !== "00001";
          })
          .map(item => ({
            codigo: item.codigo,
            descripcion: item.descripcion,
            monto: item.monto
          }));
      }

      console.log(`Verificando ${finalGastos.length} gastos para el mes ${mesEstandar}`);
      
      // Obtener gastos ya registrados para este mes
      const { data: gastosExistentes } = await supabase
        .from("gastos")
        .select("codigo, monto, descripcion")
        .eq("edificio_id", building.id)
        .eq("mes", mesEstandar);

      const existingMap = new Set(gastosExistentes?.map(g => `${g.codigo}|${g.monto}`) || []);
      
      for (const g of finalGastos) {
        // Doble verificación: No guardar fondos si se colaron por algún motivo
        const descUpper = (g.descripcion || "").toUpperCase();
        if (descUpper.includes("FONDO") || g.codigo === "00001") {
          console.log(`[Sync] Saltando guardado de fondo detectado en bucle final: ${g.descripcion}`);
          continue;
        }

        // Verificar si ya existe (por código y monto)
        if (existingMap.has(`${g.codigo}|${g.monto}`)) {
          console.log(`[Sync] Gasto ya existe, saltando: ${g.codigo} - ${g.monto}`);
          continue;
        }

        // Incluir la descripción en el hash para evitar colisiones si dos gastos tienen mismo código y monto (ej. ascensores)
        const hash = await generateHash(`GASTO|${g.codigo}|${g.monto}|${g.descripcion}|${mesEstandar}`);
        const { error: gErr } = await supabase.from("gastos").upsert({ 
          edificio_id: building.id, 
          mes: mesEstandar, 
          fecha: fechaGasto, 
          codigo: g.codigo, 
          descripcion: g.descripcion, 
          monto: g.monto, 
          hash, 
          sincronizado: true 
        }, { onConflict: 'edificio_id,hash' });
        
        if (gErr) console.error(`Error guardando gasto ${g.codigo}:`, gErr);

        await supabase.from("movimientos").upsert({ 
          edificio_id: building.id, 
          tipo: "gasto", 
          descripcion: g.descripcion, 
          monto: g.monto, 
          fecha: fechaGasto, 
          hash, 
          sincronizado: true 
        }, { onConflict: 'edificio_id,hash' });
        
        if (mesEstandar === today.substring(0, 7)) {
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

    const allConcepts: any[] = [];
    
    // 1. De Gastos (r=3)
    (allGastos || []).forEach(g => {
      if (g.codigo && !allConcepts.find(c => c.codigo === g.codigo)) {
        allConcepts.push({ codigo: g.codigo, descripcion: g.descripcion });
      }
    });

    // 2. De Recibos Detallados (r=4)
    (detailedReceiptItems || []).forEach(item => {
      if (item.codigo && !allConcepts.find(c => c.codigo === item.codigo)) {
        allConcepts.push({ codigo: item.codigo, descripcion: item.descripcion });
      }
    });

    // 3. De Egresos (r=21) - Algunos edificios no traen código formal aquí, pero usamos el beneficiario como descripción
    (allEgresos || []).forEach(egr => {
      // Si el egreso tiene algo que parezca un código en la operación
      const possibleCode = egr.operacion?.split(' ')[0] || "";
      if (possibleCode.match(/^[A-Z0-9\-]+$/) && possibleCode.length > 2) {
        if (!allConcepts.find(c => c.codigo === possibleCode)) {
          allConcepts.push({ codigo: possibleCode, descripcion: egr.beneficiario });
        }
      }
    });

    if (allConcepts.length > 0) {
      console.log(`Actualizando ${allConcepts.length} conceptos detectados para ${building.id}`);
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