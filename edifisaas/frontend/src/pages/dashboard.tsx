import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function DashboardPage() {
  const [buildingId] = useState(1) // Temporal - en producción viene del auth
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [alerts, setAlerts] = useState<any[]>([])
  const [balance, setBalance] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [dash, al, bal] = await Promise.all([
          api.getDashboard(buildingId),
          api.getAlerts(buildingId),
          api.getBalance(buildingId)
        ])
        setDashboardData(dash)
        setAlerts(Array.isArray(al) ? al : [])
        setBalance(Array.isArray(bal) ? bal : [])
      } catch (err) {
        console.error('Error cargando dashboard:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const result = await api.syncNow(buildingId)
      alert(`Sincronización completada. Nuevos registros: ${result.newReceipts + result.newExpenses + result.newGastos}`)
    } catch (err) {
      alert('Error durante la sincronización')
    } finally {
      setSyncing(false)
    }
  }

  const handleMarkRead = async (alertId: number) => {
    await api.markAlertAsRead(alertId)
    setAlerts(alerts.filter(a => a.id !== alertId))
  }

  // Preparar datos del gráfico
  const chartData = balance.slice(0, 6).reverse().map((b: any) => ({
    name: new Date(b.fecha).toLocaleDateString('es-VE', { month: 'short' }),
    Ingresos: b.ingresos_mes || 0,
    Egresos: b.egresos_mes || 0,
    Saldo: b.saldo || 0
  }))

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-5 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">E</div>
            <h1 className="text-2xl font-bold">EdifiSaaS</h1>
          </Link>
          <div className="flex items-center gap-6">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2 transition"
            >
              <span className={syncing ? 'animate-spin inline-block' : ''}>🔄</span>
              {syncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-10">
        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-600 mb-10">Resumen financiero de tu condominio</p>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white p-8 rounded-3xl shadow-sm border">
            <p className="text-gray-500 text-sm">Saldo Actual</p>
            <p className="text-4xl font-bold mt-2 text-blue-600">
              Bs. {Number(dashboardData?.saldoActual || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-sm border">
            <p className="text-gray-500 text-sm">Nuevos Movimientos</p>
            <p className="text-4xl font-bold mt-2 text-orange-500">{dashboardData?.newMovements || 0}</p>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-sm border">
            <p className="text-gray-500 text-sm">Última Sincronización</p>
            <p className="text-xl font-medium mt-2 text-gray-700">
              {dashboardData?.lastSync ? new Date(dashboardData.lastSync).toLocaleDateString('es-VE') : 'Nunca'}
            </p>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-sm border">
            <p className="text-gray-500 text-sm">Alertas Activas</p>
            <p className="text-4xl font-bold mt-2 text-red-500">{alerts.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Alertas */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border">
            <h2 className="text-xl font-semibold mb-6">Alertas Recientes</h2>
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p className="text-4xl mb-2">✅</p>
                <p>Sin alertas pendientes</p>
              </div>
            ) : (
              <div className="space-y-4">
                {alerts.map((alert: any) => (
                  <div key={alert.id} className={`flex items-start gap-3 p-4 rounded-2xl ${
                    alert.severity === 'error' ? 'bg-red-50' :
                    alert.severity === 'warning' ? 'bg-amber-50' : 'bg-blue-50'
                  }`}>
                    <span className="text-xl flex-shrink-0">
                      {alert.severity === 'error' ? '🚨' : alert.severity === 'warning' ? '⚠️' : 'ℹ️'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{alert.title}</p>
                      <p className="text-gray-600 text-xs mt-1">{alert.message}</p>
                    </div>
                    <button
                      onClick={() => handleMarkRead(alert.id)}
                      className="text-gray-400 hover:text-gray-600 text-xs flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Gráfico */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border">
            <h2 className="text-xl font-semibold mb-6">Evolución Mensual</h2>
            {chartData.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-4xl mb-2">📊</p>
                <p>Sin datos de historial. Ejecuta una sincronización.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: any) => `Bs. ${Number(value).toLocaleString('es-VE')}`} />
                  <Legend />
                  <Bar dataKey="Ingresos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Egresos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Accesos rápidos */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Recibos', icon: '📄', href: '#' },
            { label: 'Egresos', icon: '💸', href: '#' },
            { label: 'Gastos Comunes', icon: '🏢', href: '#' },
            { label: 'Tasa BCV', icon: '💱', href: '#' }
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition cursor-pointer text-center">
              <p className="text-3xl mb-2">{item.icon}</p>
              <p className="font-medium text-gray-700">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
