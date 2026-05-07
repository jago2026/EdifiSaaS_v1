import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function normalizeMes(mesStr: string): string {
  const match = mesStr?.match(/^(\d{2})-(\d{4})$/);
  return match ? `${match[2]}-${match[1]}` : (mesStr || "");
}

function parseMonto(text: string): number {
  if (!text) return 0;
  let cleaned = text.replace(/[^\d.,-]/g, "");
  if (!cleaned) return 0;
  if (cleaned.includes(".") && cleaned.includes(",")) {
    return parseFloat(cleaned.replace(/\./g, "").replace(",", ".")) || 0;
  }
  if (cleaned.includes(",")) {
    return parseFloat(cleaned.replace(",", ".")) || 0;
  }
  if (cleaned.includes(".")) {
    const parts = cleaned.split(".");
    const lastPart = parts[parts.length - 1];
    if (lastPart.length === 2) return parseFloat(cleaned) || 0;
    if (lastPart.length === 3) return parseFloat(cleaned.replace(/\./g, "")) || 0;
  }
  return parseFloat(cleaned) || 0;
}

function cleanHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&Aacute;/g, "Á").replace(/&Eacute;/g, "É").replace(/&Iacute;/g, "Í")
    .replace(/&Oacute;/g, "Ó").replace(/&Uacute;/g, "Ú")
    .replace(/&aacute;/g, "á").replace(/&eacute;/g, "é").replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó").replace(/&uacute;/g, "ú")
    .replace(/&ntilde;/g, "ñ").replace(/&Ntilde;/g, "Ñ")
    .replace(/&#8209;/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function parseReciboDetalleFromHtml(html: string): any[] {
  if (!html) return [];
  const results: any[] = [];

  const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];

  for (const rowContent of rows) {
    const cells = rowContent.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
    if (!cells || cells.length < 2) continue;

    const cellTexts = cells.map(c => cleanHtml(c).trim());

    const rowText = cellTexts.join(' ').toUpperCase();
    if (rowText.includes('CÓDIGO') || rowText.includes('CONCEPTO') || rowText.includes('DESCRIPCI')) continue;

    let code = cellTexts[0];
    const isCodeCell = /^\d{3,6}$/.test(code.replace(/[^0-9]/g, '')) && code.length <= 8;

    let desc = '';
    let montoRaw = '';
    let cuotaRaw = '';

    if (isCodeCell) {
      desc = cellTexts[1] || '';
      montoRaw = cellTexts[2] || '';
      cuotaRaw = cellTexts[3] || '';
    } else {
      code = '';
      desc = cellTexts[0];
      montoRaw = cellTexts[1] || '';
      cuotaRaw = cellTexts[2] || '';
    }

    desc = desc.replace(/\s+/g, ' ').trim();
    if (!desc || desc.length < 2) continue;

    const upperDesc = desc.toUpperCase();
    if (upperDesc === 'MONTO' || upperDesc === 'CUOTA PARTE' || upperDesc === 'DESCRIPCIÓN' || upperDesc === 'DESCRIPCION') continue;

    let foundMonto = parseMonto(montoRaw);
    let foundCuota = parseMonto(cuotaRaw);

    if (montoRaw.trim().startsWith('-') && foundMonto > 0) foundMonto = -foundMonto;
    if (cuotaRaw.trim().startsWith('-') && foundCuota > 0) foundCuota = -foundCuota;

    if (foundMonto === 0 && foundCuota === 0) {
      let montoCount = 0;
      for (let i = cellTexts.length - 1; i >= 0; i--) {
        const v = parseMonto(cellTexts[i]);
        if (v !== 0) {
          if (montoCount === 0) { foundCuota = v; montoCount++; }
          else if (montoCount === 1) { foundMonto = v; break; }
        }
      }
      if (montoCount === 1) { foundMonto = foundCuota; foundCuota = 0; }
    }

    let itemType = 'gasto';
    if (upperDesc.includes('FONDO DE RESERVA') || upperDesc.includes('FONDO PRESTACIONES') ||
        upperDesc.includes('FONDO TRABAJOS') || upperDesc.includes('FONDO INTERESES') ||
        upperDesc.includes('FONDO DIFERENCIAL')) {
      itemType = 'fondo';
    } else if (upperDesc.includes('TOTAL GASTOS COMUNES') || upperDesc.includes('TOTAL FONDOS') ||
               upperDesc.includes('TOTAL FONDOS Y GASTOS') || upperDesc.includes('TOTAL RECIBO') ||
               upperDesc.includes('GASTOS COMUNES SEGÚN') || upperDesc.includes('GASTOS COMUNES SEGUN')) {
      itemType = 'subtotal';
    }

    if (foundMonto !== 0 || foundCuota !== 0) {
      results.push({
        codigo: code,
        descripcion: desc,
        monto: foundMonto,
        cuota_parte: foundCuota,
        tipo: itemType
      });
    }
  }

  // Deduplication: remove only truly identical rows
  return results.filter((item, index, self) =>
    index === self.findIndex((t) => (
      t.codigo === item.codigo &&
      t.descripcion === item.descripcion &&
      Math.abs(t.monto - item.monto) < 0.01 &&
      Math.abs(t.cuota_parte - item.cuota_parte) < 0.01
    ))
  );
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
    return { cookie: `PHPSESSID=${sid}`, sid };
  } catch { return null; }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const edificioId = searchParams.get("edificioId");
  const mes = searchParams.get("mes");
  const unidad = searchParams.get("unidad");
  const liveScrape = searchParams.get("live") === "1";

  if (!edificioId) {
    return NextResponse.json({ error: "edificioId required" }, { status: 400 });
  }

  const mesNormalizado = normalizeMes(mes || "");
  

  try {
    let targetMes = mesNormalizado;

    if (!targetMes || targetMes === "") {
      const { data: recentData } = await supabase
        .from("recibos_detalle")
        .select("mes")
        .eq("edificio_id", edificioId)
        .eq("unidad", "GENERAL")
        .order("mes", { ascending: false })
        .limit(1);
      if (recentData && recentData.length > 0) {
        targetMes = recentData[0].mes;
      }
    }

    let query = supabase
      .from("recibos_detalle")
      .select("*")
      .eq("edificio_id", edificioId);

    if (targetMes) query = query.eq("mes", targetMes);
    if (unidad) query = query.eq("unidad", unidad);
    query = query.order("codigo");

    let { data: detalles, error } = await query;
    if (error) throw error;

    // If no data in DB or live scrape requested, try to fetch directly from admin
    if ((!detalles || detalles.length === 0) || liveScrape) {
      const { data: building } = await supabase
        .from("edificios")
        .select("url_login, admin_secret")
        .eq("id", edificioId)
        .single();

      if (building?.url_login && building?.admin_secret) {
        try {
          const session = await loginToRascaCielo(building.url_login, building.admin_secret);
          if (session) {
            const baseUrl = new URL(building.url_login).origin.replace("http://", "https://");

            // Build combo param from mes (YYYY-MM -> dd-mm-yyyy last day of month)
            let comboParam = "";
            if (mes && mes.match(/^\d{2}-\d{4}$/)) {
              const [mm, yyyy] = mes.split("-");
              const lastDay = new Date(parseInt(yyyy), parseInt(mm), 0).getDate();
              comboParam = `&combo=${String(lastDay).padStart(2, '0')}-${mm}-${yyyy}`;
            }

            const url = `${baseUrl}/condlin.php?r=4${comboParam}&PHPSESSID=${session.sid}`;
            const res = await fetch(url, {
              headers: { "Cookie": session.cookie, "User-Agent": USER_AGENT, "Referer": `${baseUrl}/condlin.php` }
            });
            const html = await res.text();

            if (html && html.length > 2000) {
              const liveItems = parseReciboDetalleFromHtml(html);
              if (liveItems.length > 0) {
                // Store in DB for future requests (after clearing old data for this month)
                if (targetMes) {
                  await supabase.from("recibos_detalle").delete()
                    .eq("edificio_id", edificioId).eq("mes", targetMes).eq("unidad", "GENERAL");

                  const seenInBatch = new Set<string>();
                  const itemsToSave = liveItems.map(item => {
                    let candidate = item.codigo || "S/C";
                    let suffix = 0;
                    while (seenInBatch.has(candidate)) { suffix++; candidate = `${item.codigo || "S/C"}#${suffix}`; }
                    seenInBatch.add(candidate);
                    return {
                      edificio_id: edificioId,
                      unidad: "GENERAL",
                      propietario: "EDIFICIO",
                      mes: targetMes,
                      codigo: candidate,
                      descripcion: item.descripcion,
                      monto: item.monto,
                      cuota_parte: item.cuota_parte,
                      tipo: item.tipo || "gasto_comun"
                    };
                  });
                  await supabase.from("recibos_detalle").insert(itemsToSave);
                }

                return NextResponse.json({ detalles: liveItems, source: "live" });
              }
            }
          }
        } catch (scrapeErr) {
          console.error("Live scrape error:", scrapeErr);
        }
      }
    }

    return NextResponse.json({ detalles: detalles || [] });
  } catch (error: any) {
    console.error("Error loading recibo detalle:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
