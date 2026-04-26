"use client";

import { useState } from "react";

export function ManualUsuario() {
  const [activeSection, setActiveSection] = useState("intro");

  const sections = [
    { id: "intro", title: "¿Qué es EdifiSaaS?", icon: "📖" },
    { id: "roles", title: "Roles de Usuario", icon: "👥" },
    { id: "registro", title: "Registro e Inicio", icon: "🚀" },
    { id: "modulos", title: "Módulos", icon: "🏠" },
    { id: "config", title: "Configuración", icon: "⚙️" },
    { id: "kpis", title: "Indicadores KPIs", icon: "📊" },
    { id: "guias", title: "Guías por Rol", icon: "🔑" },
    { id: "faq", title: "FAQ", icon: "❓" },
  ];

  const scrollTo = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(`manual-${id}`);
    if (el) {
      const yOffset = -120; 
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 max-w-6xl mx-auto px-4 sm:px-0">
      {/* Sidebar de Navegación Interna - Desktop */}
      <aside className="hidden lg:block lg:w-64 flex-shrink-0">
        <div className="sticky top-24 space-y-1 bg-white p-5 rounded-[2rem] border border-gray-100 shadow-xl shadow-indigo-100/20">
          <div className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-6 px-3 border-b border-gray-50 pb-3">Contenido</div>
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
        <header className="relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-6 border border-indigo-100 shadow-sm">
            📘 Documentación Oficial
          </div>
          <h2 className="text-5xl lg:text-7xl font-black text-gray-900 uppercase tracking-[ -0.05em] leading-[0.85] mb-8">
            Manual <br />
            <span className="text-indigo-600">Usuario</span> <br />
            <span className="text-gray-200">EdifiSaaS</span>
          </h2>
          <p className="text-gray-500 text-xl max-w-2xl leading-relaxed font-medium">
            Guía integral para administradores y juntas de condominio del sistema de control financiero inteligente.
          </p>
          
          <div className="flex flex-wrap gap-3 mt-10">
            {["Versión 1.0 — 2026", "Compatible Rascacielo", "Cloud Native"].map((tag, i) => (
              <div key={i} className="px-4 py-2 bg-white rounded-2xl border border-gray-100 text-[9px] font-black uppercase tracking-widest text-gray-400 shadow-sm">
                {tag}
              </div>
            ))}
          </div>

          <div className="absolute -top-10 -right-10 text-[15rem] font-black text-gray-100 -z-10 select-none opacity-50 hidden lg:block">
            01
          </div>
        </header>

        {/* SECCIÓN: INTRODUCCIÓN */}
        <section id="manual-intro" className="scroll-mt-32">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-1 px-0 bg-indigo-600 rounded-full"></div>
            <div className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Introducción</div>
          </div>
          <h3 className="text-4xl font-black text-gray-900 uppercase tracking-tighter mb-8 leading-none">
            ¿Qué es <span className="text-indigo-600">EdifiSaaS</span>?
          </h3>
          <div className="prose prose-indigo max-w-none text-gray-600 space-y-6 leading-relaxed text-lg font-medium">
            <p>
              Plataforma SaaS de control financiero diseñada para condominios que utilizan el <strong>sistema Rascacielo</strong>.
            </p>
            <p className="text-base text-gray-400">
              Actúa como una capa de inteligencia: extrae, procesa y presenta la información de manera visual y auditable en tiempo real.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mt-12">
            {[
              { icon: "🪞", title: "Espejo", desc: "Complementa a tu administradora. Lee datos de Rascacielo y genera alertas.", color: "indigo" },
              { icon: "🔄", title: "Sync", desc: "Sincronización diaria automática mediante hashing inteligente.", color: "blue" },
              { icon: "📊", title: "KPIs", desc: "Morosidad, flujo de caja e índices calculados al instante.", color: "indigo" },
              { icon: "🔐", title: "Roles", desc: "Permisos diferenciados para Admin, Junta y Propietarios.", color: "slate" },
            ].map((card, i) => (
              <div key={i} className="group p-8 bg-white border border-gray-50 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:border-indigo-100 transition-all duration-500">
                <div className="text-4xl mb-6 group-hover:scale-125 group-hover:-rotate-6 transition-transform duration-500">{card.icon}</div>
                <h4 className="font-black text-gray-900 uppercase tracking-tight mb-2 text-sm">{card.title}</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed font-bold uppercase">{card.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 p-8 bg-indigo-950 rounded-[3rem] text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
            <div className="absolute top-0 right-0 p-8 opacity-10 text-9xl">ℹ️</div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-indigo-400">Importante</h4>
            <p className="text-sm font-bold leading-relaxed relative z-10">
              La actualización depende de la información cargada por tu administradora. Si la administradora no sube datos, el sistema mostrará el último estado sincronizado.
            </p>
          </div>
        </section>

        {/* SECCIÓN: ROLES */}
        <section id="manual-roles" className="scroll-mt-32">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-1 px-0 bg-indigo-600 rounded-full"></div>
            <div className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Estructura</div>
          </div>
          <h3 className="text-4xl font-black text-gray-900 uppercase tracking-tighter mb-10 leading-none">
            Roles de <span className="text-indigo-600">Usuario</span>
          </h3>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { 
                icon: "👑", title: "Admin", desc: "Acceso Total", color: "indigo",
                perms: ["Configurar credenciales", "Gestionar tasa BCV", "Invitar miembros", "Sincronización manual"]
              },
              { 
                icon: "📋", title: "Junta", desc: "Supervisión", color: "blue",
                perms: ["Ver todos los módulos", "Consultar deudas", "Ver balance y KPIs"]
              },
              { 
                icon: "👁️", title: "Visor", desc: "Consulta", color: "slate",
                perms: ["Ver su propio recibo", "Ver resumen balance", "Ver dashboard"]
              }
            ].map((role, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-[3rem] p-8 shadow-sm hover:shadow-xl transition-all duration-500">
                <div className="text-5xl mb-6">{role.icon}</div>
                <h4 className="font-black text-gray-900 uppercase tracking-tight text-xl mb-1">{role.title}</h4>
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-8">{role.desc}</p>
                <div className="space-y-4">
                  {role.perms.map((p, j) => (
                    <div key={j} className="flex items-center gap-3 text-[10px] text-gray-500 font-black uppercase tracking-tight">
                      <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECCIÓN: MÓDULOS */}
        <section id="manual-modulos" className="scroll-mt-32">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-1 px-0 bg-indigo-600 rounded-full"></div>
            <div className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Funciones</div>
          </div>
          <h3 className="text-4xl font-black text-gray-900 uppercase tracking-tighter mb-10 leading-none">
            Módulos <span className="text-indigo-600">Clave</span>
          </h3>
          
          <div className="grid gap-4">
            {[
              { icon: "🏠", title: "Dashboard", color: "indigo", desc: "Resumen de fondos, deuda total y alertas." },
              { icon: "💰", title: "Recibos", color: "green", desc: "Control de morosidad y deudas en USD." },
              { icon: "🧾", title: "Egresos", color: "red", desc: "Historial de pagos a proveedores." },
              { icon: "🛠️", title: "Gastos", color: "orange", desc: "Anticipación del próximo recibo." },
              { icon: "⚖️", title: "Balance", color: "blue", desc: "Auditoría de caja y fondos de reserva." }
            ].map((m, i) => (
              <div key={i} className="group flex items-center gap-8 p-8 bg-white border border-gray-50 rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all duration-500">
                <div className="text-4xl group-hover:scale-110 transition-transform">{m.icon}</div>
                <div>
                  <h4 className="font-black text-gray-900 uppercase tracking-tight mb-1">{m.title}</h4>
                  <p className="text-xs text-gray-400 font-bold leading-relaxed">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECCIÓN: KPIs */}
        <section id="manual-kpis" className="scroll-mt-32">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-1 px-0 bg-indigo-600 rounded-full"></div>
            <div className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">KPIs</div>
          </div>
          <h3 className="text-4xl font-black text-gray-900 uppercase tracking-tighter mb-12 leading-none">
            Indicadores <span className="text-indigo-600">Financieros</span>
          </h3>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "Cobranza %", formula: "Mes / (Mes + Deuda)", s: ">50%", c: "green" },
              { title: "Morosidad %", formula: "Deuda / Patrimonio", s: "<15%", c: "red" },
              { title: "Cobertura %", formula: "Cobranza / Egresos", s: ">100%", c: "blue" }
            ].map((k, i) => (
              <div key={i} className="p-10 bg-white border-2 border-gray-50 rounded-[3rem] shadow-xl shadow-indigo-100/20 text-center relative group overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-2 bg-${k.c}-500`}></div>
                <h4 className="font-black text-gray-900 uppercase tracking-widest text-[10px] mb-6">{k.title}</h4>
                <div className="text-3xl font-black text-indigo-600 mb-2">{k.s}</div>
                <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-6 italic">{k.formula}</p>
                <div className="px-4 py-1.5 bg-gray-50 rounded-full text-[9px] font-black text-gray-400 uppercase tracking-widest">Estado Sano</div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ SIMPLE PARA MÓVIL */}
        <section id="manual-faq" className="scroll-mt-32 pb-20">
           <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-1 px-0 bg-indigo-600 rounded-full"></div>
            <div className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">FAQ</div>
          </div>
          <h3 className="text-4xl font-black text-gray-900 uppercase tracking-tighter mb-10 leading-none">
            Dudas <span className="text-indigo-600">Rápidas</span>
          </h3>
          <div className="space-y-4">
            {[
              { q: "¿Es compatible?", a: "Sí, con sistemas Rascacielo." },
              { q: "¿Datos seguros?", a: "Encriptación bancaria HTTPS." },
              { q: "¿Desde el celular?", a: "Sí, 100% responsive." }
            ].map((f, i) => (
              <div key={i} className="p-6 bg-white border border-gray-100 rounded-3xl">
                <h4 className="font-black text-indigo-950 mb-2 uppercase tracking-tight text-[10px]">Q: {f.q}</h4>
                <p className="text-xs text-gray-400 font-bold italic">A: {f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FOOTER MANUAL */}
        <footer className="text-center">
          <div className="inline-block px-8 py-4 bg-indigo-950 text-white rounded-[2rem] shadow-2xl">
            <div className="text-[10px] font-black uppercase tracking-[0.4em] mb-1">EdifiSaaS v1.0</div>
            <div className="text-[8px] font-bold text-indigo-400 uppercase">Financial Control System</div>
          </div>
        </footer>
      </div>
    </div>
  );
}
