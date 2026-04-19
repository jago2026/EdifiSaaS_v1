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
  // Buscamos la tabla que tiene los gastos (C&oacute;digo, Descripci&oacute;n, Monto, Cuota Parte)
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
    
    // Saltamos filas de totales o vacías
    if (!code || code === "&nbsp;" || code.trim() === "") continue;
    if (desc.toUpperCase().includes("TOTAL")) continue;
    if (code.length > 10) continue; // Probablemente no es un código

    results.push({
      codigo: code,
      descripcion: desc,
      monto: monto,
      cuota_parte: cuotaParte
    });
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
  
  // Limpiar HTML para búsqueda global
  const text = cleanHtml(html).toUpperCase().replace(/\s+/g, ' ');
  
  // Función auxiliar para extraer montos siguiendo una etiqueta
  const extractAfter = (label: string) => {
    const idx = text.indexOf(label);
    if (idx === -1) return null;
    const sub = text.substring(idx + label.length, idx + label.length + 50);
    const match = sub.match(/[\d,.]+/);
    return match ? parseMonto(match[0]) : null;
  };

  // Intentar extracción por palabras clave globales si la tabla falla
  balance.saldo_anterior = extractAfter("SALDO DE CAJA MES ANTERIOR") || extractAfter("SALDO ANTERIOR");
  balance.cobranza_mes = extractAfter("COBRANZA DEL MES") || extractAfter("TOTAL COBRADO") || extractAfter("INGRESOS DEL MES");
  balance.gastos_facturados = extractAfter("GASTOS FACTURADOS EN EL MES") || extractAfter("TOTAL GASTOS") || extractAfter("EGRESOS DEL MES");
  balance.saldo_disponible = extractAfter("SALDO ACTUAL DISPONIBLE EN CAJA") || extractAfter("SALDO DISPONIBLE") || extractAfter("SALDO EN CAJA");
  balance.recibos_mes = extractAfter("RECIBOS DE CONDOMINIOS DEL MES") || extractAfter("EMISION DEL MES");
  balance.total_por_cobrar = extractAfter("TOTAL CONDOMINIOS POR COBRAR") || extractAfter("TOTAL POR COBRAR");
  balance.fondo_reserva = extractAfter("SALDO FONDO DE RESERVA") || extractAfter("FONDO DE RESERVA SALDO");

  // Validar si encontramos algo
  const found = Object.values(balance).some(v => v !== null && v !== 0);
  
  if (found) {
    // Rellenar nulos con 0 para evitar errores en BD
    for (const key in balance) { if (balance[key] === null) balance[key] = 0; }
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
    const comboParam = mes ? `&combo=${mes}` : "";

    const promises = [
      doSyncRecibos ? fetchPageWithCookie(`${baseUrl}/condlin.php?r=5${comboParam}`, session) : Promise.resolve(null),
      doSyncEgresos ? fetchPageWithCookie(`${baseUrl}/condlin.php?r=21${comboParam}`, session) : Promise.resolve(null),
      doSyncGastos ? fetchPageWithCookie(`${baseUrl}/condlin.php?r=3${comboParam}`, session) : Promise.resolve(null),
      doSyncBalance || doSyncEgresos || doSyncGastos ? fetchPageWithCookie(`${baseUrl}/condlin.php?r=2${comboParam}`, session) : Promise.resolve(null),
      doSyncAlicuotas ? fetchPageWithCookie(`${baseUrl}/condlin.php?r=23${comboParam}`, session) : Promise.resolve(null),
      doSyncRecibos ? fetchPageWithCookie(`${baseUrl}/condlin.php?r=4${comboParam}`, session) : Promise.resolve(null)
    ];

    const [hRec, hEgr, hGas, hBal, hAli, hRecSummary] = await Promise.all(promises);

    console.log(`Sync Debug [${mesEstandar}]: Scraping completed.`);
    console.log(`- hRec: ${hRec ? hRec.length : 0} chars`);
    console.log(`- hBal: ${hBal ? hBal.length : 0} chars`);
    console.log(`- hRecSummary: ${hRecSummary ? hRecSummary.length : 0} chars`);

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
      console.log(`Guardando items de detalle para ${mesEstandar}`);
      
      // Filtrar duplicados por código para evitar error "ON CONFLICT DO UPDATE command cannot affect row a second time"
      const uniqueItems: any[] = [];
      const seenCodigos = new Set();
      for (const item of detailedReceiptItems) {
        if (!seenCodigos.has(item.codigo)) {
          seenCodigos.add(item.codigo);
          uniqueItems.push(item);
        }
      }

      const itemsToSave = uniqueItems.map(item => ({
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
      const { error: detErr } = await supabase.from("recibos_detalle").upsert(itemsToSave, { onConflict: 'edificio_id,unidad,mes,codigo' });
      if (detErr) console.error("Error guardando detalle recibo:", detErr);
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
