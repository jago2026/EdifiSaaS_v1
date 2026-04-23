"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [planes, setPlanes] = useState<any[]>([]);
  const [loadingPlanes, setLoadingPlanes] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    async function loadPlanes() {
      try {
        const res = await fetch("/api/planes");
        const data = await res.json();
        if (res.ok && data.data && data.data.length > 0) {
          setPlanes(data.data);
        } else {
          // Fallback plans if none in DB
          setPlanes([
            { name: "Básico", price_monthly: 19, price_yearly: 190, features: ["Hasta 30 unidades", "Control financiero básico", "Reporte diario automatico", "Historial de 3 meses", "Soporte por email"], is_popular: false, show_contact: false, badge_text: "", display_order: 0 },
            { name: "Profesional", price_monthly: 29, price_yearly: 290, features: ["Hasta 50 unidades", "Control financiero avanzado", "Reporte diario automatico", "Historial de 12 meses", "Soporte", "Exportación de reportes"], is_popular: true, show_contact: false, badge_text: "Más popular", display_order: 1 },
            { name: "Empresarial", price_monthly: 0, price_yearly: 0, features: ["Unidades ilimitadas", "Todo incluido", "Actualizaciones y mejoras incluidas", "Soporte", "Formación in situ"], is_popular: false, show_contact: true, badge_text: "", display_order: 2 },
            { name: "Inteligencia Artificial (IA)", price_monthly: 0, price_yearly: 0, features: ["Reportes inteligentes automatizados", "Todo incluido", "Análisis y recomendaciones", "Análisis de morosidad, de gastos, proyecciones y estimaciones, y mucho mas.", "Soporte", "Formación in situ"], is_popular: false, show_contact: true, badge_text: "En Desarrollo", display_order: 3 }
          ]);
        }
      } catch (error) {
        console.error("Error loading plans:", error);
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
            <Link href="/login" className="bg-blue-100 text-blue-700 px-6 py-2 rounded-lg hover:bg-blue-200 transition font-bold">Ingresar</Link>
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
            <Link href="/demo" className="bg-white text-gray-800 px-8 py-4 rounded-xl text-lg font-semibold border-2 border-gray-200 hover:border-blue-600 hover:text-blue-600 transition">
              Ver Demo
            </Link>
          </div>
          <p className="text-gray-500 mt-4 text-sm">Sin tarjeta de crédito • Cancela cuando quieras</p>
        </div>
      </section>

      <section id="features" className="container mx-auto px-6 py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Todo lo que necesitas para gestionar tu condominio
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 bg-gray-50 rounded-xl hover:shadow-lg transition border border-transparent hover:border-blue-100">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Control Financiero Automatizado</h3>
              <p className="text-gray-600">Sincroniza automáticamente tus recibos, egresos, gastos y balance desde la administradora. Detecta nuevos movimientos al instante.</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-xl hover:shadow-lg transition border border-transparent hover:border-blue-100">
              <div className="text-4xl mb-4">🔔</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Alertas Inteligentes</h3>
              <p className="text-gray-600">Recibe alertas sobre variaciones inusuales en saldos, gastos y egresos. Mantén el control total de tus finanzas.</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-xl hover:shadow-lg transition border border-transparent hover:border-blue-100">
              <div className="text-4xl mb-4">📈</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Dashboards en Tiempo Real</h3>
              <p className="text-gray-600">Visualiza el estado financiero de tu edificio con gráficos interactivos y reportes detallados.</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-xl hover:shadow-lg transition border border-transparent hover:border-blue-100">
              <div className="text-4xl mb-4">🔐</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Seguridad Garantizada</h3>
              <p className="text-gray-600">Tus datos están protegidos con encriptación de extremo a extremo. Solo tú tienes acceso a la información.</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-xl hover:shadow-lg transition border border-transparent hover:border-blue-100">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Acceso desde cualquier lugar</h3>
              <p className="text-gray-600">Gestiona tu condominio desde cualquier dispositivo. Navega, descarga reportes y toma decisiones informadas.</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-xl hover:shadow-lg transition border border-transparent hover:border-blue-100">
              <div className="text-4xl mb-4">🔄</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Sincronización Automática</h3>
              <p className="text-gray-600">El sistema se actualiza automáticamente cada día. No te preocupes por olvidar sincronizar tus datos.</p>
            </div>
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
                      : 'border-gray-100 bg-white hover:border-blue-200'
                  }`}
                >
                  {plan.badge_text && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
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
                            Billed ${plan.price_yearly} yearly
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
                </div>
              ))
            )}
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
                <li><a href="#" className="hover:text-white transition">Centro de ayuda</a></li>
                <li><a href="#" className="hover:text-white transition">Documentación</a></li>
                <li><a href="#" className="hover:text-white transition">Contacto</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-black text-xs uppercase tracking-widest text-gray-500 mb-6">Legal</h4>
              <ul className="space-y-3 text-gray-400 text-sm font-bold">
                <li><a href="#" className="hover:text-white transition">Términos de servicio</a></li>
                <li><a href="#" className="hover:text-white transition">Política de privacidad</a></li>
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
