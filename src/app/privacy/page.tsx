"use client";

import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-20">
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="bg-white p-12 rounded-[3rem] shadow-xl border border-gray-100">
          <Link href="/" className="text-blue-600 font-bold flex items-center gap-2 mb-12 hover:gap-3 transition-all">
            Volver al Inicio
          </Link>
          
          <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tighter">Política de Privacidad</h1>
          <p className="text-gray-500 font-bold mb-12 uppercase tracking-widest text-xs">Última actualización: 23 de Abril de 2026</p>

          <div className="prose prose-blue max-w-none space-y-8 text-gray-700 leading-relaxed">
            <section className="space-y-4">
              <p className="text-lg font-medium">
                En EdifiSaaS, valoramos su privacidad. Esta política describe cómo manejamos la información en este sistema de control financiero para condominios.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">1. Información que Recopilamos</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Datos Personales:</strong> Nombre, correo y teléfono que usted proporciona al registrarse o contactarnos.</li>
                <li><strong>Datos de Gestión (Crowdsourcing):</strong> Datos ingresados manualmente por los usuarios autorizados.</li>
                <li><strong>Datos Técnicos:</strong> Registros de acceso y dirección IP para auditoría de seguridad.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">2. Uso y Divulgación</h2>
              <p>
                Los datos se usan para generar proyecciones estadisticas de su condominio con base a la informacion disponible en la pagina web de su administradora y alertas. No vendemos ni compartimos sus datos con fines comerciales. Utilizamos proveedores como Supabase, Make y Google Cloud para el funcionamiento técnico.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">3. Seguridad</h2>
              <p>
                Implementamos medidas técnicas para proteger los datos, aunque recordamos que ningún sistema en internet es 100% impenetrable.
              </p>
            </section>

            <div className="border-t pt-8 mt-12 text-sm italic text-gray-400">
              Privacy Policy - Last Updated: April 23, 2026
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
