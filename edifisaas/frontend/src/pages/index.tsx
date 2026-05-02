import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">E</span>
            </div>
            <span className="font-bold text-xl text-gray-800">EdifiSaaS</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-gray-600 hover:text-blue-600 transition">Funcionalidades</a>
            <a href="#how-it-works" className="text-gray-600 hover:text-blue-600 transition">Cómo funciona</a>
            <Link to="/login" className="text-gray-600 hover:text-blue-600 transition">Iniciar Sesión</Link>
            <Link to="/register" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
              Prueba Gratis
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            🚀 30 días de prueba gratuita
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Gestión Financiera Inteligente v1.0.2<br />para Condominios
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Automatiza la descarga de recibos, egresos y gastos desde tu administradora.<br />
            Detecta movimientos nuevos y mantén el control total de tus finanzas.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition shadow-lg">
              Comenzar Prueba Gratis
            </Link>
            <Link to="/demo" className="bg-white text-gray-800 px-8 py-4 rounded-xl text-lg font-semibold border-2 border-gray-200 hover:border-blue-600 hover:text-blue-600 transition">
              Ver Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-6 py-20 bg-white">
        <h2 className="text-3xl font-bold text-center mb-12">Todo lo que necesitas</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: "📊", title: "Sincronización Automática", desc: "Descarga diaria de recibos, egresos y balance desde La Ideal C.A." },
            { icon: "🔍", title: "Detección Inteligente", desc: "Sistema de hashing SHA-256 para detectar solo movimientos nuevos." },
            { icon: "🔔", title: "Alertas en Tiempo Real", desc: "Notificaciones inmediatas sobre variaciones y gastos importantes." },
            { icon: "📈", title: "Dashboards Claros", desc: "Visualización completa del estado financiero del edificio." },
            { icon: "🔒", title: "Seguridad Total", desc: "Tus credenciales están encriptadas y protegidas." },
            { icon: "📧", title: "Reportes por Email", desc: "Resumen financiero enviado automáticamente cada día." }
          ].map((f, i) => (
            <div key={i} className="p-6 bg-gray-50 rounded-2xl hover:shadow-lg transition">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="font-semibold text-xl mb-2">{f.title}</h3>
              <p className="text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="container mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Cómo funciona</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            { step: "1", title: "Regístrate", desc: "Crea tu cuenta y vincula tu edificio con tu administradora." },
            { step: "2", title: "Conecta", desc: "Ingresa tus credenciales del portal de la administradora de forma segura." },
            { step: "3", title: "Monitorea", desc: "EdifiSaaS sincroniza automáticamente y te alerta de cualquier movimiento." }
          ].map((item, i) => (
            <div key={i} className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                {item.step}
              </div>
              <h3 className="font-semibold text-xl mb-2">{item.title}</h3>
              <p className="text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Final */}
      <section className="bg-blue-600 text-white py-20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-4">¿Listo para simplificar tu condominio?</h2>
          <p className="text-xl mb-8">Comienza hoy tu prueba gratuita de 30 días</p>
          <Link to="/register" className="inline-block bg-white text-blue-600 px-10 py-4 rounded-xl text-lg font-semibold hover:bg-gray-100">
            Registrarme Gratis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="container mx-auto px-6 text-center">
          <p className="text-lg font-semibold text-white mb-2">EdifiSaaS</p>
          <p>Gestión financiera inteligente para condominios</p>
        </div>
      </footer>
    </main>
  )
}
