const API_BASE = import.meta.env.VITE_API_URL || '/api'

export const api = {
  // Auth (simulado - conectar con Supabase Auth en producción)
  login: async (email: string, password: string) => {
    // TODO: Conectar con Supabase Auth
    return { success: true, user: { id: 'user123', name: 'Juan Pérez' } }
  },

  register: async (data: any) => {
    return { success: true, buildingId: 1 }
  },

  // Sync
  syncNow: async (buildingId: number) => {
    const res = await fetch(`${API_BASE}/sync/ejecutar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buildingId })
    })
    return res.json()
  },

  // Dashboard
  getDashboard: async (buildingId: number) => {
    const res = await fetch(`${API_BASE}/dashboard?buildingId=${buildingId}`)
    return res.json()
  },

  // Movimientos
  getReceipts: async (buildingId: number) => {
    const res = await fetch(`${API_BASE}/sync/recibos?buildingId=${buildingId}`)
    return res.json()
  },

  getExpenses: async (buildingId: number) => {
    const res = await fetch(`${API_BASE}/sync/egresos?buildingId=${buildingId}`)
    return res.json()
  },

  getGastos: async (buildingId: number) => {
    const res = await fetch(`${API_BASE}/sync/gastos?buildingId=${buildingId}`)
    return res.json()
  },

  getBalance: async (buildingId: number) => {
    const res = await fetch(`${API_BASE}/sync/balance?buildingId=${buildingId}`)
    return res.json()
  },

  // Alertas
  getAlerts: async (buildingId: number) => {
    const res = await fetch(`${API_BASE}/alertas?buildingId=${buildingId}`)
    return res.json()
  },

  markAlertAsRead: async (alertId: number) => {
    await fetch(`${API_BASE}/alertas`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: alertId })
    })
  },

  // Tasa de cambio
  getExchangeRate: async () => {
    const res = await fetch(`${API_BASE}/tasa-cambio`)
    return res.json()
  },

  // Control diario
  getControlDiario: async (buildingId: number) => {
    const res = await fetch(`${API_BASE}/control-diario?buildingId=${buildingId}`)
    return res.json()
  }
}
