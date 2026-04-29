"use client";

import { useState } from "react";

export function ManualUsuario() {
  const [activeSection, setActiveSection] = useState("intro");

  const sections = [
    { id: "intro", title: "¿Qué es EdifiSaaS?", icon: "📖" },
    { id: "roles", title: "Roles de Usuario", icon: "👥" },
    { id: "registro", title: "Registro e Inicio", icon: "🚀" },
    { id: "modulos", title: "Módulos detallados", icon: "🏠" },
    { id: "config", title: "Configuración", icon: "⚙️" },
    { id: "kpis", title: "Indicadores KPIs", icon: "📊" },
    { id: "analisis", title: "Análisis Avanzado", icon: "🧠" },
    { id: "guias", title: "Guías por Rol", icon: "🔑" },
    { id: "faq", title: "Preguntas Frecuentes", icon: "❓" },
  ];

  const scrollTo = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(`manual-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 max-w-6xl mx-auto px-4 sm:px-0">
      {/* Sidebar de Navegación Interna - Desktop */}
      <aside className="hidden lg:block lg:w-72 flex-shrink-0">
        <div className="sticky top-24 space-y-1 bg-white p-5 rounded-[2rem] border border-gray-100 shadow-xl shadow-indigo-100/20">
          <div className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-6 px-3 border-b border-gray-50 pb-3">Contenido del Manual</div>
          <div className="space-y-1 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-xs font-black transition-all text-left uppercase tracking-tighter ${
                  activeSection === s.id
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                    : "text-gray-400 hover:bg-indigo-50 hover:text-indigo-600"
                }`}
              >
                <span className="text-lg">{s.icon}</span>
                <span className="truncate">{s.title}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Navegación Móvil - Horizontal Scroll */}
      <div className="lg:hidden sticky top-0 z-10 bg-gray-50/80 backdrop-blur-md -mx-4 px-4 py-3 border-b overflow-x-auto no-scrollbar flex gap-2 mb-8">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => scrollTo(s.id)}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
              activeSection === s.id
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-white text-gray-500 border border-gray-100"
            }`}
          >
            <span>{s.icon}</span>
            {s.title.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Contenido del Manual */}
      <div className="flex-1 space-y-24 pb-32">
        {/* Header */}
        <header className="relative border-b pb-12 border-gray-100">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-6 border border-indigo-100 shadow-sm">
            📘 Documentación Oficial
          </div>
          <h2 className="text-5xl lg:text-7xl font-black text-gray-900 uppercase tracking-[-0.05em] leading-[0.85] mb-8">
            Manual de <br />
            <span className="text-indigo-600">Usuario</span> <br />
            <span className="text-gray-200">EdifiSaaS v1</span>
          </h2>
          <p className="text-gray-500 text-xl max-w-2xl leading-relaxed font-medium">
            Guía integral para administradores, juntas de condominio y usuarios del sistema de control financiero inteligente.
          </p>
          
          <div className="flex flex-wrap gap-3 mt-10">
            {["Versión 1.0 — 2026", "Compatible Rascacielo", "100% en la nube"].map((tag, i) => (
              <div key={i} className="px-4 py-2 bg-white rounded-2xl border border-gray-100 text-[9px] font-black uppercase tracking-widest text-gray-400 shadow-sm">
                {tag}
              </div>
            ))}
          </div>
        </header>

        {/* SECCIÓN 0: INTRODUCCIÓN */}
        <section id="manual-intro" className="scroll-mt-32">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-1 bg-indigo-600 rounded-full"></div>
            <div className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Introducción</div>
          </div>
          <h3 className="text-4xl font-black text-gray-900 uppercase tracking-tighter mb-8 leading-none">
            ¿Qué es <span className="text-indigo-600">EdifiSaaS</span>?
          </h3>
          <div className="prose prose-indigo max-w-none text-gray-600 space-y-6 leading-relaxed text-lg">
            <p>
              <strong>EdifiSaaS</strong> es una plataforma SaaS (Software como Servicio) de control financiero diseñada específicamente para condominios y edificios residenciales que utilizan <strong>administradoras con sistema Rascacielo</strong>. Actúa como una capa de inteligencia sobre el portal de tu administradora: extrae, procesa, enriquece y presenta la información financiera de manera visual, auditable y en tiempo real.
            </p>
            <p>
              En lugar de depender de reportes en papel o de navegar por múltiples pantallas en el sistema de la administradora, EdifiSaaS centraliza toda la información en un único panel intuitivo al que los miembros autorizados del edificio pueden acceder desde cualquier dispositivo, en cualquier momento.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 mt-12">
            {[
              { icon: "🪞", title: "Espejo inteligente", desc: "EdifiSaaS no reemplaza a tu administradora — la complementa. Lee los datos del portal Rascacielo y los transforma en reportes visuales y alertas.", color: "indigo" },
              { icon: "🔄", title: "Sincronización automática", desc: "El sistema detecta cambios diariamente mediante hashing. Solo guarda movimientos nuevos y genera alertas automáticamente.", color: "blue" },
              { icon: "📊", title: "KPIs en tiempo real", desc: "Morosidad, cobertura de gastos, flujo de caja, índice patrimonial y más — todos calculados automáticamente.", color: "indigo" },
              { icon: "🔐", title: "Acceso por roles", desc: "Administrador, Miembro de Junta y Visor tienen permisos distintos según su función dentro del edificio.", color: "slate" },
            ].map((card, i) => (
              <div key={i} className="group p-8 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all duration-500">
                <div className="text-4xl mb-6 group-hover:scale-110 transition-transform">{card.icon}</div>
                <h4 className="font-black text-gray-900 uppercase tracking-tight mb-2 text-sm">{card.title}</h4>
                <p className="text-xs text-gray-500 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 p-8 bg-indigo-50 border-l-8 border-indigo-600 rounded-2xl">
            <div className="flex gap-4">
              <span className="text-2xl">ℹ️</span>
              <p className="text-sm text-indigo-900 font-bold leading-relaxed">
                <strong>Importante:</strong> La actualización de datos depende directamente de la información cargada por tu administradora en el portal Rascacielo. EdifiSaaS toma esa data, la procesa y la muestra — si la administradora no ha cargado datos nuevos, el sistema mostrará la última información sincronizada.
              </p>
            </div>
          </div>
        </section>

        {/* SECCIÓN 1: ROLES */}
        <section id="manual-roles" className="scroll-mt-32">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-1 bg-indigo-600 rounded-full"></div>
            <div className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Estructura</div>
          </div>
          <h3 className="text-4xl font-black text-gray-900 uppercase tracking-tighter mb-8 leading-none">
            Roles de <span className="text-indigo-600">Usuario</span>
          </h3>
          <p className="text-gray-600 text-base mb-10 leading-relaxed">
            EdifiSaaS define tres roles con permisos claramente diferenciados. Cada usuario del edificio recibe uno de estos roles al ser invitado al sistema.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { 
                icon: "👑", title: "Administrador", desc: "Acceso total al sistema", color: "indigo",
                perms: ["Ver todos los módulos", "Configurar credenciales", "Gestionar tasa BCV", "Ejecutar sincronización", "Invitar y gestionar miembros", "Modificar parámetros del edificio"]
              },
              { 
                icon: "📋", title: "Miembro de Junta", desc: "Consulta y supervisión financiera", color: "blue",
                perms: ["Ver todos los módulos", "Consultar recibos y deudas", "Ver egresos y gastos", "Ver balance y KPIs"],
                nos: ["Configurar credenciales", "Invitar usuarios"]
              },
              { 
                icon: "👁️", title: "Visor", desc: "Solo lectura — propietarios", color: "slate",
                perms: ["Ver dashboard general", "Consultar su propio recibo", "Ver resumen de balance"],
                nos: ["Ver deudas de otros", "Modificar configuración", "Ejecutar sincronización"]
              }
            ].map((role, i) => (
              <div key={i} className="flex flex-col bg-white border border-gray-100 rounded-[3rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500">
                <div className={`p-8 bg-gray-50 border-b border-gray-100`}>
                  <div className="text-4xl mb-4">{role.icon}</div>
                  <h4 className="font-black text-gray-900 uppercase tracking-tight text-base mb-1">{role.title}</h4>
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{role.desc}</p>
                </div>
                <div className="p-8 space-y-4 flex-1">
                  {role.perms.map((p, j) => (
                    <div key={j} className="flex items-start gap-3 text-xs text-gray-600 font-bold">
                      <span className="text-green-500 font-black">✓</span>
                      {p}
                    </div>
                  ))}
                  {role.nos?.map((p, j) => (
                    <div key={j} className="flex items-start gap-3 text-xs text-gray-400 font-medium italic">
                      <span className="text-red-400 font-black">✗</span>
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-6 bg-green-50 border border-green-100 rounded-3xl flex gap-4">
            <span className="text-2xl">💡</span>
            <p className="text-xs text-green-800 font-bold leading-relaxed">
              <strong>Buena práctica:</strong> El rol de <strong>Administrador</strong> debe asignarse únicamente al presidente de junta o al representante técnico que configura el sistema. Los demás miembros de junta reciben el rol <strong>Miembro de Junta</strong>, y los propietarios que solo desean ver su estado de cuenta reciben el rol <strong>Visor</strong>.
            </p>
          </div>
        </section>

        {/* SECCIÓN 2: REGISTRO */}
        <section id="manual-registro" className="scroll-mt-32">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-1 bg-indigo-600 rounded-full"></div>
            <div className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Primeros pasos</div>
          </div>
          <h3 className="text-4xl font-black text-gray-900 uppercase tracking-tighter mb-10 leading-none">
            Registro e <span className="text-indigo-600">Inicio de Sesión</span>
          </h3>
          
          <div className="space-y-16">
            <div>
              <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-8">2.1 Crear una cuenta nueva (Administrador)</h4>
              <p className="text-sm text-gray-500 mb-6">El proceso de registro lo realiza quien va a gestionar el edificio como <strong>Administrador principal</strong>. Solo se registra una vez por edificio.</p>
              <div className="grid gap-4">
                {[
                  { step: 1, title: "Ingresar a la página principal", desc: "Visita edifi-saa-s-v1.vercel.app y haz clic en el botón 'Comenzar Prueba Gratis' o 'Prueba Gratis' en la barra de navegación superior." },
                  { step: 2, title: "Completar el formulario de registro", desc: "Ingresa tu nombre y apellido, nombre del edificio, tu correo electrónico y una contraseña segura. El sistema creará una organización (edificio) a tu nombre." },
                  { step: 3, title: "Verificar el correo electrónico", desc: "Recibirás un correo de verificación. Haz clic en el enlace para activar tu cuenta. Sin este paso, no podrás iniciar sesión." },
                  { step: 4, title: "Iniciar sesión y configurar el sistema", desc: "Una vez verificado, inicia sesión en /login. Serás redirigido al Dashboard. El primer paso es ir a Configuración e ingresar las credenciales de la administradora." },
                  { step: 5, title: "Ejecutar la primera sincronización", desc: "Con las credenciales configuradas, pulsa 'Ejecutar Sincronización Ahora'. El sistema realizará la primera lectura de datos desde el portal Rascacielo. Este proceso puede tomar 1–3 minutos." }
                ].map((s) => (
                  <div key={s.step} className="flex gap-6 items-start bg-white p-6 rounded-[1.5rem] border border-gray-100 shadow-sm">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0">{s.step}</div>
                    <div>
                      <h5 className="font-black text-gray-900 uppercase tracking-tight text-sm mb-1">{s.title}</h5>
                      <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-8">2.2 Invitar miembros (Junta y Visores)</h4>
              <p className="text-sm text-gray-500 mb-6">El Administrador puede invitar a otros usuarios del edificio. Los invitados <strong>no necesitan pasar por el registro público</strong> — recibirán un correo de invitación con un enlace directo.</p>
              <div className="grid gap-4">
                {[
                  { step: 1, title: "Ir a la sección de Miembros / Configuración", desc: "Desde el menú lateral del dashboard, accede a Configuración → Gestión de Miembros o Junta y Permisos." },
                  { step: 2, title: "Ingresar el correo del nuevo miembro", desc: "Escribe el correo electrónico del miembro a invitar y selecciona su rol: Miembro de Junta o Visor." },
                  { step: 3, title: "Enviar la invitación", desc: "El sistema envía automáticamente un correo al nuevo miembro con un enlace de registro. Al hacer clic, el usuario crea su contraseña y accede directamente." },
                  { step: 4, title: "El nuevo miembro inicia sesión", desc: "Una vez registrado, el miembro puede ingresar en cualquier momento desde /login con su correo y contraseña." }
                ].map((s) => (
                  <div key={s.step} className="flex gap-6 items-start bg-white p-6 rounded-[1.5rem] border border-gray-100 shadow-sm">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0">{s.step}</div>
                    <div>
                      <h5 className="font-black text-gray-900 uppercase tracking-tight text-sm mb-1">{s.title}</h5>
                      <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl flex gap-4">
              <span className="text-2xl">⚠️</span>
              <p className="text-xs text-amber-800 font-bold leading-relaxed">
                Los enlaces de invitación tienen un tiempo de expiración. Si el invitado no activa su cuenta dentro del plazo, el Administrador deberá reenviar la invitación desde el panel de miembros.
              </p>
            </div>
          </div>
        </section>

        {/* SECCIÓN 3: MÓDULOS */}
        <section id="manual-modulos" className="scroll-mt-32">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-1 bg-indigo-600 rounded-full"></div>
            <div className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Funcionamiento</div>
          </div>
          <h3 className="text-4xl font-black text-gray-900 uppercase tracking-tighter mb-10 leading-none">
            Módulos del <span className="text-indigo-600">Sistema</span>
          </h3>
          
          <div className="space-y-12">
            <div>
              <h4 className="text-lg font-black text-gray-900 mb-4 uppercase tracking-tight">🏠 Panel de Control (Dashboard)</h4>
              <p className="text-sm text-gray-600 mb-6">Proporciona una vista ejecutiva del estado financiero del edificio con indicadores clave al instante.</p>
              <div className="overflow-x-auto rounded-3xl border border-gray-100 shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 font-black uppercase text-gray-400 border-b">
                    <tr><th className="p-4">Elemento</th><th className="p-4">Descripción</th><th className="p-4">Utilidad</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-600">
                    <tr><td className="p-4 font-bold">Tarjetas de resumen</td><td className="p-4">Total de fondos, deuda acumulada y morosos</td><td className="p-4">Visión rápida en 10 segundos</td></tr>
                    <tr><td className="p-4 font-bold">Alertas</td><td className="p-4">Notificaciones de últimos movimientos detectados</td><td className="p-4">Saber si hay datos nuevos</td></tr>
                    <tr><td className="p-4 font-bold">Morosidad</td><td className="p-4">Porcentaje de unidades con recibos pendientes</td><td className="p-4">Detectar problemas de cobranza</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-black text-gray-900 mb-4 uppercase tracking-tight">💰 Recibos y Deudas</h4>
              <p className="text-sm text-gray-600 mb-6">Estado de cuenta de cada unidad. Herramienta principal para el control de morosidad.</p>
              <div className="overflow-x-auto rounded-3xl border border-gray-100 shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 font-black uppercase text-gray-400 border-b">
                    <tr><th className="p-4">Columna</th><th className="p-4">Significado</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-600">
                    <tr><td className="p-4 font-bold">Num. Recibos</td><td className="p-4">Cantidad de recibos pendientes. +3 indica morosidad crítica.</td></tr>
                    <tr><td className="p-4 font-bold">Deuda en USD</td><td className="p-4">Equivalente referencial al cambio BCV configurado.</td></tr>
                    <tr><td className="p-4 font-bold">Fecha Antiguo</td><td className="p-4">Indica cuánto tiempo lleva sin pagar el propietario.</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-black text-gray-900 mb-4 uppercase tracking-tight">🧾 Egresos (Pagos Realizados)</h4>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                Registra todos los <strong>pagos efectivamente realizados</strong> por el edificio: proveedores, servicios, personal, etc. Cada registro proviene de los reportes de la administradora (r=21).
              </p>
              <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-3xl text-xs text-indigo-900 font-bold">
                ℹ️ Si un pago no aparece, significa que la administradora aún no lo ha procesado en su sistema.
              </div>
            </div>

            <div>
              <h4 className="text-lg font-black text-gray-900 mb-4 uppercase tracking-tight">🛠️ Gastos (Por Facturar)</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Muestra las <strong>facturas recibidas que aún no han sido cobradas a los vecinos</strong>. Es la herramienta de anticipación: permite saber si el próximo recibo será más alto de lo habitual.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-black text-gray-900 mb-4 uppercase tracking-tight">⚖️ Balance Financiero</h4>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">Auditoría financiera. Muestra el flujo de caja real del edificio: cuánto entró, cuánto salió y cuánto hay disponible.</p>
              <div className="overflow-x-auto rounded-3xl border border-gray-100 shadow-sm text-xs">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 font-black uppercase text-gray-400 border-b">
                    <tr><th className="p-4">Componente</th><th className="p-4">Descripción</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-600 font-medium">
                    <tr><td className="p-4 font-bold">Cobranza del período</td><td className="p-4">Total de pagos recibidos de propietarios en el mes.</td></tr>
                    <tr><td className="p-4 font-bold">Egresos del período</td><td className="p-4">Total de pagos realizados a proveedores.</td></tr>
                    <tr><td className="p-4 font-bold">Saldo disponible</td><td className="p-4">Dinero efectivo en cuenta bancaria.</td></tr>
                    <tr><td className="p-4 font-bold">Fondos de reserva</td><td className="p-4">Monto apartado para emergencias.</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* SECCIÓN 4: CONFIGURACIÓN */}
        <section id="manual-config" className="scroll-mt-32">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-1 bg-indigo-600 rounded-full"></div>
            <div className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Administración</div>
          </div>
          <h3 className="text-4xl font-black text-gray-900 uppercase tracking-tighter mb-10 leading-none">
            Configuración <span className="text-indigo-600">Crítica</span>
          </h3>
          
          <div className="space-y-12">
            <div>
              <h4 className="text-lg font-black text-gray-900 mb-4 uppercase tracking-tight">🌐 Conexión y Credenciales</h4>
              <div className="overflow-x-auto rounded-3xl border border-gray-100 shadow-sm text-xs">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 font-black uppercase text-gray-400 border-b">
                    <tr><th className="p-4">Campo</th><th className="p-4">Descripción</th><th className="p-4">Ejemplo</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-600 font-medium">
                    <tr><td className="p-4 font-bold">Admin ID</td><td className="p-4">Usuario del portal Rascacielo</td><td className="p-4 italic">edificio123</td></tr>
                    <tr><td className="p-4 font-bold">Secret / Pass</td><td className="p-4">Contraseña del portal (cifrada)</td><td className="p-4 italic">••••••••</td></tr>
                    <tr><td className="p-4 font-bold">Rutas r=</td><td className="p-4">Códigos internos de reportes</td><td className="p-4 italic">?r=5, ?r=21</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-black text-gray-900 mb-4 uppercase tracking-tight">💵 Moneda y Tasa BCV</h4>
              <div className="prose prose-indigo text-sm text-gray-600 leading-relaxed font-medium space-y-4">
                <p>EdifiSaaS maneja Bolívares (Bs) como oficial y Dólares (USD) como referencia. La conversión es automática usando la Tasa BCV.</p>
                <p><strong>Obtención automática:</strong> El sistema consulta el sitio oficial del BCV. Si no está disponible, utiliza la tasa del día anterior guardada en la base de datos, garantizando operatividad continua.</p>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-black text-gray-900 mb-4 uppercase tracking-tight">🔄 Sincronización</h4>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed font-medium">Es el corazón del sistema. Lee datos de Rascacielo y los incorpora mediante <strong>Hashing</strong> para evitar duplicados.</p>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center">
                {["Login", "Extracción", "Hashing", "Guardado", "Alertas", "Visualización"].map((step, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="text-[9px] font-black text-indigo-600 uppercase mb-1">Paso {i+1}</div>
                    <div className="text-[10px] font-bold text-gray-800 truncate">{step}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SECCIÓN 5: KPIs */}
        <section id="manual-kpis" className="scroll-mt-32">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-1 bg-indigo-600 rounded-full"></div>
            <div className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">KPIs</div>
          </div>
          <h3 className="text-4xl font-black text-gray-900 uppercase tracking-tighter mb-12 leading-none">
            Indicadores <span className="text-indigo-600">Financieros</span>
          </h3>
          
          <div className="grid md:grid-cols-3 gap-8 text-left">
            {[
              { title: "📈 Efectividad Cobranza", formula: "Cob Mes ÷ (Cob Mes + Deuda) × 100", desc: "Mide qué porcentaje del total cobrable se logró ingresar al banco.", s: ">50%", a: "30%-50%", c: "green" },
              { title: "📉 Morosidad Patrimonial", formula: "Deuda ÷ (Deuda + Banco + Fondos) × 100", desc: "% del patrimonio del edificio retenido en deudas de copropietarios.", s: "<15%", a: "15%-30%", c: "red" },
              { title: "⚖️ Cobertura de Gastos", formula: "Cobranza ÷ Egresos Facturados × 100", desc: "Mide si el dinero que entró alcanza para cubrir las facturas.", s: ">100%", a: "90%-100%", c: "blue" }
            ].map((k, i) => (
              <div key={i} className="p-8 bg-white border-2 border-gray-50 rounded-[3rem] shadow-sm relative group overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-2 bg-${k.c}-500`}></div>
                <h4 className="font-black text-gray-900 uppercase tracking-tight text-[11px] mb-4">{k.title}</h4>
                <div className="bg-gray-50 p-3 rounded-xl font-mono text-[9px] text-gray-500 mb-6 border border-gray-100 font-bold">{k.formula}</div>
                <p className="text-xs text-gray-400 mb-6 leading-relaxed font-bold uppercase">{k.desc}</p>
                <div className="space-y-2 text-[10px] font-black uppercase">
                  <div className="text-green-600">✓ Sano: {k.s}</div>
                  <div className="text-orange-500">⚠ Atención: {k.a}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECCIÓN 6: ANALISIS AVANZADO */}
        <section id="manual-analisis" className="scroll-mt-32">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-1 bg-indigo-600 rounded-full"></div>
            <div className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Análisis Avanzado</div>
          </div>
          <h3 className="text-4xl font-black text-gray-900 uppercase tracking-tighter mb-8 leading-none">
            Herramientas de <br /><span className="text-indigo-600">Gestión Estratégica</span>
          </h3>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-xl mb-6">📈</div>
              <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-4">Análisis de Cobranza</h4>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">
                Visualice la <strong>Curva de Recaudación</strong> que compara la velocidad de ingreso de fondos del mes actual contra el anterior.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-xs font-bold text-gray-600 uppercase">
                  <span className="text-indigo-500">✔</span> Predicción de recaudación 100%
                </li>
                <li className="flex items-start gap-2 text-xs font-bold text-gray-600 uppercase">
                  <span className="text-indigo-500">✔</span> Alerta de ralentización de pagos
                </li>
              </ul>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center text-xl mb-6">🚦</div>
              <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-4">Semáforo de Morosidad</h4>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">
                Mida el riesgo de la cartera basándose en la <strong>Antigüedad de Deuda</strong> (antigüedad de recibos pendientes).
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-xs font-bold text-gray-600 uppercase">
                  <span className="text-rose-500">✔</span> Costo real de la morosidad (Devaluación)
                </li>
                <li className="flex items-start gap-2 text-xs font-bold text-gray-600 uppercase">
                  <span className="text-rose-500">✔</span> Análisis de desplazamiento de deudores
                </li>
              </ul>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-xl mb-6">🏥</div>
              <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-4">Salud Financiera</h4>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">
                Indicadores técnicos para juntas de condominio que buscan transparencia y eficiencia.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-xs font-bold text-gray-600 uppercase">
                  <span className="text-emerald-500">✔</span> Índice de Liquidez (Caja vs Compromisos)
                </li>
                <li className="flex items-start gap-2 text-xs font-bold text-gray-600 uppercase">
                  <span className="text-emerald-500">✔</span> El "Día de Oro" para pagos a proveedores
                </li>
              </ul>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-xl mb-6">🏗️</div>
              <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-4">Simulador de Proyectos</h4>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">
                Planifique reparaciones o mejoras (pintura, ascensores, bombas) basándose en excedentes reales.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-xs font-bold text-gray-600 uppercase">
                  <span className="text-amber-500">✔</span> Estimación de meses para alcanzar la meta
                </li>
                <li className="flex items-start gap-2 text-xs font-bold text-gray-600 uppercase">
                  <span className="text-amber-500">✔</span> Proyección sin tocar el Fondo de Reserva
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* SECCIÓN 7: GUIAS */}
        <section id="manual-guias" className="scroll-mt-32">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-1 bg-indigo-600 rounded-full"></div>
            <div className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Guías por Perfil</div>
          </div>
          <h3 className="text-4xl font-black text-gray-900 uppercase tracking-tighter mb-10 leading-none">
            Uso <span className="text-indigo-600">Diario</span>
          </h3>
          
          <div className="space-y-8">
            <div className="p-10 bg-white border border-indigo-100 rounded-[2.5rem] shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <span className="text-4xl">🔑</span>
                <h4 className="font-black text-indigo-950 uppercase tracking-tighter text-xl">Guía del Administrador</h4>
              </div>
              <div className="space-y-6 text-sm text-gray-600 font-bold uppercase tracking-tight">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="mb-2 text-indigo-600 tracking-widest text-[10px]">Rutina Semanal:</p>
                  <ul className="space-y-2 text-xs">
                    <li>• Actualizar tasa BCV cuando cambie oficialmente.</li>
                    <li>• Verificar alertas de sincronización diariamente.</li>
                    <li>• Revisar morosos de más de 3 recibos.</li>
                    <li>• Forzar sincronización manual si la admin cargó datos.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="p-10 bg-white border border-blue-100 rounded-[2.5rem] shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <span className="text-4xl">📋</span>
                <h4 className="font-black text-blue-950 uppercase tracking-tighter text-xl">Guía Miembro de Junta</h4>
              </div>
              <div className="space-y-4 text-sm text-gray-600 font-bold uppercase tracking-tight">
                <p>1. Antes de cada reunión, toma nota de indicadores en Dashboard.</p>
                <p>2. En 'Recibos' filtra por +3 recibos para ver morosos críticos.</p>
                <p>3. Revisa en 'Balance' el saldo disponible y fondos.</p>
                <p>4. Usa 'Gastos' para anticipar recibos altos a la comunidad.</p>
              </div>
            </div>

            <div className="p-10 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <span className="text-4xl">👁️</span>
                <h4 className="font-black text-slate-950 uppercase tracking-tighter text-xl">Guía Visor (Propietario)</h4>
              </div>
              <div className="space-y-4 text-sm text-gray-600 font-bold uppercase tracking-tight">
                <p>• Consulta tu propio estado de cuenta en 'Recibos'.</p>
                <p>• Mira en qué se gasta el dinero en 'Egresos' y 'Gastos'.</p>
                <p>• Los datos son un espejo de Rascacielo; si falta un pago, contacta a la admin.</p>
              </div>
            </div>
          </div>
        </section>

        {/* SECCIÓN 7: FAQ */}
        <section id="manual-faq" className="scroll-mt-32 pb-20">
           <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-1 bg-indigo-600 rounded-full"></div>
            <div className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Soporte</div>
          </div>
          <h3 className="text-4xl font-black text-gray-900 uppercase tracking-tighter mb-10 leading-none">
            Preguntas <span className="text-indigo-600">Frecuentes</span>
          </h3>
          <div className="grid gap-4">
            {[
              { q: "¿Es compatible con mi administradora?", a: "Diseñado para administradoras con portal Rascacielo. Si los propietarios ven recibos online, somos compatibles." },
              { q: "¿Cuándo se actualizan los datos?", a: "Sincronización automática diaria. El administrador puede forzarla manualmente en Configuración." },
              { q: "Un pago no aparece. ¿Por qué?", a: "Ocurre cuando la administradora aún no procesa el pago en Rascacielo. Solo mostramos datos registrados." },
              { q: "¿Mis datos están seguros?", a: "Sí. Credenciales cifradas, comunicación HTTPS y datos privados exclusivos de tu edificio." },
              { q: "¿Puedo acceder desde el celular?", a: "Sí, 100% en la nube. Funciona en cualquier navegador sin instalar aplicaciones." },
              { q: "¿Qué pasa si cambio de administradora?", a: "Si la nueva usa Rascacielo, solo actualizas credenciales. Si usa otro sistema, consúltanos." }
            ].map((f, i) => (
              <div key={i} className="p-8 bg-white border border-gray-100 rounded-[2rem] hover:border-indigo-100 transition-colors">
                <h4 className="font-black text-indigo-900 mb-4 uppercase tracking-tight text-xs">Q: {f.q}</h4>
                <p className="text-sm text-gray-500 font-bold italic leading-relaxed">A: {f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FOOTER MANUAL */}
        <footer className="text-center pt-20 border-t border-gray-50">
          <div className="inline-block px-8 py-4 bg-indigo-950 text-white rounded-[2rem] shadow-2xl">
            <div className="text-[10px] font-black uppercase tracking-[0.4em] mb-1">EdifiSaaS v1.0</div>
            <div className="text-[8px] font-bold text-indigo-400 uppercase leading-loose">
              Sistema de Control Financiero • Compatible con Rascacielo • 2026
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
