import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getPlanPermissions } from "@/lib/planLimits";
import { formatNumber, formatDate } from "@/lib/formatters";


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
    const { edificioId, testMode, action, error: errorMsg, recipient, syncFailed, syncFailedReason } = body;
    const tasa = await getTasaBCV();
    

    const { data: edificio } = await supabase.from("edificios").select("id, nombre, unidades, email_junta, plan").eq("id", edificioId).single();
    if (!edificio) return NextResponse.json({ error: "Edificio no encontrado" }, { status: 404 });

    const permissions = getPlanPermissions(edificio.plan || "Esencial");

    // ─── SERVICIOS PÚBLICOS EMAIL ─────────────────────────────────────────────
    if (action === "servicios_publicos_email") {
      const {
        tipoServicio, identificador, alias, resultadoConsulta,
        destinatario, emailAdministradora, nombreEdificio
      } = body;

      const deuda = resultadoConsulta?.deuda ?? 0;
      const isDeudaCero = Number(deuda) === 0;

      // Si la deuda es cero y el destino es la administradora, cancelamos el envío
      if (isDeudaCero && destinatario === "administradora") {
        return NextResponse.json({ success: true, message: "Consulta con deuda Bs. 0. No se requiere enviar a administradora." });
      }

      console.log(`[SP][EMAIL] tipoServicio=${tipoServicio} id=${identificador} dest=${destinatario} deuda=${deuda}`);

      let toList: string[] = [];
      const isDestUser = destinatario === "yo";

      if (destinatario === "administradora") {
        toList = (emailAdministradora || "").split(",").map((e: string) => e.trim()).filter(Boolean);
        if (!toList.length) return NextResponse.json({ error: "No hay email de administradora configurado" }, { status: 400 });
      } else if (isDestUser) {
        toList = [recipient || "correojago@gmail.com"];
      } else if (destinatario === "junta") {
        toList = (edificio.email_junta || "").split(",").map((e: string) => e.trim()).filter(Boolean);
        if (!toList.length) return NextResponse.json({ error: "No hay emails de junta configurados" }, { status: 400 });
      } else {
        toList = (destinatario || "").split(",").map((e: string) => e.trim()).filter(Boolean);
      }

      const fechaConsulta = formatDate(new Date());
      const edificioNombre = nombreEdificio || edificio.nombre;
      let servicioHtml = "";
      let asunto = "";
      let whatsappMsg = "";

      const introText = isDestUser 
        ? `<p>Hola, este es el resultado de la consulta solicitada para el servicio <strong>${tipoServicio.toUpperCase()}</strong>:</p>`
        : `<p>Buen día, estimados/as representantes de la Administradora,</p><p>En nombre de la Junta de Condominio de <strong>${edificioNombre}</strong>, enviamos el reporte del servicio <strong>${tipoServicio.toUpperCase()}</strong>:</p>`;

      if (tipoServicio === "cantv") {
        asunto = isDestUser ? `Resultado Consulta CANTV - ${edificioNombre}` : `Solicitud de confirmación de pago – Servicio CANTV – ${edificioNombre}`;
        servicioHtml = `${introText}
          <ul><li><strong>N° de Línea CANTV:</strong> ${identificador}${alias ? ` (${alias})` : ""}</li></ul>
          <p>La consulta se realizó el día <strong>${fechaConsulta}</strong>.</p>
          <p>${isDeudaCero ? "✅ <strong>No se detectó deuda pendiente en el portal.</strong>" : `💰 <strong>Deuda detectada: Bs. ${deuda}</strong>`}</p>
          <p>Agradeceríamos confirmación de: pago realizado, fecha del pago y monto cancelado.</p>`;
        whatsappMsg = `Buen día, consultamos el estatus de pago del servicio *CANTV* (N° Línea: ${identificador}) del edificio ${edificioNombre}. ¿Confirman si el pago fue realizado, fecha y monto? Gracias, Junta de Condominio.`;
      } else if (tipoServicio === "hidrocapital") {
        const recibos = resultadoConsulta?.recibos ?? "N/D";
        const contrato = resultadoConsulta?.contrato || identificador;
        asunto = isDestUser ? `Resultado Hidrocapital: Bs. ${deuda} - ${edificioNombre}` : `Notificación de Deuda Hidrocapital – ${edificioNombre} – N° Contrato: ${contrato}`;
        servicioHtml = `${introText}
          <p>Resultado de consulta del servicio de agua potable (Hidrocapital) realizada el <strong>${fechaConsulta}</strong>:</p>
          <table border="1" style="border-collapse:collapse;width:100%;margin:16px 0;">
            <thead style="background:#0066b3;color:white;">
              <tr><th style="padding:8px;">N° Contrato</th><th style="padding:8px;text-align:center;">Recibos Pendientes</th><th style="padding:8px;text-align:right;">Deuda (Bs)</th></tr>
            </thead>
            <tbody>
              <tr><td style="padding:8px;"><strong>${contrato}</strong></td><td style="padding:8px;text-align:center;">${recibos}</td><td style="padding:8px;text-align:right;color:${Number(deuda)>0?'#c0392b':'#27ae60'};"><strong>Bs. ${deuda}</strong></td></tr>
            </tbody>
          </table>`;
        whatsappMsg = `Buen día, consulta Hidrocapital del ${fechaConsulta} – N° Contrato *${contrato}* (${edificioNombre}):\n• Recibos pendientes: ${recibos}\n• Deuda: Bs. ${deuda}\n¿Confirman si el pago fue realizado? Junta de Condominio.`;
      } else if (tipoServicio === "corpoelec") {
        const titular = resultadoConsulta?.titular || "N/D";
        const cuentaContrato = resultadoConsulta?.cuentaContrato || identificador;
        const totalPagarStr = resultadoConsulta?.totalPagarStr || String(deuda);
        asunto = isDestUser ? `Resultado Corpoelec: Bs. ${totalPagarStr} - ${edificioNombre}` : `Estado de Cuenta Corpoelec – ${edificioNombre} – N° Cta. Contrato: ${cuentaContrato}`;
        servicioHtml = `${introText}
          <p>Estado de cuenta Corpoelec consultado el <strong>${fechaConsulta}</strong> para <strong>${edificioNombre}</strong>:</p>
          <table border="1" style="border-collapse:collapse;width:100%;margin:16px 0;">
            <thead style="background:#0273bc;color:white;">
              <tr><th style="padding:8px;">N° Cta. Contrato / Titular</th><th style="padding:8px;text-align:right;">Total a Pagar (Bs)</th></tr>
            </thead>
            <tbody>
              <tr><td style="padding:8px;"><strong>${cuentaContrato}</strong><br><small style="color:#666;">${titular}</small></td><td style="padding:8px;text-align:right;color:${Number(deuda)>0?'#c0392b':'#27ae60'};font-size:1.1em;"><strong>Bs. ${totalPagarStr}</strong></td></tr>
            </tbody>
          </table>`;
        whatsappMsg = `Buen día, estado Corpoelec del ${fechaConsulta} – N° Cta. Contrato *${cuentaContrato}* (${titular}, ${edificioNombre}): *Total a Pagar: Bs. ${totalPagarStr}*. ¿Confirman si el pago fue realizado? Junta de Condominio.`;
      }

      const htmlBody = `<div style="font-family:sans-serif;max-width:700px;margin:auto;border:1px solid #eee;border-radius:12px;overflow:hidden;">
        <div style="background:#1a73e8;color:white;padding:20px 24px;">
          <h2 style="margin:0;font-size:18px;">📋 Consulta de Servicio Público</h2>
          <p style="margin:4px 0 0 0;font-size:12px;opacity:0.85;">${edificioNombre} — ${fechaConsulta}</p>
        </div>
        <div style="padding:24px;">
          ${servicioHtml}
          <p>Quedamos atentos a su pronta respuesta.<br>Atentamente,<br><strong>Junta de Condominio – ${edificioNombre}</strong></p>
          <hr style="margin:20px 0;border:0;border-top:1px solid #eee;"/>
          ${whatsappMsg ? `<h3 style="font-size:14px;">📲 Mensaje listo para WhatsApp:</h3>
          <div style="background:#f0fdf4;border-left:5px solid #25D366;padding:12px;font-family:monospace;font-size:12px;white-space:pre-wrap;">${whatsappMsg}</div>
          <hr style="margin:20px 0;border:0;border-top:1px solid #eee;"/>` : ""}
          <p style="font-size:10px;color:#999;">NOTA: No responder a este correo. Notificación automática del Sistema EdifiSaaS.</p>
        </div>
      </div>`;

      console.log(`[SP][EMAIL] Enviando a: ${toList.join(", ")}`);
      await transporter.sendMail({
        from: `"${edificioNombre} – Junta de Condominio" <${SMTP_USER}>`,
        to: toList.join(", "),
        subject: asunto,
        html: htmlBody,
      });
      console.log(`[SP][EMAIL] ✅ Email enviado a: ${toList.join(", ")}`);
      return NextResponse.json({ success: true, message: `Email enviado a: ${toList.join(", ")}`, recipient: toList.join(", ") });
    }

    if (action === "custom_support") {
      const { subject, customBody, overrideRecipient } = body;
      await transporter.sendMail({
        from: `"EdifiSaaS - Soporte" <${SMTP_USER}>`,
        to: overrideRecipient || "correojago@gmail.com",
        subject: subject || "Solicitud de Soporte",
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            ${customBody}
            <hr style="margin-top: 30px; border: 0; border-top: 1px solid #eee;" />
            <p style="font-size: 10px; color: #999;">Enviado automáticamente desde la plataforma EdifiSaaS</p>
          </div>
        `
      });
      return NextResponse.json({ success: true, message: "Solicitud enviada" });
    }

    if (action === "welcome_invitation") {
      const { tempPassword, nombreMiembro } = body;
      await transporter.sendMail({
        from: `"EdifiSaaS - Invitación" <${SMTP_USER}>`,
        to: recipient,
        subject: `📊 Bienvenido al Sistema de Control Financiero - ${edificio.nombre}`,
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
      
      const format = (n: number) => formatNumber(n, 2);
      const formatUsdLocal = (n: number) => formatNumber(n, 2);
      // Alícuota de referencia base para el detalle de filas (2.2135%)
      const alicuotaBase = 0.022135;
      const totalCuotasPartes = totalGastosComunes * alicuotaBase;
      const totalFondoReservaCuota = totalCuotasPartes * 0.10;
      const totalConFondo = totalCuotasPartes + totalFondoReservaCuota;

      let rowsHtml = items.map((i: any) => {
        const cuotaParte = i.monto * alicuotaBase;
        const totalConFondoItem = cuotaParte * 1.10;
        const usdItem = totalConFondoItem / (tasaDolar || 45);
        return `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; font-family: monospace; font-size: 11px;">${i.codigo}</td>
          <td style="border: 1px solid #ddd; padding: 8px; font-size: 11px;">${i.descripcion}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-family: monospace;">${format(i.monto)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right; color: #666; font-family: monospace;">${format(cuotaParte)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold; color: #3730a3; font-family: monospace;">${format(totalConFondoItem)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right; color: #2e7d32; font-family: monospace;">$${formatUsdLocal(usdItem)}</td>
        </tr>
      `}).join('');

      let alicuotasHtml = [...dist].sort((a: any, b: any) => a.alicuota - b.alicuota).map((g: any) => {
        const cpUnit = totalGastosComunes * (g.alicuota / 100);
        const totalBsUnit = cpUnit * 1.10;
        const subTotalComunes = cpUnit * g.count;
        const totalBsGrupo = totalBsUnit * g.count;
        const totalUsdGrupo = totalBsGrupo / (tasaDolar || 45);
        const usdPorApto = totalBsUnit / (tasaDolar || 45);
        return `
        <tr>
          <td style="border-bottom: 1px solid #eee; padding: 6px; font-weight: bold; color: #3730a3;">(${g.count}) ${formatNumber(g.alicuota, 7)}%</td>
          <td style="border-bottom: 1px solid #eee; padding: 6px; text-align: right; font-family: monospace;">${format(cpUnit)}</td>
          <td style="border-bottom: 1px solid #eee; padding: 6px; text-align: right; font-weight: bold; font-family: monospace;">${format(totalBsUnit)}</td>
          <td style="border-bottom: 1px solid #eee; padding: 6px; text-align: right; color: #666; font-family: monospace;">${format(subTotalComunes)}</td>
          <td style="border-bottom: 1px solid #eee; padding: 6px; text-align: right; color: #2e7d32; font-family: monospace;">$${formatUsdLocal(totalUsdGrupo)}</td>
          <td style="border-bottom: 1px solid #eee; padding: 6px; text-align: right; color: #1a237e; font-weight: bold; font-family: monospace;">$${formatUsdLocal(usdPorApto)}</td>
        </tr>
      `}).join('');

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
          <div style="font-family: sans-serif; color: #333; max-width: 900px; margin: 0 auto;">
            <div style="background: #1a237e; color: white; padding: 20px 24px; text-align: center; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 1px;">PRE-RECIBO DE CONDOMINIO ESTIMADO (E)</h2>
              <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.85;">Período: ${mes} | Edificio: ${edificio.nombre}</p>
            </div>
            
            <div style="padding: 20px 0;">
              <table style="width: 100%; border-collapse: collapse; margin: 0 0 4px; font-size: 11px;">
                <thead>
                  <tr style="background: #f1f3f4;">
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; text-transform: uppercase; font-size: 10px;">CÓDIGO</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; text-transform: uppercase; font-size: 10px;">DESCRIPCIÓN</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: right; text-transform: uppercase; font-size: 10px;">MONTO (Bs)</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: right; text-transform: uppercase; font-size: 10px;">CUOTA PARTE (Bs)</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: right; text-transform: uppercase; font-size: 10px;">CUOTA PARTE + 10% F.RESERVA (Bs)</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: right; text-transform: uppercase; font-size: 10px;">USD</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                  <tr style="background: #f1f3f4; font-weight: bold;">
                    <td colspan="2" style="border: 1px solid #ddd; padding: 10px; text-align: right; text-transform: uppercase; font-size: 10px;">TOTAL GASTOS COMUNES:</td>
                    <td style="border: 1px solid #ddd; padding: 10px; text-align: right; font-family: monospace;">${format(totalGastosComunes)}</td>
                    <td style="border: 1px solid #ddd; padding: 10px; text-align: right; font-family: monospace; color: #666;">${format(totalCuotasPartes)}</td>
                    <td style="border: 1px solid #ddd;"></td>
                    <td style="border: 1px solid #ddd;"></td>
                  </tr>
                  <tr style="background: #e8f0fe; font-weight: bold;">
                    <td colspan="2" style="border: 1px solid #ddd; padding: 10px; text-align: right; text-transform: uppercase; font-size: 10px;">FONDO DE RESERVA (10%):</td>
                    <td style="border: 1px solid #ddd; padding: 10px; text-align: right; font-family: monospace;">${format(totalGastosComunes * 0.10)}</td>
                    <td style="border: 1px solid #ddd; padding: 10px; text-align: right; font-family: monospace; color: #666;">${format(totalFondoReservaCuota)}</td>
                    <td style="border: 1px solid #ddd;"></td>
                    <td style="border: 1px solid #ddd;"></td>
                  </tr>
                  <tr style="background: #1a237e; color: white;">
                    <td colspan="4" style="padding: 12px 16px; text-align: right; font-weight: bold; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">TOTAL ESTIMADO POR APARTAMENTO (2.2135%):</td>
                    <td style="padding: 12px 8px; text-align: right; font-weight: bold; font-family: monospace; font-size: 13px;">Bs. ${format(totalConFondo)}</td>
                    <td style="padding: 12px 8px; text-align: right; font-weight: bold; font-family: monospace; font-size: 13px; color: #a5f3a5;">USD $${formatUsdLocal(totalConFondo / (tasaDolar || 45))}</td>
                  </tr>
                </tbody>
              </table>

              <!-- Nota explicativa -->
              <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px; padding: 10px 14px; margin: 8px 0 20px; font-size: 10px; color: #78350f; line-height: 1.5;">
                <strong>📌 NOTA:</strong> La columna <strong>"CUOTA PARTE (Bs)"</strong> es el monto que corresponde al apartamento según su alícuota de participación en los gastos comunes, sin incluir el Fondo de Reserva. La columna <strong>"CUOTA PARTE + 10% F.RESERVA (Bs)"</strong> es el total a facturar en el recibo, e incluye el 10% de Fondo de Reserva aplicado sobre la cuota parte. Los valores de este detalle corresponden a la alícuota base de referencia (2.2135%). Ver tabla inferior para el detalle exacto por tipo de apartamento.
              </div>

              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
                <h3 style="margin-top: 0; font-size: 13px; text-transform: uppercase; color: #1a237e;">CÁLCULOS ADICIONALES POR TIPO DE APARTAMENTO</h3>
                <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
                  <thead>
                    <tr style="border-bottom: 2px solid #ccc;">
                      <th style="text-align: left; padding: 6px; text-transform: uppercase; font-size: 10px;">TIPO / ALÍCUOTA</th>
                      <th style="text-align: right; padding: 6px; text-transform: uppercase; font-size: 10px;">CUOTA PARTE (Bs)</th>
                      <th style="text-align: right; padding: 6px; text-transform: uppercase; font-size: 10px;">TOTAL (Bs.)</th>
                      <th style="text-align: right; padding: 6px; text-transform: uppercase; font-size: 10px;">SUB-TOTAL COMUNES</th>
                      <th style="text-align: right; padding: 6px; text-transform: uppercase; font-size: 10px;">TOTAL USD$</th>
                      <th style="text-align: right; padding: 6px; text-transform: uppercase; font-size: 10px;">P/APTO USD$</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${alicuotasHtml}
                  </tbody>
                </table>
                <p style="font-size: 10px; color: #666; margin-top: 12px; font-style: italic;">
                  * <strong>CUOTA PARTE (Bs)</strong>: monto del apartamento según alícuota (sin fondo de reserva). <strong>TOTAL (Bs.)</strong>: cuota parte + 10% fondo de reserva (total a facturar por apartamento). <strong>SUB-TOTAL COMUNES</strong>: suma de cuotas partes de todos los apartamentos del mismo tipo. <strong>P/APTO USD$</strong>: total por apartamento en dólares.<br>
                  * Tasa BCV utilizada: ${format(tasaDolar)} Bs/USD.
                </p>
              </div>
            </div>
          </div>
        `
      });
      return NextResponse.json({ success: true, message: "Borrador enviado exitosamente" });
    }

    if (action === "send_cash_flow") {
      const { payload } = body;
      const { mes, rows, summary } = payload;
      
      const format = (n: number) => formatNumber(n, 2);

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
              Reporte generado automáticamente por EdifiSaaS v1.0 el ${formatDate(new Date())} a las ${new Date().toLocaleTimeString('es-VE')}.
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
        subject: `⚠️ ERROR en Sincronización - ${edificio.nombre} - ${formatDate(new Date())}`,
        text: `Se ha detectado un error durante la sincronización automática o el envío del reporte para el edificio ${edificio.nombre}.\n\nDetalles del error:\n${errorMsg || "Desconocido"}\n\nPor favor, verifica el estado del sistema.`,
      });
      return NextResponse.json({ success: true, message: "Notificación de error enviada" });
    }

    if (action === "modern_report_test") {
      const todayDate = new Date();
      const today = todayDate.toISOString().split("T")[0];
      const fechaStr = formatDate(todayDate);
      
      // -- 1. OBTENER DATOS EXTENSOS --
      // Tasas
      const tasa = await getTasaBCV();

      // Balances
      const { data: balance } = await supabase.from("balances").select("*").eq("edificio_id", edificioId).order("fecha", { ascending: false }).limit(1).single();
      const { data: balancesHist } = await supabase.from("balances").select("mes, cobranza_mes, gastos_facturados, saldo_disponible").eq("edificio_id", edificioId).order("mes", { ascending: false }).limit(6);
      
      // Deuda y Morosidad (Filtrar por último mes para evitar duplicados por histórico)
      const { data: latestMesData } = await supabase.from("recibos").select("mes").eq("edificio_id", edificioId).order("mes", { ascending: false }).limit(1);
      const latestMes = latestMesData?.[0]?.mes;

      let recQuery = supabase.from("recibos").select("deuda, num_recibos, deuda_usd").eq("edificio_id", edificioId).gt("deuda", 0);
      if (latestMes) recQuery = recQuery.eq("mes", latestMes);
      const { data: allRecibos } = await recQuery;

      const totalDeuda = (allRecibos || []).reduce((sum, r) => sum + Number(r.deuda), 0);
      const totalDeudaUsd = (allRecibos || []).reduce((sum, r) => sum + Number(r.deuda_usd || 0), 0);
      const distDeuda: Record<number, { count: number, total: number }> = { 1: {count:0, total:0}, 2: {count:0, total:0}, 3: {count:0, total:0}, 4: {count:0, total:0} }; 
      (allRecibos || []).forEach(r => {
        const n = r.num_recibos || 1;
        const index = n >= 4 ? 4 : n;
        distDeuda[index].count++;
        distDeuda[index].total += Number(r.deuda);
      });

      // Movimientos del día
      const { data: movsHoy } = await supabase.from("movimientos_dia").select("*").eq("edificio_id", edificioId).eq("detectado_en", today);
      const pagosHoy = (movsHoy || []).filter(m => m.tipo === "recibo");
      const egresosHoy = (movsHoy || []).filter(m => m.tipo !== "recibo");

      // Movimientos últimos 7 días
      const sevenDaysAgo = new Date(todayDate.getTime() - 7 * 86400000).toISOString().split("T")[0];
      const { data: movs7DiasRaw } = await supabase.from("movimientos_dia").select("*").eq("edificio_id", edificioId).gte("detectado_en", sevenDaysAgo).order("detectado_en", { ascending: false });
      
      // Agrupar movimientos por día para el resumen de 7 días
      const movsPorDia: Record<string, { ingresos: number, egresos: number, saldo_act?: number }> = {};
      (movs7DiasRaw || []).forEach(m => {
        if (!movsPorDia[m.detectado_en]) movsPorDia[m.detectado_en] = { ingresos: 0, egresos: 0 };
        if (m.tipo === 'recibo' || m.tipo === 'ingreso') {
          movsPorDia[m.detectado_en].ingresos += Number(m.monto || 0);
        } else {
          movsPorDia[m.detectado_en].egresos += Number(m.monto || 0);
        }
      });

      // Datos Manuales (Caja)
      const { data: manualMovs } = await supabase.from("movimientos_manual").select("saldo_inicial, ingresos, egresos").eq("edificio_id", edificioId);
      const manualTotal = (manualMovs || []).reduce((sum, m) => sum + (Number(m.saldo_inicial) || 0) + (Number(m.ingresos) || 0) - (Number(m.egresos) || 0), 0);
      
      // -- 2. CÁLCULOS --
      const currentMesStr = todayDate.toISOString().substring(0, 7);
      
      // Obtener totales reales del mes en curso desde las tablas de movimientos (no del balance histórico)
      const { data: realPagosMes } = await supabase.from("pagos_recibos").select("monto").eq("edificio_id", edificioId).gte("fecha_pago", `${currentMesStr}-01`).lte("fecha_pago", `${currentMesStr}-31`);
      const { data: realGastosMes } = await supabase.from("gastos").select("monto").eq("edificio_id", edificioId).gte("fecha", `${currentMesStr}-01`).lte("fecha", `${currentMesStr}-31`).neq("codigo", "TOTAL").neq("codigo", "00001").not("descripcion", "ilike", "%FONDO%");

      const cobranzaMes = (realPagosMes || []).reduce((s, p) => s + Number(p.monto || 0), 0);
      const gastosMes = (realGastosMes || []).reduce((s, g) => s + Number(g.monto || 0), 0);
      
      const saldoDisp = Number(balance?.saldo_disponible || 0);
      const fondoRes = Number(balance?.fondo_reserva || 0);
      const disponibilidadTotal = saldoDisp + fondoRes;
      const metaMes = totalDeuda + cobranzaMes;
      const pctEfectividad = metaMes > 0 ? (cobranzaMes / metaMes) * 100 : 0;
      const aptosDeudaTotal = (allRecibos || []).length;
      const totalAptos = edificio.unidades || 43;
      const pctAptosConDeuda = (aptosDeudaTotal / totalAptos) * 100;

      // Días restantes del mes
      const lastDay = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).getDate();
      const daysRemaining = lastDay - todayDate.getDate();

      const modernHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          .kpi-card { background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:15px; text-align:center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .label { color:#64748b; font-size:11px; text-transform:uppercase; font-weight:700; margin-bottom:5px; display:block; }
          .value { color:#0f172a; font-size:18px; font-weight:700; }
          .section-header { border-left:4px solid #3b82f6; padding-left:12px; margin:25px 0 15px; color:#1e293b; font-size:16px; font-weight:700; }
          .data-table { width:100%; border-collapse:collapse; }
          .data-table th { text-align:left; font-size:11px; color:#64748b; padding:10px; border-bottom:2px solid #f1f5f9; text-transform:uppercase; }
          .data-table td { padding:10px; border-bottom:1px solid #f1f5f9; font-size:13px; color:#334155; }
          .badge { padding:3px 8px; border-radius:12px; font-size:10px; font-weight:700; }
          .info-box { background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:20px; }
          .metric-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
          .metric-label { font-size: 13px; color: #64748b; }
          .metric-val { font-size: 13px; font-weight: 700; color: #1e293b; }
        </style>
      </head>
      <body style="margin:0; padding:0; background-color:#f1f5f9; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px;">
          <tr>
            <td align="center">
              <table width="100%" style="max-width:750px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);">
                
                <!-- HEADER -->
                <tr>
                  <td style="background: #1e293b; padding:40px 30px; text-align:center;">
                    <h1 style="margin:0; color:#ffffff; font-size:24px; font-weight:800; letter-spacing:-0.5px;">${edificio.nombre.toUpperCase()}</h1>
                    <p style="margin:8px 0 0 0; color:#94a3b8; font-size:14px;">Resumen Ejecutivo de Gestión &bull; ${fechaStr}</p>
                    <div style="display:inline-block; margin-top:20px; background:rgba(255,255,255,0.1); border-radius:8px; padding:8px 15px; color:#ffffff; font-size:13px; font-weight:600;">
                      Tasa BCV: ${formatNumber(tasa)} Bs/$
                    </div>
                  </td>
                </tr>

                <!-- TABLERO PRINCIPAL -->
                <tr>
                  <td style="padding:30px 30px 10px 30px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="31%" valign="top">
                          <div class="kpi-card">
                            <span class="label">Disponibilidad</span>
                            <div class="value">${formatBs(disponibilidadTotal)}</div>
                            <div style="color:#64748b; font-size:11px; margin-top:4px;">$${formatNumber(disponibilidadTotal/tasa)} USD</div>
                          </div>
                        </td>
                        <td width="3.5%"></td>
                        <td width="31%" valign="top">
                          <div class="kpi-card">
                            <span class="label">Ingresos Mes</span>
                            <div class="value" style="color:#10b981;">${formatBs(cobranzaMes)}</div>
                            <div style="color:#64748b; font-size:11px; margin-top:4px;">${formatNumber(pctEfectividad)}% de Meta</div>
                          </div>
                        </td>
                        <td width="3.5%"></td>
                        <td width="31%" valign="top">
                          <div class="kpi-card">
                            <span class="label">Por Cobrar</span>
                            <div class="value" style="color:#ef4444;">${formatBs(totalDeuda)}</div>
                            <div style="color:#64748b; font-size:11px; margin-top:4px;">${aptosDeudaTotal} Aptos.</div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- ESTADO FINANCIERO ACTUAL -->
                <tr>
                  <td style="padding:0 30px;">
                    <div class="section-header">💰 ESTADO FINANCIERO ACTUAL (Web Admin)</div>
                    <div class="info-box">
                      <table width="100%">
                        <tr>
                          <td width="48%" valign="top">
                            <div class="metric-row"><span class="metric-label">Saldo Anterior:</span><span class="metric-val">${formatBs(Number(balance?.saldo_anterior || 0))}</span></div>
                            <div style="background:#e0f2fe; padding:15px; border-radius:8px; margin:10px 0; text-align:center;">
                              <div style="font-size:18px; font-weight:800; color:#0369a1;">${formatBs(saldoDisp)}</div>
                              <div style="font-size:12px; color:#0369a1;">${formatUsd(saldoDisp/tasa)} USD</div>
                              <div style="font-size:10px; font-weight:700; color:#0369a1; margin-top:5px; text-transform:uppercase;">Saldo Disponible Operativo</div>
                            </div>
                            <div class="metric-row"><span class="metric-label">Ingresos:</span><span class="metric-val" style="color:#10b981;">+ ${formatBs(cobranzaMes)}</span></div>
                            <div class="metric-row"><span class="metric-label">Egresos:</span><span class="metric-val" style="color:#ef4444;">- ${formatBs(gastosMes)}</span></div>
                            <div class="metric-row"><span class="metric-label">Resultado:</span><span class="metric-val">${formatBs(cobranzaMes - gastosMes)}</span></div>
                          </td>
                          <td width="4%"></td>
                          <td width="48%" valign="top">
                            <div class="metric-row"><span class="metric-label">Fondo Reserva:</span><span class="metric-val">${formatBs(fondoRes)}</span></div>
                            <div style="background:#f0fdf4; padding:15px; border-radius:8px; margin:10px 0; text-align:center; border:1px solid #bbf7d0;">
                              <div style="font-size:18px; font-weight:800; color:#15803d;">${formatBs(disponibilidadTotal)}</div>
                              <div style="font-size:12px; color:#15803d;">${formatUsd(disponibilidadTotal/tasa)} USD</div>
                              <div style="font-size:10px; font-weight:700; color:#15803d; margin-top:5px; text-transform:uppercase;">Disponibilidad Total General</div>
                            </div>
                            <div style="background:#f1f5f9; padding:12px; border-radius:8px; text-align:center;">
                              <div style="font-size:15px; font-weight:700; color:#475569;">${formatBs(manualTotal)}</div>
                              <div style="font-size:11px; color:#475569;">${formatUsd(manualTotal/tasa)} USD</div>
                              <div style="font-size:9px; font-weight:700; color:#475569; margin-top:4px;">SALDO MANUAL (INTERNO)</div>
                            </div>
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>

                <!-- ANÁLISIS DE MOROSIDAD (BLOQUES) -->
                <tr>
                  <td style="padding:0 30px;">
                    <div class="section-header">📊 Distribución de Morosidad</div>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        ${[1, 2, 3, 4].map(n => `
                          <td width="23%" align="center">
                            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px;">
                              <div style="font-size:20px; font-weight:800; color:${n===1?'#3b82f6':n===2?'#f59e0b':'#ef4444'};">${distDeuda[n].count}</div>
                              <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; margin-top:4px;">${n===4?'+3 Recibos':`${n} Recibo${n>1?'s':''}`}</div>
                            </div>
                          </td>
                          ${n < 4 ? '<td width="2.6%"></td>' : ''}
                        `).join('')}
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- RESUMEN DEL DÍA (WHATSAPP STYLE) -->
                <tr>
                  <td style="padding:0 30px;">
                    <div class="section-header">📢 RESUMEN DEL DÍA</div>
                    <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:12px; padding:20px; font-size:13px; line-height:1.6; color:#92400e;">
                      <strong>Estado de pagos de condominio – ${fechaStr}</strong><br><br>
                      Buen día, Estimados vecinos,<br><br>
                      A continuación el resumen actualizado de los recibos pendientes de condominio:<br><br>
                      <strong>📝 Resumen de deuda pendiente al ${fechaStr}:</strong><br>
                      ${Object.keys(distDeuda).map(n => {
                        const d = distDeuda[Number(n)];
                        if (d.count === 0) return '';
                        return `• ${d.count} apartamento(s) deben ${n === '4' ? '+3' : n} recibo(s), por un total de ${formatBs(d.total)}.<br>`;
                      }).join('')}
                      <br>
                      <strong>📊 Total general adeudado: ${formatBs(totalDeuda)}</strong><br>
                      🏠 Cantidad de apartamentos con deuda: ${aptosDeudaTotal} (equivale al ${formatNumber(pctAptosConDeuda, 2)}% del total)<br>
                      📉 Porcentaje recaudado del mes: ${formatNumber(pctEfectividad, 2)}%<br>
                      📈 Porcentaje pendiente por recaudar: ${formatNumber(100 - pctEfectividad, 2)}%<br>
                      🗓️ Días restantes del mes: ${daysRemaining}<br><br>
                      Agradecemos a quienes ya han cumplido con sus pagos. A quienes aún tienen cuotas pendientes, se les invita cordialmente a ponerse al día para garantizar el mantenimiento, seguridad y operatividad del condominio.<br><br>
                      📌 <strong>CONSULTA DETALLADA:</strong> El desglose detallado de las cuentas por cobrar del edificio se encuentra disponible para su consulta privada en el sitio web de la administradora, ingresando a la sección "Recibos Pendientes".<br><br>
                      Gracias por su colaboración y compromiso.<br><br>
                      <strong>Junta de Condominio.</strong>
                    </div>
                  </td>
                </tr>

                <!-- INFORMACION ADICIONAL PREMIUM -->
                <tr>
                  <td style="padding:0 30px;">
                    <div class="section-header">** RESUMEN MENSUAL (Ingresos / Egresos / Gastos) **</div>
                    <div style="border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; margin-bottom: 20px;">
                      <table class="data-table">
                        <thead>
                          <tr style="background:#f8fafc;">
                            <th>Mes</th>
                            <th align="right">Ingresos</th>
                            <th align="right">Egresos</th>
                            <th align="right">Gastos</th>
                            <th align="right">Neto</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${(balancesHist || []).slice(0, 4).map(bh => `
                            <tr>
                              <td>${bh.mes}</td>
                              <td align="right" style="color:#16a34a;">${formatNumber(bh.cobranza_mes)} Bs</td>
                              <td align="right" style="color:#dc2626;">-${formatNumber(Math.abs(bh.gastos_facturados))} Bs</td>
                              <td align="right">-</td>
                              <td align="right" style="font-weight:700;">${formatNumber(Number(bh.cobranza_mes) + Number(bh.gastos_facturados))} Bs</td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                    </div>

                    <div class="section-header">🟡 CUENTAS POR COBRAR</div>
                    <div class="info-box" style="margin-bottom: 20px;">
                      <div class="metric-row">
                        <span class="metric-label">Recibos Pendientes:</span>
                        <span class="metric-val">${aptosDeudaTotal} unidades (${formatNumber(pctAptosConDeuda, 1)}% de ${totalAptos} unidades totales)</span>
                      </div>
                      <div class="metric-row">
                        <span class="metric-label">Monto Por Cobrar:</span>
                        <span class="metric-val">${formatBs(totalDeuda)}<br>${formatUsd(totalDeudaUsd)}</span>
                      </div>
                    </div>

                    <div class="section-header">📊 RESUMEN DE COBROS DEL DÍA</div>
                    <div class="info-box" style="margin-bottom: 20px;">
                      <div class="metric-row">
                        <span class="metric-label">Apartamentos Pagaron:</span>
                        <span class="metric-val">${pagosHoy.length} unidades hoy</span>
                      </div>
                      <div class="metric-row">
                        <span class="metric-label">Monto Cobrado Hoy:</span>
                        <span class="metric-val">${formatBs(pagosHoy.reduce((s, m) => s + Number(m.monto), 0))}<br>${formatUsd(pagosHoy.reduce((s, m) => s + Number(m.monto), 0) / tasa)}</span>
                      </div>
                    </div>

                    <div class="section-header">📈 ÚLTIMOS MOVIMIENTOS OPERATIVOS (7 DÍAS)</div>
                    <div style="border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; margin-bottom: 20px;">
                      <table class="data-table">
                        <thead>
                          <tr style="background:#f8fafc;">
                            <th>Fecha</th>
                            <th>DÍA</th>
                            <th align="right">INGRESOS</th>
                            <th align="right">EGRESOS</th>
                            <th align="right">USD</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${Object.entries(movsPorDia).slice(0, 7).map(([date, vals]) => `
                            <tr>
                              <td>${date}</td>
                              <td>${getDiaSemana(date)}</td>
                              <td align="right" style="color:#16a34a;">${formatNumber(vals.ingresos)} Bs</td>
                              <td align="right" style="color:#dc2626;">-${formatNumber(vals.egresos)} Bs</td>
                              <td align="right">${formatUsd((vals.ingresos - vals.egresos) / tasa)}</td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>

                <!-- ACTIVIDAD RECIENTE -->
                <tr>
                  <td style="padding:0 30px;">
                    <div class="section-header">📝 Actividad de las últimas 24 Horas</div>
                    <div style="border:1px solid #e2e8f0; border-radius:12px; overflow:hidden;">
                      <table class="data-table">
                        <thead>
                          <tr style="background:#f8fafc;">
                            <th>Concepto</th>
                            <th align="center">Tipo</th>
                            <th align="right">Monto</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${[...pagosHoy, ...egresosHoy].slice(0, 10).map(m => `
                            <tr>
                              <td>
                                <div style="font-weight:700;">${m.unidad_apartamento || 'Operación'}</div>
                                <div style="font-size:11px; color:#94a3b8;">${m.descripcion || ''}</div>
                              </td>
                              <td align="center">
                                <span class="badge" style="background:${m.tipo==='recibo'?'#dcfce7':'#fee2e2'}; color:${m.tipo==='recibo'?'#166534':'#991b1b'};">
                                  ${m.tipo==='recibo'?'INGRESO':'EGRESO'}
                                </span>
                              </td>
                              <td align="right" style="font-weight:700; color:${m.tipo==='recibo'?'#16a34a':'#dc2626'};">
                                ${m.tipo==='recibo'?'+':'-'} ${formatNumber(m.monto)}
                              </td>
                            </tr>
                          `).join('')}
                          ${(pagosHoy.length + egresosHoy.length === 0) ? '<tr><td colspan="3" align="center" style="padding:30px; color:#94a3b8; font-style:italic;">Sin movimientos detectados hoy.</td></tr>' : ''}
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>

                <!-- FOOTER -->
                <tr>
                  <td style="padding:40px 30px; text-align:center; background:#f8fafc; border-top:1px solid #e2e8f0;">
                    <a href="${BASE_URL}/dashboard" style="display:inline-block; background:#1e293b; color:#ffffff; padding:15px 30px; border-radius:8px; text-decoration:none; font-weight:700; font-size:14px;">Acceder al Portal EdifiSaaS</a>
                    <p style="margin-top:25px; font-size:10px; color:#94a3b8; line-height:1.5;">
                      Informe automático generado por EdifiSaaS v1.1<br>
                      ${fechaStr} &bull; Condominio ${edificio.nombre}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
      `;

      await transporter.sendMail({
        from: `"SaaS - Sistema Junta de Condominio" <${SMTP_USER}>`,
        to: recipient || "correojago@gmail.com",
        subject: `💰Resumen Financiero ${edificio.nombre} - ${fechaStr}`,
        html: modernHtml,
      });

      return NextResponse.json({ success: true, message: "Informe Premium enviado exitosamente" });
    }


    const { data: juntaMembers } = await supabase.from("junta").select("email, recibe_email_cron").eq("edificio_id", edificioId).eq("activo", true);
    // Solo enviar a miembros que tengan recibe_email_cron = true (o null/undefined para retrocompatibilidad)
    const juntaRecipients = (juntaMembers || []).filter(m => m.recibe_email_cron !== false);
    let toEmailsRaw = testMode ? ["correojago@gmail.com"] : juntaRecipients.map(m => m.email).filter(e => e);
    
    // Fallback: Si no hay miembros en la tabla junta, usar los emails configurados en el edificio
    if (toEmailsRaw.length === 0 && edificio.email_junta) {
      toEmailsRaw = edificio.email_junta.split(",").map((e: string) => e.trim()).filter(Boolean);
    }
    
    const toEmails = toEmailsRaw.slice(0, permissions.maxEmailRecipients);
    
    if (toEmails.length === 0) {
      console.error(`[EMAIL] No hay destinatarios para el edificio ${edificio.nombre}`);
      return NextResponse.json({ error: "No hay destinatarios configurados (Junta o Email Config)" }, { status: 400 });
    }

    const todayDate = new Date();
    const today = todayDate.toISOString().split("T")[0];
    const fechaStr = formatDate(todayDate);

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
      
      // Get balance for collection percentage and morosity index
      const { data: balance } = await supabase.from("balances").select("*").eq("edificio_id", edificioId).order("mes", { ascending: false }).limit(1).single();
      
      // Calculate realistic percentages
      const cobranza = Number(balance?.cobranza_mes || 0);
      const facturacion = Number(balance?.recibos_mes || 0);
      const saldoDisponible = Number(balance?.saldo_disponible || 0);
      const fondoReserva = Number(balance?.fondo_reserva || 0);
      const disponibilidadTotal = saldoDisponible + fondoReserva;
      
      // Collection Effectiveness: (Collected / (Debt + Collected))
      // This shows how much of the total "receivable" money was actually recovered
      const totalACobrar = totalGeneralAdeudado + cobranza;
      const pctEfectividad = totalACobrar > 0 ? (cobranza / totalACobrar) * 100 : 0;

      // Financial Morosity Index: (Debt / (Debt + Cash))
      const totalPatrimonio = totalGeneralAdeudado + disponibilidadTotal;
      const pctMoraFinanciera = totalPatrimonio > 0 ? (totalGeneralAdeudado / totalPatrimonio) * 100 : 0;

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
• Recaudado este mes: ${formatBs(cobranza)} (${formatNumber(pctEfectividad)}% de efectividad) ✅
• Total pendiente por cobrar: ${formatBs(totalGeneralAdeudado)} (${formatNumber(pctMoraFinanciera)}% de morosidad) ⏳
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
        subject: `💰Resumen Financiero ${edificio.nombre} - ${fechaStr}`,
        html: whatsappMsg,
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

    // Ingresos reales por mes (suma de pagos_recibos agrupados por mes)
    const { data: pagosRecibosHist } = await supabase
      .from("pagos_recibos")
      .select("mes, monto")
      .eq("edificio_id", edificioId);
    const ingresosPorMes: Record<string, number> = {};
    (pagosRecibosHist || []).forEach((p: any) => {
      const m = (p.mes || "").substring(0, 7);
      if (m) ingresosPorMes[m] = (ingresosPorMes[m] || 0) + Number(p.monto || 0);
    });

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
    const { data: movimientosDia } = await supabase.from("movimientos_dia").select("tipo, descripcion, monto, fuente, unidad_apartamento, propietario").eq("edificio_id", edificioId).eq("detectado_en", today);
    const pagosHoy = movimientosDia?.filter(m => m.tipo === "recibo") || [];
    const cobrosHoy = pagosHoy.length;
    const montoCobradoHoy = pagosHoy.reduce((sum, p) => sum + p.monto, 0);

    // Egresos del día (filtrados por fecha de hoy)
    const currentMesEmail = today.substring(0, 7);
    
    // OBTENER TOTALES REALES DEL MES EN CURSO (LIVE)
    const { data: realPagosMes } = await supabase.from("pagos_recibos").select("monto").eq("edificio_id", edificioId).gte("fecha_pago", `${currentMesEmail}-01`).lte("fecha_pago", `${currentMesEmail}-31`);
    const { data: realGastosMes } = await supabase.from("gastos").select("monto").eq("edificio_id", edificioId).gte("fecha", `${currentMesEmail}-01`).lte("fecha", `${currentMesEmail}-31`).neq("codigo", "TOTAL").neq("codigo", "00001").not("descripcion", "ilike", "%FONDO%");

    const liveCobranzaMes = (realPagosMes || []).reduce((s, p) => s + Number(p.monto || 0), 0);
    const liveGastosMes = (realGastosMes || []).reduce((s, g) => s + Number(g.monto || 0), 0);

    const { data: newestEgresos } = await supabase.from("egresos").select("fecha, beneficiario, descripcion, monto").eq("edificio_id", edificioId).eq("mes", currentMesEmail).order("fecha", { ascending: false }).limit(20);

    // Gastos del día
    const { data: gastosHoy } = await supabase.from("gastos").select("codigo, descripcion, monto").eq("edificio_id", edificioId).eq("mes", currentMesEmail).order("created_at", { ascending: false }).limit(20);

    // 7-day history
    const { data: movs7days } = await supabase.from("movimientos_dia").select("detectado_en, tipo, monto").eq("edificio_id", edificioId).gte("detectado_en", yesterday).order("detectado_en", { ascending: false });

    const fechaCompleta = formatDate(todayDate);
    const horaEnvio = todayDate.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "America/Caracas" });

    const disponibilidadTotal = Number(bal?.saldo_disponible || 0) + Number(bal?.fondo_reserva || 0);
    const disponibilidadTotalUSD = disponibilidadTotal / tasa;
    const saldoAnterior = Number(bal?.saldo_anterior || 0);
    const saldoDisponible = Number(bal?.saldo_disponible || 0);
    const saldoManual = manualTotal;
    const saldoManualUSD = manualTotal / tasa;

    const ajustesDelDia = 0;
    const resultadoDelDia = liveCobranzaMes - liveGastosMes + ajustesDelDia;
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
              <tr><td class="metric-label">Ingresos:</td><td class="metric-value positive">${formatBs(liveCobranzaMes)}</td></tr>
              <tr><td class="metric-label">Egresos:</td><td class="metric-value negative">${formatBs(liveGastosMes)}</td></tr>
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
            const mesKey = (b.mes || '').substring(0, 7);
            const isRowCurrent = mesKey === currentMesEmail;

            const ingresosReales = isRowCurrent ? liveCobranzaMes : (ingresosPorMes[mesKey] ?? Number(b.cobranza_mes));
            const egresos = isRowCurrent ? liveGastosMes : Number(b.gastos_facturados);
            const neto = ingresosReales - egresos;
            return `<tr style="${i === 0 ? 'background:#eef7ff;font-weight:bold;': ''}">
              <td>${b.mes || ''}</td>
              <td style="text-align:right;">${formatBs(ingresosReales)}</td>
              <td style="text-align:right;">${formatBs(egresos)}</td>
              <td style="text-align:right;">-</td>
              <td style="text-align:right; font-weight:bold; color:${neto >= 0 ? '#34a853' : '#ea4335'}">${formatBs(neto)}</td>
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
            <div style="text-align: center; font-size: 10px; color: #5f6368;">(${formatNumber(unidadesConDeuda/totalAptosMain*100, 1)}% de ${totalAptosMain} unidades totales)</div>
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
        ${cobrosHoy > 0 ? `<table><thead><tr style="background:#e8f5e8;"><th>Apartamento</th><th>Propietario</th><th>Tipo</th><th style="text-align:right;">Monto (USD)</th><th style="text-align:right;">Monto (Bs.)</th></tr></thead><tbody>${pagosHoy.map((p: any) => {
          const aptDesc = p.unidad_apartamento || p.descripcion || 'N/A';
          const propDesc = p.propietario || '';
          const tipoDesc = (p.descripcion || '').includes('PARCIAL') ? '🟡 Abono Parcial' : '✅ Pago Total';
          return `<tr><td>${aptDesc}</td><td>${propDesc}</td><td>${tipoDesc}</td><td style="text-align:right;">${formatNumber(p.monto/tasa)}</td><td style="text-align:right;">${formatBs(p.monto)}</td></tr>`;
        }).join("")}</tbody></table>` : '<p style="color:#666; font-size:11px;">No se registraron pagos hoy.</p>'}

        <h4 style="color:#ea4335; font-size: 12px; margin: 15px 0 8px;">💸 Egresos Procesados Hoy</h4>
        ${(() => {
          const uniqueEgresosMap = new Map();
          (newestEgresos || []).forEach((e: any) => {
            const key = `${e.beneficiario}-${e.descripcion}-${e.monto}`;
            if (!uniqueEgresosMap.has(key)) uniqueEgresosMap.set(key, e);
          });
          const uniqueEgresos = Array.from(uniqueEgresosMap.values());
          
          return uniqueEgresos.length ? `<table><thead><tr style="background:#ffe8e8;"><th>Beneficiario</th><th>Operación</th><th style="text-align:right;">Monto (Bs)</th><th style="text-align:right;">Monto (USD)</th></tr></thead><tbody>${uniqueEgresos.map((e: any) => `<tr><td>${e.beneficiario}</td><td>Egreso: ${e.descripcion || 'N/A'}</td><td style="text-align:right;">${formatBs(e.monto)}</td><td style="text-align:right;">${formatUsd(e.monto/tasa)}</td></tr>`).join("")}</tbody></table>` : '<p style="color:#666; font-size:11px;">No hay egresos hoy.</p>';
        })()}

        <h4 style="color:#f57c00; font-size: 12px; margin: 15px 0 8px;">🧧 Gastos Registrados Hoy</h4>
        ${(() => {
          const uniqueGastosMap = new Map();
          (gastosHoy || []).forEach((g: any) => {
            const key = `${g.codigo}-${g.descripcion}-${g.monto}`;
            if (!uniqueGastosMap.has(key)) uniqueGastosMap.set(key, g);
          });
          const uniqueGastos = Array.from(uniqueGastosMap.values());
          return uniqueGastos.length ? `<table><thead><tr style="background:#fff3e0;"><th>Código</th><th>Descripción</th><th style="text-align:right;">Monto (Bs)</th></tr></thead><tbody>${uniqueGastos.map((g: any) => `<tr><td>${g.codigo || '-'}</td><td>${g.descripcion || 'N/A'}</td><td style="text-align:right;">${formatBs(Number(g.monto))}</td></tr>`).join("")}</tbody></table>` : '<p style="color:#666; font-size:11px;">No hay gastos registrados este mes.</p>';
        })()}
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

    const subject = syncFailed
      ? `💰Resumen Financiero ${edificio.nombre} - ${fechaStr} (datos al ${fechaStr})`
      : `💰Resumen Financiero ${edificio.nombre} - ${fechaStr}`;

    // Banner de aviso si la sincronización falló y se envía con datos disponibles
    const syncFailedBanner = syncFailed ? `
      <div style="background:#fff7ed;border-left:4px solid #f97316;padding:12px 16px;margin-bottom:16px;border-radius:4px;">
        <p style="margin:0;font-size:13px;color:#9a3412;font-weight:bold;">⚠️ Nota sobre la actualización de datos</p>
        <p style="margin:4px 0 0;font-size:12px;color:#c2410c;">
          Esta noche no fue posible sincronizar con el sistema externo de cobranza. 
          La información mostrada en este informe corresponde a los <strong>últimos datos disponibles en nuestra base de datos</strong>.
          Fecha de la información: <strong>${fechaStr}</strong>.
        </p>
      </div>` : '';

    // Insertar el banner justo después del primer div del body del email HTML
    const htmlConBanner = syncFailed ? html.replace(
      /<body[^>]*>[\s\S]*?(<div)/,
      (match: string, firstDiv: string) => match.replace(firstDiv, syncFailedBanner + firstDiv)
    ) : html;

    await transporter.sendMail({
      from: `"SaaS - Sistema Junta de Condominio" <${SMTP_USER}>`,
      to: toEmails.join(", "),
      subject,
      html: htmlConBanner,
    });

    // Registrar alerta de envío exitoso
    try {
      await supabase.from("alertas").insert({
        edificio_id: edificioId,
        tipo: "info",
        titulo: "📧 Informe Diario Enviado",
        descripcion: `El resumen financiero ha sido enviado por email a los destinatarios configurados: ${toEmails.join(", ")}`,
        fecha: today
      });
    } catch (e) {
      console.error("Error logging email alert:", e);
    }

    return NextResponse.json({ success: true, message: testMode ? "Email de prueba enviado" : "Informe enviado a la junta", recipient: toEmails.join(", ") });
  } catch (error: any) {
    console.error("Email error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
