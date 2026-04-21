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
    const { edificioId, testMode, action, error: errorMsg, recipient } = body;
    const tasa = await getTasaBCV();
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: edificio } = await supabase.from("edificios").select("id, nombre, unidades, email_junta").eq("id", edificioId).single();
    if (!edificio) return NextResponse.json({ error: "Edificio no encontrado" }, { status: 404 });

    if (action === "welcome_invitation") {
      const { tempPassword, nombreMiembro } = body;
      await transporter.sendMail({
        from: `"EdifiSaaS - Invitación" <${SMTP_USER}>`,
        to: recipient,
        subject: `Bienvenido a la Junta de Condominio - ${edificio.nombre}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
            <div style="background: #1a73e8; color: white; padding: 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">¡Hola, ${nombreMiembro}!</h1>
            </div>
            <div style="padding: 24px; color: #444; line-height: 1.6;">
              <p>Has sido invitado a participar como miembro de la junta en el sistema de control financiero del edificio <strong>${edificio.nombre}</strong>.</p>
              <p>Desde ahora podrás visualizar el estado de las finanzas, recibos pendientes, egresos y generar reportes en tiempo real.</p>
              
              <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 24px 0; border: 1px solid #e9ecef;">
                <p style="margin: 0 0 8px 0;"><strong>Tus credenciales de acceso:</strong></p>
                <p style="margin: 4px 0;">📧 Email: ${recipient}</p>
                <p style="margin: 4px 0;">🔑 Clave Inicial: <strong>${tempPassword}</strong></p>
              </div>

              <div style="text-align: center; margin: 32px 0;">
                <a href="${BASE_URL}/login" style="background: #1a73e8; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">Ingresar al Sistema</a>
              </div>

              <p style="font-size: 13px; color: #666; font-style: italic;">* Por seguridad, el sistema te pedirá cambiar tu clave al ingresar por primera vez.</p>
            </div>
            <div style="background: #f8f9fa; padding: 16px; text-align: center; font-size: 12px; color: #999;">
              EdifiSaaS v1 - Gestión Inteligente de Condominios
            </div>
          </div>
        `
      });
      return NextResponse.json({ success: true, message: "Invitación enviada" });
    }

    if (action === "send_pre_receipt") {
      const { payload } = body;
      const { mes, items, totalGastosComunes, alicuotas: dist, tasaDolar } = payload;
      
      const format = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const formatUsd = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      let rowsHtml = items.map((i: any) => `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; font-family: monospace;">${i.codigo}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${i.descripcion}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${format(i.monto)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right; color: #666;">${format(i.monto * 0.022135)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold;">${format((i.monto * 0.022135) * 1.10)}</td>
        </tr>
      `).join('');

      let alicuotasHtml = dist.map((g: any) => `
        <tr>
          <td style="border-bottom: 1px solid #eee; padding: 6px;">(${g.count}) ${g.alicuota.toFixed(7)}%</td>
          <td style="border-bottom: 1px solid #eee; padding: 6px; text-align: right;">${format(totalGastosComunes * (g.alicuota/100))}</td>
          <td style="border-bottom: 1px solid #eee; padding: 6px; text-align: right; font-weight: bold;">${format((totalGastosComunes * (g.alicuota/100)) * 1.10)}</td>
          <td style="border-bottom: 1px solid #eee; padding: 6px; text-align: right; color: #2e7d32;">$${formatUsd(((totalGastosComunes * (g.alicuota/100)) * 1.10) / (tasaDolar || 45))}</td>
        </tr>
      `).join('');

      // Configurar destinatarios
      let recipients = edificio.email_junta ? edificio.email_junta.split(",").map((e: string) => e.trim()) : [];
      
      // Si no hay correos manuales, buscar automáticamente a todos los miembros de la junta
      if (recipients.length === 0) {
        const { data: miembros } = await supabase.from("junta").select("email").eq("edificio_id", edificioId);
        if (miembros && miembros.length > 0) {
          recipients = miembros.map(m => m.email);
        }
      }

      if (recipients.length === 0) return NextResponse.json({ error: "No hay destinatarios configurados. Agrega correos en Configuración o registra miembros en la pestaña Junta." }, { status: 400 });

      await transporter.sendMail({
        from: `"EdifiSaaS - Estimados" <${SMTP_USER}>`,
        to: recipients,
        subject: `Borrador Recibo Estimado - ${edificio.nombre} - ${mes}`,
        html: `
          <div style="font-family: sans-serif; color: #333; max-width: 800px; margin: 0 auto;">
            <h2 style="text-align: center; color: #1a73e8; text-transform: uppercase;">Borrador Recibo Estimado (Referencial)</h2>
            <p style="text-align: center; font-weight: bold;">Período: ${mes} | Edificio: ${edificio.nombre}</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px;">
              <thead>
                <tr style="background: #f8f9fa;">
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">CÓDIGO</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">DESCRIPCIÓN</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">MONTO (Bs)</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">CUOTA PARTE (Bs)</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">TOTAL RECIBO (Bs)</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
                <tr style="background: #f1f3f4; font-weight: bold;">
                  <td colspan="2" style="border: 1px solid #ddd; padding: 10px; text-align: right;">TOTAL GASTOS COMUNES:</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${format(totalGastosComunes)}</td>
                  <td colspan="2" style="border: 1px solid #ddd;"></td>
                </tr>
                <tr style="background: #e8f0fe; font-weight: bold;">
                  <td colspan="2" style="border: 1px solid #ddd; padding: 10px; text-align: right;">FONDO DE RESERVA (10%):</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${format(totalGastosComunes * 0.10)}</td>
                  <td colspan="2" style="border: 1px solid #ddd;"></td>
                </tr>
              </tbody>
            </table>

            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
              <h3 style="margin-top: 0; font-size: 14px; text-transform: uppercase;">Distribución por Alícuotas</h3>
              <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 2px solid #ccc;">
                    <th style="text-align: left; padding: 5px;">TIPO / %</th>
                    <th style="text-align: right; padding: 5px;">CUOTA PARTE (Bs)</th>
                    <th style="text-align: right; padding: 5px;">TOTAL (Bs.)</th>
                    <th style="text-align: right; padding: 5px;">TOTAL USD ($)</th>
                  </tr>
                </thead>
                <tbody>
                  ${alicuotasHtml}
                </tbody>
              </table>
              <p style="font-size: 10px; color: #666; margin-top: 15px; font-style: italic;">
                * Valores calculados con Tasa BCV: ${format(tasaDolar)} Bs/USD.
              </p>
            </div>
          </div>
        `
      });
      return NextResponse.json({ success: true, message: "Borrador enviado exitosamente" });
    }

    if (action === "send_cash_flow") {
      const { payload } = body;
      const { mes, rows, summary } = payload;
      
      const format = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      let tableRowsHtml = rows.map((r: any) => `
        <tr style="background: ${r.dia % 2 === 0 ? '#f8f9fa' : '#ffffff'};">
          <td style="border: 1px solid #ddd; padding: 5px; text-align: center;">${r.dia}</td>
          <td style="border: 1px solid #ddd; padding: 5px; text-align: right; font-family: monospace; color: #888;">${format(r.saldoInicial)}</td>
          <td style="border: 1px solid #ddd; padding: 5px; text-align: right; font-family: monospace; color: #2e7d32;">${format(r.cobranza)}</td>
          <td style="border: 1px solid #ddd; padding: 5px; text-align: right; font-family: monospace; color: #4caf50;">${format(r.otrosIng)}</td>
          <td style="border: 1px solid #ddd; padding: 5px; text-align: right; font-family: monospace; background: #e8f5e9; font-weight: bold;">${format(r.totalIng)}</td>
          <td style="border: 1px solid #ddd; padding: 5px; text-align: right; font-family: monospace; color: #c62828;">${format(r.operativos)}</td>
          <td style="border: 1px solid #ddd; padding: 5px; text-align: right; font-family: monospace; color: #ef5350;">${format(r.otrosEgr)}</td>
          <td style="border: 1px solid #ddd; padding: 5px; text-align: right; font-family: monospace; background: #ffeeee; font-weight: bold;">${format(r.totalEgr)}</td>
          <td style="border: 1px solid #ddd; padding: 5px; text-align: right; font-family: monospace; color: #aaa;">0,00</td>
          <td style="border: 1px solid #ddd; padding: 5px; text-align: right; font-family: monospace; background: #f3f4f6; font-weight: bold;">${format(r.saldoFinal)}</td>
        </tr>
      `).join('');

      let recipients = edificio.email_junta ? edificio.email_junta.split(",").map((e: string) => e.trim()) : [];
      if (recipients.length === 0) {
        const { data: miembros } = await supabase.from("junta").select("email").eq("edificio_id", edificioId);
        if (miembros) recipients = miembros.map(m => m.email);
      }

      await transporter.sendMail({
        from: `"EdifiSaaS - Reportes" <${SMTP_USER}>`,
        to: recipients,
        subject: `Estado de Flujo de Efectivo - ${edificio.nombre} - ${mes}`,
        html: `
          <div style="font-family: sans-serif; color: #333; max-width: 900px; margin: 0 auto;">
            <h2 style="text-align: center; color: #1a73e8; text-transform: uppercase; margin-bottom: 5px;">Estado de Flujo de Efectivo</h2>
            <p style="text-align: center; font-weight: bold; margin-top: 0;">Edificio: ${edificio.nombre} | Período: ${mes}</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 10px;">
              <thead>
                <tr style="background: #1a237e; color: white;">
                  <th style="padding: 8px; border: 1px solid #0d125a;">Día</th>
                  <th style="padding: 8px; border: 1px solid #0d125a;">Saldo Inicial</th>
                  <th style="padding: 8px; border: 1px solid #0d125a;">Cobranza</th>
                  <th style="padding: 8px; border: 1px solid #0d125a;">Otros Ing.</th>
                  <th style="padding: 8px; border: 1px solid #0d125a; background: #004d40;">Total Ing.</th>
                  <th style="padding: 8px; border: 1px solid #0d125a;">Egr. Operat.</th>
                  <th style="padding: 8px; border: 1px solid #0d125a;">Otros Egr.</th>
                  <th style="padding: 8px; border: 1px solid #0d125a; background: #b71c1c;">Total Egr.</th>
                  <th style="padding: 8px; border: 1px solid #0d125a;">Ajustes</th>
                  <th style="padding: 8px; border: 1px solid #0d125a; background: #0d125a;">Saldo Final</th>
                </tr>
              </thead>
              <tbody>
                ${tableRowsHtml}
              </tbody>
            </table>

            <div style="display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-top: 30px;">
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #ddd;">
                <h3 style="margin-top: 0; font-size: 14px; text-transform: uppercase; color: #1a237e;">Resumen Ejecutivo</h3>
                <p style="margin: 5px 0; font-size: 12px;">Días con movimiento: <strong>${summary.daysWithMovement}</strong></p>
                <p style="margin: 5px 0; font-size: 12px;">Total Ingresos: <strong style="color: #2e7d32;">Bs. ${format(summary.totalIng)}</strong></p>
                <p style="margin: 5px 0; font-size: 12px;">Total Egresos: <strong style="color: #c62828;">Bs. ${format(summary.totalEgr)}</strong></p>
                <p style="margin: 5px 0; font-size: 12px;">Balance del Mes: <strong>Bs. ${format(summary.balance)}</strong></p>
              </div>
              <div style="background: #1a237e; padding: 15px; border-radius: 8px; color: white;">
                <h3 style="margin-top: 0; font-size: 14px; text-transform: uppercase; color: #8c9eff;">Análisis de Tendencia</h3>
                <p style="margin: 5px 0; font-size: 12px;">Día Mayor Ingreso: <strong>Día ${summary.maxIngDia}</strong> (Bs. ${format(summary.maxIngMonto)})</p>
                <p style="margin: 5px 0; font-size: 12px;">Día Mayor Egreso: <strong>Día ${summary.maxEgrDia}</strong> (Bs. ${format(summary.maxEgrMonto)})</p>
              </div>
            </div>
            
            <p style="font-size: 10px; color: #999; text-align: center; margin-top: 40px; font-style: italic;">
              Reporte generado automáticamente por EdifiSaaS v1.0 el ${new Date().toLocaleString('es-VE')}.
            </p>
          </div>
        `
      });
      return NextResponse.json({ success: true, message: "Reporte de flujo enviado exitosamente" });
    }

    if (action === "error_notification") {
      await transporter.sendMail({
        from: `"SaaS - Error de Sincronización" <${SMTP_USER}>`,
        to: recipient || "correojago@gmail.com",
        subject: `⚠️ ERROR en Sincronización - ${edificio.nombre} - ${new Date().toLocaleDateString()}`,
        text: `Se ha detectado un error durante la sincronización automática o el envío del reporte para el edificio ${edificio.nombre}.\n\nDetalles del error:\n${errorMsg || "Desconocido"}\n\nPor favor, verifica el estado del sistema.`,
      });
      return NextResponse.json({ success: true, message: "Notificación de error enviada" });
    }

    const { data: juntaMembers } = await supabase.from("junta").select("email").eq("edificio_id", edificioId);
    const toEmails = testMode ? ["correojago@gmail.com"] : (juntaMembers || []).map(m => m.email).filter(e => e);
    if (toEmails.length === 0) return NextResponse.json({ error: "No hay emails en la junta" }, { status: 400 });

    const todayDate = new Date();
    const today = todayDate.toISOString().split("T")[0];
    const fechaStr = todayDate.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });

    if (action === "whatsapp_report") {
      // Get the latest month available for this building in recibos
      const { data: latestMesData } = await supabase
        .from("recibos")
        .select("mes")
        .eq("edificio_id", edificioId)
        .order("mes", { ascending: false })
        .limit(1);
      
      const latestMes = latestMesData?.[0]?.mes;

      // Get all receipts with debt for the latest month (or all if no mes exists yet)
      let query = supabase.from("recibos").select("num_recibos, deuda").eq("edificio_id", edificioId).gt("deuda", 0);
      if (latestMes) {
        query = query.eq("mes", latestMes);
      }
      const { data: recibos } = await query;
      
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
      
      // Calculate realistic percentages
      const cobranza = Number(balance?.cobranza_mes || 0);
      const facturacion = Number(balance?.recibos_mes || 0);
      
      const pctRecaudado = facturacion > 0 ? (cobranza / facturacion) * 100 : 0;
      // Pendiente cannot be negative, so we cap pctRecaudado at 100 for this specific calculation
      const pctPendiente = Math.max(0, 100 - Math.min(100, pctRecaudado));

      // Days remaining in month
      const lastDay = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).getDate();
      const daysRemaining = lastDay - todayDate.getDate();

      let deudasTexto = "";
      Object.keys(dist).sort((a, b) => Number(a) - Number(b)).forEach(n => {
        const d = dist[Number(n)];
        deudasTexto += `• ${d.count} apartamento(s) deben ${n} recibo(s), por un total de ${formatBs(d.total)}.\n`;
      });

      const whatsappMsg = `Resumen del Día: (MENSAJE A ENVIAR POR WHATSAPP)

📢 *ESTADO DE PAGOS DE CONDOMINIO – ${fechaStr}*

Buen día, Estimados/as vecinos/as,

A continuación el resumen actualizado de los recibos pendientes de condominio, con el objetivo de mantener la transparencia en el funcionamiento del edificio:

📝 *Resumen de deuda pendiente al ${fechaStr}:*
${deudasTexto}
📊 *Total general adeudado: ${formatBs(totalGeneralAdeudado)}*

🏠 *Estadísticas de Cobranza:*
• Aptos con deuda: ${cantAptosConDeuda} (${formatNumber(Math.min(100, pctAptosConDeuda))}% del total)
• Recaudado este mes: ${formatBs(cobranza)} (${formatNumber(pctRecaudado)}%) ${pctRecaudado >= 100 ? "✅" : "⏳"}
• Total pendiente por cobrar: ${formatBs(totalGeneralAdeudado)} ⏳
• Días restantes del mes: ${daysRemaining} 📅

Agradecemos a quienes ya han cumplido con sus pagos.

A quienes aún tienen cuotas pendientes, se les invita cordialmente a ponerse al día para garantizar el mantenimiento, seguridad y operatividad del condominio.

📌 *CONSULTA DETALLADA:* El desglose detallado de las cuentas por cobrar del edificio se encuentra disponible para su consulta privada en el sitio web de la administradora, ingresando a la sección "Recibos Pendientes".

Gracias por su colaboración y compromiso.

*Junta de Condominio.*

_Generado automáticamente por el Sistema de Control de Recibos._`;

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

    // Get manual balance (Total accumulated)
    const { data: manualMovs } = await supabase.from("movimientos_manual").select("saldo_inicial, ingresos, egresos").eq("edificio_id", edificioId);
    const manualTotal = (manualMovs || []).reduce((sum, m) => sum + (Number(m.saldo_inicial) || 0) + (Number(m.ingresos) || 0) - (Number(m.egresos) || 0), 0);


    // Historical balances
    const { data: balancesHist } = await supabase.from("balances").select("mes, cobranza_mes, gastos_facturados").eq("edificio_id", edificioId).order("mes", { ascending: false }).limit(4);

    // Get the latest month available for this building in recibos
    const { data: latestMesDataMain } = await supabase
      .from("recibos")
      .select("mes")
      .eq("edificio_id", edificioId)
      .order("mes", { ascending: false })
      .limit(1);
    
    const latestMesMain = latestMesDataMain?.[0]?.mes;

    // Recibos with debt (filtered by latest month if available)
    let recQuery = supabase.from("recibos").select("unidad, propietario, num_recibos, deuda").eq("edificio_id", edificioId).gt("deuda", 0);
    if (latestMesMain) {
      recQuery = recQuery.eq("mes", latestMesMain);
    }
    const { data: recibos } = await recQuery;
    
    const totalDeuda = (recibos || []).reduce((sum, r) => sum + Number(r.deuda), 0);
    const unidadesConDeuda = recibos?.length || 0;
    const totalAptosMain = edificio.unidades || 43;

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
    const saldoManual = manualTotal;
    const saldoManualUSD = manualTotal / tasa;

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
              <tr><td class="metric-label">Recibos Pendientes:</td><td class="metric-value ${unidadesConDeuda > (totalAptosMain * 0.5) ? 'negative' : 'positive'}">${unidadesConDeuda} unidades</td></tr>
            </table>
            <div style="text-align: center; font-size: 10px; color: #5f6368;">(${(unidadesConDeuda/totalAptosMain*100).toFixed(1)}% de ${totalAptosMain} unidades totales)</div>
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

    const subject = `SaaS - Resumen Financiero Condominio - ${fechaStr}`;

    await transporter.sendMail({
      from: `"SaaS - Sistema Junta de Condominio" <${SMTP_USER}>`,
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
