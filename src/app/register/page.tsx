"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Step = 1 | 2 | 3;

interface AccountData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface BuildingData {
  nombre: string;
  direccion: string;
  unidades: string;
}

interface IntegrationData {
  admin_nombre: string;
  admin_id: string;
  admin_secret: string;
  custom_domain?: string;
  url_login?: string;
  url_recibos?: string;
  url_recibo_mes?: string;
  url_egresos?: string;
  url_gastos?: string;
  url_balance?: string;
  url_alicuotas?: string;
}

interface Administradora {
  id: string;
  nombre: string;
  url_login: string;
  url_recibos: string;
  url_recibo_mes: string;
  url_egresos: string;
  url_gastos: string;
  url_balance: string;
  url_alicuotas: string;
}

const ADMIN_URLS: Record<string, any> = {
  "La Ideal C.A.": {
    url_login: "https://admlaideal.com.ve/condlin.php?r=1",
    url_recibos: "https://admlaideal.com.ve/condlin.php?r=5",
    url_egresos: "https://admlaideal.com.ve/condlin.php?r=21",
    url_gastos: "https://admlaideal.com.ve/condlin.php?r=3",
    url_balance: "https://admlaideal.com.ve/condlin.php?r=2",
  },
  "Administradora AC. Condominios, C.A.": {
    url_login: "https://www.admastridcarrasquel.com/condlin.php",
    url_recibos: "https://www.admastridcarrasquel.com/condlin.php?r=5",
    url_egresos: "https://www.admastridcarrasquel.com/condlin.php?r=21",
    url_gastos: "https://www.admastridcarrasquel.com/condlin.php?r=3",
    url_balance: "https://www.admastridcarrasquel.com/condlin.php?r=2",
  },
  "Administradora Elite": {
    url_login: "https://www.administradoraelite.com/control.php",
    url_recibos: "https://www.administradoraelite.com/condlin.php?r=5",
    url_egresos: "https://www.administradoraelite.com/condlin.php?r=21",
    url_gastos: "https://www.administradoraelite.com/condlin.php?r=3",
    url_balance: "https://www.administradoraelite.com/condlin.php?r=2",
  },
  "Intercanariven": {
    url_login: "https://www.intercanariven.com/control.php",
    url_recibos: "https://www.intercanariven.com/condlin.php?r=5",
    url_egresos: "https://www.intercanariven.com/condlin.php?r=21",
    url_gastos: "https://www.intercanariven.com/condlin.php?r=3",
    url_balance: "https://www.intercanariven.com/condlin.php?r=2",
  },
  "Administradora Actual, C.A.": {
    url_login: "https://www.admactual.com/control.php",
    url_recibos: "https://www.admactual.com/condlin.php?r=5",
    url_egresos: "https://www.admactual.com/condlin.php?r=21",
    url_gastos: "https://www.admactual.com/condlin.php?r=3",
    url_balance: "https://www.admactual.com/condlin.php?r=2",
  },
  "Condominios Chacao": {
    url_login: "https://condominioschacao.com/control.php",
    url_recibos: "https://condominioschacao.com/condlin.php?r=5",
    url_egresos: "https://condominioschacao.com/condlin.php?r=21",
    url_gastos: "https://condominioschacao.com/condlin.php?r=3",
    url_balance: "https://condominioschacao.com/condlin.php?r=2",
  },
  "Obelisco": {
    url_login: "https://www.obelisco.com.ve/control.php",
    url_recibos: "https://www.obelisco.com.ve/condlin.php?r=5",
    url_egresos: "https://www.obelisco.com.ve/condlin.php?r=21",
    url_gastos: "https://www.obelisco.com.ve/condlin.php?r=3",
    url_balance: "https://www.obelisco.com.ve/condlin.php?r=2",
  },
  "Administradora GCM": {
    url_login: "https://administradoragcm.com/empresa.htm/control.php",
    url_recibos: "https://administradoragcm.com/empresa.htm/condlin.php?r=5",
    url_egresos: "https://administradoragcm.com/empresa.htm/condlin.php?r=21",
    url_gastos: "https://administradoragcm.com/empresa.htm/condlin.php?r=3",
    url_balance: "https://administradoragcm.com/empresa.htm/condlin.php?r=2",
  },
};

function buildUrlsFromDomain(domain: string): any {
  const d = domain.trim();
  const base = d.startsWith("http") ? d : `https://${d}`;
  const cleanBase = base.endsWith("/") ? base.slice(0, -1) : base;
  return {
    url_login: `${cleanBase}/condlin.php?r=1`,
    url_recibos: `${cleanBase}/condlin.php?r=5`,
    url_egresos: `${cleanBase}/condlin.php?r=21`,
    url_gastos: `${cleanBase}/condlin.php?r=3`,
    url_balance: `${cleanBase}/condlin.php?r=2`,
  };
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [account, setAccount] = useState<AccountData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  
  const [building, setBuilding] = useState<BuildingData>({
    nombre: "",
    direccion: "",
    unidades: "",
  });
  
  const [integration, setIntegration] = useState<IntegrationData>({
    admin_nombre: "La Ideal C.A.",
    admin_id: "",
    admin_secret: "",
    custom_domain: "",
  });
  
  const [administradoras, setAdministradoras] = useState<Administradora[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  const handleAdminChange = (nombre: string) => {
    setIntegration({
      ...integration,
      admin_nombre: nombre,
      custom_domain: nombre === "Otra" ? integration.custom_domain : "",
    });
  };

  useEffect(() => {
    async function loadAdmins() {
      setLoadingAdmins(true);
      setError("");
      try {
        console.log("Fetching administradoras...");
        const res = await fetch("/api/admin/administradoras", { cache: 'no-store' });
        const data = await res.json();
        console.log("Administradoras loaded:", data);
        if (res.ok) {
          setAdministradoras(data.data || []);
        } else {
          console.error("Error from API:", data.error);
        }
      } catch (e) {
        console.error("Error loading admins", e);
      } finally {
        setLoadingAdmins(false);
      }
    }
    loadAdmins();
  }, []);

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (account.password !== account.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    
    if (account.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    
    setStep(2);
  };

  const handleBuildingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!building.nombre || !building.direccion || !building.unidades) {
      setError("Todos los campos son obligatorios");
      return;
    }
    
    setStep(3);
  };

  const handleIntegrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    // Build integration data with proper URLs
    let integrationData = { ...integration };
    
    if (integration.admin_nombre === "Otra" && integration.custom_domain) {
      integrationData = {
        ...integration,
        ...buildUrlsFromDomain(integration.custom_domain),
      };
    } else {
      // Intentar buscar en las administradoras dinámicas
      const selected = administradoras.find(a => a.nombre === integration.admin_nombre);
      if (selected) {
        integrationData = {
          ...integration,
          url_login: selected.url_login,
          url_recibos: selected.url_recibos,
          url_recibo_mes: selected.url_recibo_mes,
          url_egresos: selected.url_egresos,
          url_gastos: selected.url_gastos,
          url_balance: selected.url_balance,
        };
      } else if (ADMIN_URLS[integration.admin_nombre]) {
        // Fallback a las hardcoded por si acaso
        integrationData = {
          ...integration,
          ...ADMIN_URLS[integration.admin_nombre],
        };
      }
    }
    
    try {
      const clientMetadata = {
        browser: navigator.userAgent,
        localTime: new Date().toLocaleString("es-VE"),
        language: navigator.language,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
      };

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...account,
          ...building,
          ...integrationData,
          metadata: clientMetadata
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Error al registrar");
      }
      
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isStepActive = (s: Step) => {
    if (s === 1) return step === 1 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600";
    if (s === 2) return step === 2 ? "bg-blue-600 text-white" : step > 2 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600";
    return step === 3 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600";
  };

  const getStepLabel = (s: Step) => {
    if (s === 1) return { text: "Cuenta", active: step >= 1 };
    if (s === 2) return { text: "Edificio", active: step >= 2 };
    return { text: "Integración", active: step >= 3 };
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <span className="font-bold text-xl text-gray-800">CondominioSaaS</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Crea tu cuenta</h1>
          <p className="text-gray-600">Comienza tu prueba gratuita de 30 días</p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${isStepActive(s as Step)}`}>
                  {s}
                </div>
                {s < 3 && (
                  <div className={`w-full h-1 mx-4 ${step > s ? "bg-blue-600" : "bg-gray-200"}`} style={{ width: '80px' }}></div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span className={step >= 1 ? "text-blue-600 font-medium" : ""}>Cuenta</span>
            <span className={step >= 2 ? "text-blue-600 font-medium" : ""}>Edificio</span>
            <span className={step >= 3 ? "text-blue-600 font-medium" : ""}>Integración</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleAccountSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                    placeholder="Juan" 
                    value={account.firstName}
                    onChange={(e) => setAccount({ ...account, firstName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Apellido *</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                    placeholder="Pérez" 
                    value={account.lastName}
                    onChange={(e) => setAccount({ ...account, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Correo electrónico *</label>
                <input 
                  type="email" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  placeholder="juan@ejemplo.com" 
                  value={account.email}
                  onChange={(e) => setAccount({ ...account, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña *</label>
                <input 
                  type="password" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  placeholder="Mínimo 8 caracteres" 
                  value={account.password}
                  onChange={(e) => setAccount({ ...account, password: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar contraseña *</label>
                <input 
                  type="password" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  placeholder="Repite tu contraseña" 
                  value={account.confirmPassword}
                  onChange={(e) => setAccount({ ...account, confirmPassword: e.target.value })}
                  required
                />
              </div>
              <div className="flex gap-4 mt-8">
                <Link href="/" className="flex-1 px-6 py-3 bg-gray-100 text-gray-800 rounded-lg font-semibold hover:bg-gray-200 transition text-center">
                  Cancelar
                </Link>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Continuar
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleBuildingSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Edificio *</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  placeholder="Torre Central" 
                  value={building.nombre}
                  onChange={(e) => setBuilding({ ...building, nombre: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dirección *</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  placeholder="Av. Principal 123, Ciudad" 
                  value={building.direccion}
                  onChange={(e) => setBuilding({ ...building, direccion: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Número de Unidades/Apartamentos *</label>
                <input 
                  type="number" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  placeholder="24" 
                  value={building.unidades}
                  onChange={(e) => setBuilding({ ...building, unidades: e.target.value })}
                  required
                />
              </div>
              <div className="flex gap-4 mt-8">
                <button 
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-800 rounded-lg font-semibold hover:bg-gray-200 transition"
                >
                  Atrás
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Continuar
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleIntegrationSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Administradora</label>
                <select 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={integration.admin_nombre}
                  onChange={(e) => handleAdminChange(e.target.value)}
                >
                  {loadingAdmins ? (
                    <option value="">Cargando administradoras...</option>
                  ) : administradoras.length > 0 ? (
                    <>
                      <option value="">Seleccione una administradora</option>
                      {administradoras.map(adm => (
                        <option key={adm.id} value={adm.nombre}>{adm.nombre}</option>
                      ))}
                      <option value="Otra">Otra (Manual)</option>
                    </>
                  ) : (
                    <>
                      <option value="La Ideal C.A.">La Ideal C.A.</option>
                      <option value="Administradora AC. Condominios, C.A.">Administradora AC. Condominios, C.A.</option>
                      <option value="Administradora Elite">Administradora Elite</option>
                      <option value="Intercanariven">Intercanariven</option>
                      <option value="Administradora Actual, C.A.">Administradora Actual, C.A.</option>
                      <option value="Condominios Chacao">Condominios Chacao</option>
                      <option value="Obelisco">Obelisco</option>
                      <option value="Administradora GCM">Administradora GCM</option>
                      <option value="Otra">Otra (Manual)</option>
                    </>
                  )}
                </select>
                {(integration.admin_nombre === "Otra" || administradoras.some(a => a.nombre === integration.admin_nombre) || ADMIN_URLS[integration.admin_nombre]) && (
                  <p className="text-xs text-green-600 mt-1">✓ URLs pre-configuradas para {integration.admin_nombre}</p>
                )}
              </div>
              {integration.admin_nombre === "Otra" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dominio de tu Administradora</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                    placeholder="ejemplo: www.miadmin.com" 
                    value={integration.custom_domain}
                    onChange={(e) => setIntegration({ ...integration, custom_domain: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">Ingresa el dominio sin http:// ni trailing slash</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Clave de Acceso ({integration.admin_nombre})</label>
                <input 
                  type="password" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  placeholder="Tu clave de acceso (contraseña del apartamento)" 
                  value={integration.admin_secret}
                  onChange={(e) => setIntegration({ ...integration, admin_secret: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">Solo necesitas la contraseña que usas para entrar al sistema</p>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Nota:</strong> Las URLs de {integration.admin_nombre === "Otra" ? "tu administradora" : integration.admin_nombre} se pre-configurarán automáticamente. 
                  {(integration.admin_nombre === "La Ideal C.A." || integration.admin_nombre === "Administradora Elite") ? " Puedes sincronizar inmediatamente después de registrarte." : " Configura las URLs manualmente después."}
                </p>
              </div>
              <div className="flex gap-4 mt-8">
                <button 
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-800 rounded-lg font-semibold hover:bg-gray-200 transition"
                >
                  Atrás
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {loading ? "Creando..." : "Completar Registro"}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-sm text-gray-600 mt-6">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-blue-600 font-medium hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}