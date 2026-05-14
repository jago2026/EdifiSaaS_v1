"use client";

import Link from "next/link";

export default function Privacy() {
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
          <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tighter uppercase italic">Política de Privacidad</h1>
          <p className="text-gray-500 mb-10 font-bold uppercase tracking-widest text-xs">Última actualización: 23 de abril de 2023</p>
          
          <div className="prose prose-blue max-w-none space-y-8 text-gray-700">
            <section>
              <h2 className="text-xl font-black text-blue-600 uppercase tracking-tight mb-4">1. Responsable del tratamiento</h2>
              <p className="font-medium leading-relaxed">
                El responsable del tratamiento de datos es <strong>EdifiSaaS</strong>. Nos comprometemos a proteger la privacidad y seguridad de la información de nuestros usuarios en cumplimiento con las mejores prácticas y el marco legal aplicable.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-blue-600 uppercase tracking-tight mb-4">2. Datos recolectados</h2>
              <p className="mb-4 font-medium">Podemos recopilar y procesar los siguientes tipos de información:</p>
              <div className="grid md:grid-cols-1 gap-4">
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <h3 className="font-black text-gray-900 mb-2 uppercase text-sm tracking-wide">a) Datos personales</h3>
                  <ul className="list-disc pl-5 space-y-1 font-medium text-sm">
                    <li>Nombre y Apellido</li>
                    <li>Cédula o identificación fiscal</li>
                    <li>Teléfono de contacto / WhatsApp</li>
                    <li>Correo electrónico</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <h3 className="font-black text-gray-900 mb-2 uppercase text-sm tracking-wide">b) Datos operativos</h3>
                  <ul className="list-disc pl-5 space-y-1 font-medium text-sm">
                    <li>Información de unidades y propiedades del edificio</li>
                    <li>Registros de pagos, cuotas y transacciones</li>
                    <li>Documentos administrativos y estados financieros</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <h3 className="font-black text-gray-900 mb-2 uppercase text-sm tracking-wide">c) Datos técnicos</h3>
                  <ul className="list-disc pl-5 space-y-1 font-medium text-sm">
                    <li>Dirección IP y ubicación aproximada</li>
                    <li>Navegador y sistema operativo</li>
                    <li>Logs de actividad del sistema para auditoría</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-black text-blue-600 uppercase tracking-tight mb-4">3. Finalidad del tratamiento</h2>
              <p className="font-medium leading-relaxed mb-4">Los datos se utilizan exclusivamente para:</p>
              <ul className="space-y-2 font-medium">
                <li className="flex items-start gap-3"><span className="text-blue-600">●</span> Operar y mantener la funcionalidad de la plataforma.</li>
                <li className="flex items-start gap-3"><span className="text-blue-600">●</span> Facilitar la gestión administrativa y financiera del condominio.</li>
                <li className="flex items-start gap-3"><span className="text-blue-600">●</span> Mantener comunicación directa con los usuarios sobre el servicio.</li>
                <li className="flex items-start gap-3"><span className="text-blue-600">●</span> Garantizar la seguridad, integridad y auditoría de los registros.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-black text-blue-600 uppercase tracking-tight mb-4">4. Base legal (Venezuela)</h2>
              <p className="font-medium leading-relaxed">
                El tratamiento de datos se fundamenta en el <strong>consentimiento expreso</strong> del usuario al registrarse, la <strong>relación contractual</strong> para la prestación del servicio y el <strong>cumplimiento de obligaciones legales</strong> derivadas de la gestión de propiedad horizontal.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-blue-600 uppercase tracking-tight mb-4">5. Compartición de datos</h2>
              <p className="font-medium leading-relaxed mb-4">Los datos pueden compartirse únicamente con:</p>
              <ul className="space-y-2 font-medium">
                <li className="flex items-start gap-3"><span className="text-blue-600">●</span> <strong>Proveedores tecnológicos:</strong> Servicios de hosting, base de datos e infraestructura necesarios para la operación.</li>
                <li className="flex items-start gap-3"><span className="text-blue-600">●</span> <strong>Autoridades:</strong> Cuando sea estrictamente requerido por ley o mandamiento judicial.</li>
              </ul>
              <div className="mt-4 p-4 bg-blue-50 text-blue-800 rounded-xl font-black text-center text-sm uppercase tracking-widest">
                Importante: EdifiSaaS NO vende ni comercializa sus datos personales con terceros.
              </div>
            </section>

            <section>
              <h2 className="text-xl font-black text-blue-600 uppercase tracking-tight mb-4">6. Transferencias internacionales</h2>
              <p className="font-medium leading-relaxed">
                Al utilizar servicios de infraestructura global (ej. servidores en la nube), el usuario acepta la transferencia técnica de datos fuera de Venezuela, bajo estándares internacionales de seguridad adecuados.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-blue-600 uppercase tracking-tight mb-4">7. Seguridad de la información</h2>
              <p className="font-medium leading-relaxed mb-4">Aplicamos medidas de seguridad avanzadas, incluyendo:</p>
              <ul className="list-disc pl-5 space-y-1 font-medium">
                <li>Cifrado de datos en tránsito (SSL/TLS).</li>
                <li>Políticas estrictas de control de acceso.</li>
                <li>Monitoreo y logging de actividad sospechosa.</li>
              </ul>
              <p className="mt-4 text-xs italic text-gray-500 font-bold uppercase tracking-tighter">Nota: Aunque aplicamos los más altos estándares, ningún sistema de transmisión electrónica es 100% invulnerable.</p>
            </section>

            <section>
              <h2 className="text-xl font-black text-blue-600 uppercase tracking-tight mb-4">8. Derechos del usuario</h2>
              <p className="font-medium leading-relaxed mb-4">Usted tiene derecho a:</p>
              <ul className="list-disc pl-5 space-y-1 font-medium">
                <li>Acceder a sus datos personales almacenados.</li>
                <li>Rectificar información inexacta o incompleta.</li>
                <li>Solicitar la eliminación (cuando no existan obligaciones legales vigentes).</li>
                <li>Limitar u oponerse al tratamiento de ciertos datos.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-black text-blue-600 uppercase tracking-tight mb-4">9. Retención de datos</h2>
              <p className="font-medium leading-relaxed">
                Los datos se conservarán mientras exista una relación contractual activa y posteriormente durante los plazos legalmente exigidos por las normativas administrativas y tributarias venezolanas.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-blue-600 uppercase tracking-tight mb-4">10. Cookies</h2>
              <p className="font-medium leading-relaxed">
                Utilizamos cookies técnicas para mejorar la experiencia de usuario y realizar analíticas anónimas. Usted puede desactivarlas en la configuración de su navegador, aunque esto podría afectar ciertas funcionalidades.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-blue-600 uppercase tracking-tight mb-4">11. Menores de edad</h2>
              <p className="font-medium leading-relaxed">
                Nuestro servicio está dirigido exclusivamente a personas con capacidad legal de contratación y no está diseñado para menores de edad.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-blue-600 uppercase tracking-tight mb-4">12. Cambios en la política</h2>
              <p className="font-medium leading-relaxed">
                Podremos actualizar esta política en cualquier momento. Los cambios significativos serán notificados a través de la plataforma o vía correo electrónico.
              </p>
            </section>

            <section className="bg-gray-50 p-8 rounded-2xl border border-gray-200">
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-4 italic">13. Interoperabilidad y Acceso a Sistemas de Terceros</h2>
              <p className="font-medium leading-relaxed text-sm">
                EdifiSaaS permite la integración técnica con portales de administradoras externas (como aquellas que utilizan el sistema Rascacielo). El acceso a dicha información se realiza bajo la <strong>autorización expresa del usuario</strong> mediante el uso de sus propias credenciales. 
              </p>
              <p className="font-medium leading-relaxed text-sm mt-4">
                Aclaramos que EdifiSaaS no almacena credenciales para fines distintos a la sincronización técnica solicitada y no tiene acceso a modificar datos en los sistemas originales. La mención de marcas de terceros se hace con fines puramente informativos de compatibilidad, sin que ello implique afiliación alguna.
              </p>
            </section>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-white py-8 border-t border-gray-800">
        <div className="container mx-auto px-6 text-center text-gray-500 text-xs font-black uppercase tracking-widest">
          © 2026 EdifiSaaS. Transparencia y Control Financiero.
        </div>
      </footer>
    </main>
  );
}
