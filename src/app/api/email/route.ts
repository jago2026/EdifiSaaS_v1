import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

const SMTP_HOST = "smtp.gmail.com";
const SMTP_PORT = 587;
const SMTP_USER = "controlfinancierosaas@gmail.com";
const SMTP_PASS = "bjedepzgbococwsl";

const BASE_URL = "https://edifi-saa-s-v1.vercel.app";

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

function formatNumber(num: number, decimals: number = 2): string {
  return num.toLocaleString("es-VE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatBs(amount: number): string {
  return formatNumber(amount) + " Bs";
}

function formatUsd(amount: number): string {
  return formatNumber(amount) + " USD";
}

function getDiaSemana(fecha: string): string {
  const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  return dias[new Date(fecha).getDay()];
}

async function getTasaBCV(): Promise<number> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  try {
    const { data } = await supabase
      .from("tasas_cambio")
      .select("tasa_dolar")
      .order("fecha", { ascending: false })
      .limit(1)
      .single();
    return data?.tasa_dolar || 45.50;
  } catch { return 45.50; }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { edificioId, testMode, action } = body;
    const tasa = await getTasaBCV();
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: edificio } = await supabase.from("edificios").select("id, nombre, unidades").eq("id", edificioId).single();
    if (!edificio) return NextResponse.json({ error: "Edificio no encontrado" }, { status: 404 });

    const { data: juntaMembers } = await supabase.from("junta").select("email").eq("edificio_id", edificioId);
    const toEmails = testMode ? ["correojago@gmail.com"] : (juntaMembers || []).map(m => m.email).filter(e => e);
    if (toEmails.length === 0) return NextResponse.json({ error: "No hay emails en la junta" }, { status: 400 });

    const todayDate = new Date();
    const today = todayDate.toISOString().split("T")[0];
    const fechaStr = todayDate.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });

    if (action === "whatsapp_report") {
      // Get all receipts with debt
      const { data: recibos } = await supabase.from("recibos").select("num_recibos, deuda").eq("edificio_id", edificioId).gt("deuda", 0);
      
      const dist: Record<number, { count: number, total: number }> = {};
      (recibos || []).forEach(r => {
        const n = r.num_recibos || 1;
        if (!dist[n]) dist[n] = { count: 0, total: 0 };
        dist[n].count++;
        dist[n].total += Number(r.deuda);
      });

      const totalGeneralAdeudado = (recibos || []).reduce((sum, r) => sum + Number(r.deuda), 0);
      const cantAptosConDeuda = recibos?.length || 0;
      const totalAptos = edificio.unidades || 43;
      const pctAptosConDeuda = (cantAptosConDeuda / totalAptos) * 100;
      
      // Get balance for collection percentage
      const { data: balance } = await supabase.from("balances").select("cobranza_mes, recibos_mes").eq("edificio_id", edificioId).order("mes", { ascending: false }).limit(1).single();
      const pctRecaudado = balance?.recibos_mes ? (Number(balance.cobranza_mes) / Number(balance.recibos_mes)) * 100 : 0;
      const pctPendiente = 100 - pctRecaudado;

      // Days remaining in month
      const lastDay = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).getDate();
      const daysRemaining = lastDay - todayDate.getDate();

      let deudasTexto = "";
      Object.keys(dist).sort((a, b) => Number(a) - Number(b)).forEach(n => {
        const d = dist[Number(n)];
        deudasTexto += `• ${d.count} apartamento(s) deben ${n} recibo(s), por un total de ${formatBs(d.total)}.\n`;
      });

      const whatsappMsg = `Resumen del Día: (MENSAJE A ENVIAR POR WHATSAPP)

📢 Estado de pagos de condominio – ${fechaStr}

Buen día, Estimados/as vecinos/as,

A continuación el resumen actualizado de los recibos pendientes de condominio, con el objetivo de mantener la transparencia en el funcionamiento del edificio:

📝 Resumen de deuda pendiente al ${fechaStr}:
${deudasTexto}📊 Total general adeudado: ${formatBs(totalGeneralAdeudado)}

🏠 Cantidad de apartamentos con deuda: ${cantAptosConDeuda} (equivale al ${formatNumber(pctAptosConDeuda)} % del total)
Porcentaje recaudado del mes: ${formatNumber(pctRecaudado)} %
Porcentaje pendiente por recaudar: ${formatNumber(pctPendiente)} %
Días restantes del mes: ${daysRemaining}

Agradecemos a quienes ya han cumplido con sus pagos.

A quienes aún tienen cuotas pendientes, se les invita cordialmente a ponerse al día para garantizar el mantenimiento, seguridad y operatividad del condominio.

📌 CONSULTA DETALLADA: El desglose detallado de las cuentas por cobrar del edificio se encuentra disponible para su consulta privada en el sitio web de la administradora, ingresando a la sección "Recibos Pendientes".

Gracias por su colaboración y compromiso.

Junta de Condominio.

Generado automáticamente por el Sistema de Control de Recibos.`;

      await transporter.sendMail({
        from: `"Sistema Junta de Condominio" <${SMTP_USER}>`,
        to: toEmails.join(", "),
        subject: `[WHATSAPP REPORT] Resumen Condominio ${edificio.nombre} - ${fechaStr}`,
        text: whatsappMsg,
      });

      return NextResponse.json({ success: true, message: "Reporte estilo WhatsApp enviado por email", recipient: toEmails.join(", ") });
    }

    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    // Get balance
    const { data: balance } = await supabase.from("balances").select("*").eq("edificio_id", edificioId).order("fecha", { ascending: false }).limit(1);
    const bal = balance?.[0];

    // Get manual balance
    const { data: manualBal } = await supabase.from("movimientos_manual").select("*").eq("edificio_id", edificioId).order("fecha_corte", { ascending: false }).limit(1);
    const mBal = manualBal?.[0];

    // Historical balances
    const { data: balancesHist } = await supabase.from("balances").select("mes, cobranza_mes, gastos_facturados").eq("edificio_id", edificioId).order("mes", { ascending: false }).limit(4);

    // Recibos with debt
    const { data: recibos } = await supabase.from("recibos").select("unidad, propietario, num_recibos, deuda").eq("edificio_id", edificioId).gt("deuda", 0);
    const totalDeuda = (recibos || []).reduce((sum, r) => sum + r.deuda, 0);
    const unidadesConDeuda = recibos?.length || 0;

    // Today's movements
    const { data: movimientosDia } = await supabase.from("movimientos_dia").select("tipo, descripcion, monto, fuente").eq("edificio_id", edificioId).eq("detectado_en", today);
    const pagosHoy = movimientosDia?.filter(m => m.tipo === "recibo") || [];
    const cobrosHoy = pagosHoy.length;
    const montoCobradoHoy = pagosHoy.reduce((sum, p) => sum + p.monto, 0);

    // Egresos
    const { data: newestEgresos } = await supabase.from("egresos").select("fecha, beneficiario, descripcion, monto").eq("edificio_id", edificioId).order("fecha", { ascending: false }).limit(10);

    // 7-day history
    const { data: movs7days } = await supabase.from("movimientos_dia").select("detectado_en, tipo, monto").eq("edificio_id", edificioId).gte("detectado_en", yesterday).order("detectado_en", { ascending: false });

    const fechaCompleta = todayDate.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
    const horaEnvio = todayDate.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "America/Caracas" });

    const disponibilidadTotal = Number(bal?.saldo_disponible || 0) + Number(bal?.fondo_reserva || 0);
    const disponibilidadTotalUSD = disponibilidadTotal / tasa;
    const saldoAnterior = Number(bal?.saldo_anterior || 0);
    const saldoDisponible = Number(bal?.saldo_disponible || 0);
    const saldoManual = Number(mBal?.saldo_final || 0);
    const saldoManualUSD = Number(mBal?.saldo_final_usd || (saldoManual / tasa));

    const ajustesDelDia = 0;
    const resultadoDelDia = Number(bal?.cobranza_mes || 0) - Number(bal?.gastos_facturados || 0) + ajustesDelDia;
    const resultadoDelDiaUSD = resultadoDelDia / tasa;

    // Calculate 7-day movements
    let saldoCalculado = saldoAnterior;
    const movs7daysList = movs7days || [];
    const ultimos7dias: any[] = [];
    for (let i = movs7daysList.length - 1; i >= 0; i--) {
      const m = movs7daysList[i];
      const movTipo = m.tipo === "recibo" ? m.monto : -m.monto;
      saldoCalculado += movTipo;
      ultimos7dias.unshift({
        fecha: m.detectado_en,
        dia: getDiaSemana(m.detectado_en),
        ing: m.tipo === "recibo" ? m.monto : 0,
        eg: m.tipo === "recibo" ? 0 : m.monto,
        saldo: saldoCalculado,
        saldoUsd: saldoCalculado / tasa
      });
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; color: #333; line-height: 1.4; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 800px; margin: 0 auto; background: white; }
    .header { background: #1a73e8; color: white; padding: 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; }
    .header p { margin: 5px 0 0; opacity: 0.9; font-size: 13px; }
    .content { padding: 15px; }
    .section-title { font-weight: bold; font-size: 14px; text-align: center; padding: 10px; margin: 15px 0 10px; border-radius: 4px; color: white; }
    .estado { background: #34a853; }
    .cobrar { background: #ea4335; }
    .fondos { background: #4285f4; }
    .movimientos { background: #f9ab00; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #eee; font-size: 11px; }
    th { background: #f8f9fa; }
    .metric-table td { padding: 4px 8px; }
    .metric-label { font-size: 11px; color: #5f6368; text-align: left; }
    .metric-value { font-size: 11px; font-weight: bold; text-align: right; }
    .highlight-box { background: #e8f0fe; border-left: 4px solid #1a73e8; padding: 10px; margin: 10px 0; border-radius: 4px; }
    .highlight-value { font-size: 16px; font-weight: bold; color: #1a73e8; text-align: center; }
    .highlight-subvalue { font-size: 12px; color: #5f6368; text-align: center; }
    .positive { color: #34a853; }
    .negative { color: #ea4335; }
    .footer { text-align: center; padding: 15px; font-size: 11px; color: #666; background: #f8f9fa; border-top: 1px solid #eee; }
    .two-col { width: 100%; border-collapse: collapse; }
    .two-col td { width: 50%; vertical-align: top; padding: 0 5px; }
    .btn { display: inline-block; padding: 10px 20px; background: #1a73e8; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 14px; }
    .resaltado { background: #fff3cd; padding: 10px; border-radius: 4px; margin: 10px 0; }
    .manual-box { background: #e0f2f1; border-left: 4px solid #009688; padding: 10px; margin: 10px 0; border-radius: 4px; }
    .manual-value { font-size: 16px; font-weight: bold; color: #00796b; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏡 CONTROL FINANCIERO CONDOMINIO ${edificio.nombre.toUpperCase()}</h1>
      <p>Actualizado: ${fechaCompleta} | Tasa: ${formatNumber(tasa)} Bs/USD</p>
    </div>
    
    <div class="content">
      <div style="background: #eef2f3; padding: 12px; border-radius: 6px; margin-bottom: 20px; border: 1px solid #d1d9e6;">
        <p style="margin: 0; font-size: 13px; font-weight: bold; color: #2c3e50;">
          Saldo Manual del Día: <span style="color: #00796b;">${formatBs(saldoManual)}</span> | <span style="color: #00796b;">${formatUsd(saldoManualUSD)}</span>
        </p>
      </div>

      <!-- ESTADO FINANCIERO -->
      <div class="section-title estado">💰 ESTADO FINANCIERO ACTUAL (Web Admin)</div>
      <table class="two-col">
        <tr>
          <td>
            <table class="metric-table">
              <tr><td class="metric-label">Saldo Anterior:</td><td class="metric-value">${formatBs(saldoAnterior)}</td></tr>
            </table>
            <div class="highlight-box">
              <div class="highlight-value">${formatBs(saldoDisponible)}</div>
              <div class="highlight-subvalue">${formatUsd(saldoDisponible / tasa)} USD</div>
            </div>
            <div style="text-align: center; font-size: 12px; font-weight: bold; background: #e8f0fe; color: #1a73e8; padding: 8px; border-radius: 4px; margin-bottom: 8px;">Saldo Disponible Operativo del Día</div>
            <table class="metric-table">
              <tr><td class="metric-label">Ingresos:</td><td class="metric-value positive">${formatBs(bal?.cobranza_mes || 0)}</td></tr>
              <tr><td class="metric-label">Egresos:</td><td class="metric-value negative">${formatBs(bal?.gastos_facturados || 0)}</td></tr>
              <tr><td class="metric-label">Ajustes:</td><td class="metric-value">${formatBs(ajustesDelDia)}</td></tr>
              <tr><td class="metric-label">Resultado:</td><td class="metric-value ${resultadoDelDia >= 0 ? 'positive' : 'negative'}">${formatBs(resultadoDelDia)} (${formatUsd(resultadoDelDiaUSD)})</td></tr>
            </table>
          </td>
          <td>
            <div style="margin-bottom: 10px;">
              <table class="metric-table">
                <tr><td class="metric-label">Fondo Reserva:</td><td class="metric-value">${formatBs(bal?.fondo_reserva || 0)}</td></tr>
                <tr><td class="metric-label">Total Fondos:</td><td class="metric-value" style="color: #1a73e8; font-weight: bold;">${formatBs(bal?.fondo_reserva || 0)}</td></tr>
              </table>
              <div class="highlight-box" style="background: #d9ead3; border-left-color: #0b5394; margin-bottom: 5px;">
                <div class="highlight-value" style="color: #0b5394;">${formatBs(disponibilidadTotal)}</div>
                <div class="highlight-subvalue">${formatUsd(disponibilidadTotalUSD)} USD</div>
              </div>
              <div style="text-align: center; font-size: 11px; color: #5f6368; margin-bottom: 15px;">Disponibilidad Total General</div>
            </div>

            <div class="manual-box">
              <div class="manual-value">${formatBs(saldoManual)}</div>
              <div style="text-align: center; font-size: 12px; color: #00796b; font-weight: bold;">${formatUsd(saldoManualUSD)} USD</div>
              <div style="text-align: center; font-size: 11px; color: #00796b; margin-top: 5px;">Saldo Manual (Registros Internos)</div>
            </div>
          </td>
        </tr>
      </table>

      <!-- RESUMEN MENSUAL -->
      <div class="section-title estado">** RESUMEN MENSUAL (Ingresos / Egresos / Gastos) **</div>
      <table>
        <thead>
          <tr style="background: #8e44ad;"><th>Mes</th><th style="text-align:right;">Ingresos</th><th style="text-align:right;">Egresos</th><th style="text-align:right;">Gastos</th><th style="text-align:right;">Neto</th></tr>
        </thead>
        <tbody>
          ${(balancesHist || []).map((b: any, i: number) => {
            const neto = Number(b.cobranza_mes) - Number(b.gastos_facturados);
            return `<tr style="${i === 0 ? 'background:#eef7ff;font-weight:bold;': ''}">
              <td>${b.mes || ''}</td>
              <td style="text-align:right;">${formatBs(Number(b.cobranza_mes))}</td>
              <td style="text-align:right;">${formatBs(Number(b.gastos_facturados))}</td>
              <td style="text-align:right;">-</td>
              <td style="text-align:right; color:${neto >= 0 ? '#34a853':'#ea4335'}">${formatBs(neto)}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>

      <!-- CUENTAS POR COBRAR -->
      <div class="section-title cobrar">🟡 CUENTAS POR COBRAR</div>
      <table class="two-col">
        <tr>
          <td>
            <table class="metric-table">
              <tr><td class="metric-label">Recibos Pendientes:</td><td class="metric-value ${unidadesConDeuda > 25 ? 'negative' : 'positive'}">${unidadesConDeuda} unidades</td></tr>
            </table>
            <div style="text-align: center; font-size: 10px; color: #5f6368;">(${(unidadesConDeuda/43*100).toFixed(1)}% de 43 unidades totales)</div>
          </td>
          <td>
            <table class="metric-table">
              <tr><td class="metric-label">Monto Por Cobrar:</td><td class="metric-value negative">${formatBs(totalDeuda)}</td></tr>
            </table>
            <div style="text-align: center; font-size: 10px; color: #5f6368;">${formatUsd(totalDeuda/tasa)} USD</div>
          </td>
        </tr>
      </table>

      <!-- RESUMEN DE COBROS DEL DÍA -->
      <div class="section-title fondos">📊 RESUMEN DE COBROS DEL DÍA</div>
      <table class="two-col">
        <tr>
          <td>
            <table class="metric-table">
              <tr><td class="metric-label">Apartamentos Pagaron:</td><td class="metric-value positive">${cobrosHoy} unidades</td></tr>
            </table>
            <div style="text-align: center; font-size: 10px; color: #5f6368;">hoy</div>
          </td>
          <td>
            <table class="metric-table">
              <tr><td class="metric-label">Monto Cobrado Hoy:</td><td class="metric-value positive">${formatBs(montoCobradoHoy)}</td></tr>
            </table>
            <div style="text-align: center; font-size: 10px; color: #5f6368;">${formatUsd(montoCobradoHoy/tasa)} USD</div>
          </td>
        </tr>
      </table>

      <!-- ÚLTIMOS MOVIMIENTOS 7 DÍAS -->
      <div class="section-title movimientos">📈 ÚLTIMOS MOVIMIENTOS OPERATIVOS (7 DÍAS)</div>
      <table>
        <thead>
          <tr style="background:#f9ab00;"><th>Fecha</th><th>DÍA</th><th style="text-align:right;">SALDO ANT.</th><th style="text-align:right;">INGRESOS</th><th style="text-align:right;">EGRESOS</th><th style="text-align:right;">SALDO ACT.</th><th style="text-align:right;">USD</th></tr>
        </thead>
        <tbody>
          <tr><td>${today}</td><td>${getDiaSemana(today)}</td><td style="text-align:right;">${formatBs(saldoAnterior)}</td><td style="text-align:right;">${formatBs(Number(bal?.cobranza_mes))}</td><td style="text-align:right;">${formatBs(Number(bal?.gastos_facturados))}</td><td style="text-align:right;">${formatBs(saldoDisponible)}</td><td style="text-align:right;">${formatUsd(saldoDisponible/tasa)}</td></tr>
          ${ultimos7dias.slice(0, 6).map((d) => `
            <tr><td>${d.fecha}</td><td>${d.dia}</td><td style="text-align:right;">-</td><td style="text-align:right;">${formatBs(d.ing)}</td><td style="text-align:right;">${formatBs(d.eg)}</td><td style="text-align:right;">${formatBs(d.saldo)}</td><td style="text-align:right;">${formatUsd(d.saldoUsd)}</td></tr>
          `).join("")}
        </tbody>
      </table>

      <!-- LINK AL DASHBOARD -->
      <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 4px; border-left: 4px solid #1a73e8; text-align: center;">
        <div style="font-size: 11px; color: #5f6368; margin-bottom: 10px;">
          <strong>📊 Para consultar en detalles los movimientos obtenidos de la página web de la administradora:</strong>
        </div>
        <a href="${BASE_URL}/login" style="display:inline-block;padding:12px 24px;background:#1a73e8;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:14px;">Ver Control Financiero</a>
      </div>

      <!-- DETALLES DEL DÍA -->
      <div style="margin-top: 20px; padding-top: 15px; border-top: 2px solid #eee;">
        <h3 style="color: #333; font-size: 14px; margin-bottom: 10px;">📋 Detalles de Transacciones del Día</h3>
        
        <h4 style="color:#34a853; font-size: 12px; margin: 15px 0 8px;">💰 Recibos de Condominio Pagados (Ingresos)</h4>
        ${cobrosHoy > 0 ? `<table><thead><tr style="background:#e8f5e8;"><th>Apartamento</th><th>Descripción</th><th style="text-align:right;">Monto (USD)</th><th style="text-align:right;">Monto (Bs.)</th></tr></thead><tbody>${pagosHoy.map((p: any) => `<tr><td>${p.descripcion}</td><td>Recibo</td><td style="text-align:right;">${formatNumber(p.monto/tasa)}</td><td style="text-align:right;">${formatBs(p.monto)}</td></tr>`).join("")}</tbody></table>` : '<p style="color:#666; font-size:11px;">No se registraron pagos hoy.</p>'}

        <h4 style="color:#ea4335; font-size: 12px; margin: 15px 0 8px;">💸 Egresos Procesados Hoy</h4>
        ${newestEgresos?.length ? `<table><thead><tr style="background:#ffe8e8;"><th>Beneficiario</th><th>Operación</th><th style="text-align:right;">Monto (Bs)</th><th style="text-align:right;">Monto (USD)</th></tr></thead><tbody>${newestEgresos.map((e: any) => `<tr><td>${e.beneficiario}</td><td>Egreso: ${e.descripcion || 'N/A'}</td><td style="text-align:right;">${formatBs(e.monto)}</td><td style="text-align:right;">${formatUsd(e.monto/tasa)}</td></tr>`).join("")}</tbody></table>` : '<p style="color:#666; font-size:11px;">No hay egresos hoy.</p>'}
      </div>
    </div>

    <div class="footer">
      <p>🕐 Enviado el ${fechaCompleta} a las ${horaEnvio}</p>
      <p>📧 <strong>Resumen Generado Automáticamente</strong> - Sistema de Control Financiero Condominio</p>
      <p style="font-size: 10px; color: #999; margin-top: 10px;">
        Este mensaje fue generado automáticamente. Por favor, <strong>no responda a este email</strong>, ya que esta dirección de correo no es monitoreada y no recibiremos su respuesta.
      </p>
    </div>
  </div>
</body>
</html>`;

    const subject = `${testMode ? "[TEST] " : ""}Resumen Financiero Condominio - ${fechaStr}`;

    await transporter.sendMail({
      from: `"Sistema Junta de Condominio" <${SMTP_USER}>`,
      to: toEmails.join(", "),
      subject,
      html,
    });

    return NextResponse.json({ success: true, message: testMode ? "Email de prueba enviado" : "Informe enviado a la junta", recipient: toEmails.join(", ") });
  } catch (error: any) {
    console.error("Email error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
