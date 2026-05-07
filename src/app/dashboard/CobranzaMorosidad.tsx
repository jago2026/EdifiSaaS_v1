"use client";

import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  Legend,
} from "recharts";

import { formatNumber, formatCurrency, formatBs, formatUsd, formatDate } from "@/lib/formatters";

/**
 * CobranzaMorosidad
 * ------------------------------------------------------------------
 * Pestaña unificada que combina, en este orden:
 *   1) Análisis de Cobranza        (antes pestaña "Análisis Cobranza")
 *   2) Semáforo de Morosidad        (antes pestaña "Semáforo Morosidad")
 *   3) Salud Financiera             (antes pestaña "Salud Financiera")
 *
 * Cambios solicitados aplicados:
 *   - El gráfico de Análisis de Cobranza ahora es de BARRAS:
 *       · Mes anterior: gris oscuro (#475569)
 *       · Mes actual:   azul       (#2563eb)
 *   - El gráfico "Evolución de la Morosidad" mantiene barras agrupadas pero
 *     el mes actual ahora también se pinta en azul (en lugar de rojo) y el
 *     mes anterior en gris oscuro, para mantener la coherencia cromática.
 *   - Se eliminó el gráfico "Flujo de Ingresos por Día de la Semana" de la
 *     sección de Salud Financiera, por ser un duplicado del flujo de caja.
 */
export function CobranzaMorosidad({ edificioId }: { edificioId: string }) {
  const [cobranza, setCobranza] = useState<any>(null);
  const [morosidad, setMorosidad] = useState<any>(null);
  const [salud, setSalud] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"monto" | "montoUsd" | "porcentaje">("montoUsd");

  useEffect(() => {
    let cancelled = false;
    async function loadAll() {
      setLoading(true);
      try {
        const [cRes, mRes, sRes] = await Promise.all([
          fetch(`/api/analytics/cobranza?edificioId=${edificioId}`).then(r => r.json()).catch(() => null),
          fetch(`/api/analytics/morosidad?edificioId=${edificioId}`).then(r => r.json()).catch(() => null),
          fetch(`/api/analytics/salud-financiera?edificioId=${edificioId}`).then(r => r.json()).catch(() => null),
        ]);
        if (!cancelled) {
          setCobranza(cRes);
          setMorosidad(mRes);
          setSalud(sRes);
        }
      } catch (err) {
        console.error("Error cargando Cobranza y Morosidad:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadAll();
    return () => { cancelled = true; };
  }, [edificioId]);

  if (loading) {
    return <div className="p-8 text-center animate-pulse text-indigo-600 font-black">Cargando Cobranza y Morosidad...</div>;
  }

  // ----------------------------------------------------------------
  // Sección 1: Análisis de Cobranza (gráfico de barras comparativo)
  // ----------------------------------------------------------------
  const renderCobranza = () => {
    if (!cobranza || !cobranza.mesActual || !cobranza.mesAnterior) {
      return <div className="p-8 text-center text-gray-400">No hay datos suficientes para el análisis de cobranza.</div>;
    }

    // Día actual en Caracas para no graficar días futuros del mes actual
    const hoyCaracas = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Caracas",
      year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());
    const diaHoyNum = Number(hoyCaracas.split("-")[2]);

    const chartData = Array.from({ length: 31 }, (_, i) => {
      const dia = i + 1;
      const actual = cobranza.mesActual.find((d: any) => d.dia === dia);
      const anterior = cobranza.mesAnterior.find((d: any) => d.dia === dia);
      const item: any = { dia };
      if (anterior && anterior.pct !== null && anterior.pct !== undefined) {
        item["Mes Anterior"] = anterior.pct;
      }
      if (dia <= diaHoyNum && actual && actual.pct !== null && actual.pct !== undefined) {
        item["Mes Actual"] = actual.pct;
      }
      return item;
    });

    const predictionDate = () => {
      if (cobranza.stats?.diasPara50Actual) {
        // Lógica mejorada: Si ya tenemos el 50%, el 100% suele tardar un factor de 1.5x a 2.5x 
        // dependiendo de la "cola" de morosidad.
        const dia50 = cobranza.stats.diasPara50Actual;
        
        // Escenario Conservador: 2.2x el tiempo del 50%
        const daysTo100 = Math.round(dia50 * 2.2);
        
        const targetDate = new Date();
        targetDate.setDate(1); // Inicio de mes
        targetDate.setDate(daysTo100);
        
        const now = new Date();
        if (targetDate < now) {
          // Si la fecha estimada ya pasó, estimamos 5 días adicionales desde hoy
          const fallback = new Date();
          fallback.setDate(now.getDate() + 5);
          return formatDate(fallback);
        }
        
        return formatDate(targetDate);
      }
      return "Pendiente de más datos";
    };

    const getScenarios = () => {
      if (!cobranza.stats?.diasPara50Actual) return null;
      const dia50 = cobranza.stats.diasPara50Actual;
      
      const getFecha = (factor: number) => {
        const d = new Date();
        d.setDate(1);
        d.setDate(Math.round(dia50 * factor));
        return formatDate(d);
      };

      return [
        { label: "🟢 Optimista", fecha: getFecha(1.6), desc: "Basado en historial acelerado" },
        { label: "🟡 Conservador", fecha: getFecha(2.2), desc: "Patrón histórico real (1.0x)" },
        { label: "🔴 Pesimista", fecha: getFecha(3.0), desc: "Retraso por morosidad (0.6x)" },
      ];
    };

    const scenarios = getScenarios();

    return (
      <section className="space-y-8">
        <header className="relative border-b pb-6 border-gray-100">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 border border-indigo-100">
            📈 Curva de Recaudación
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-3">
            Análisis de <span className="text-indigo-600">Cobranza</span>
          </h2>
          <p className="text-gray-500 max-w-2xl font-medium">
            Compare la velocidad de pago de este mes contra el anterior y visualice la proyección de recaudación.
          </p>
        </header>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-indigo-100/20">
            <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Curva Comparativa (%)</h3>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#2563eb" }}></div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Mes Actual</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#475569" }}></div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Mes Anterior</span>
                </div>
              </div>
            </div>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={2} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }} unit="%" />
                  <Tooltip
                    contentStyle={{ borderRadius: "20px", border: "none", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", padding: "15px" }}
                    itemStyle={{ fontSize: "12px", fontWeight: 900, textTransform: "uppercase" }}
                    formatter={(value: any) => [`${formatNumber(value, 1)}%`, ""]}
                    labelFormatter={(l) => `Día ${l}`}
                  />
                  <Bar dataKey="Mes Anterior" fill="#475569" radius={[4, 4, 0, 0]} maxBarSize={18} />
                  <Bar dataKey="Mes Actual" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-[2rem] text-white shadow-xl shadow-indigo-200">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Predicción de Saldo (100%)</div>
              {scenarios ? (
                <div className="space-y-4">
                  {scenarios.map((s, idx) => (
                    <div key={idx} className={`p-3 rounded-xl border ${idx === 1 ? 'bg-white/20 border-white/30 shadow-lg' : 'bg-white/5 border-white/10 opacity-70'}`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-black uppercase tracking-widest">{s.label}</span>
                        <span className="text-[9px] font-bold opacity-60">{s.desc}</span>
                      </div>
                      <div className="text-xl font-black">{s.fecha}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="text-3xl font-black tracking-tighter leading-tight mb-4">
                    Estimamos recaudar el <span className="text-amber-300 underline decoration-4 underline-offset-4">100%</span> para el:
                  </div>
                  <div className="text-4xl font-black mb-6">{predictionDate()}</div>
                </>
              )}
              <div className="mt-6 p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 text-xs font-medium leading-relaxed">
                Basado en que se alcanzó el 50% de recaudación en el día <span className="font-black text-amber-300">{cobranza.stats?.diasPara50Actual || "-"}</span>.
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b pb-4">Velocidad de Cobro</h3>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600 uppercase">Día 50% (Mes Ant.)</span>
                <span className="text-xl font-black text-gray-400">{cobranza.stats?.diasPara50Anterior || "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600 uppercase">Día 50% (Mes Act.)</span>
                <span className={`text-xl font-black ${cobranza.stats?.diasPara50Actual <= cobranza.stats?.diasPara50Anterior ? "text-emerald-500" : "text-rose-500"}`}>
                  {cobranza.stats?.diasPara50Actual || "-"}
                </span>
              </div>
              <div className={`text-[10px] font-black p-3 rounded-xl text-center uppercase tracking-tighter ${cobranza.stats?.diasPara50Actual <= cobranza.stats?.diasPara50Anterior ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                {cobranza.stats?.diasPara50Actual <= cobranza.stats?.diasPara50Anterior ? "🚀 Cobrando más rápido" : "⚠️ Alerta: Cobro más lento"}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  };

  // ----------------------------------------------------------------
  // Sección 2: Semáforo de Morosidad
  // ----------------------------------------------------------------
  const renderMorosidad = () => {
    if (!morosidad || !morosidad.current) {
      return <div className="p-8 text-center text-gray-400">No hay datos suficientes para el análisis de morosidad.</div>;
    }

    const getChartLabel = () => {
      if (viewMode === "monto") return "Bolívares (Bs.)";
      if (viewMode === "montoUsd") return "Dólares (USD)";
      return "Porcentaje (%)";
    };
    const activeDataKey = viewMode === "monto" ? "monto" : viewMode === "montoUsd" ? "montoUsd" : "porcentaje";

    const chartData = [
      { name: "1 Recibo",     value: Math.min(43, morosidad.current.g1.aptos),     monto: morosidad.current.g1.monto,     color: "#10b981", key: "g1" },
      { name: "2-3 Recibos",  value: Math.min(43, morosidad.current.g2_3.aptos),   monto: morosidad.current.g2_3.monto,   color: "#84cc16", key: "g2_3" },
      { name: "4-6 Recibos",  value: Math.min(43, morosidad.current.g4_6.aptos),   monto: morosidad.current.g4_6.monto,   color: "#f59e0b", key: "g4_6" },
      { name: "7-11 Recibos", value: Math.min(43, morosidad.current.g7_11.aptos),  monto: morosidad.current.g7_11.monto,  color: "#ef4444", key: "g7_11" },
      { name: "12+ Recibos",  value: Math.min(43, morosidad.current.g12_mas.aptos),monto: morosidad.current.g12_mas.monto,color: "#7f1d1d", key: "g12_mas" },
    ];

    return (
      <section className="space-y-8 pt-12 border-t border-gray-100">
        <header className="relative pb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 border border-rose-100">
            🚦 Semáforo de Riesgo
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-3">
            Antigüedad de <span className="text-rose-600">Deuda</span>
          </h2>
          <p className="text-gray-500 max-w-2xl font-medium">
            Identifique la concentración de deuda por antigüedad y el impacto financiero de la morosidad crónica.
          </p>
        </header>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-100/50">
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-8">Concentración de Deudores</h3>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: "#64748b" }} width={100} />
                  <Tooltip
                    cursor={{ fill: "#f8fafc" }}
                    contentStyle={{ borderRadius: "20px", border: "none", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", padding: "15px" }}
                    formatter={(value: any) => [value, "Apartamentos"]}
                  />
                  <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={40}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-gray-400 mt-4 text-center uppercase font-bold tracking-widest">Número de apartamentos por grupo de recibos</p>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-900 p-8 rounded-[2rem] text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 text-8xl transition-transform group-hover:scale-110 duration-500">📉</div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400 mb-2">Pérdida por Devaluación</div>
              <h3 className="text-3xl font-black tracking-tighter leading-tight mb-4">Costo de la <br />Morosidad Acumulada</h3>
              <div className="text-5xl font-black text-rose-500 mb-6">
                $ {formatCurrency(Object.values(morosidad.costoMorosidad as Record<string, number>).reduce((a, b) => a + b, 0))}
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Este es el monto estimado que el edificio ha perdido en <span className="text-white font-bold">poder adquisitivo</span> debido a la inflación sobre las deudas no pagadas a tiempo.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {chartData.map((g, i) => (
                <div key={i} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">{g.name}</div>
                  <div className="text-lg font-black text-gray-900 mb-1">Bs. {formatBs(g.monto)}</div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: g.color }}></div>
                    <span className="text-[10px] font-bold text-gray-500">{g.value} Aptos</span>
                  </div>
                  {morosidad.desplazamiento && morosidad.desplazamiento[g.key] !== undefined && (
                    <div className={`mt-3 text-[9px] font-black uppercase p-1.5 rounded-lg text-center ${morosidad.desplazamiento[g.key] <= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                      {morosidad.desplazamiento[g.key] > 0 ? `+${morosidad.desplazamiento[g.key]} Nuevos` : `${morosidad.desplazamiento[g.key]} Reducción`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Evolución de la Morosidad: Mes Ant. (gris oscuro) vs Mes Act. (azul) */}
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-100/50">
          <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Evolución de la Morosidad</h3>
              <p className="text-sm text-gray-500 font-medium">
                Comparativo por día — {getChartLabel()}
              </p>
              <div className="flex items-center gap-6 mt-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#475569" }}></div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Mes Ant. ({morosidad.mesAnteriorLabel || ""})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#2563eb" }}></div>
                  <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">
                    Mes Act. ({morosidad.mesActualLabel || ""})
                  </span>
                </div>
              </div>
            </div>
            <div className="flex bg-gray-100 p-1 rounded-xl self-start">
              <button onClick={() => setViewMode("monto")} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === "monto" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>Bs.</button>
              <button onClick={() => setViewMode("montoUsd")} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === "montoUsd" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>USD</button>
              <button onClick={() => setViewMode("porcentaje")} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === "porcentaje" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>%</button>
            </div>
          </header>

          {(!morosidad.barData || morosidad.barData.length === 0) ? (
            <div className="h-[340px] flex items-center justify-center text-gray-400 text-sm font-medium">
              No hay datos suficientes para comparar los dos meses.
            </div>
          ) : (
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={morosidad.barData} barCategoryGap="30%" barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }} tickFormatter={(v) => `${v}`} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }}
                    tickFormatter={(val) => {
                      if (viewMode === "porcentaje") return `${val}%`;
                      if (viewMode === "montoUsd") return `$${formatNumber(val)}`;
                      return `Bs.${formatNumber(val / 1000)}k`;
                    }}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: "20px", border: "none", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", padding: "16px", minWidth: "220px" }}
                    labelFormatter={(label) => `Día ${label} del mes`}
                    formatter={(value: any, name: any) => {
                      if (value === null || value === undefined) return ["-", name];
                      const isMesAct = String(name).startsWith("mesActual");
                      const label = isMesAct ? `Mes actual (${morosidad.mesActualLabel})` : `Mes anterior (${morosidad.mesAnteriorLabel})`;
                      if (viewMode === "porcentaje") return [`${formatNumber(value)}%`, label];
                      if (viewMode === "montoUsd") return [formatUsd(value), label];
                      return [`Bs. ${formatBs(value)}`, label];
                    }}
                  />
                  {/* Mes Anterior — gris oscuro */}
                  <Bar dataKey={`mesAnterior_${activeDataKey}`} fill="#475569" radius={[4, 4, 0, 0]} maxBarSize={18} />
                  {/* Mes Actual — azul */}
                  <Bar dataKey={`mesActual_${activeDataKey}`} fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>
    );
  };

  // ----------------------------------------------------------------
  // Sección 3: Salud Financiera (sin el chart de Flujo por día semana)
  // ----------------------------------------------------------------
  const renderSalud = () => {
    if (!salud || !salud.liquidez) {
      return <div className="p-8 text-center text-gray-400">No hay datos suficientes para el reporte de salud financiera.</div>;
    }

    return (
      <section className="space-y-8 pt-12 border-t border-gray-100">
        <header className="relative pb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 border border-emerald-100">
            🏢 KPIs Ejecutivos
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-3">
            Salud <span className="text-emerald-600">Financiera</span>
          </h2>
          <p className="text-gray-500 max-w-2xl font-medium">
            Indicadores clave para la toma de decisiones estratégicas de la Junta de Condominio.
          </p>
        </header>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-100/50 flex flex-col items-center text-center">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Índice de Liquidez</div>
            <div className={`text-6xl font-black mb-4 ${salud.liquidez.valor >= 1 ? "text-emerald-600" : "text-rose-600"}`}>
              {formatCurrency(salud.liquidez.valor, 2)}
            </div>
            <div className="text-xs font-bold text-gray-500 uppercase mb-6">Caja vs Gastos Facturados</div>
            <div className="w-full bg-gray-50 p-4 rounded-2xl space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase">
                <span className="text-gray-400">Disponible</span>
                <span className="text-gray-900">Bs. {formatBs(salud.liquidez.disponibilidad)}</span>
              </div>
              <div className="flex justify-between text-[10px] font-black uppercase">
                <span className="text-gray-400">Gastos</span>
                <span className="text-gray-900">Bs. {formatBs(salud.liquidez.gastos)}</span>
              </div>
            </div>
            <p className="mt-6 text-[10px] leading-relaxed text-gray-400 font-medium">
              {salud.liquidez.valor >= 1
                ? "✅ Excelente: Tenemos fondos para cubrir el 100% de los gastos facturados."
                : "⚠️ Alerta: El flujo de caja no alcanza para cubrir todos los gastos del mes."}
            </p>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-100/50 flex flex-col items-center text-center">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Efectividad 1ra Sem.</div>
            <div className="text-6xl font-black text-indigo-600 mb-4">
              {formatCurrency(salud.efectividad?.valor, 0)}%
            </div>
            <div className="text-xs font-bold text-gray-500 uppercase mb-6">{salud.efectividad?.aptos} de {salud.efectividad?.totalAptos} Apartamentos</div>
            <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden mb-6">
              <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${salud.efectividad?.valor || 0}%` }}></div>
            </div>
            <p className="text-[10px] leading-relaxed text-gray-400 font-medium">
              Porcentaje de vecinos que pagan sus recibos en los primeros 7 días tras la emisión. Una efectividad alta garantiza operatividad sin retrasos.
            </p>
          </div>

          <div className="bg-indigo-900 p-8 rounded-[2rem] text-white flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 text-8xl">🏆</div>
            <div className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-6">El Día de Oro</div>
            <div className="text-5xl font-black text-amber-400 mb-4 uppercase italic">
              {salud.diaDeOro?.nombre || "-"}
            </div>
            <div className="text-xs font-bold text-indigo-200 uppercase mb-8">Mayor Recaudación Histórica</div>
            <div className="w-full bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10">
              <div className="text-[10px] font-black uppercase text-indigo-300 mb-2">Total Recaudado en {salud.diaDeOro?.nombre || "-"}s</div>
              <div className="text-2xl font-black">Bs. {formatBs(salud.diaDeOro?.total)}</div>
            </div>
            <p className="mt-6 text-[10px] leading-relaxed text-indigo-300 font-medium italic">
              "Programe los pagos a proveedores o reparaciones mayores para este día, ya que es cuando hay mayor ingreso de liquidez."
            </p>
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="relative border-b pb-8 border-gray-100">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 border border-blue-100">
          💼 Vista Unificada
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-4">
          Cobranza y <span className="text-blue-600">Morosidad</span>
        </h1>
        <p className="text-gray-500 max-w-3xl font-medium">
          Toda la información de cobranza, antigüedad de deuda y salud financiera del edificio reunida en un solo lugar.
        </p>
      </header>

      {renderCobranza()}
      {renderMorosidad()}
      {renderSalud()}
    </div>
  );
}
