import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER || "controlfinancierosaas@gmail.com";
const SMTP_PASS = process.env.SMTP_PASS || "bjedepzgbococwsl";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://edifi-saa-s-v1.vercel.app";

if (!process.env.SMTP_USER) {
  console.log("ℹ️ Usando credenciales de correo por defecto (hardcoded).");
}

export const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

export const sendInvitationEmail = async (recipient: string, nombreMiembro: string, tempPassword: string, edificioNombre: string) => {
  return transporter.sendMail({
    from: `"EdifiSaaS" <${SMTP_USER}>`,
    to: recipient,
    subject: `Bienvenido a la Junta de Condominio - ${edificioNombre}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff; color: #1a202c;">
        <div style="background: linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%); color: white; padding: 32px 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 800;">¡Hola, ${nombreMiembro}!</h1>
          <p style="margin-top: 8px; font-size: 16px; opacity: 0.9;">Has sido invitado a participar como miembro de la junta en el sistema de control financiero.</p>
        </div>

        <div style="padding: 32px 24px; line-height: 1.6;">
          <p style="font-size: 16px;">Participarás en la gestión del edificio: <strong>${edificioNombre}</strong>.</p>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #e9ecef;">
            <p style="margin: 0 0 12px 0; color: #1a73e8; font-weight: bold; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em;">Tus credenciales de acceso:</p>
            <p style="margin: 6px 0; font-size: 15px;">📧 <strong>Email:</strong> ${recipient}</p>
            <p style="margin: 6px 0; font-size: 15px;">🔑 <strong>Clave Inicial:</strong> <span style="background: #fff; padding: 2px 8px; border-radius: 4px; border: 1px dashed #cbd5e1;">${tempPassword}</span></p>
          </div>

          <h3 style="color: #2d3748; font-size: 16px; margin-top: 32px; border-bottom: 2px solid #edf2f7; padding-bottom: 8px;">🚀 Sigue estos pasos para comenzar:</h3>

          <div style="margin-top: 20px;">
            <p style="margin-bottom: 8px;"><strong>Paso 1: Ingresar al Sistema y cambiar su clave</strong></p>
            <p style="font-size: 13px; color: #666; margin-bottom: 16px;">* Por seguridad, el sistema te pedirá cambiar tu clave al ingresar por primera vez.</p>
            <div style="text-align: left; margin-bottom: 32px;">
              <a href="${BASE_URL}/login" style="background: #1a73e8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(26, 115, 232, 0.2);">Configurar mi Acceso Ahora</a>
            </div>

            <p style="margin-bottom: 12px;"><strong>Paso 2: Conocer más sobre el Sistema</strong></p>
            <p style="font-size: 13px; color: #666; margin-bottom: 16px;">En cualquier momento, puede usted ir a la página principal para conocer todas las funcionalidades y beneficios de EdifiSaaS.</p>
            <div style="text-align: left;">
              <a href="${BASE_URL}" style="background: #ffffff; color: #1a73e8; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block; border: 2px solid #1a73e8;">Ir a la Página Principal</a>
            </div>
          </div>

          <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 40px 0;">

          <p style="font-size: 14px; color: #718096; text-align: center;">
            ¿Necesitas ayuda? Responde a este correo.<br>
            <span style="font-weight: bold; color: #1a73e8;">EdifiSaaS - Transparencia y Control</span>
          </p>
        </div>
      </div>
    `
  });
};

export const sendWelcomeEmail = async (recipient: string, firstName: string, buildingName: string) => {
  return transporter.sendMail({
    from: `"EdifiSaaS" <${SMTP_USER}>`,
    to: recipient,
    subject: `¡Bienvenido a EdifiSaaS! 🏢 Registro Exitoso: ${buildingName}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff; color: #1a202c;">
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 40px 24px; text-align: center;">
          <div style="background: rgba(255,255,255,0.2); width: 64px; height: 64px; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; font-size: 32px; font-weight: bold;">E</div>
          <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.025em; text-transform: uppercase italic;">¡Bienvenido, ${firstName}!</h1>
          <p style="margin-top: 8px; font-size: 16px; opacity: 0.9; font-weight: 500;">Gracias por confiar en EdifiSaaS para tu edificio.</p>
        </div>
        
        <div style="padding: 32px 24px; line-height: 1.6;">
          <p style="font-size: 18px; color: #2d3748;">Nos alegra informarte que el registro de <strong>${buildingName}</strong> se ha completado correctamente.</p>
          
          <div style="background: #f0f7ff; border-left: 4px solid #2563eb; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <h3 style="margin: 0 0 8px 0; color: #1e40af; font-size: 16px; text-transform: uppercase; letter-spacing: 0.05em;">🎁 Periodo de Prueba Activado</h3>
            <p style="margin: 0; color: #4a5568;">Tu cuenta incluye <strong>30 días de prueba gratuita</strong> con acceso a todas las funcionalidades premium del sistema.</p>
          </div>

          <h3 style="color: #2d3748; font-size: 16px; margin-top: 32px; border-bottom: 2px solid #edf2f7; padding-bottom: 8px;">🚀 Pasos para comenzar:</h3>
          <ul style="padding-left: 20px; color: #4a5568;">
            <li style="margin-bottom: 12px;"><strong>Configura tu Administradora:</strong> Asegúrate de que las credenciales (ID y Clave) de tu administradora sean correctas en la sección de configuración.</li>
            <li style="margin-bottom: 12px;"><strong>Primera Sincronización:</strong> Ve al Dashboard y haz clic en "Sincronizar" para descargar los datos actuales.</li>
            <li style="margin-bottom: 12px;"><strong>Invita a la Junta:</strong> Agrega a los miembros de la junta en la pestaña correspondiente para que puedan auditar el sistema.</li>
          </ul>

          <div style="text-align: center; margin: 40px 0;">
            <a href="${BASE_URL}/login" style="background: #2563eb; color: white; padding: 14px 40px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">Acceder a mi Dashboard</a>
          </div>

          <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 32px 0;">
          
          <p style="font-size: 14px; color: #718096; text-align: center;">
            ¿Tienes alguna duda? Responde a este correo y nuestro equipo te ayudará con gusto.<br>
            <span style="display: block; margin-top: 8px; font-weight: bold; color: #2563eb;">EdifiSaaS - El Espejo Inteligente de tu Condominio</span>
          </p>
        </div>
      </div>
    `
  });
};

export const sendContactEmail = async (data: {
  nombre: string;
  edificio: string;
  rol: string;
  email: string;
  whatsapp: string;
  mensaje: string;
}) => {
  // 1. Email to Admin
  await transporter.sendMail({
    from: `"EdifiSaaS Leads" <${SMTP_USER}>`,
    to: "correojago@gmail.com",
    subject: `NUEVO INTERESADO: ${data.nombre} - ${data.edificio}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2 style="color: #2563eb;">Nuevo Prospecto desde la Landing</h2>
        <p><strong>Nombre:</strong> ${data.nombre}</p>
        <p><strong>Edificio:</strong> ${data.edificio}</p>
        <p><strong>Rol:</strong> ${data.rol}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>WhatsApp:</strong> ${data.whatsapp}</p>
        <p><strong>Mensaje:</strong></p>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px;">${data.mensaje}</div>
      </div>
    `
  });

  // 2. Confirmation to User
  return transporter.sendMail({
    from: `"EdifiSaaS" <${SMTP_USER}>`,
    to: data.email,
    subject: `Recibimos tu solicitud - EdifiSaaS`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background: #2563eb; color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0;">¡Hola, ${data.nombre}!</h1>
        </div>
        <div style="padding: 30px; line-height: 1.6;">
          <p>Hemos recibido tu interés en <strong>EdifiSaaS</strong> para el edificio <strong>${data.edificio}</strong>.</p>
          <p>Nuestro equipo revisará tu información y te contactaremos muy pronto para coordinar una demostración personalizada.</p>
          <p>Gracias por contactarnos.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #666; text-align: center;">EdifiSaaS - Gestión Inteligente de Condominios</p>
        </div>
      </div>
    `
  });
};

export const sendAdminNotification = async (data: { 
  user: { email: string, name: string }, 
  building: { name: string, units: string, address: string },
  metadata: { ip: string, userAgent: string, localTime: string, language: string, resolution: string }
}) => {
  return transporter.sendMail({
    from: `"EdifiSaaS System" <${SMTP_USER}>`,
    to: "correojago@gmail.com",
    subject: `🚀 NUEVO REGISTRO: ${data.building.name}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #fcfcfc;">
        <h2 style="color: #2563eb; margin-top: 0;">🚀 Alguien nuevo se ha registrado</h2>
        <p style="font-size: 14px; color: #666;">Se ha detectado un nuevo registro de edificio en la plataforma.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;"/>
        
        <h3 style="color: #1e40af; font-size: 16px; text-transform: uppercase;">🏢 Datos del Edificio</h3>
        <p><strong>Nombre:</strong> ${data.building.name}</p>
        <p><strong>Unidades:</strong> ${data.building.units}</p>
        <p><strong>Dirección:</strong> ${data.building.address}</p>
        
        <h3 style="color: #1e40af; font-size: 16px; text-transform: uppercase;">👤 Datos del Usuario</h3>
        <p><strong>Nombre:</strong> ${data.user.name}</p>
        <p><strong>Email:</strong> ${data.user.email}</p>
        
        <h3 style="color: #1e40af; font-size: 16px; text-transform: uppercase;">🌐 Información Técnica (Metadata)</h3>
        <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <p style="margin: 5px 0;"><strong>Dirección IP:</strong> <span style="color: #d93025; font-weight: bold;">${data.metadata.ip}</span></p>
          <p style="margin: 5px 0;"><strong>Hora Local del Usuario:</strong> ${data.metadata.localTime}</p>
          <p style="margin: 5px 0;"><strong>Navegador:</strong> ${data.metadata.userAgent}</p>
          <p style="margin: 5px 0;"><strong>Idioma:</strong> ${data.metadata.language}</p>
          <p style="margin: 5px 0;"><strong>Resolución:</strong> ${data.metadata.resolution}</p>
        </div>
        
        <div style="margin-top: 30px; font-size: 10px; color: #999; text-align: center; font-style: italic;">
          Evento capturado automáticamente por el sistema de monitoreo EdifiSaaS
        </div>
      </div>
    `
  });
};
