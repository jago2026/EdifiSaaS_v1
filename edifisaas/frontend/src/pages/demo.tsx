import { Link } from 'react-router-dom'

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Header simple */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">E</div>
            <span className="font-bold text-lg">EdifiSaaS</span>
          </Link>
          <Link to="/register" className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 text-sm">
            Prueba Gratis
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12">
        <h1 className="text-5xl font-bold text-center mb-4">Demo Interactiva</h1>
        <p className="text-center text-xl text-gray-600 mb-12">Mira cómo funciona EdifiSaaS en acción</p>

        {/* Dashboard simulado */}
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-semibold">Dashboard - Edificio Ejemplo</h2>
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">● Sincronizado</span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
            <div className="bg-blue-50 p-6 rounded-2xl text-center">
              <p className="text-3xl mb-2">💰</p>
              <p className="font-bold text-2xl text-blue-700">Bs. 124.850</p>
              <p className="text-sm text-gray-500 mt-1">Saldo Actual</p>
            </div>
            <div className="bg-green-50 p-6 rounded-2xl text-center">
              <p className="text-3xl mb-2">📥</p>
              <p className="font-bold text-2xl text-green-700">Bs. 48.230</p>
              <p className="text-sm text-gray-500 mt-1">Ingresos Mes</p>
            </div>
            <div className="bg-red-50 p-6 rounded-2xl text-center">
              <p className="text-3xl mb-2">📤</p>
              <p className="font-bold text-2xl text-red-700">Bs. 31.450</p>
              <p className="text-sm text-gray-500 mt-1">Egresos Mes</p>
            </div>
            <div className="bg-amber-50 p-6 rounded-2xl text-center">
              <p className="text-3xl mb-2">🔔</p>
              <p className="font-bold text-2xl text-amber-700">4</p>
              <p className="text-sm text-gray-500 mt-1">Alertas</p>
            </div>
          </div>

          {/* Movimientos recientes simulados */}
          <h3 className="font-semibold text-lg mb-4">Últimos movimientos detectados</h3>
          <div className="space-y-3">
            {[
              { tipo: 'Recibo', unidad: 'Apto 3B', monto: '+Bs. 850', fecha: '11/04/2026', color: 'green' },
              { tipo: 'Recibo', unidad: 'Apto 5A', monto: '+Bs. 850', fecha: '11/04/2026', color: 'green' },
              { tipo: 'Egreso', unidad: 'Electricidad', monto: '-Bs. 3.200', fecha: '10/04/2026', color: 'red' },
              { tipo: 'Egreso', unidad: 'Servicio Agua', monto: '-Bs. 1.500', fecha: '09/04/2026', color: 'red' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${item.color === 'green' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <div>
                    <p className="font-medium text-sm">{item.tipo} - {item.unidad}</p>
                    <p className="text-xs text-gray-400">{item.fecha}</p>
                  </div>
                </div>
                <span className={`font-bold ${item.color === 'green' ? 'text-green-600' : 'text-red-600'}`}>
                  {item.monto}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-12 space-y-4">
          <p className="text-gray-600 text-lg">¿Te gustó lo que viste? Comienza ahora con tu edificio real.</p>
          <Link to="/register" className="inline-block bg-blue-600 text-white px-10 py-4 rounded-2xl text-lg font-semibold hover:bg-blue-700 transition">
            Quiero probarlo de verdad →
          </Link>
        </div>
      </div>
    </main>
  )
}
