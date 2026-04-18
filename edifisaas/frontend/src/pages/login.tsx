import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

export default function LoginPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // TODO: Conectar con Supabase Auth real
      await new Promise(r => setTimeout(r, 1000))
      navigate('/dashboard')
    } catch (err) {
      alert('Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 justify-center mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold">E</div>
            <span className="text-3xl font-bold">EdifiSaaS</span>
          </Link>
          <h2 className="text-2xl font-semibold mt-2">Iniciar Sesión</h2>
          <p className="text-gray-500 mt-1">Bienvenido de vuelta</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <input
            type="email"
            placeholder="Correo electrónico"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full p-4 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full p-4 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-semibold hover:bg-blue-700 disabled:opacity-70 transition"
          >
            {loading ? 'Iniciando sesión...' : 'Ingresar'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-600">
          ¿No tienes cuenta? <Link to="/register" className="text-blue-600 font-medium">Regístrate gratis</Link>
        </p>
      </div>
    </main>
  )
}
