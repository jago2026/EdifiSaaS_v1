"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [planes, setPlanes] = useState<any[]>([]);
  const [loadingPlanes, setLoadingPlanes] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "¿Es compatible con mi administradora?",
      a: "EdifiSaaS está optimizado para funcionar con administradoras que utilizan el portal Rascacielo. Si tus recibos se ven como los ejemplos mostrados, somos 100% compatibles."
    },
    {
      q: "¿Cómo se actualizan los datos?",
      a: "El sistema se sincroniza diariamente de forma automática con el portal de tu administradora, detectando nuevos pagos, gastos y variaciones en saldos sin que tengas que hacer nada manual."
    },
    {
      q: "¿Mis datos están seguros?",
      a: "Absolutamente. Utilizamos encriptación de nivel bancario para proteger toda la información. Los datos son privados de tu junta de condominio y no se comparten con terceros."
    },
    {
      q: "¿Tengo que instalar algún software?",
      a: "No. EdifiSaaS es una plataforma 100% en la nube. Puedes acceder desde cualquier navegador en tu computadora, tablet o teléfono móvil."
    },
    {
      q: "¿Puedo cancelar en cualquier momento?",
      a: "Sí, no hay contratos de permanencia a largo plazo. Si decides cancelar, tu servicio se mantendrá activo hasta el final del periodo pagado y no se realizarán más cobros."
    },
    {
      q: "¿Ofrecen soporte técnico?",
      a: "Contamos con un equipo de soporte dedicado para ayudarte en la configuración inicial y resolver cualquier duda operativa que surja durante el uso del sistema."
    }
  ];

  const [contactForm, setContactForm] = useState({
    nombre: '',
    edificio: '',
    rol: 'Administrador',
    email: '',
    whatsapp: '',
    mensaje: ''
  });
  const [sendingContact, setSendingContact] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingContact(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm)
      });
      if (res.ok) {
        alert('¡Mensaje enviado con éxito! Te contactaremos pronto.');
        setContactForm({ nombre: '', edificio: '', rol: 'Administrador', email: '', whatsapp: '', mensaje: '' });
      }
    } catch (e) {
      alert('Error al enviar el mensaje. Por favor intenta de nuevo.');
    }
    setSendingContact(false);
  };

  useEffect(() => {
    async function loadPlanes() {
      const hardcodedPlanes = [
        { name: "Esencial", price_monthly: 19, price_yearly: 190, features: [
          "Sincronización Diaria Manual",
          "Envío de Reportes Manual",
          "Historial para Procesamiento: 3 meses",
          "App de Propietarios (Consulta)",
          "Soporte Estándar por Email",
          "Hasta 30 Unidades de Vivienda"
        ], is_popular: false, show_contact: false, badge_text: "", display_order: 0 },
        { name: "Profesional", price_monthly: 29, price_yearly: 290, features: [
          "Todo Automático: Sincronización y Reportes",
          "Historial para Procesamiento: 6 meses",
          "KPIs y Gráficos de Tendencias",
          "Exportación Completa Excel/CSV",
          "Generación Recibo Próximo Mes",
          "Hasta 50 Unidades de Vivienda"
        ], is_popular: true, show_contact: false, badge_text: "Más popular", display_order: 1 },
        { name: "Premium", price_monthly: 59, price_yearly: 590, features: [
          "Todo Automático e Ilimitado",
          "Historial para Procesamiento: 1 Año",
          "Auditoría Financiera y Presupuestos",
          "Personalización de Marca (Branding)",
          "Alertas WhatsApp (200/mes)",
          "Hasta 100 Unidades de Vivienda"
        ], is_popular: false, show_contact: false, badge_text: "", display_order: 2 },
        { name: "Inteligencia Artificial", price_monthly: 79, price_yearly: 790, features: [
          "Todo lo del Plan Premium",
          "Asistente Virtual con IA 24/7",
          "Análisis Predictivo de Gastos",
          "Análisis de Morosidad con IA",
          "Automatización de Tareas",
          "Unidades de Vivienda Ilimitadas"
        ], is_popular: false, show_contact: false, badge_text: "Próximamente", display_order: 3 }
      ];

      try {
        const res = await fetch("/api/planes");
        const data = await res.json();
        if (res.ok && data.data && data.data.length > 0) {
          // Combinamos con los datos de la DB pero priorizamos nuestros textos de features
          const mergedPlanes = data.data.map((dbPlan: any) => {
            const dbName = dbPlan.name;
            const normalizedName = dbName === "Básico" ? "Esencial" : 
                                 (dbName === "Empresarial" ? "Premium" : dbName);

            const hardPlan = hardcodedPlanes.find(p => 
              p.name === normalizedName || 
              (normalizedName.startsWith("IA") && p.name.startsWith("IA")) ||
              (normalizedName.includes("Inteligencia") && p.name.includes("IA"))
            );

            return hardPlan ? { ...dbPlan, ...hardPlan, name: hardPlan.name } : { ...dbPlan, name: normalizedName };
          });
          setPlanes(mergedPlanes);        } else {
          setPlanes(hardcodedPlanes);
        }
      } catch (error) {
        setPlanes(hardcodedPlanes);
      } finally {
        setLoadingPlanes(false);
      }
    }
    loadPlanes();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 font-sans">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">E</span>
            </div>
            <span className="font-bold text-xl text-gray-800 tracking-tighter">EdifiSaaS</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-gray-600 hover:text-blue-600 transition font-medium">Funcionalidades</a>
            <a href="#how-it-works" className="text-gray-600 hover:text-blue-600 transition font-medium">Cómo funciona</a>
            <a href="#pricing" className="text-gray-600 hover:text-blue-600 transition font-medium">Planes</a>
            <a href="#faq" className="text-gray-600 hover:text-blue-600 transition font-medium">Preguntas frecuentes</a>
            <a href="#contact" className="text-gray-600 hover:text-blue-600 transition font-medium">Contacto</a>            <Link href="/login" className="bg-blue-100 text-blue-700 px-6 py-2 rounded-lg hover:bg-blue-200 transition font-bold">Ingresar</Link>
            <Link href="/register" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-bold">Prueba Gratis</Link>
          </nav>
          
          <button 
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 p-4 space-y-4 shadow-lg animate-in slide-in-from-top duration-200">
            <nav className="flex flex-col gap-4">
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-gray-600 font-medium py-2">Funcionalidades</a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-gray-600 font-medium py-2">Cómo funciona</a>
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-gray-600 font-medium py-2">Planes</a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="text-gray-600 font-medium py-2">Preguntas frecuentes</a>
              <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="text-gray-600 font-medium py-2">Contacto</a>
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="bg-blue-100 text-blue-700 px-6 py-2 rounded-lg text-center font-bold">Ingresar</Link>
              <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-center font-bold">Prueba Gratis</Link>
            </nav>
          </div>
        )}
      </header>

      <section className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            🚀 Nuevo: Prueba gratis por 30 días
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-gray-900 mb-6 leading-tight tracking-tighter">
            Gestión Inteligente de Condominios
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Automatiza el control financiero de tu edificio. Integra datos de tu administradora, detecta movimientos nuevos y mantén tu contabilidad al día sin esfuerzo.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login" className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition shadow-lg hover:shadow-xl">
              Ingresar al Sistema
            </Link>
            <Link href="/register" className="bg-white text-blue-600 border-2 border-blue-600 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-50 transition shadow-lg">
              Comenzar Prueba Gratis
            </Link>
            <Link href="/demo" className="bg-white text-gray-800 px-8 py-4 rounded-xl text-lg font-semibold border-2 border-gray-400 hover:border-blue-600 hover:text-blue-600 transition shadow-sm">
              Ver Demo
            </Link>
          </div>
          <p className="text-gray-500 mt-4 text-sm">Sin tarjeta de crédito • Cancela cuando quieras</p>
        </div>
      </section>

      <section id="features" className="container mx-auto px-6 py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12 uppercase tracking-tighter">
            Todo lo que necesitas para gestionar tu condominio
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 bg-gray-50 rounded-[2rem] hover:shadow-2xl transition-all duration-300 border border-transparent hover:border-blue-100 group">
              <div className="text-5xl mb-6 transform group-hover:scale-110 transition-transform">📊</div>
              <h3 className="text-xl font-black text-gray-900 mb-4 uppercase tracking-tight">Control Financiero Automatizado</h3>
              <p className="text-gray-600 font-medium leading-relaxed">Sincroniza automáticamente tus recibos, egresos, gastos y balance desde la administradora. Detecta nuevos movimientos al instante.</p>
            </div>
            <div className="p-8 bg-gray-50 rounded-[2rem] hover:shadow-2xl transition-all duration-300 border border-transparent hover:border-blue-100 group">
              <div className="text-5xl mb-6 transform group-hover:scale-110 transition-transform">🔔</div>
              <h3 className="text-xl font-black text-gray-900 mb-4 uppercase tracking-tight">Alertas Inteligentes</h3>
              <p className="text-gray-600 font-medium leading-relaxed">Recibe alertas sobre variaciones inusuales en saldos, gastos y egresos. Mantén el control total de tus finanzas.</p>
            </div>
            <div className="p-8 bg-gray-50 rounded-[2rem] hover:shadow-2xl transition-all duration-300 border border-transparent hover:border-blue-100 group">
              <div className="text-5xl mb-6 transform group-hover:scale-110 transition-transform">📈</div>
              <h3 className="text-xl font-black text-gray-900 mb-4 uppercase tracking-tight">Dashboards en Tiempo Real</h3>
              <p className="text-gray-600 font-medium leading-relaxed">Visualiza el estado financiero de tu edificio con gráficos interactivos y reportes detallados.</p>
            </div>
            <div className="p-8 bg-gray-50 rounded-[2rem] hover:shadow-2xl transition-all duration-300 border border-transparent hover:border-blue-100 group">
              <div className="text-5xl mb-6 transform group-hover:scale-110 transition-transform">🔐</div>
              <h3 className="text-xl font-black text-gray-900 mb-4 uppercase tracking-tight">Seguridad</h3>
              <p className="text-gray-600 font-medium leading-relaxed">Tus datos están protegidos con encriptación de extremo a extremo. Solo tú tienes acceso a la información.</p>
            </div>
            <div className="p-8 bg-gray-50 rounded-[2rem] hover:shadow-2xl transition-all duration-300 border border-transparent hover:border-blue-100 group">
              <div className="text-5xl mb-6 transform group-hover:scale-110 transition-transform">📱</div>
              <h3 className="text-xl font-black text-gray-900 mb-4 uppercase tracking-tight">Acceso desde cualquier lugar</h3>
              <p className="text-gray-600 font-medium leading-relaxed">Gestiona tu condominio desde cualquier dispositivo. Navega, descarga reportes y toma decisiones informadas.</p>
            </div>
            <div className="p-8 bg-gray-50 rounded-[2rem] hover:shadow-2xl transition-all duration-300 border border-transparent hover:border-blue-100 group">
              <div className="text-5xl mb-6 transform group-hover:scale-110 transition-transform">🔄</div>
              <h3 className="text-xl font-black text-gray-900 mb-4 uppercase tracking-tight">Sincronización Automática</h3>
              <p className="text-gray-600 font-medium leading-relaxed">El sistema se actualiza automáticamente cada día. No te preocupes por olvidar sincronizar tus datos.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-24 bg-gray-50 border-y border-gray-100 overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-4xl font-black text-gray-900 mb-6 tracking-tighter uppercase italic">¿Cómo funciona EdifiSaaS?</h2>
            <p className="text-xl text-gray-600 leading-relaxed font-medium">
              Nuestra plataforma actúa como una capa de inteligencia sobre la web de tu administradora actual. 
              Extraemos, procesamos y presentamos los datos para que siempre tengas el control financiero total.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-16 items-center mb-24">
            <div className="space-y-6">
              <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-gray-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl mb-8 shadow-lg shadow-blue-200">1</div>
                  <h3 className="text-2xl font-black text-gray-900 mb-4 tracking-tight uppercase">Integración con Rascacielo</h3>
                  <p className="text-gray-600 font-medium leading-relaxed italic">
                    "El Sistema está completamente adaptado para funcionar con las Adminitradoras que utilizan el Sistema de condominio Rascacielo, y donde los propietarios acceden al mismo."
                  </p>
                </div>
              </div>
              <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-gray-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl mb-8 shadow-lg shadow-blue-200">2</div>
                  <h3 className="text-2xl font-black text-gray-900 mb-4 tracking-tight uppercase">Data en Tiempo Real</h3>
                  <p className="text-gray-600 font-medium leading-relaxed">
                    La actualización on-line depende directamente de la información cargada por tu administradora. EdifiSaaS toma esa data y genera reportes automáticos de alta visibilidad.
                  </p>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gray-200 rounded-[3.5rem] p-3 rotate-2 shadow-2xl">
                <img 
                  src="/pantallarascacielo1.jpg" 
                  alt="Portal Rascacielo" 
                  className="rounded-[3rem] shadow-inner"
                />
              </div>
              <div className="absolute -bottom-10 -left-10 w-72 bg-blue-600 p-3 rounded-[2rem] shadow-2xl -rotate-3 border border-blue-400 hidden lg:block">
                <img 
                  src="/EjemploPantallaPpalEdifiSaaS.jpg" 
                  alt="Dashboard EdifiSaaS" 
                  className="rounded-2xl"
                />
                <p className="text-[10px] font-black text-white uppercase mt-3 text-center tracking-widest font-sans">Dashboard Inteligente</p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-16 items-center flex-row-reverse">
             <div className="order-2 md:order-1">
                <div className="relative">
                  <div className="bg-white rounded-[4rem] p-3 -rotate-2 shadow-2xl border border-gray-100">
                    <img 
                      src="/pantallarascacielo2.jpg" 
                      alt="Portal Rascacielo Detalle" 
                      className="rounded-[3.5rem]"
                    />
                  </div>
                  <div className="absolute -top-10 -right-10 w-64 bg-white p-3 rounded-[2rem] shadow-2xl rotate-3 border border-gray-100 hidden lg:block">
                    <img 
                      src="/EjemplopantallaKPIs.jpg" 
                      alt="KPIs EdifiSaaS" 
                      className="rounded-2xl"
                    />
                    <p className="text-[10px] font-black text-blue-600 uppercase mt-3 text-center tracking-widest">Indicadores Clave</p>
                  </div>
                </div>
             </div>
             <div className="space-y-8 order-1 md:order-2">
                <h3 className="text-4xl font-black text-gray-900 tracking-tighter leading-tight uppercase italic">
                  Reportes <span className="text-blue-600 underline decoration-blue-200 underline-offset-8">Gráficos e Indicadores</span>
                </h3>
                <p className="text-lg text-gray-600 font-medium leading-relaxed">
                  Visualiza KPIs críticos como morosidad, flujo de caja proyectado y evolución de fondos de reserva con base a la información de tu administradora.
                </p>
                <div className="p-8 bg-blue-600 rounded-[2.5rem] text-white shadow-xl shadow-blue-200">
                  <p className="text-sm font-bold leading-relaxed italic">
                    "El sistema toma la data existente en la página de la administradora y a partir de ahí muestra información con base a la data cargada en la misma. Su actualización on-line depende de la información actualizada existente en la página de la administradora."
                  </p>
                </div>
             </div>
          </div>
        </div>
      </section>

      <section id="contact" className="container mx-auto px-6 py-24 bg-white">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-20 items-center">
          <div>
            <h2 className="text-5xl font-black text-gray-900 mb-8 tracking-tighter leading-tight uppercase italic">
              ¿Listo para automatizar tu edificio?
            </h2>
            <p className="text-xl text-gray-600 mb-10 font-bold uppercase tracking-tight">
              Déjanos tus datos y te contactaremos para una demostración personalizada.
            </p>
          </div>
          <div className="bg-[#0f172a] p-12 rounded-[4rem] border border-slate-800 shadow-2xl">
            <form className="space-y-6" onSubmit={handleContactSubmit}>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Nombre y Apellido *</label>
                  <input 
                    type="text" required 
                    value={contactForm.nombre}
                    onChange={(e) => setContactForm({...contactForm, nombre: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 text-white px-5 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Nombre del Edificio *</label>
                  <input 
                    type="text" required 
                    value={contactForm.edificio}
                    onChange={(e) => setContactForm({...contactForm, edificio: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 text-white px-5 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Rol en el Edificio</label>
                <select 
                  value={contactForm.rol}
                  onChange={(e) => setContactForm({...contactForm, rol: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 text-white px-5 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm appearance-none"
                >
                  <option>Administrador</option>
                  <option>Miembro de Junta</option>
                  <option>Propietario</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Email *</label>
                  <input 
                    type="email" required 
                    value={contactForm.email}
                    onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 text-white px-5 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">WhatsApp *</label>
                  <input 
                    type="tel" required 
                    value={contactForm.whatsapp}
                    onChange={(e) => setContactForm({...contactForm, whatsapp: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 text-white px-5 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Mensaje</label>
                <textarea 
                  rows={4} 
                  value={contactForm.mensaje}
                  onChange={(e) => setContactForm({...contactForm, mensaje: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 text-white px-5 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm resize-none"
                ></textarea>
              </div>
              <button 
                type="submit" 
                disabled={sendingContact}
                className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-blue-500 transition shadow-2xl shadow-blue-600/20 disabled:opacity-50"
              >
                {sendingContact ? 'ENVIANDO...' : 'Enviar Mensaje'}
              </button>
            </form>
          </div>
        </div>
      </section>

      <section id="pricing" className="container mx-auto px-6 py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tighter">Planes flexibles para cada necesidad</h2>
            <p className="text-gray-600 mb-8">Elige el plan que mejor se adapte a tu edificio</p>
            
            {/* Monthly/Yearly Toggle */}
            <div className="flex items-center justify-center gap-4">
              <span className={`text-sm font-bold ${billingPeriod === 'monthly' ? 'text-gray-900' : 'text-gray-400'}`}>Mensual</span>
              <button 
                onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
                className="w-14 h-8 bg-blue-600 rounded-full p-1 relative transition-all shadow-inner"
              >
                <div className={`w-6 h-6 bg-white rounded-full transition-all shadow-md ${billingPeriod === 'yearly' ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
              <span className={`text-sm font-bold ${billingPeriod === 'yearly' ? 'text-gray-900' : 'text-gray-400'}`}>Anual (2 meses gratis)</span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {loadingPlanes ? (
              <div className="col-span-4 text-center py-12 text-gray-500 font-bold">Cargando planes...</div>
            ) : (
              planes.map((plan, idx) => (
                <div 
                  key={plan.id || idx} 
                  className={`p-6 rounded-3xl border-2 flex flex-col transition-all duration-300 hover:shadow-2xl relative ${
                    plan.is_popular 
                      ? 'border-blue-600 bg-blue-50/30 scale-105 z-10' 
                      : 'border-gray-200 bg-white hover:border-blue-300'
                  } ${plan.name.includes("IA") || plan.name.includes("Inteligencia") ? 'overflow-hidden pt-12' : ''}`}
                >
                  {(plan.name.includes("IA") || plan.name.includes("Inteligencia")) && (
                    <div className="absolute top-0 left-0 w-full bg-purple-600 text-white py-2 font-black text-[10px] uppercase tracking-[0.2em] shadow-md z-20 text-center">
                      Próximamente
                    </div>
                  )}

                  {plan.badge_text && (                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                      {plan.badge_text}
                    </div>
                  )}
                  
                  <h3 className="text-xl font-black text-gray-900 mb-4 tracking-tight">{plan.name}</h3>
                  
                  <div className="mb-6">
                    {plan.show_contact ? (
                      <span className="text-3xl font-black text-gray-900 tracking-tighter">Contactar</span>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-black text-gray-900 tracking-tighter">
                            ${billingPeriod === 'monthly' ? plan.price_monthly : Math.round(plan.price_yearly / 12)}
                          </span>
                          <span className="text-gray-500 font-bold">/mes</span>
                        </div>
                        {billingPeriod === 'yearly' && (
                          <div className="text-xs font-bold text-green-600 mt-1">
                            Pago anual único de USD${plan.price_yearly}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <ul className="space-y-4 mb-8 flex-1">
                    {plan.features.map((feature: string, fIdx: number) => (
                      <li key={fIdx} className="flex items-start gap-3 text-sm text-gray-600 font-medium leading-tight">
                        <span className="text-green-500 flex-shrink-0 font-bold mt-0.5">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {plan.badge_text === "En Desarrollo" ? (
                    <span className="block text-center py-4 rounded-xl font-black text-xs uppercase tracking-widest bg-gray-200 text-gray-400 cursor-not-allowed select-none">
                      Próximamente
                    </span>
                  ) : (
                    <Link 
                      href="/register" 
                      className={`block text-center py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                        plan.is_popular 
                          ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200' 
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      Comenzar
                    </Link>
                  )}
                </div>
              ))
              )}
              </div>

              {/* Tabla Comparativa de Planes */}
              <div className="mt-32 overflow-x-auto">
              <div className="text-center mb-16">
              <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic">Comparativa de Funcionalidades</h3>
              <div className="w-24 h-2 bg-blue-600 mx-auto mt-4 rounded-full"></div>
              </div>
              <table className="w-full text-left border-collapse min-w-[900px] border-2 border-gray-200 shadow-sm rounded-3xl overflow-hidden">
              <thead>
                <tr className="border-b-4 border-gray-200">
                  <th className="py-8 px-6 text-xs font-black uppercase text-gray-500 tracking-widest bg-gray-100/50">Módulo / Servicio</th>
                  <th className="py-8 px-6 text-center font-black text-gray-900 uppercase bg-gray-100/50">Esencial</th>
                  <th className="py-8 px-6 text-center font-black text-indigo-600 uppercase bg-indigo-50/50">Profesional</th>
                  <th className="py-8 px-6 text-center font-black text-blue-600 uppercase bg-blue-50/50">Premium</th>
                  <th className="py-8 px-6 text-center font-black text-purple-600 uppercase bg-purple-50/50">Inteligencia Artificial</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-gray-200">
                <tr className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-6 px-6 font-bold text-gray-700">Sincronización de Datos</td>
                  <td className="py-6 px-6 text-center font-black text-gray-400 uppercase text-[9px]">Diaria Manual</td>
                  <td className="py-6 px-6 text-center font-black text-indigo-600 uppercase text-[9px]">Automática</td>
                  <td className="py-6 px-6 text-center font-black text-blue-600 uppercase text-[9px]">Automática</td>
                  <td className="py-6 px-6 text-center font-black text-purple-600 uppercase text-[9px]">Automática</td>
                </tr>
                <tr className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-6 px-6 font-bold text-gray-700">Envío de Reportes por Email</td>
                  <td className="py-6 px-6 text-center font-black text-gray-400 uppercase text-[9px]">Manual</td>
                  <td className="py-6 px-6 text-center font-black text-indigo-600 uppercase text-[9px]">Automático</td>
                  <td className="py-6 px-6 text-center font-black text-blue-600 uppercase text-[9px]">Automático</td>
                  <td className="py-6 px-6 text-center font-black text-purple-600 uppercase text-[9px]">Inteligente</td>
                </tr>
                <tr className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-6 px-6 font-bold text-gray-700 font-medium">Historial (Caché Procesamiento Rápido)</td>
                  <td className="py-6 px-6 text-center font-black text-gray-400 uppercase text-[9px]">3 Meses</td>
                  <td className="py-6 px-6 text-center font-black text-indigo-600 uppercase text-[9px]">6 Meses</td>
                  <td className="py-6 px-6 text-center font-black text-blue-600 uppercase text-[9px]">1 Año</td>
                  <td className="py-6 px-6 text-center font-black text-purple-600 uppercase text-[9px]">Ilimitado</td>
                </tr>
                <tr className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-6 px-6 font-bold text-gray-700">Exportación de Datos (Excel/CSV)</td>
                  <td className="py-6 px-6 text-center text-red-300 font-bold text-xl">❌</td>
                  <td className="py-6 px-6 text-center font-black text-indigo-400 uppercase text-[9px]">Últimos 3 meses</td>
                  <td className="py-6 px-6 text-center text-green-500 font-bold text-xl">✅</td>
                  <td className="py-6 px-6 text-center text-green-500 font-bold text-xl">✅</td>
                </tr>
                <tr className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-6 px-6 font-bold text-gray-700">Auditoría Financiera Digital</td>
                  <td className="py-6 px-6 text-center text-red-300 font-bold text-xl">❌</td>
                  <td className="py-6 px-6 text-center text-red-300 font-bold text-xl">❌</td>
                  <td className="py-6 px-6 text-center text-green-500 font-bold text-xl">✅</td>
                  <td className="py-6 px-6 text-center text-green-500 font-bold text-xl">✅</td>
                </tr>
                <tr className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-6 px-6 font-bold text-gray-700">Recibo del Próximo Mes</td>
                  <td className="py-6 px-6 text-center text-red-300 font-bold text-xl">❌</td>
                  <td className="py-6 px-6 text-center text-green-500 font-bold text-xl">✅</td>
                  <td className="py-6 px-6 text-center text-green-500 font-bold text-xl">✅</td>
                  <td className="py-6 px-6 text-center text-green-500 font-bold text-xl">✅</td>
                </tr>
                <tr className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-6 px-6 font-bold text-gray-700 italic text-purple-700">IA, Análisis Predictivo y Asistente</td>
                  <td className="py-6 px-6 text-center text-red-300 font-bold text-xl">❌</td>
                  <td className="py-6 px-6 text-center text-red-300 font-bold text-xl">❌</td>
                  <td className="py-6 px-6 text-center text-red-300 font-bold text-xl">❌</td>
                  <td className="py-6 px-6 text-center text-purple-600 font-black text-[10px] uppercase tracking-tighter bg-purple-50">Próximamente</td>
                </tr>
                <tr className="bg-gray-900 text-white shadow-xl">
                  <td className="py-8 px-6 font-black uppercase text-xs tracking-[0.2em] rounded-bl-3xl">Límite de Unidades</td>
                  <td className="py-8 px-6 text-center font-black text-lg">30</td>
                  <td className="py-8 px-6 text-center font-black text-lg text-indigo-300">50</td>
                  <td className="py-8 px-6 text-center font-black text-lg text-blue-300">100</td>
                  <td className="py-8 px-6 text-center font-black text-lg text-purple-300 italic tracking-widest rounded-br-3xl">ILIMITADO</td>
                </tr>              </tbody>
              </table>
              </div>
              </div>
              </section>
      <section id="faq" className="container mx-auto px-6 py-20 bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-black text-center text-gray-900 mb-12 uppercase tracking-tighter italic">Preguntas Frecuentes</h2>
          <div className="grid md:grid-cols-1 gap-4">
            {faqs.map((faq, index) => (
              <div 
                key={index} 
                className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300"
              >
                <button 
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-lg font-black text-gray-900 uppercase tracking-tight">{faq.q}</span>
                  <div className={`w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center transition-transform duration-300 ${openFaq === index ? 'rotate-180' : ''}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                <div 
                  className={`px-8 transition-all duration-300 ease-in-out ${openFaq === index ? 'max-h-96 py-6 border-t border-gray-50 opacity-100' : 'max-h-0 opacity-0'}`}
                >
                  <p className="text-gray-600 font-medium leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-12 text-center text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <h2 className="text-4xl font-black mb-6 tracking-tighter">¿Listo para transformar la gestión de tu condominio?</h2>
          <p className="text-xl text-blue-100 mb-10 font-medium">Únete a cientos de edificios que ya están ahorrando tiempo y dinero con EdifiSaaS</p>
          <Link href="/register" className="inline-block bg-white text-blue-600 px-10 py-5 rounded-2xl text-lg font-black hover:bg-blue-50 transition shadow-xl hover:transform hover:scale-105 duration-200">
            Comenzar Prueba Gratis de 30 Días
          </Link>
        </div>
      </section>

      <footer className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">E</span>
                </div>
                <span className="font-bold text-xl tracking-tighter">EdifiSaaS</span>
              </div>
              <p className="text-gray-400 text-sm font-medium leading-relaxed">La plataforma líder en gestión financiera de condominios. Transparencia y eficiencia para tu edificio.</p>
            </div>
            <div>
              <h4 className="font-black text-xs uppercase tracking-widest text-gray-500 mb-6">Producto</h4>
              <ul className="space-y-3 text-gray-400 text-sm font-bold">
                <li><a href="#features" className="hover:text-white transition">Funcionalidades</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition">Cómo funciona</a></li>
                <li><a href="#pricing" className="hover:text-white transition">Precios</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-black text-xs uppercase tracking-widest text-gray-500 mb-6">Soporte</h4>
              <ul className="space-y-3 text-gray-400 text-sm font-bold">
                <li><a href="https://edifi-saa-s-v1-9o9n9dkon-joses-projects-2e18a871.vercel.app/dashboard" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Centro de ayuda</a></li>
                <li><a href="#contact" className="hover:text-white transition">Contacto</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-black text-xs uppercase tracking-widest text-gray-500 mb-6">Legal</h4>
              <ul className="space-y-3 text-gray-400 text-sm font-bold">
                <li><Link href="/terms" className="hover:text-white transition">Términos de servicio</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition">Política de privacidad</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-16 pt-8 text-center text-gray-500 text-xs font-black uppercase tracking-widest">
            © 2026 EdifiSaaS. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </main>
  );
}
