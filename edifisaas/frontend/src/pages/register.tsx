import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
    buildingName: '', buildingAddress: '', buildingUnits: '',
    adminProvider: 'laideal', adminUsername: '', adminPassword: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleNext = () => setStep(step + 1)
  const handleBack = () => setStep(step - 1)

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await new Promise(r => setTimeout(r, 1500))
      alert('¡Registro exitoso! Redirigiendo al dashboard...')
      navigate('/dashboard')
    } catch (err) {
      alert('Error en el registro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl p-10">
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold">E</div>
            <span className="text-3xl font-bold">EdifiSaaS</span>
          </Link>
          <h1 className="text-3xl font-bold">
            {step === 1 ? 'Paso 1 de 3 - Tus datos' : step === 2 ? 'Paso 2 de 3 - Tu edificio' : 'Paso 3 de 3 - Administradora'}
          </h1>
          <div className="flex gap-2 justify-center mt-4">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-2 w-16 rounded-full ${s <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>

        {/* Paso 1: Datos personales */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <input name="firstName" placeholder="Nombre" value={formData.firstName} onChange={handleChange} className="w-full p-4 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input name="lastName" placeholder="Apellido" value={formData.lastName} onChange={handleChange} className="w-full p-4 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <input name="email" type="email" placeholder="Correo electrónico" value={formData.email} onChange={handleChange} className="w-full p-4 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input name="password" type="password" placeholder="Contraseña" value={formData.password} onChange={handleChange} className="w-full p-4 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input name="confirmPassword" type="password" placeholder="Confirmar contraseña" value={formData.confirmPassword} onChange={handleChange} className="w-full p-4 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        )}

        {/* Paso 2: Datos del edificio */}
        {step === 2 && (
          <div className="space-y-6">
            <input name="buildingName" placeholder="Nombre del edificio" value={formData.buildingName} onChange={handleChange} className="w-full p-4 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input name="buildingAddress" placeholder="Dirección completa" value={formData.buildingAddress} onChange={handleChange} className="w-full p-4 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input name="buildingUnits" type="number" placeholder="Número de unidades" value={formData.buildingUnits} onChange={handleChange} className="w-full p-4 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        )}

        {/* Paso 3: Integración con administradora */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-2xl text-sm text-blue-700">
              Tus credenciales se almacenan encriptadas con AES-256. Nunca las compartimos.
            </div>
            <select name="adminProvider" value={formData.adminProvider} onChange={handleChange} className="w-full p-4 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="laideal">La Ideal C.A.</option>
              <option value="otra">Otra administradora</option>
            </select>
            <input name="adminUsername" placeholder="Usuario de la administradora" value={formData.adminUsername} onChange={handleChange} className="w-full p-4 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input name="adminPassword" type="password" placeholder="Contraseña de la administradora" value={formData.adminPassword} onChange={handleChange} className="w-full p-4 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        )}

        <div className="flex gap-4 mt-10">
          {step > 1 && (
            <button onClick={handleBack} className="flex-1 py-4 border border-gray-300 rounded-2xl font-semibold hover:bg-gray-50">
              Atrás
            </button>
          )}
          <button
            onClick={step === 3 ? handleSubmit : handleNext}
            disabled={loading}
            className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Procesando...' : step === 3 ? 'Completar Registro' : 'Continuar →'}
          </button>
        </div>

        <p className="text-center mt-6 text-sm text-gray-600">
          ¿Ya tienes cuenta? <Link to="/login" className="text-blue-600 font-medium">Inicia sesión</Link>
        </p>
      </div>
    </main>
  )
}
