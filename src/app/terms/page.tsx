"use client";

import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-20">
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="bg-white p-12 rounded-[3rem] shadow-xl border border-gray-100">
          <Link href="/" className="text-blue-600 font-bold flex items-center gap-2 mb-12 hover:gap-3 transition-all">
            Volver al Inicio
          </Link>
          
          <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tighter">Descargo de Responsabilidad</h1>
          <p className="text-gray-500 font-bold mb-12 uppercase tracking-widest text-xs">Última actualización: 8 de Abril de 2026</p>

          <div className="prose prose-blue max-w-none space-y-8 text-gray-700 leading-relaxed">
            <section className="space-y-4">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">1. Exactitud de los Datos</h2>
              <p>
                EdifiSaaS es una herramienta de soporte basada en entrada manual de datos por parte de los usuarios y extraccion de datos existentes en la pagina web de su administradora. No garantizamos la exactitud de las cifras reportadas, ya que dependen de la veracidad y frecuencia del ingreso realizado por los usuarios y de lo cargado por su administradora en su pagina web.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">2. Responsabilidad Operativa</h2>
              <p>
                Las decisiones operativas financieras son responsabilidad exclusiva de las Juntas de Condominio. EdifiSaaS no se hace responsable por daños derivados de interpretaciones de los datos.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">3. Datos Externos</h2>
              <p>
                No tenemos control sobre el suministro de informacion de entes como su administradora. La disponibilidad de informacion y datos es ajena a nuestra plataforma técnica.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
