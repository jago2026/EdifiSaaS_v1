"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, ComposedChart
} from "recharts";

type Tab = "resumen" | "movimientos" | "recibos" | "egresos" | "gastos" | "balance" | "alicuotas" | "alertas" | "kpis" | "configuracion" | "manual" | "junta" | "ingresos" | "informes";

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface Building {
  id: string;
  nombre: string;
  direccion: string;
  unidades: number;
  plan: string;
  admin_id: string | null;
  admin_secret: string | null;
  admin_nombre: string | null;
  url_login: string | null;
  url_recibos: string | null;
  url_recibo_mes: string | null;
  url_egresos: string | null;
  url_gastos: string | null;
  url_balance: string | null;
  cron_enabled?: boolean;
  cron_time?: string;
  cron_frequency?: string;
  ultima_sincronizacion: string | null;
  sync_recibos?: boolean;
  sync_egresos?: boolean;
  sync_gastos?: boolean;
  sync_alicuotas?: boolean;
  sync_balance?: boolean;
  email_junta?: string | null;
}

interface Movement {
  id: string;
  fecha: string;
  descripcion: string;
  monto: number;
  monto_usd?: number;
  tipo: "pago" | "gasto" | "egreso" | "recibo";
  unidad?: string;
  unidad_apartamento?: string;
}

interface Recibo {
  unidad: string;
  propietario: string;
  num_recibos: number;
  deuda: number;
  deuda_usd: number;
  mes?: string;
}

interface Egreso {
  id: string;
  fecha: string;
  beneficiario: string;
  descripcion: string;
  monto: number;
  monto_usd: number;
  tasa_bcv: number;
  isTotal?: boolean;
}

interface Balance {
  mes: string;
  fecha: string;
  saldo_disponible: number;
  saldo_disponible_usd: number;
  cobranza_mes: number;
  cobranza_mes_usd: number;
  gastos_facturados: number;
  gastos_facturados_usd: number;
  fondo_reserva: number;
  fondo_reserva_usd: number;
  total_por_cobrar: number;
  total_por_cobrar_usd: number;
  fondo_prestaciones?: number;
  fondo_prestaciones_usd?: number;
  fondo_trabajos_varios?: number;
  fondo_trabajos_varios_usd?: number;
  fondo_intereses?: number;
  fondo_intereses_usd?: number;
  fondo_diferencial_cambiario?: number;
  fondo_diferencial_cambiario_usd?: number;
  saldo_anterior?: number;
  saldo_anterior_usd?: number;
  recibos_mes?: number;
  recibos_mes_usd?: number;
}

interface MovimientoManual {
  id: string;
  fecha_corte: string;
  saldo_final: number;
  saldo_final_usd: number;
  comparado: boolean;
  saldo_segun_administradora: number;
}

interface Alicuota {
  unidad: string;
  propietario: string;
  alicuota: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("resumen");
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState<Building | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [recibos, setRecibos] = useState<Recibo[]>([]);
  const [loadingRecibos, setLoadingRecibos] = useState(false);
  const [movimientosDia, setMovimientosDia] = useState<any[]>([]);
  const [loadingMovimientosDia, setLoadingMovimientosDia] = useState(false);
  const [gastosSummary, setGastosSummary] = useState({ monto: 0, cantidad: 0 });
  const [egresos, setEgresos] = useState<Egreso[]>([]);
  const [loadingEgresos, setLoadingEgresos] = useState(false);
  const [gastos, setGastos] = useState<any[]>([]);
  const [loadingGastos, setLoadingGastos] = useState(false);
  const [egresosSummary, setEgresosSummary] = useState({ monto: 0, cantidad: 0 });
  const [ingresosSummary, setIngresosSummary] = useState({ monto: 0, cantidad: 0 });
  const [ingresosData, setIngresosData] = useState<any[]>([]);
  const [loadingIngresos, setLoadingIngresos] = useState(false);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [mesesBalance, setMesesBalance] = useState<string[]>([]);
  const [selectedMesBalance, setSelectedMesBalance] = useState<string>("");
  const [mesesEgresos, setMesesEgresos] = useState<string[]>([]);
  const [selectedMesEgresos, setSelectedMesEgresos] = useState<string>("");
  const [mesesGastos, setMesesGastos] = useState<string[]>([]);
  const [selectedMesGastos, setSelectedMesGastos] = useState<string>("");
  const [mesesRecibos, setMesesRecibos] = useState<string[]>([]);
  const [selectedMesRecibos, setSelectedMesRecibos] = useState<string>("");
  const [movimientosManual, setMovimientosManual] = useState<MovimientoManual[]>([]);
  const [loadingManual, setLoadingManual] = useState(false);
  const [alicuotas, setAlicuotas] = useState<Alicuota[]>([]);
  const [loadingAlicuotas, setLoadingAlicuotas] = useState(false);
  const [alicuotasCount, setAlicuotasCount] = useState(0);
  const [alicuotaSum, setAlicuotaSum] = useState(0);
  const [alicuotaWarning, setAlicuotaWarning] = useState<any>(null);
  const [alicuotaTotalWarning, setAlicuotaTotalWarning] = useState<string | null>(null);
  const [showUnitsAlert, setShowUnitsAlert] = useState(false);
  const [kpisData, setKpisData] = useState<any>({ egresos: [], gastos: [], balances: [], movimientos: [] });
  const [loadingKpis, setLoadingKpis] = useState(false);
  const [junta, setJunta] = useState<any[]>([]);
  const [loadingJunta, setLoadingJunta] = useState(false);
  const [sincronizaciones, setSincronizaciones] = useState<any[]>([]);
  const [loadingSincronizaciones, setLoadingSincronizaciones] = useState(false);
  const [alertas, setAlertas] = useState<any[]>([]);
  const [loadingAlertas, setLoadingAlertas] = useState(false);
  const [tasaBCV, setTasaBCV] = useState({ dolar: 0, euro: 0, fecha: "" });
  const [loadingTasa, setLoadingTasa] = useState(false);
  const [selectedMes, setSelectedMes] = useState<string>("");
  const [selectedUnidad, setSelectedUnidad] = useState<string>("");
  const [reciboDetalle, setReciboDetalle] = useState<any[]>([]);
  const [loadingRecibo, setLoadingRecibo] = useState(false);
  const [reciboGeneral, setReciboGeneral] = useState<any[]>([]);
  const [loadingReciboGeneral, setLoadingReciboGeneral] = useState(false);
  const [syncMes, setSyncMes] = useState("");
  const [syncing, setSyncing] = useState(false);

  const loadReciboGeneral = async () => {
    if (!building?.id) return;
    setLoadingReciboGeneral(true);
    setReciboGeneral([]); // Limpiar estado previo
    try {
      const mes = selectedMesRecibos || "";
      const url = `/api/recibo-detalle?edificioId=${building.id}&unidad=GENERAL${mes ? `&mes=${mes}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setReciboGeneral(data.detalles || []);
      }
    } catch (error) {
      console.error("Error loading general receipt:", error);
    } finally {
      setLoadingReciboGeneral(false);
    }
  };
  const [syncingMes, setSyncingMes] = useState(false);
  const [informeFecha, setInformeFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [informeData, setInformeData] = useState<any>(null);
  const [loadingInforme, setLoadingInforme] = useState(false);
  const [gastosRecurrentes, setGastosRecurrentes] = useState<any[]>([]);
  const [loadingGastosRecurrentes, setLoadingGastosRecurrentes] = useState(false);
  const [evolucionRecurrentes, setEvolucionRecurrentes] = useState<any[]>([]);

  const loadInforme = async () => {
    if (!building?.id || !informeFecha) return;
    setLoadingInforme(true);
    setInformeData(null);
    try {
      const res = await fetch(`/api/informes?action=resumen_fecha&edificioId=${building.id}&fecha=${informeFecha}`);
      const data = await res.json();
      if (res.ok) {
        setInformeData(data.data || "not_found");
      }
    } catch (error) {
      console.error("Error loading informe:", error);
    } finally {
      setLoadingInforme(false);
    }
  };

  const loadGastosRecurrentes = async () => {
    if (!building?.id) return;
    setLoadingGastosRecurrentes(true);
    try {
      const res = await fetch(`/api/informes?action=gastos_recurrentes&edificioId=${building.id}`);
      const data = await res.json();
      if (res.ok) {
        setGastosRecurrentes(data.data || []);
      }
    } catch (error) {
      console.error("Error loading recurrentes:", error);
    } finally {
      setLoadingGastosRecurrentes(false);
    }
  };

  const loadEvolucionRecurrentes = async () => {
    if (!building?.id) return;
    try {
      const res = await fetch(`/api/informes?action=evolucion_recurrentes&edificioId=${building.id}`);
      const data = await res.json();
      if (res.ok) {
        setEvolucionRecurrentes(data.data || []);
      }
    } catch (error) {
      console.error("Error loading evolucion:", error);
    }
  };

  const updateRecurrente = async (codigo: string, descripcion: string, activo: boolean, categoria: string) => {
    if (!building?.id) return;

    console.log(`Updating recurrente: ${codigo}, activo: ${activo}, categoria: ${categoria}`);

    // Guardar estado previo por si falla
    const previousGastos = [...gastosRecurrentes];

    // Actualización optimista local
    setGastosRecurrentes(prev =>
      prev.map(g => g.codigo === codigo ? { ...g, activo, categoria } : g)
    );

    try {
      const res = await fetch("/api/informes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_recurrentes",
          edificioId: building.id,
          data: { codigo, descripcion, activo, categoria }
        })
      });

      if (!res.ok) {
        throw new Error("Failed to update on server");
      }

      console.log("Update successful on server");
    } catch (error) {
      console.error("Error updating recurrente:", error);
      // Revertir en caso de error
      setGastosRecurrentes(previousGastos);
    }
  };

  const [editConfig, setEditConfig] = useState({
    admin_id: "",
    admin_secret: "",
    admin_nombre: "La Ideal C.A.",
    url_login: "",
    url_recibos: "",
    url_recibo_mes: "",
    url_egresos: "",
    url_gastos: "",
    url_balance: "",
    cron_enabled: true,
    cron_time: "05:00",
    cron_frequency: "diaria",
    email_junta: "",
    sync_recibos: true,
    sync_egresos: true,
    sync_gastos: true,
    sync_alicuotas: true,
    sync_balance: true,
    unidades: 0,
  });

  useEffect(() => {
    if (building) {
      setEditConfig(prev => ({
        ...prev,
        admin_id: building.admin_id || "",
        admin_secret: building.admin_secret || "",
        admin_nombre: building.admin_nombre || "La Ideal C.A.",
        url_login: building.url_login || "",
        url_recibos: building.url_recibos || "",
        url_recibo_mes: building.url_recibo_mes || "",
        url_egresos: building.url_egresos || "",
        url_gastos: building.url_gastos || "",
        url_balance: building.url_balance || "",
        cron_enabled: building.cron_enabled !== false,
        cron_time: building.cron_time || "05:00",
        cron_frequency: building.cron_frequency || "diaria",
        email_junta: building.email_junta || "",
        sync_recibos: building.sync_recibos !== false,
        sync_egresos: building.sync_egresos !== false,
        sync_gastos: building.sync_gastos !== false,
        sync_alicuotas: building.sync_alicuotas !== false,
        sync_balance: building.sync_balance !== false,
        unidades: building.unidades || 0,
      }));
    }
  }, [building]);

  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");

  const sendEmailToJunta = async (testMode: boolean = false) => {
    if (!building?.id) return;
    setSendingEmail(true);
    setEmailMessage("");
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edificioId: building.id, testMode }),
      });
      const data = await res.json();
      if (res.ok) {
        setEmailMessage(testMode ? "✅ Email de prueba enviado satisfactoriamente" : "✅ Informe enviado a la junta satisfactoriamente");
      } else {
        setEmailMessage(`❌ Error: ${data.error}`);
      }
    } catch (error: any) {
      setEmailMessage(`❌ Error: ${error.message}`);
    } finally {
      setSendingEmail(false);
    }
  };

  const sendWhatsappReportToJunta = async () => {
    if (!building?.id) return;
    setSendingEmail(true);
    setEmailMessage("");
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edificioId: building.id, action: "whatsapp_report" }),
      });
      const data = await res.json();
      if (res.ok) {
        setEmailMessage("✅ Reporte estilo WhatsApp enviado satisfactoriamente");
      } else {
        setEmailMessage(`❌ Error: ${data.error}`);
      }
    } catch (error: any) {
      setEmailMessage(`❌ Error: ${error.message}`);
    } finally {
      setSendingEmail(false);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/login");
        const data = await res.json();
        if (res.ok && data.user) {
          setUser(data.user);
          const resBuilding = await fetch("/api/dashboard");
          const dataBuilding = await resBuilding.json();
          if (resBuilding.ok && dataBuilding.building) {
            setBuilding(dataBuilding.building);
          } else {
            router.push("/login");
          }
        } else {
          router.push("/login");
        }
      } catch (error) {
        console.error("Auth check error:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  const loadMovements = async () => {
    if (!building?.id) return;
    setLoadingMovements(true);
    try {
      const currentMes = new Date().toISOString().substring(0, 7);
      const res = await fetch(`/api/movimientos-all?edificioId=${building.id}&mes=${currentMes}`);
      const data = await res.json();
      if (res.ok && data.movimientos) {
        setMovements(data.movimientos);
      }
    } catch (error) {
      console.error("Error loading movements:", error);
    } finally {
      setLoadingMovements(false);
    }
  };

  useEffect(() => {
    if (activeTab === "ingresos" && building?.id) {
      loadIngresosData();
    }
    if (activeTab === "movimientos" && building?.id) {
      loadMovements();
      loadMovimientosDia();
    }
    if (activeTab === "recibos" && building?.id) {
      loadRecibos();
      loadReciboGeneral();
      if (!selectedMesRecibos) {
        loadMovimientosDia();
      } else {
        setMovimientosDia([]);
      }
    }
    if (activeTab === "egresos" && building?.id) {
      loadEgresos();
    }
    if (activeTab === "gastos" && building?.id) {
      loadGastos();
    }
    if (activeTab === "balance" && building?.id) {
      loadBalance();
    }
    if (activeTab === "alicuotas" && building?.id) {
      loadAlicuotas();
    }
    if (activeTab === "manual" && building?.id) {
      loadMovimientosManual();
    }
    if (activeTab === "kpis" && building?.id) {
      loadKpis();
    }
    if ((activeTab as string) === "informes" && building?.id) {
      loadInforme();
      loadGastosRecurrentes();
      loadEvolucionRecurrentes();
    }
    if (activeTab === "junta" && building?.id) {
      loadJunta();
    }
    if (activeTab === "alertas" && building?.id) {
      loadSincronizaciones();
    }
  }, [activeTab, building?.id]);

  const loadRecibos = async () => {
    if (!building?.id) return;
    setLoadingRecibos(true);
    setRecibos([]); // Limpiar estado previo
    try {
      const url = new URL(`/api/recibos`, window.location.origin);
      url.searchParams.append("edificioId", building.id);
      if (selectedMesRecibos) url.searchParams.append("mes", selectedMesRecibos);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (res.ok) {
        setRecibos(data.recibos || []);
        if (data.mesesDisponibles) {
          setMesesRecibos(data.mesesDisponibles);
        }
      }
    } catch (error) {
      console.error("Error loading recibos:", error);
    } finally {
      setLoadingRecibos(false);
    }
  };

  const loadMovimientosDia = async () => {
    if (!building?.id) return;
    setLoadingMovimientosDia(true);
    try {
      const res = await fetch(`/api/movimientos-dia?edificioId=${building.id}`);
      const data = await res.json();
      if (res.ok && data.movimientos) {
        setMovimientosDia(data.movimientos);
      }
    } catch (error) {
      console.error("Error loading daily movements:", error);
    } finally {
      setLoadingMovimientosDia(false);
    }
  };

  const loadEgresos = async () => {
    if (!building?.id) return;
    setLoadingEgresos(true);
    setEgresos([]); // Limpiar estado previo
    try {
      const url = new URL(`/api/egresos`, window.location.origin);
      url.searchParams.append("edificioId", building.id);
      if (selectedMesEgresos) url.searchParams.append("mes", selectedMesEgresos);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (res.ok && data.egresos) {
        setEgresos(data.egresos);
        if (data.mesesDisponibles) {
          setMesesEgresos(data.mesesDisponibles);
        }
      }
    } catch (error) {
      console.error("Error loading egresos:", error);
    } finally {
      setLoadingEgresos(false);
    }
  };

  const loadEgresosSummary = async () => {
    if (!building?.id) return;
    try {
      const res = await fetch(`/api/egresos-summary?edificioId=${building.id}`);
      const data = await res.json();
      if (res.ok) {
        setEgresosSummary(data);
      }
    } catch (error) {
      console.error("Error loading egresos summary:", error);
    }
  };

  const loadIngresosSummary = async () => {
    if (!building?.id) return;
    try {
      const res = await fetch(`/api/ingresos-summary?edificioId=${building.id}`);
      const data = await res.json();
      if (res.ok) {
        setIngresosSummary(data);
      }
    } catch (error) {
      console.error("Error loading ingresos summary:", error);
    }
  };

  const loadIngresosData = async () => {
    if (!building?.id) return;
    setLoadingIngresos(true);
    try {
      const res = await fetch(`/api/ingresos?edificioId=${building.id}`);
      const data = await res.json();
      if (res.ok && data.pagos) {
        setIngresosData(data.pagos);
      }
    } catch (error) {
      console.error("Error loading ingresos data:", error);
    } finally {
      setLoadingIngresos(false);
    }
  };

  const loadBalance = async () => {
    if (!building?.id) return;
    setLoadingBalance(true);
    try {
      const url = new URL(`/api/balance`, window.location.origin);
      url.searchParams.append("edificioId", building.id);
      if (selectedMesBalance) url.searchParams.append("mes", selectedMesBalance);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (res.ok) {
        setBalance(data.balance || null);
        if (data.mesesDisponibles) {
          setMesesBalance(data.mesesDisponibles);
        }
      }
    } catch (error) {
      console.error("Error loading balance:", error);
    } finally {
      setLoadingBalance(false);
    }
  };

  const loadAlicuotas = async () => {
    if (!building?.id) return;
    setLoadingAlicuotas(true);
    try {
      const res = await fetch(`/api/alicuotas?edificioId=${building.id}`);
      const data = await res.json();
      if (res.ok && data.alicuotas) {
        setAlicuotas(data.alicuotas);
        setAlicuotasCount(data.count || 0);
        setAlicuotaSum(data.alicuotaSum || 0);
        setAlicuotaWarning(data.validation);
        setAlicuotaTotalWarning(data.totalWarning);
        if (data.count !== building.unidades) {
          setShowUnitsAlert(true);
        }
      }
    } catch (error) {
      console.error("Error loading alicuotas:", error);
    } finally {
      setLoadingAlicuotas(false);
    }
  };

  const loadMovimientosManual = async () => {
    if (!building?.id) return;
    setLoadingManual(true);
    try {
      const res = await fetch(`/api/movimientos-manual?edificioId=${building.id}`);
      const data = await res.json();
      if (res.ok && data.movimientos) {
        setMovimientosManual(data.movimientos);
      }
    } catch (error) {
      console.error("Error loading movements manual:", error);
    } finally {
      setLoadingManual(false);
    }
  };

  const loadKpis = async () => {
    if (!building?.id) return;
    setLoadingKpis(true);
    try {
      const res = await fetch(`/api/kpis?edificioId=${building.id}`);
      const data = await res.json();
      if (res.ok) {
        setKpisData(data);
      }
    } catch (error) {
      console.error("Error loading KPIs:", error);
    } finally {
      setLoadingKpis(false);
    }
  };

  const loadJunta = async () => {
    if (!building?.id) return;
    setLoadingJunta(true);
    try {
      const res = await fetch(`/api/junta?edificioId=${building.id}`);
      const data = await res.json();
      if (res.ok) {
        setJunta(data.junta || []);
      }
    } catch (error) {
      console.error("Error loading junta:", error);
    } finally {
      setLoadingJunta(false);
    }
  };

  const loadSincronizaciones = async () => {
    if (!building?.id) return;
    setLoadingSincronizaciones(true);
    try {
      const res = await fetch(`/api/sincronizaciones?edificioId=${building.id}`);
      const data = await res.json();
      if (res.ok && data.sincronizaciones) {
        setSincronizaciones(data.sincronizaciones);
      }
      
      const resAlert = await fetch(`/api/alertas?edificioId=${building.id}`);
      const dataAlert = await resAlert.json();
      if (resAlert.ok && dataAlert.alertas) {
        setAlertas(dataAlert.alertas);
      }
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoadingSincronizaciones(false);
    }
  };

  const loadGastosSummary = async () => {
    if (!building?.id) return;
    try {
      const res = await fetch(`/api/gastos-summary?edificioId=${building.id}`);
      const data = await res.json();
      if (res.ok) {
        setGastosSummary(data);
      }
    } catch (error) {
      console.error("Error loading gastos summary:", error);
    }
  };

  const loadGastos = async () => {
    if (!building?.id) return;
    setLoadingGastos(true);
    setGastos([]); // Limpiar estado previo
    try {
      const url = new URL(`/api/gastos`, window.location.origin);
      url.searchParams.append("edificioId", building.id);
      if (selectedMesGastos) url.searchParams.append("mes", selectedMesGastos);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (res.ok) {
        setGastos(data.gastos || []);
        if (data.mesesDisponibles) {
          setMesesGastos(data.mesesDisponibles);
        }
      }
    } catch (error) {
      console.error("Error loading gastos:", error);
    } finally {
      setLoadingGastos(false);
    }
  };

  const updateAdminAndUrls = (adminName: string) => {
    let urls = {
      url_login: '',
      url_recibos: '',
      url_recibo_mes: '',
      url_egresos: '',
      url_gastos: '',
      url_balance: '',
    };

    if (adminName === "La Ideal C.A.") {
      urls = {
        url_login: 'https://admlaideal.com.ve/condlin.php?r=1',
        url_recibos: 'https://admlaideal.com.ve/condlin.php?r=5',
        url_recibo_mes: 'https://admlaideal.com.ve/condlin.php?r=4',
        url_egresos: 'https://admlaideal.com.ve/condlin.php?r=21',
        url_gastos: 'https://admlaideal.com.ve/condlin.php?r=3',
        url_balance: 'https://admlaideal.com.ve/condlin.php?r=2',
      };
    } else if (adminName === "Admastridcarrasquel" || adminName === "Administradora AC. Condominios, C.A.") {
      urls = {
        url_login: 'https://www.admastridcarrasquel.com/condlin.php',
        url_recibos: 'https://www.admastridcarrasquel.com/condlin.php?r=5',
        url_recibo_mes: 'https://www.admastridcarrasquel.com/condlin.php?r=4',
        url_egresos: 'https://www.admastridcarrasquel.com/condlin.php?r=21',
        url_gastos: 'https://www.admastridcarrasquel.com/condlin.php?r=3',
        url_balance: 'https://www.admastridcarrasquel.com/condlin.php?r=2',
      };
    } else if (adminName === "Administradora Elite") {
      urls = {
        url_login: 'https://www.administradoraelite.com/control.php',
        url_recibos: 'https://www.administradoraelite.com/condlin.php?r=5',
        url_recibo_mes: 'https://www.administradoraelite.com/condlin.php?r=4',
        url_egresos: 'https://www.administradoraelite.com/condlin.php?r=21',
        url_gastos: 'https://www.administradoraelite.com/condlin.php?r=3',
        url_balance: 'https://www.administradoraelite.com/condlin.php?r=2',
      };
    } else if (adminName === "Intercanar" || adminName === "Intercanariven") {
      urls = {
        url_login: 'https://www.intercanariven.com/control.php',
        url_recibos: 'https://www.intercanariven.com/condlin.php?r=5',
        url_recibo_mes: 'https://www.intercanariven.com/condlin.php?r=4',
        url_egresos: 'https://www.intercanariven.com/condlin.php?r=21',
        url_gastos: 'https://www.intercanariven.com/condlin.php?r=3',
        url_balance: 'https://www.intercanariven.com/condlin.php?r=2',
      };
    } else if (adminName === "Admactual" || adminName === "Administradora Actual, C.A.") {
      urls = {
        url_login: 'https://www.admactual.com/control.php',
        url_recibos: 'https://www.admactual.com/condlin.php?r=5',
        url_recibo_mes: 'https://www.admactual.com/condlin.php?r=4',
        url_egresos: 'https://www.admactual.com/condlin.php?r=21',
        url_gastos: 'https://www.admactual.com/condlin.php?r=3',
        url_balance: 'https://www.admactual.com/condlin.php?r=2',
      };
    } else if (adminName === "Condominios Chacao") {
      urls = {
        url_login: 'https://condominioschacao.com/control.php',
        url_recibos: 'https://condominioschacao.com/condlin.php?r=5',
        url_recibo_mes: 'https://condominioschacao.com/condlin.php?r=4',
        url_egresos: 'https://condominioschacao.com/condlin.php?r=21',
        url_gastos: 'https://condominioschacao.com/condlin.php?r=3',
        url_balance: 'https://condominioschacao.com/condlin.php?r=2',
      };
    } else if (adminName === "Obelisco") {
      urls = {
        url_login: 'https://www.obelisco.com.ve/condlin.php?r=1',
        url_recibos: 'https://www.obelisco.com.ve/condlin.php?r=5',
        url_recibo_mes: 'https://www.obelisco.com.ve/condlin.php?r=4',
        url_egresos: 'https://www.obelisco.com.ve/condlin.php?r=21',
        url_gastos: 'https://www.obelisco.com.ve/condlin.php?r=3',
        url_balance: 'https://www.obelisco.com.ve/condlin.php?r=2',
      };
    } else if (adminName === "Administradora GCM") {
      urls = {
        url_login: 'https://administradoragcm.com/empresa.htm/control.php',
        url_recibos: 'https://administradoragcm.com/empresa.htm/condlin.php?r=5',
        url_recibo_mes: 'https://administradoragcm.com/empresa.htm/condlin.php?r=4',
        url_egresos: 'https://administradoragcm.com/empresa.htm/condlin.php?r=21',
        url_gastos: 'https://administradoragcm.com/empresa.htm/condlin.php?r=3',
        url_balance: 'https://administradoragcm.com/empresa.htm/condlin.php?r=2',
      };
    }

    setEditConfig(prev => ({
      ...prev,
      admin_nombre: adminName,
      ...urls
    }));
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    setSyncMessage("");
    console.log("Config being saved:", editConfig);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editConfig,
          userId: user?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al guardar");
      }
      setBuilding(data.building);
      setSyncMessage("✅ Configuración guardada satisfactoriamente");
      loadAlicuotas();
      setTimeout(() => setActiveTab("resumen"), 1500);
    } catch (error: any) {
      setSyncMessage(`❌ Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncMessage("");
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: user?.id,
          mes: syncMes || undefined
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSyncMessage(`✅ Sincronización exitosa: ${data.message}`);
        loadEgresos();
        loadGastos();
        loadBalance();
        loadAlicuotas();
        loadMovements();
        loadMovimientosDia();
        loadSincronizaciones();
        loadGastosSummary();
        loadEgresosSummary();
        loadIngresosSummary();
      } else {
        setSyncMessage(`❌ Error: ${data.error}`);
      }
    } catch (error: any) {
      setSyncMessage(`❌ Error: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const runMaintenance = async () => {
    if (maintenanceLoading) return;
    setMaintenanceLoading(true);
    setMaintenanceMessage("");
    try {
      const res = await fetch("/api/debug-supabase");
      const data = await res.json();
      if (res.ok) {
        setMaintenanceMessage(`✅ Mantenimiento completado satisfactoriamente`);
      } else {
        setMaintenanceMessage(`❌ Error: ${data.error}`);
      }
    } catch (error: any) {
      setMaintenanceMessage(`❌ Error: ${error.message}`);
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const formatBs = (num: number | undefined) => {
    return (num || 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatUsd = (num: number | undefined) => {
    return (num || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getDayLabel = (dateStr: string) => {
    const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const d = new Date(dateStr + 'T12:00:00');
    return days[d.getDay()];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando plataforma...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header Fijo */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-2 rounded-lg text-white font-black text-xl tracking-tighter">SaaS</div>
            <div>
              <h1 className="text-sm font-black text-gray-900 uppercase tracking-tight leading-none">{building?.nombre || "Cargando..."}</h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase mt-1 tracking-widest">Dashboard de Control Financiero</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:block text-right">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Usuario Conectado</p>
              <p className="text-xs font-black text-gray-700 uppercase">{user?.first_name} {user?.last_name}</p>
            </div>
            <Link href="/logout" className="bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-600 p-2 rounded-lg transition-all border border-gray-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {/* Tabs Superiores */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-30">
        <div className="max-w-[1600px] mx-auto px-4">
          <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar py-2">
            {(["resumen", "movimientos", "ingresos", "egresos", "gastos", "recibos", "balance", "alicuotas", "alertas", "kpis", "informes", "manual", "junta", "configuracion"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeTab === tab 
                    ? "bg-blue-600 text-white shadow-md shadow-blue-100" 
                    : "text-gray-400 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                {tab === "resumen" ? "Resumen" : 
                 tab === "movimientos" ? "Sincronizado" :
                 tab === "ingresos" ? "Ingresos" :
                 tab === "egresos" ? "Egresos" :
                 tab === "gastos" ? "Gastos" :
                 tab === "recibos" ? "Recibos" :
                 tab === "balance" ? "Balance" :
                 tab === "alicuotas" ? "Alicuotas" :
                 tab === "alertas" ? "Alertas" :
                 tab === "kpis" ? "KPIs" :
                 tab === "informes" ? "Informes" :
                 tab === "manual" ? "Manual" :
                 tab === "junta" ? "Junta" : "Config"}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto p-4 md:p-6">
        {activeTab === "resumen" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* KPI Cards Superiores */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 group hover:border-blue-500 transition-all cursor-pointer" onClick={() => setActiveTab("balance")}>
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-blue-50 p-2 rounded-xl text-blue-600 font-bold text-xs uppercase tracking-widest">Saldo Disponible</div>
                  <div className="text-blue-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-black text-gray-900 tracking-tight mb-1">Bs. {formatBs(balance?.saldo_disponible)}</div>
                <div className="text-sm font-bold text-blue-600 uppercase tracking-widest">$ {formatUsd(balance?.saldo_disponible_usd)} USD</div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 group hover:border-green-500 transition-all cursor-pointer" onClick={() => setActiveTab("ingresos")}>
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-green-50 p-2 rounded-xl text-green-600 font-bold text-xs uppercase tracking-widest">Ingresos del Mes</div>
                  <div className="text-green-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-black text-gray-900 tracking-tight mb-1">Bs. {formatBs(ingresosSummary.monto)}</div>
                <div className="text-sm font-bold text-green-600 uppercase tracking-widest">{ingresosSummary.cantidad} Transacciones</div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 group hover:border-red-500 transition-all cursor-pointer" onClick={() => setActiveTab("egresos")}>
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-red-50 p-2 rounded-xl text-red-600 font-bold text-xs uppercase tracking-widest">Egresos del Mes</div>
                  <div className="text-red-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-black text-gray-900 tracking-tight mb-1">Bs. {formatBs(egresosSummary.monto)}</div>
                <div className="text-sm font-bold text-red-600 uppercase tracking-widest">{egresosSummary.cantidad} Transacciones</div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 group hover:border-orange-500 transition-all cursor-pointer" onClick={() => setActiveTab("recibos")}>
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-orange-50 p-2 rounded-xl text-orange-600 font-bold text-xs uppercase tracking-widest">Deuda Total</div>
                  <div className="text-orange-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-black text-gray-900 tracking-tight mb-1">Bs. {formatBs(recibos.reduce((acc, r) => acc + r.deuda, 0))}</div>
                <div className="text-sm font-bold text-orange-600 uppercase tracking-widest">$ {formatUsd(recibos.reduce((acc, r) => acc + r.deuda_usd, 0))} USD</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Gráfico Principal */}
              <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Evoluci&oacute;n del Saldo</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Comparativa Ingresos vs Egresos (Bol&iacute;vares)</p>
                  </div>
                </div>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={kpisData.balances} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b', fontWeight: 'bold'}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b', fontWeight: 'bold'}} tickFormatter={(val) => `Bs.${(val/1000).toFixed(0)}k`} />
                      <Tooltip 
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                        formatter={(val: number) => [`Bs. ${formatBs(val)}`, "Saldo"]}
                      />
                      <Area type="monotone" dataKey="saldo_disponible" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSaldo)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Sidebar Resumen */}
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 border-b border-gray-50 pb-4">Detalle de Fondos (USD)</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-100">
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Reserva</span>
                      <span className="text-sm font-black text-blue-900">$ {formatUsd(balance?.fondo_reserva_usd)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-orange-50 border border-orange-100">
                      <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Intereses Morat.</span>
                      <span className="text-sm font-black text-orange-900">$ {formatUsd(balance?.fondo_intereses_usd)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Dif. Cambiario</span>
                      <span className="text-sm font-black text-indigo-900">$ {formatUsd(balance?.fondo_diferencial_cambiario_usd)}</span>
                    </div>
                    <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
                      <span className="text-xs font-black text-gray-900 uppercase tracking-tighter">Total Capital Disponible:</span>
                      <span className="text-lg font-black text-blue-600">$ {formatUsd((balance?.saldo_disponible_usd || 0) + (balance?.fondo_reserva_usd || 0) + (balance?.fondo_intereses_usd || 0) + (balance?.fondo_diferencial_cambiario_usd || 0))}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-2xl shadow-lg text-white">
                  <h3 className="text-xs font-black uppercase tracking-widest mb-4 opacity-60">Sincronizaci&oacute;n Autom&aacute;tica</h3>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-[10px] font-black uppercase tracking-widest">Sistema Online</span>
                    </div>
                    <span className="text-[10px] font-bold opacity-40 uppercase">{building?.ultima_sincronizacion ? new Date(building.ultima_sincronizacion).toLocaleString() : "Sin registros"}</span>
                  </div>
                  <button 
                    onClick={() => setActiveTab("configuracion")}
                    className="w-full bg-white/10 hover:bg-white/20 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-white/10"
                  >
                    Actualizar Ahora
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "movimientos" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 uppercase tracking-tight">Movimientos Sincronizados</h2>
                  <p className="text-xs text-gray-500 font-medium italic">Datos obtenidos directamente del portal de la administradora</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={loadMovements} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-blue-600" title="Refrescar">
                    <span className={loadingMovements ? "animate-spin inline-block" : ""}>🔄</span>
                  </button>
                </div>
              </div>

              {loadingMovements ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-400 font-medium italic animate-pulse">Consultando base de datos...</p>
                </div>
              ) : movements.length === 0 ? (
                <p className="text-center py-10 text-gray-500 font-medium uppercase text-xs tracking-widest italic border-2 border-dashed border-gray-100 rounded-xl">
                  No hay movimientos registrados para el mes actual.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <div className="text-[10px] font-black text-gray-400 mb-4 uppercase tracking-widest flex items-center justify-between px-2">
                    <span>Lista de Transacciones</span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">{movements.length} REGISTROS</span>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 text-left border-b border-gray-100">
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Descripci&oacute;n</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Unidad</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Monto Bs.</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Equiv. USD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {movements.map((mov, idx) => (
                        <tr key={`${mov.id}-${idx}`} className="hover:bg-blue-50/30 transition-colors group">
                          <td className="px-4 py-3 text-xs font-bold text-gray-500">{mov.fecha}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                              mov.tipo === "pago" || mov.tipo === "recibo" ? "bg-green-100 text-green-700" :
                              mov.tipo === "gasto" ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"
                            }`}>
                              {mov.tipo}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs font-bold text-gray-700 group-hover:text-blue-700 uppercase">{mov.descripcion}</td>
                          <td className="px-4 py-3 text-xs font-black text-gray-400">{mov.unidad_apartamento || mov.unidad || "-"}</td>
                          <td className={`px-4 py-3 text-xs font-black text-right ${
                            mov.tipo === "pago" || mov.tipo === "recibo" ? "text-green-600" : "text-red-600"
                          }`}>
                            {mov.tipo === "pago" || mov.tipo === "recibo" ? "+" : "-"}Bs. {formatBs(mov.monto)}
                          </td>
                          <td className="px-4 py-3 text-xs font-bold text-gray-500 text-right group-hover:text-gray-900 transition-colors">
                            $ {formatUsd(mov.monto_usd || (tasaBCV.dolar > 0 ? mov.monto / tasaBCV.dolar : 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "recibos" && (
          <div className="space-y-6">
            {/* Solo mostrar el bloque del recibo si se ha seleccionado un mes específico */}
            {selectedMesRecibos && selectedMesRecibos !== "" && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in slide-in-from-top duration-300">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 uppercase tracking-tight">Visualizaci&oacute;n de Recibo de Condominio</h2>
                    <p className="text-xs text-gray-500 font-medium">Resumen detallado de gastos del mes {selectedMesRecibos}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {building?.url_recibo_mes && (
                      <a
                        href={`${building.url_recibo_mes}${selectedMesRecibos ? `&combo=${selectedMesRecibos}` : ""}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors flex items-center gap-1.5"
                      >
                        <span>📄</span> PDF RECIBO
                      </a>
                    )}
                    <button onClick={loadReciboGeneral} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-blue-600" title="Refrescar Detalle">
                      <span className={loadingReciboGeneral ? "animate-spin inline-block" : ""}>🔄</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 text-left border-b border-gray-100">
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">C&oacute;digo</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Descripci&oacute;n del Concepto</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Monto (Bs.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {loadingReciboGeneral ? (
                        <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400 text-xs font-bold animate-pulse">CARGANDO DETALLE DEL RECIBO...</td></tr>
                      ) : reciboGeneral.length > 0 ? (
                        <>
                          {/* Eliminando duplicados por código en el renderizado */}
                          {(() => {
                            const uniqueItems: any[] = [];
                            const seenCodes = new Set();
                            reciboGeneral.forEach(item => {
                              if (!seenCodes.has(item.codigo)) {
                                seenCodes.add(item.codigo);
                                uniqueItems.push(item);
                              }
                            });
                            
                            return (
                              <>
                                {uniqueItems.map((item) => (
                                  <tr key={`${item.codigo}`} className="hover:bg-blue-50/30 transition-colors group">
                                    <td className="px-4 py-3 text-xs font-mono font-bold text-blue-600">{item.codigo}</td>
                                    <td className="px-4 py-3 text-xs font-bold text-gray-700 group-hover:text-blue-700 uppercase">{item.descripcion}</td>
                                    <td className="px-4 py-3 text-xs font-black text-gray-900 text-right">{Number(item.monto).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
                                  </tr>
                                ))}
                                <tr className="bg-blue-50/50">
                                  <td colSpan={2} className="px-4 py-3 text-xs font-black text-blue-800 text-right uppercase tracking-widest">Total Gastos del Mes:</td>
                                  <td className="px-4 py-3 text-sm font-black text-blue-600 text-right underline decoration-double">Bs. {uniqueItems.reduce((sum: number, i: any) => sum + Number(i.monto), 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
                                </tr>
                              </>
                            );
                          })()}
                        </>
                      ) : (
                        <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400 text-xs font-bold uppercase tracking-widest italic">Sincroniza los datos para visualizar el detalle del recibo.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-100">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 uppercase tracking-tight">Relaci&oacute;n de Recibos Pendientes</h2>
                  <p className="text-xs text-gray-500 font-medium">Detalle de deudas por apartamento</p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={selectedMesRecibos}
                    onChange={(e) => {
                      setSelectedMesRecibos(e.target.value);
                      setTimeout(() => {
                        loadRecibos();
                        if (e.target.value) loadReciboGeneral();
                        else setReciboGeneral([]);
                      }, 100);
                    }}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold bg-white focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                  >
                    <option value="">Mes Actual (Online)</option>
                    {mesesRecibos.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <button onClick={loadRecibos} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-blue-600" title="Refrescar">
                    <span className={loadingRecibos ? "animate-spin inline-block" : ""}>🔄</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-left border-b border-gray-100">
                      <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Unidad</th>
                      <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Propietario</th>
                      <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">#Recibos</th>
                      <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Deuda USD</th>
                      <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Deuda Bs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loadingRecibos ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-xs font-bold animate-pulse">Sincronizando con administradora...</td></tr>
                    ) : recibos.length > 0 ? (
                      <>
                        {recibos.map((rec: any, idx: number) => (
                          <tr key={`${rec.unidad}-${idx}`} className="hover:bg-gray-50/50 transition-colors group">
                            <td className="px-4 py-3 text-xs font-black text-blue-600">{rec.unidad}</td>
                            <td className="px-4 py-3 text-[11px] font-bold text-gray-600 group-hover:text-gray-900 uppercase truncate max-w-[200px]">{rec.propietario}</td>
                            <td className="px-4 py-3 text-xs text-center"><span className={`px-2 py-0.5 rounded-full font-black ${rec.num_recibos > 2 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>{rec.num_recibos}</span></td>
                            <td className="px-4 py-3 text-xs font-black text-gray-900 text-right">${(rec.deuda_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                            <td className="px-4 py-3 text-xs font-black text-gray-900 text-right">Bs.{(rec.deuda || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                        <tr className="bg-orange-50/50">
                          <td colSpan={2} className="px-4 py-3 text-[10px] font-black text-orange-800 text-right uppercase tracking-widest">Total Deuda Condominios:</td>
                          <td className="px-4 py-3 text-xs font-black text-orange-600 text-center">{recibos.reduce((sum, r) => sum + Number(r.num_recibos || 0), 0)}</td>
                          <td className="px-4 py-3 text-sm font-black text-orange-600 text-right decoration-double underline">${recibos.reduce((sum, r) => sum + Number(r.deuda_usd || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-sm font-black text-orange-600 text-right decoration-double underline">Bs.{recibos.reduce((sum, r) => sum + Number(r.deuda || 0), 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      </>
                    ) : (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-xs font-bold uppercase tracking-widest italic">No hay recibos pendientes registrados.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "ingresos" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 uppercase tracking-tight">Historial de Ingresos</h2>
                  <p className="text-xs text-gray-500 font-medium italic">Pagos de condominio detectados en cartola bancaria</p>
                </div>
                <button onClick={loadIngresosData} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-blue-600" title="Refrescar">
                  <span className={loadingIngresos ? "animate-spin inline-block" : ""}>🔄</span>
                </button>
              </div>

              {loadingIngresos ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-400 font-medium italic animate-pulse">Obteniendo pagos...</p>
                </div>
              ) : ingresosData.length === 0 ? (
                <p className="text-center py-10 text-gray-500 font-medium uppercase text-xs tracking-widest italic border-2 border-dashed border-gray-100 rounded-xl">
                  No hay pagos registrados para este edificio.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 text-left border-b border-gray-100">
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha Pago</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Unidad</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Referencia</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Monto Bs.</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Equiv. USD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {ingresosData.map((pago, idx) => (
                        <tr key={`${pago.id}-${idx}`} className="hover:bg-green-50/30 transition-colors">
                          <td className="px-4 py-3 text-xs font-bold text-gray-500">{pago.fecha_pago}</td>
                          <td className="px-4 py-3 text-xs font-black text-blue-600">{pago.unidad}</td>
                          <td className="px-4 py-3 text-xs font-bold text-gray-700 uppercase truncate max-w-[200px]">{pago.referencia}</td>
                          <td className="px-4 py-3 text-xs font-black text-green-600 text-right">Bs. {formatBs(pago.monto)}</td>
                          <td className="px-4 py-3 text-xs font-bold text-gray-500 text-right">$ {formatUsd(pago.monto_usd || (tasaBCV.dolar > 0 ? pago.monto / tasaBCV.dolar : 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "egresos" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 uppercase tracking-tight">Egresos Generales</h2>
                </div>
                <div className="flex items-center gap-3">
                  {mesesEgresos.length > 0 && (
                    <select
                      value={selectedMesEgresos}
                      onChange={(e) => {
                        setSelectedMesEgresos(e.target.value);
                        setTimeout(() => loadEgresos(), 100);
                      }}
                      className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold bg-white focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                    >
                      <option value="">Mes Actual</option>
                      {mesesEgresos.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  )}
                  <button onClick={loadEgresos} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-blue-600" title="Refrescar">
                    <span className={loadingEgresos ? "animate-spin inline-block" : ""}>🔄</span>
                  </button>
                </div>
              </div>

              {loadingEgresos ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-400 font-medium italic animate-pulse">Obteniendo egresos...</p>
                </div>
              ) : egresos.length === 0 ? (
                <p className="text-center py-10 text-gray-500 font-medium uppercase text-xs tracking-widest italic border-2 border-dashed border-gray-100 rounded-xl">
                  No hay egresos registrados para este mes.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 text-left border-b border-gray-100">
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Beneficiario</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Operación</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">USD</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Bolivares</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {egresos.map((eg, idx) => (
                        <tr key={`${eg.id}-${idx}`} className={`hover:bg-red-50/30 transition-colors ${eg.isTotal ? 'bg-gray-100 font-black' : ''}`}>
                          <td className="px-4 py-3 text-xs font-bold text-gray-500">{eg.fecha}</td>
                          <td className="px-4 py-3 text-xs font-black text-gray-900 uppercase truncate max-w-[250px]">{eg.beneficiario}</td>
                          <td className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">{eg.descripcion}</td>
                          <td className="px-4 py-3 text-xs font-bold text-gray-600 text-right">$ {formatUsd(eg.monto_usd)}</td>
                          <td className="px-4 py-3 text-xs font-black text-red-600 text-right">Bs. {formatBs(eg.monto)}</td>
                        </tr>
                      ))}
                      <tr className="bg-red-50/50 font-black">
                        <td colSpan={3} className="px-4 py-3 text-xs text-right uppercase tracking-widest">Total General:</td>
                        <td className="px-4 py-3 text-xs text-right">$ {formatUsd(egresos.reduce((sum, e) => sum + Number(e.monto_usd), 0))}</td>
                        <td className="px-4 py-3 text-xs text-right text-red-600">Bs. {formatBs(egresos.reduce((sum, e) => sum + Number(e.monto), 0))}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "gastos" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 uppercase tracking-tight">Gastos del Edificio</h2>
                </div>
                <div className="flex items-center gap-3">
                  {mesesGastos.length > 0 && (
                    <select
                      value={selectedMesGastos}
                      onChange={(e) => {
                        setSelectedMesGastos(e.target.value);
                        setTimeout(() => loadGastos(), 100);
                      }}
                      className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold bg-white focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                    >
                      <option value="">Mes Actual</option>
                      {mesesGastos.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  )}
                  <button onClick={loadGastos} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-blue-600" title="Refrescar">
                    <span className={loadingGastos ? "animate-spin inline-block" : ""}>🔄</span>
                  </button>
                </div>
              </div>

              {loadingGastos ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-400 font-medium italic animate-pulse">Consultando gastos...</p>
                </div>
              ) : gastos.length === 0 ? (
                <p className="text-center py-10 text-gray-500 font-medium uppercase text-xs tracking-widest italic border-2 border-dashed border-gray-100 rounded-xl">
                  No hay gastos detallados registrados este mes.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 text-left border-b border-gray-100">
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Concepto</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">C&oacute;digo</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">USD</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Bolivares</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {gastos.map((g, idx) => (
                        <tr key={`${g.id}-${idx}`} className="hover:bg-orange-50/30 transition-colors">
                          <td className="px-4 py-3 text-xs font-bold text-gray-500">{g.fecha}</td>
                          <td className="px-4 py-3 text-xs font-black text-gray-900 uppercase truncate max-w-[250px]">{g.descripcion}</td>
                          <td className="px-4 py-3 text-xs font-black text-orange-600">{g.codigo}</td>
                          <td className="px-4 py-3 text-xs font-bold text-gray-600 text-right">$ {formatUsd(g.monto_usd)}</td>
                          <td className="px-4 py-3 text-xs font-black text-gray-900 text-right">Bs. {formatBs(g.monto)}</td>
                        </tr>
                      ))}
                      <tr className="bg-orange-50/50 font-black">
                        <td colSpan={3} className="px-4 py-3 text-xs text-right uppercase tracking-widest">Total General Gastos:</td>
                        <td className="px-4 py-3 text-xs text-right">$ {formatUsd(gastos.reduce((sum, g) => sum + Number(g.monto_usd), 0))}</td>
                        <td className="px-4 py-3 text-xs text-right text-orange-700">Bs. {formatBs(gastos.reduce((sum, g) => sum + Number(g.monto), 0))}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "balance" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 uppercase tracking-tight">Estado de Cuenta Edificio</h2>
                  <p className="text-xs text-gray-500 font-medium italic">Balance financiero consolidado</p>
                </div>
                <div className="flex items-center gap-3">
                  {mesesBalance.length > 0 && (
                    <select
                      value={selectedMesBalance}
                      onChange={(e) => {
                        setSelectedMesBalance(e.target.value);
                        setTimeout(() => loadBalance(), 100);
                      }}
                      className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold bg-white focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                    >
                      <option value="">Mes Actual</option>
                      {mesesBalance.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  )}
                  <button onClick={loadBalance} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-blue-600" title="Refrescar">
                    <span className={loadingBalance ? "animate-spin inline-block" : ""}>🔄</span>
                  </button>
                </div>
              </div>

              {loadingBalance ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-400 font-medium italic animate-pulse">Obteniendo balance...</p>
                </div>
              ) : !balance ? (
                <p className="text-center py-10 text-gray-500 font-medium uppercase text-xs tracking-widest italic border-2 border-dashed border-gray-100 rounded-xl">
                  No hay datos de balance para este mes. Realiza una sincronización.
                </p>
              ) : (
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Disponibilidad de Caja</h3>
                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex justify-between items-center">
                      <span className="text-xs font-bold text-blue-800 uppercase">Saldo Disponible</span>
                      <div className="text-right">
                        <div className="text-xl font-black text-blue-900">Bs. {formatBs(balance.saldo_disponible)}</div>
                        <div className="text-xs font-bold text-blue-600">$ {formatUsd(balance.saldo_disponible_usd)} USD</div>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-600 uppercase">Fondo de Reserva</span>
                      <div className="text-right">
                        <div className="text-lg font-black text-gray-900">Bs. {formatBs(balance.fondo_reserva)}</div>
                        <div className="text-xs font-bold text-gray-500">$ {formatUsd(balance.fondo_reserva_usd)} USD</div>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                      <span className="text-xs font-black text-gray-900 uppercase">Total en Bancos:</span>
                      <div className="text-right">
                        <div className="text-2xl font-black text-blue-600">Bs. {formatBs(balance.saldo_disponible + balance.fondo_reserva)}</div>
                        <div className="text-sm font-bold text-gray-400">$ {formatUsd(balance.saldo_disponible_usd + balance.fondo_reserva_usd)} USD</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Operaci&oacute;n Mensual</h3>
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="text-xs font-bold text-gray-600 uppercase">Ingresos (Cobranza)</span>
                      <span className="text-sm font-black text-green-600">Bs. {formatBs(balance.cobranza_mes)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="text-xs font-bold text-gray-600 uppercase">Egresos (Gastos)</span>
                      <span className="text-sm font-black text-red-600">Bs. {formatBs(balance.gastos_facturados)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="text-xs font-bold text-gray-600 uppercase">Cuentas por Cobrar</span>
                      <span className="text-sm font-black text-orange-600">Bs. {formatBs(balance.total_por_cobrar)}</span>
                    </div>
                    <div className="p-4 mt-4 rounded-xl bg-orange-50 border border-orange-100">
                      <div className="text-[10px] font-black text-orange-800 uppercase tracking-widest mb-1">Impacto de Cuentas por Cobrar</div>
                      <div className="text-lg font-black text-orange-900">$ {formatUsd(balance.total_por_cobrar_usd)} USD</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "alicuotas" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 uppercase tracking-tight">Directorio de Apartamentos</h2>
                  <p className="text-xs text-gray-500 font-medium italic">Base de datos de unidades y al&iacute;cuotas</p>
                </div>
                <button onClick={loadAlicuotas} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-blue-600" title="Refrescar">
                  <span className={loadingAlicuotas ? "animate-spin inline-block" : ""}>🔄</span>
                </button>
              </div>

              {showUnitsAlert && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-red-500 text-xl">⚠️</span>
                    <div>
                      <p className="text-xs font-black text-red-800 uppercase">Inconsistencia Detectada</p>
                      <p className="text-xs text-red-600">Se encontraron {alicuotasCount} apartamentos registrados, pero el edificio est&aacute; configurado para {building?.unidades} unidades.</p>
                    </div>
                  </div>
                </div>
              )}

              {loadingAlicuotas ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-400 font-medium italic animate-pulse">Obteniendo directorio...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 text-left border-b border-gray-100">
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Unidad</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Propietario</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Al&iacute;cuota (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {alicuotas.map((ali, idx) => (
                        <tr key={`${ali.unidad}-${idx}`} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-4 py-3 text-xs font-black text-blue-600">{ali.unidad}</td>
                          <td className="px-4 py-3 text-xs font-bold text-gray-700 uppercase">{ali.propietario}</td>
                          <td className="px-4 py-3 text-xs font-black text-gray-900 text-right">{ali.alicuota.toFixed(4)}%</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-black border-t-2 border-gray-100">
                        <td colSpan={2} className="px-4 py-3 text-xs text-right uppercase tracking-widest">Suma Total Al&iacute;cuotas:</td>
                        <td className={`px-4 py-3 text-xs text-right ${Math.abs(alicuotaSum - 100) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>{alicuotaSum.toFixed(4)}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "alertas" && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-6 uppercase tracking-tight flex items-center gap-2">
                  <span className="text-red-500">🔔</span> Notificaciones del Sistema
                </h2>
                <div className="space-y-4">
                  {alertas.length === 0 ? (
                    <p className="text-center py-10 text-gray-400 italic text-xs uppercase tracking-widest">No hay alertas activas.</p>
                  ) : (
                    alertas.map((alerta) => (
                      <div key={alerta.id} className={`p-4 rounded-xl border-l-4 shadow-sm ${
                        alerta.tipo === 'error' ? 'bg-red-50 border-red-500' : 
                        alerta.tipo === 'warning' ? 'bg-orange-50 border-orange-500' : 
                        'bg-blue-50 border-blue-500'
                      }`}>
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="text-xs font-black text-gray-900 uppercase tracking-tight">{alerta.titulo}</h4>
                          <span className="text-[9px] font-bold text-gray-400 uppercase">{alerta.fecha}</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">{alerta.descripcion}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-6 uppercase tracking-tight flex items-center gap-2">
                  <span className="text-blue-500">🔄</span> Historial de Sincronizaci&oacute;n
                </h2>
                <div className="space-y-4">
                  {sincronizaciones.length === 0 ? (
                    <p className="text-center py-10 text-gray-400 italic text-xs uppercase tracking-widest">Sin registros de sincronizaci&oacute;n.</p>
                  ) : (
                    sincronizaciones.map((sync) => (
                      <div key={sync.id} className="p-4 rounded-xl bg-gray-50 border border-gray-100 group hover:bg-white transition-all">
                        <div className="flex justify-between items-center mb-2">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${sync.estado === 'completado' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {sync.estado}
                          </span>
                          <span className="text-[9px] font-bold text-gray-400 uppercase">{new Date(sync.created_at).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-700 uppercase tracking-tighter">Eventos Detectados:</span>
                          <span className="text-xs font-black text-blue-600">{sync.movimientos_nuevos || 0}</span>
                        </div>
                        {sync.error && <p className="mt-2 text-[10px] text-red-500 font-medium italic">Error: {sync.error}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "kpis" && (
           <div className="space-y-6">
             {/* Tarjetas de Métricas USD */}
             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
               <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                 <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Disponible en Caja</div>
                 <div className="text-lg font-black text-blue-600">$ {formatUsd(balance?.saldo_disponible_usd || 0)}</div>
                 <div className="text-[9px] text-gray-400 font-bold uppercase">Bs. {formatBs(balance?.saldo_disponible)}</div>
               </div>
               <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                 <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Cuentas por Cobrar</div>
                 <div className="text-lg font-black text-orange-600">$ {formatUsd(balance?.total_por_cobrar_usd || 0)}</div>
                 <div className="text-[9px] text-gray-400 font-bold uppercase">Bs. {formatBs(balance?.total_por_cobrar)}</div>
               </div>
               <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                 <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Fondo de Reserva</div>
                 <div className="text-lg font-black text-emerald-600">$ {formatUsd(balance?.fondo_reserva_usd || 0)}</div>
                 <div className="text-[9px] text-gray-400 font-bold uppercase">Bs. {formatBs(balance?.fondo_reserva)}</div>
               </div>
               <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                 <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Int. Moratorios</div>
                 <div className="text-lg font-black text-pink-600">$ {formatUsd(balance?.fondo_intereses_usd || 0)}</div>
                 <div className="text-[9px] text-gray-400 font-bold uppercase">Bs. {formatBs(balance?.fondo_intereses)}</div>
               </div>
               <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                 <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Dif. Cambiario</div>
                 <div className="text-lg font-black text-indigo-600">$ {formatUsd(balance?.fondo_diferencial_cambiario_usd || 0)}</div>
                 <div className="text-[9px] text-gray-400 font-bold uppercase">Bs. {formatBs(balance?.fondo_diferencial_cambiario)}</div>
               </div>
             </div>

             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
               <h2 className="text-lg font-semibold text-gray-900 mb-4">Flujo de Caja Diario (Bs.)</h2>
               {loadingKpis ? (
                 <p className="text-gray-500 text-center py-8">Cargando...</p>
               ) : kpisData.cashFlow?.length > 0 ? (
                 <ResponsiveContainer width="100%" height={400}>
                   <ComposedChart data={kpisData.cashFlow} margin={{ top: 10, right: 40, left: 10, bottom: 20 }}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} />
                     <XAxis 
                       dataKey="fecha" 
                       tick={{ fontSize: 9 }} 
                       tickFormatter={(v) => v.split("-").slice(1).reverse().join("/")} 
                       angle={-45}
                       textAnchor="end"
                       height={50}
                     />
                     <YAxis 
                       yAxisId="left" 
                       tick={{ fontSize: 9 }} 
                       label={{ value: "Ingresos (Bs)", angle: -90, position: "insideLeft", fontSize: 10 }}
                     />
                     <YAxis 
                       yAxisId="right" 
                       orientation="right" 
                       tick={{ fontSize: 9 }} 
                       label={{ value: "Egresos (Bs)", angle: 90, position: "insideRight", fontSize: 10 }}
                     />
                     <Tooltip 
                       formatter={(value: any, name: any) => [`Bs. ${formatBs(value as number)}`, name]}
                       contentStyle={{ fontSize: "11px", borderRadius: "8px" }}
                     />
                     <Legend verticalAlign="top" wrapperStyle={{ fontSize: "11px", paddingBottom: "10px" }} />
                     <Bar yAxisId="left" dataKey="ingresos" fill="#10b981" name="Ingresos (Bs.)" radius={[2, 2, 0, 0]} barSize={15} />
                     <Line yAxisId="right" type="monotone" dataKey="egresos" stroke="#ef4444" name="Egresos (Bs.)" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                   </ComposedChart>
                 </ResponsiveContainer>
               ) : (
                 <p className="text-gray-500 text-center py-8">No hay datos de flujo de caja para este periodo</p>
               )}
               <p className="text-[10px] text-gray-400 mt-2 text-center uppercase font-bold">Comparativa diaria de ingresos (barras verdes, eje izq) vs egresos (línea roja, eje der)</p>
             </div>

             <div className="grid md:grid-cols-2 gap-6">
               <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                 <h2 className="text-lg font-semibold text-gray-900 mb-4">Evolución de Cobranza Mensual (USD)</h2>
                 {loadingKpis ? (
                   <p className="text-gray-500 text-center py-8">Cargando...</p>
                 ) : kpisData.balances?.length > 0 ? (
                   <ResponsiveContainer width="100%" height={300}>
                     <BarChart data={kpisData.balances} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                       <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                       <YAxis tick={{ fontSize: 9 }} tickFormatter={(v: any) => `$${v.toFixed(0)}`} />
                       <Tooltip formatter={(value: any) => [`$${formatUsd(value as number)}`, "Cobranza"]} />
                       <Legend verticalAlign="top" height={36} />
                       <Bar dataKey="cobranza_mes_usd" fill="#10b981" name="Cobranza ($)" radius={[4, 4, 0, 0]} />
                     </BarChart>
                   </ResponsiveContainer>
                 ) : (
                   <p className="text-gray-500 text-center py-8">No hay datos</p>
                 )}
               </div>

               <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                 <h2 className="text-lg font-semibold text-gray-900 mb-4">Total Cuentas por Cobrar (USD)</h2>
                 {loadingKpis ? (
                   <p className="text-gray-500 text-center py-8">Cargando...</p>
                 ) : kpisData.balances?.length > 0 ? (
                   <ResponsiveContainer width="100%" height={300}>
                     <AreaChart data={kpisData.balances} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                       <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                       <YAxis tick={{ fontSize: 9 }} tickFormatter={(v: any) => `$${v.toFixed(0)}`} />
                       <Tooltip formatter={(value: any) => [`$${formatUsd(value as number)}`, "Cuentas por Cobrar"]} />
                       <Legend verticalAlign="top" height={36} />
                       <Area type="monotone" dataKey="total_por_cobrar_usd" stroke="#f59e0b" fill="#fef3c7" name="Por Cobrar ($)" />
                     </AreaChart>
                   </ResponsiveContainer>
                 ) : (
                   <p className="text-gray-500 text-center py-8">No hay datos</p>
                 )}
               </div>

               <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                 <h2 className="text-lg font-semibold text-gray-900 mb-4">Evolución Fondos de Reserva (USD)</h2>
                 {loadingKpis ? (
                   <p className="text-gray-500 text-center py-8">Cargando...</p>
                 ) : kpisData.balances?.length > 0 ? (
                   <ResponsiveContainer width="100%" height={300}>
                     <LineChart data={kpisData.balances} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                       <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                       <YAxis tick={{ fontSize: 9 }} tickFormatter={(v: any) => `$${v.toFixed(0)}`} />
                       <Tooltip formatter={(value: any) => [`$${formatUsd(value as number)}`, "Monto"]} />
                       <Legend verticalAlign="top" height={36} />
                       <Line type="monotone" dataKey="fondo_reserva_usd" stroke="#059669" name="Fondo Reserva ($)" strokeWidth={2} />
                       <Line type="monotone" dataKey="fondo_intereses_usd" stroke="#d97706" name="Intereses Morat. ($)" strokeWidth={2} />
                       <Line type="monotone" dataKey="fondo_diferencial_cambiario_usd" stroke="#2563eb" name="Dif. Cambiario ($)" strokeWidth={2} />
                     </LineChart>
                   </ResponsiveContainer>
                 ) : (
                   <p className="text-gray-500 text-center py-8">No hay datos</p>
                 )}
               </div>

               <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                 <h2 className="text-lg font-semibold text-gray-900 mb-4">Evolución del Saldo Disponible (USD)</h2>
                 {loadingKpis ? (
                   <p className="text-gray-500 text-center py-8">Cargando...</p>
                 ) : kpisData.balances?.length > 0 ? (
                   <ResponsiveContainer width="100%" height={300}>
                     <LineChart data={kpisData.balances} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                       <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                       <YAxis tick={{ fontSize: 9 }} tickFormatter={(v: any) => `$${v.toFixed(0)}`} />
                       <Tooltip formatter={(value: any) => [`$${formatUsd(value as number)}`, "Saldo"]} />
                       <Legend verticalAlign="top" height={36} />
                       <Line type="monotone" dataKey="saldo_disponible_usd" stroke="#2563eb" strokeWidth={3} name="Saldo Disponible ($)" dot={{ r: 4 }} />
                     </LineChart>
                   </ResponsiveContainer>
                 ) : (
                   <p className="text-gray-500 text-center py-8">No hay datos</p>
                 )}
               </div>
             </div>
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
               <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribuci&oacute;n de Unidades con Deuda</h2>
               <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={(() => {
                          const dist: any = {};
                          recibos.forEach(r => {
                            const n = r.num_recibos || 1;
                            dist[n] = (dist[n] || 0) + 1;
                          });
                          return Object.keys(dist).map(n => ({
                            name: `${n} Recibo(s)`,
                            value: dist[n]
                          }));
                        })()}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {recibos.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'][index % 7]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 text-center uppercase font-bold">Cantidad de apartamentos seg&uacute;n n&uacute;mero de recibos pendientes</p>
             </div>

             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
               <h2 className="text-lg font-semibold text-gray-900 mb-4">Deuda Acumulada por Antig&uuml;edad (Bs.)</h2>
               <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={(() => {
                          const dist: any = {};
                          recibos.forEach(r => {
                            const n = r.num_recibos || 1;
                            dist[n] = (dist[n] || 0) + parseFloat(r.deuda.toString());
                          });
                          return Object.keys(dist).map(n => ({
                            name: `${n} Recibo(s)`,
                            value: dist[n]
                          }));
                        })()}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: Bs. ${formatBs(value)}`}
                      >
                        {recibos.map((_, index) => (
                          <Cell key={`cell-amt-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'][index % 7]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => `Bs. ${formatBs(value)}`} />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 text-center uppercase font-bold">Monto total adeudado (Bs.) distribuido por antig&uuml;edad de deuda</p>
             </div>
           </div>
        )}

        {(activeTab as string) === "informes" && (
           <div className="space-y-6">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
               <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumen por Fecha</h2>
               <div className="flex gap-4 items-end mb-6">
                 <div className="flex-1 max-w-xs">
                   <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Seleccionar Fecha</label>
                   <input 
                     type="date" 
                     value={informeFecha} 
                     onChange={(e) => setInformeFecha(e.target.value)}
                     className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm font-bold bg-white focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                   />
                 </div>
                 <button 
                   onClick={loadInforme}
                   className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all"
                 >
                   {loadingInforme ? "Consultando..." : "Cargar Resumen"}
                 </button>
               </div>

               {informeData === "not_found" ? (
                 <div className="py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-center">
                   <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No hay registros para la fecha seleccionada ({informeFecha})</p>
                 </div>
               ) : informeData ? (
                 <div className="grid md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <div className="space-y-6">
                     <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                       <h3 className="text-xs font-black text-blue-800 uppercase tracking-widest mb-4 border-b border-blue-200 pb-2">Balance Operativo al {informeFecha}</h3>
                       <div className="space-y-4">
                         <div className="flex justify-between items-center">
                           <span className="text-[10px] font-bold text-blue-600 uppercase">Saldo en Bancos</span>
                           <span className="text-sm font-black text-blue-900">Bs. {formatBs(informeData.saldo_disponible)}</span>
                         </div>
                         <div className="flex justify-between items-center">
                           <span className="text-[10px] font-bold text-blue-600 uppercase">Disponibilidad Total</span>
                           <span className="text-lg font-black text-blue-700">Bs. {formatBs(informeData.disponibilidad_total_bs)}</span>
                         </div>
                       </div>
                     </div>
                   </div>

                   <div className="space-y-6">
                     <div className="bg-orange-50/50 p-6 rounded-2xl border border-orange-100">
                       <h3 className="text-xs font-black text-orange-800 uppercase tracking-widest mb-4 border-b border-orange-200 pb-2">Gesti&oacute;n de Cartera</h3>
                       <div className="space-y-4">
                         <div className="flex justify-between items-center">
                           <span className="text-[10px] font-bold text-orange-600 uppercase">Cuentas por Cobrar</span>
                           <span className="text-sm font-black text-orange-900">Bs. {formatBs(informeData.cuentas_por_cobrar_bs)}</span>
                         </div>
                         <div className="flex justify-between items-center">
                           <span className="text-[10px] font-bold text-orange-600 uppercase">Ingresos del D&iacute;a</span>
                           <span className="text-sm font-black text-green-600">+ Bs. {formatBs(informeData.cobros_dia_bs)}</span>
                         </div>
                       </div>
                     </div>
                   </div>
                 </div>
               ) : null}
             </div>

             <div className="grid lg:grid-cols-2 gap-6">
               <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                 <div className="flex items-center justify-between mb-6">
                   <div>
                     <h2 className="text-lg font-bold text-gray-900 uppercase tracking-tight">Gesti&oacute;n de Gastos Recurrentes</h2>
                     <p className="text-xs text-gray-500 font-medium italic">Conceptos detectados en los recibos</p>
                   </div>
                   <button onClick={loadGastosRecurrentes} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-blue-600">
                     <span className={loadingGastosRecurrentes ? "animate-spin inline-block" : ""}>🔄</span>
                   </button>
                 </div>

                 <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                   {gastosRecurrentes.length === 0 ? (
                     <div className="py-10 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-100">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Realiza una sincronizaci&oacute;n para detectar conceptos.</p>
                     </div>
                   ) : (
                     gastosRecurrentes.map((gasto) => (
                       <div key={gasto.codigo} className={`p-4 rounded-xl border transition-all flex items-center justify-between ${gasto.activo ? 'bg-white border-blue-100 shadow-sm' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
                         <div className="flex items-center gap-4">
                           <input 
                             type="checkbox" 
                             checked={gasto.activo} 
                             onChange={(e) => updateRecurrente(gasto.codigo, gasto.descripcion, e.target.checked, gasto.categoria || 'otros')}
                             className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                           />
                           <div>
                             <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-0.5">{gasto.codigo}</p>
                             <p className="text-xs font-bold text-gray-800 uppercase">{gasto.descripcion}</p>
                           </div>
                         </div>
                         <select
                           value={gasto.categoria || 'otros'}
                           onChange={(e) => updateRecurrente(gasto.codigo, gasto.descripcion, gasto.activo, e.target.value)}
                           className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-[10px] font-black uppercase text-gray-500 focus:ring-1 focus:ring-blue-500 outline-none"
                         >
                           <option value="otros">Otros</option>
                           <option value="servicios">Servicios</option>
                           <option value="mantenimiento">Mantenimiento</option>
                           <option value="seguridad">Seguridad</option>
                           <option value="administrativo">Administrativo</option>
                         </select>
                       </div>
                     ))
                   )}
                 </div>
               </div>

               <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                 <div className="flex items-center justify-between mb-6">
                   <h2 className="text-lg font-bold text-gray-900 uppercase tracking-tight">Evoluci&oacute;n de Gastos</h2>
                   <button onClick={loadEvolucionRecurrentes} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Refrescar Gr&aacute;ficos</button>
                 </div>
                 
                 {evolucionRecurrentes.length === 0 ? (
                    <div className="py-20 text-center">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">No hay datos históricos para los conceptos marcados como activos.</p>
                      <p className="text-[9px] text-gray-400 mt-2">Marca los gastos que quieres monitorear en la lista de la izquierda.</p>
                    </div>
                 ) : (
                    <div className="space-y-8">
                       <div className="h-[300px]">
                         <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 text-center">Inversi&oacute;n Mensual por Categor&iacute;a (Bs.)</h4>
                         <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={evolucionRecurrentes} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} />
                             <XAxis dataKey="mes" tick={{fontSize: 10}} />
                             <YAxis tick={{fontSize: 10}} />
                             <Tooltip formatter={(value: any) => `Bs. ${formatBs(value as number)}`} />
                             <Legend wrapperStyle={{fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase'}} />
                             <Bar dataKey="categorias.servicios" name="Servicios" stackId="a" fill="#3b82f6" />
                             <Bar dataKey="categorias.seguridad" name="Seguridad" stackId="a" fill="#10b981" />
                             <Bar dataKey="categorias.mantenimiento" name="Mantenimiento" stackId="a" fill="#f59e0b" />
                             <Bar dataKey="categorias.otros" name="Otros" stackId="a" fill="#94a3b8" />
                           </BarChart>
                         </ResponsiveContainer>
                       </div>
                       <div className="h-[200px]">
                         <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 text-center">Total Gasto Recurrente Acumulado (Bs.)</h4>
                         <ResponsiveContainer width="100%" height="100%">
                           <LineChart data={evolucionRecurrentes} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} />
                             <XAxis dataKey="mes" tick={{fontSize: 10}} />
                             <YAxis tick={{fontSize: 10}} />
                             <Tooltip formatter={(value: any) => `Bs. ${formatBs(value as number)}`} />
                             <Line type="monotone" dataKey="total" stroke="#ef4444" strokeWidth={3} name="Total Recurrente" dot={{ r: 4 }} />
                           </LineChart>
                         </ResponsiveContainer>
                       </div>
                    </div>
                 )}
               </div>
             </div>
           </div>
        )}

        {activeTab === "configuracion" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
            {/* Mensajes de Sync */}
            {syncMessage && (
              <div className={`p-5 rounded-2xl font-black text-sm shadow-lg flex items-center gap-3 animate-bounce ${syncMessage.includes("❌") ? "bg-red-50 text-red-700 border-2 border-red-100" : "bg-green-50 text-green-700 border-2 border-green-100"}`}>
                <span className="text-xl">{syncMessage.includes("❌") ? "🚫" : "✅"}</span>
                {syncMessage}
              </div>
            )}

            <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
              <h2 className="text-xl font-black text-gray-900 mb-8 uppercase tracking-tight flex items-center gap-3">
                <span className="bg-blue-100 p-2 rounded-xl text-blue-600">⚙️</span>
                Panel de Control de Integración
              </h2>

              <div className="space-y-10">
                {/* Administradora */}
                <div className="grid md:grid-cols-2 gap-8 items-start">
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Portal Administrativo</label>
                    <select
                      value={editConfig.admin_nombre || "La Ideal C.A."}
                      onChange={(e) => updateAdminAndUrls(e.target.value)}
                      className="w-full px-5 py-4 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-sm font-black text-gray-700 bg-gray-50/50"
                    >
                      <option value="La Ideal C.A.">La Ideal C.A.</option>
                      <option value="Admastridcarrasquel">Administradora AC. Condominios, C.A.</option>
                      <option value="Administradora Elite">Administradora Elite</option>
                      <option value="Intercanar">Intercanariven</option>
                      <option value="Admactual">Administradora Actual, C.A.</option>
                      <option value="Condominios Chacao">Condominios Chacao</option>
                      <option value="Obelisco">Obelisco</option>
                      <option value="Administradora GCM">Administradora GCM</option>
                      <option value="Otra">Otra (Manual)</option>
                    </select>
                  </div>
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Clave de Acceso Secreta</label>
                    <input
                      type="password"
                      value={editConfig.admin_secret}
                      onChange={(e) => setEditConfig({ ...editConfig, admin_secret: e.target.value })}
                      className="w-full px-5 py-4 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-sm font-black tracking-widest bg-gray-50/50"
                      placeholder="••••••••••••"
                    />
                  </div>
                </div>

                {/* URLs Avanzadas */}
                <div className="bg-gray-50/50 p-8 rounded-3xl border-2 border-gray-100">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Direcciones de Scraping (Advanced)</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    {[
                      { label: "Login", key: "url_login" },
                      { label: "Recibos Pendientes", key: "url_recibos" },
                      { label: "Recibo del Mes (?r=4)", key: "url_recibo_mes" },
                      { label: "Egresos", key: "url_egresos" },
                      { label: "Gastos", key: "url_gastos" },
                      { label: "Balance General", key: "url_balance" }
                    ].map((url) => (
                      <div key={url.key} className="space-y-2">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-tighter pl-1">{url.label}</label>
                        <input
                          type="text"
                          value={(editConfig as any)[url.key]}
                          onChange={(e) => setEditConfig({ ...editConfig, [url.key]: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[10px] font-mono font-medium bg-white focus:ring-2 focus:ring-blue-500 outline-none truncate"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sincronización Manual */}
                <div className="bg-blue-600 rounded-3xl p-8 text-white shadow-xl shadow-blue-200">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="text-center md:text-left">
                      <h3 className="text-lg font-black uppercase tracking-tight mb-1">Ejecutar Descarga Manual</h3>
                      <p className="text-xs font-bold text-blue-100 opacity-80 uppercase tracking-widest">Obt&eacute;n los datos m&aacute;s recientes del portal ahora mismo</p>
                    </div>
                    <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                      <select 
                        value={syncMes} 
                        onChange={(e) => setSyncMes(e.target.value)}
                        className="bg-white/10 border border-white/20 px-4 py-3 rounded-2xl text-xs font-black uppercase outline-none"
                      >
                        <option value="" className="text-gray-900">Mes Actual</option>
                        <option value="2026-03" className="text-gray-900">Marzo 2026</option>
                        <option value="2026-02" className="text-gray-900">Febrero 2026</option>
                        <option value="2026-01" className="text-gray-900">Enero 2026</option>
                        <option value="2025-12" className="text-gray-900">Diciembre 2025</option>
                      </select>
                      <button 
                        onClick={handleSync}
                        disabled={syncing}
                        className="bg-white text-blue-600 px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                      >
                        {syncing ? "Sincronizando..." : "Iniciar Sincronización"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cron Configuration */}
                <div className="bg-indigo-50/50 p-8 rounded-3xl border-2 border-indigo-100">
                  <h3 className="text-xs font-black text-indigo-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <span className="text-lg">⏰</span> Configuración de Tareas Automáticas
                  </h3>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm flex flex-col justify-between">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest">Reporte Automático</h4>
                      <button
                        onClick={() => setEditConfig({ ...editConfig, cron_enabled: !editConfig.cron_enabled })}
                        className={`w-full py-3 rounded-xl text-[10px] font-black uppercase transition-all ${editConfig.cron_enabled ? 'bg-green-600 text-white shadow-lg shadow-green-100' : 'bg-gray-200 text-gray-500'}`}
                      >
                        {editConfig.cron_enabled ? '● SERVICIO ACTIVO' : '○ DESACTIVADO'}
                      </button>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Hora de Envío (VET)</h4>
                      <input
                        type="time"
                        value={editConfig.cron_time}
                        onChange={(e) => setEditConfig({ ...editConfig, cron_time: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-50 rounded-xl text-lg font-black text-indigo-700 outline-none focus:border-indigo-200"
                      />
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Frecuencia</h4>
                      <select
                        value={editConfig.cron_frequency}
                        onChange={(e) => setEditConfig({ ...editConfig, cron_frequency: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-50 rounded-xl text-xs font-black text-indigo-700 outline-none uppercase bg-white focus:border-indigo-200"
                      >
                        <option value="diaria">DIARIA</option>
                        <option value="semanal">SEMANAL</option>
                        <option value="mensual">MENSUAL</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-6 p-4 bg-white rounded-2xl border border-indigo-100 font-mono text-[9px] text-indigo-600 break-all select-all flex items-center justify-between">
                    <span>{window.location.origin}/api/cron</span>
                    <span className="text-[8px] bg-indigo-50 px-2 py-1 rounded-full font-black uppercase">Endpoint URL</span>
                  </div>
                </div>

                <div className="pt-8 border-t border-gray-100 flex justify-end gap-4">
                   <button onClick={() => setActiveTab("resumen")} className="px-8 py-4 rounded-2xl text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-all">Cancelar</button>
                   <button 
                     onClick={handleSaveConfig}
                     disabled={saving}
                     className="bg-gray-900 text-white px-12 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-gray-200 disabled:opacity-50"
                   >
                     {saving ? "Guardando..." : "Guardar Cambios"}
                   </button>
                </div>
              </div>
            </div>

            {/* Mantenimiento */}
            <div className="bg-white p-8 rounded-3xl shadow-lg border border-red-50">
               <h3 className="text-sm font-black text-red-600 uppercase tracking-widest mb-6">Mantenimiento y Depuraci&oacute;n</h3>
               <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-red-50 rounded-3xl border border-red-100">
                  <div className="text-center md:text-left flex-1">
                     <h4 className="text-sm font-black text-red-900 uppercase">Optimizar Base de Datos</h4>
                     <p className="text-xs text-red-700 font-medium opacity-70">Limpia registros duplicados, reindexa tablas y compacta el almacenamiento de Supabase.</p>
                  </div>
                  <button 
                    onClick={runMaintenance}
                    disabled={maintenanceLoading}
                    className="bg-red-600 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-100 disabled:opacity-50"
                  >
                    {maintenanceLoading ? "Ejecutando..." : "Correr Mantenimiento"}
                  </button>
               </div>
               {maintenanceMessage && <p className="mt-4 p-4 rounded-2xl bg-white border border-gray-100 text-xs font-bold text-gray-600 animate-in fade-in">{maintenanceMessage}</p>}
            </div>
          </div>
        )}

        {activeTab === "manual" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 uppercase tracking-tight">Registro Manual de Caja</h2>
                  <p className="text-xs text-gray-500 font-medium italic">Control de saldos internos (no bancarizados)</p>
                </div>
                <button onClick={loadMovimientosManual} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-blue-600">
                  <span className={loadingManual ? "animate-spin inline-block" : ""}>🔄</span>
                </button>
              </div>

              {loadingManual ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-600 mb-4"></div>
                </div>
              ) : movimientosManual.length === 0 ? (
                <p className="text-center py-10 text-gray-500 font-medium uppercase text-xs tracking-widest italic border-2 border-dashed border-gray-100 rounded-xl">
                  No hay cierres de caja manuales registrados.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 text-left border-b border-gray-100">
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha Corte</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Saldo Bs.</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Saldo USD</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {movimientosManual.map((m, idx) => (
                        <tr key={`${m.id}-${idx}`} className="hover:bg-yellow-50/30 transition-colors">
                          <td className="px-4 py-3 text-xs font-bold text-gray-500">{m.fecha_corte}</td>
                          <td className="px-4 py-3 text-xs font-black text-gray-900 text-right">Bs. {formatBs(m.saldo_final)}</td>
                          <td className="px-4 py-3 text-xs font-bold text-yellow-700 text-right">$ {formatUsd(m.saldo_final_usd)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${m.comparado ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                              {m.comparado ? "Cuadrado" : "Pendiente"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "junta" && (
           <div className="space-y-6">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 uppercase tracking-tight">Miembros de la Junta</h2>
                    <p className="text-xs text-gray-500 font-medium">Destinatarios del reporte diario</p>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => sendEmailToJunta(true)}
                      disabled={sendingEmail}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                    >
                      Probar Envío
                    </button>
                    <button 
                      onClick={() => sendEmailToJunta(false)}
                      disabled={sendingEmail}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-md transition-all"
                    >
                      {sendingEmail ? "Enviando..." : "Enviar Reporte Ahora"}
                    </button>
                  </div>
                </div>

                {emailMessage && (
                  <div className={`p-4 rounded-xl mb-6 font-bold text-xs uppercase tracking-widest flex items-center gap-2 ${emailMessage.includes("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    <span>{emailMessage.includes("✅") ? "📬" : "⚠️"}</span>
                    {emailMessage}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {junta.length === 0 ? (
                    <p className="col-span-full text-center py-10 text-gray-400 italic text-xs uppercase tracking-widest">No hay miembros configurados.</p>
                  ) : (
                    junta.map((miembro, idx) => (
                      <div key={idx} className="p-5 rounded-2xl bg-gray-50 border border-gray-100 relative group">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black">
                            {miembro.nombre?.[0] || "?"}
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-gray-900 uppercase tracking-tight">{miembro.nombre}</h4>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">{miembro.cargo}</p>
                            <p className="text-[10px] font-mono text-blue-500 mt-1">{miembro.email}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-12 pt-8 border-t border-gray-100">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">Reportes Especiales</h3>
                  <button 
                    onClick={sendWhatsappReportToJunta}
                    disabled={sendingEmail}
                    className="flex items-center gap-3 px-6 py-4 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-green-100 transition-all"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.319 1.592 5.548 0 10.058-4.51 10.06-10.059.002-2.689-1.047-5.215-2.951-7.121C17.118 2.698 14.59 1.65 11.903 1.649c-5.547 0-10.057 4.51-10.059 10.06-.001 2.14.606 3.73 1.55 5.395l-1.011 3.693 3.264-.856zm10.362-7.111c-.299-.149-1.764-.87-2.034-.968-.269-.099-.465-.148-.661.149-.197.297-.759.967-.93 1.166-.171.198-.342.223-.641.074-.3-.148-1.266-.466-2.411-1.487-.893-.796-1.495-1.778-1.671-2.075-.176-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.299-.496.101-.198.05-.371-.025-.52-.05-.148-.661-1.592-.906-2.181-.238-.574-.481-.497-.661-.506-.171-.007-.367-.008-.564-.008-.197 0-.516.074-.786.371-.269.297-1.028 1.004-1.028 2.448 0 1.444 1.05 2.84 1.197 3.038.147.198 2.066 3.155 5.006 4.437.699.305 1.246.487 1.671.623.703.223 1.343.192 1.85.114.564-.087 1.764-.72 2.014-1.416.25-.696.25-1.293.176-1.416-.074-.124-.271-.198-.57-.347z"/></svg>
                    <span>Enviar Resumen estilo WhatsApp</span>
                  </button>
                  <p className="text-[10px] text-gray-400 mt-2 font-medium">Este reporte agrupa las deudas por número de recibos para facilitar el pegado en grupos de WhatsApp.</p>
                </div>
             </div>
           </div>
        )}
      </main>

      {/* Pie de Pagina */}
      <footer className="bg-white border-t border-gray-200 py-8 mt-12">
        <div className="max-w-[1600px] mx-auto px-4 text-center">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Control Financiero SaaS © 2026 - Todos los derechos reservados</p>
        </div>
      </footer>
    </div>
  );
}
