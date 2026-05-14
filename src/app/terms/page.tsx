"use client";

import Link from "next/link";

export default function Terms() {
  return (
    <main className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">E</span>
            </div>
            <span className="font-bold text-lg text-gray-800 tracking-tighter uppercase italic">EdifiSaaS</span>
          </Link>
          <Link href="/" className="text-blue-600 font-bold text-sm hover:underline">Volver al inicio</Link>
        </div>
      </header>

      <section className="container mx-auto px-6 py-16 max-w-4xl">
        <div className="bg-white p-12 rounded-[3rem] shadow-xl border border-gray-100">
          <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tighter uppercase italic">Términos y Condiciones</h1>
          <p className="text-gray-500 mb-10 font-bold uppercase tracking-widest text-xs">Última actualización: 23 de abril de 2026</p>
          
          <div className="prose prose-blue max-w-none space-y-8 text-gray-700">
            <section>
              <h2 className="text-xl font-black text-blue-600 uppercase tracking-tight mb-4">1. Identificación del servicio</h2>
              <p className="font-medium leading-relaxed">
                <strong>EdifiSaaS</strong> (en adelante, “la Plataforma”) es un ecosistema digital de gestión administrativa, financiera y operativa diseñado específicamente para condominios, edificios y asociaciones de propietarios en el marco legal de la República Bolivariana de Venezuela. El uso de la Plataforma implica la aceptación total de estos términos.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-blue-600 uppercase tracking-tight mb-4">2. Capacidad legal</h2>
              <p className="font-medium leading-relaxed mb-4">Al utilizar este servicio, el usuario declara:</p>
              <ul className="list-disc pl-5 space-y-1 font-medium">
                <li>Ser mayor de edad (18+ años).</li>
                <li>Tener plena capacidad legal para contratar según el Código Civil venezolano.</li>
                <li>Actuar en representación de una Junta de Condominio debidamente constituida o bajo autorización expresa.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-black text-blue-600 uppercase tracking-tight mb-4">3. Objeto del servicio</h2>
              <p className="font-medium leading-relaxed mb-4">La Plataforma ofrece herramientas para:</p>
              <ul className="grid md:grid-cols-2 gap-4 font-medium">
                <li className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span> Gestión de unidades y residentes.
                </li>
                <li className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span> Control de pagos y recaudación.
                </li>
                <li className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span> Registro de gastos y egresos.
                </li>
                <li className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span> Generación de dashboards y reportes.
                </li>
              </ul>
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl font-bold text-sm text-center">
                Aviso: EdifiSaaS es una herramienta de apoyo y NO sustituye las obligaciones legales, contables o fiscales que el condominio deba cumplir ante las autoridades.
              </div>
            </section>

            <section>
              <h2 className="text-xl font-black text-blue-600 uppercase tracking-tight mb-4">4. Registro y cuenta</h2>
              <p className="font-medium leading-relaxed mb-4">El usuario registrado se compromete a:</p>
              <ul className="list-disc pl-5 space-y-2 font-medium">
                <li>Proporcionar información veraz y mantenerla actualizada.</li>
                <li>Resguardar la confidencialidad de sus credenciales de acceso.</li>
                <li>Notificar inmediatamente cualquier sospecha de acceso no autorizado.</li>
              </ul>
              <p className="mt-4 font-medium text-gray-500 italic">EdifiSaaS no se hace responsable por daños derivados del uso indebido o negligente de las cuentas de usuario.</p>
            </section>

            <section>
              <h2 className="text-xl font-black text-blue-600 uppercase tracking-tight mb-4">5. Uso permitido y prohibiciones</h2>
              <p className="font-medium leading-relaxed mb-4">Queda terminantemente prohibido:</p>
              <ul className="list-disc pl-5 space-y-1 font-medium">
                <li>El uso fraudulento, difamatorio o ilícito del sistema.</li>
                <li>Intentar vulnerar la seguridad o acceder a datos de otros condominios.</li>
                <li>Utilizar la plataforma para actividades prohibidas por la Ley Especial contra los Delitos Informáticos.</li>
                <li>Alterar, sabotear o realizar ingeniería inversa sobre el software.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-black text-blue-600 uppercase tracking-tight mb-4">6. Disponibilidad del servicio</h2>
              <p className="font-medium leading-relaxed">
                El servicio se ofrece bajo el modelo de <strong>"SaaS" (Software as a Service)</strong> según disponibilidad técnica. Si bien trabajamos por un uptime del 99.9%, el acceso puede interrumpirse temporalmente por mantenimientos programados o fallas externas de infraestructura (conectividad, electricidad, proveedores de nube).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-blue-600 uppercase tracking-tight mb-4">7. Propiedad intelectual</h2>
              <p className="font-medium leading-relaxed">
                Todo el software, código fuente, diseño gráfico, algoritmos y logotipos son propiedad exclusiva de EdifiSaaS. Se prohíbe la reproducción parcial o total, distribución o creación de obras derivadas sin consentimiento expreso por escrito.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-blue-600 uppercase tracking-tight mb-4">8. Responsabilidad del usuario</h2>
              <p className="font-medium leading-relaxed">
                El usuario es el único responsable de la <strong>integridad y veracidad</strong> de la información cargada en el sistema, así como de asegurar que dicho contenido cumple con las normativas locales (incluyendo la Ley de Propiedad Horizontal).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-blue-600 uppercase tracking-tight mb-4">9. Limitación de responsabilidad</h2>
              <p className="font-medium leading-relaxed mb-4">EdifiSaaS NO será responsable por:</p>
              <ul className="list-disc pl-5 space-y-1 font-medium">
                <li>Pérdida de datos resultante de causas externas fuera de nuestro control directo.</li>
                <li>Daños indirectos, accidentales o lucro cesante.</li>
                <li>Decisiones financieras o legales tomadas por el usuario con base en la información mostrada por el sistema.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-black text-blue-600 uppercase tracking-tight mb-4">10. Suspensión y terminación</h2>
              <p className="font-medium leading-relaxed">
                Nos reservamos el derecho de suspender o cancelar el acceso a la plataforma en caso de incumplimiento de estos términos, falta de pago del servicio, o uso indebido que ponga en riesgo la integridad del sistema.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-blue-600 uppercase tracking-tight mb-4">11. Legislación aplicable</h2>
              <p className="font-medium leading-relaxed">
                Este acuerdo se rige por las leyes vigentes de la <strong>República Bolivariana de Venezuela</strong>, con especial énfasis en el Código de Comercio, la Ley de Propiedad Horizontal y la Ley Especial contra los Delitos Informáticos.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-blue-600 uppercase tracking-tight mb-4">12. Resolución de conflictos</h2>
              <p className="font-medium leading-relaxed">
                Cualquier controversia se intentará resolver mediante negociación directa y amistosa. De no ser posible, las partes se someten a la jurisdicción de los tribunales competentes en la ciudad de Caracas, Venezuela.
              </p>
            </section>

            <section className="bg-gray-50 p-8 rounded-2xl border border-gray-200">
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-4 italic">13. Aviso de Propiedad Intelectual y Marcas de Terceros</h2>
              <p className="font-medium leading-relaxed text-sm">
                El nombre <strong>"Rascacielo"</strong> es una marca registrada y propiedad intelectual de sus respectivos creadores. EdifiSaaS no tiene relación laboral, societaria ni comercial directa con la empresa propietaria de dicho software, ni con las administradoras de condominios mencionadas en este sitio web. 
              </p>
              <p className="font-medium leading-relaxed text-sm mt-4">
                La mención de estos nombres se realiza exclusivamente con <strong>fines informativos y de referencia de compatibilidad técnica</strong>, para orientar al usuario final sobre el alcance de nuestra plataforma. EdifiSaaS es una solución independiente que procesa la información de consulta del usuario para ofrecer herramientas de análisis financiero adicionales, actuando únicamente como un visor inteligente de la información a la cual el usuario ya tiene acceso legítimo.
              </p>
            </section>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-white py-8 border-t border-gray-800">
        <div className="container mx-auto px-6 text-center text-gray-500 text-xs font-black uppercase tracking-widest">
          © 2026 EdifiSaaS. Gestión Inteligente de Condominios.
        </div>
      </footer>
    </main>
  );
}
