import Link from "next/link";

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <span className="font-bold text-xl text-gray-800">CondominioSaaS</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Demo del Sistema</h1>
          <p className="text-gray-600">Explora las funcionalidades de CondominioSaaS</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Dashboards de Ejemplo</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 bg-blue-50 rounded-xl">
              <div className="text-3xl font-bold text-blue-600 mb-2">$125,430</div>
              <div className="text-gray-600">Balance Total</div>
              <div className="text-sm text-green-600 mt-2">↑ 12.5% vs mes anterior</div>
            </div>
            <div className="p-6 bg-green-50 rounded-xl">
              <div className="text-3xl font-bold text-green-600 mb-2">$45,200</div>
              <div className="text-gray-600">Ingresos del Mes</div>
              <div className="text-sm text-green-600 mt-2">↑ 8.3% vs mes anterior</div>
            </div>
            <div className="p-6 bg-orange-50 rounded-xl">
              <div className="text-3xl font-bold text-orange-600 mb-2">$18,750</div>
              <div className="text-gray-600">Egresos del Mes</div>
              <div className="text-sm text-red-600 mt-2">↓ 5.2% vs mes anterior</div>
            </div>
            <div className="p-6 bg-purple-50 rounded-xl">
              <div className="text-3xl font-bold text-purple-600 mb-2">24</div>
              <div className="text-gray-600">Movimientos Nuevos</div>
              <div className="text-sm text-blue-600 mt-2">Esta semana</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Últimos Movimientos</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">Recibo #1245 - Torre A</div>
                <div className="text-sm text-gray-500">10/04/2026</div>
              </div>
              <div className="text-green-600 font-semibold">+$450</div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">Mantenimiento Ascensor</div>
                <div className="text-sm text-gray-500">09/04/2026</div>
              </div>
              <div className="text-red-600 font-semibold">-$1,200</div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">Recibo #1244 - Torre B</div>
                <div className="text-sm text-gray-500">08/04/2026</div>
              </div>
              <div className="text-green-600 font-semibold">+$380</div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Link href="/register" className="inline-block bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition">
            Prueba Gratis por 30 Días
          </Link>
        </div>
      </div>
    </main>
  );
}