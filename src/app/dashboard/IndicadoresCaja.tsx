"use client";

import { useState, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from "recharts";

import { formatNumber, formatBs, formatUsd, formatDate } from "@/lib/formatters";

/**
 * IndicadoresCaja
 * ------------------------------------------------------------------
 * Dashboard ejecutivo construido sobre la tabla `control_diario` de
 * Supabase. Muestra cinco indicadores clave para la Junta:
 *
 *   1) Salud de Caja           → meses de operación cubiertos (gauge).
 *   2) Brecha Cambiaria         → erosión del saldo Bs vs USD (área apilada).
 *   3) Tendencia de Morosidad   → recibos pendientes en el tiempo + línea de tendencia.
 *   4) Comportamiento de Fondos → reserva, dif. cambiaria e int. mora (multilínea).
 *   5) Heatmap por día semana   → ingresos vs egresos USD promedio.
 *
 * Cada bloque incluye una explicación corta en lenguaje sencillo para
 * que un miembro de Junta sin formación financiera pueda interpretarlo.
 */
export function IndicadoresCaja({ edificioId }: { edificioId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/analytics/control-diario?edificioId=${edificioId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Error desconocido");
        if (!cancelled) setData(json);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Error cargando indicadores");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [edificioId]);

  if (loading) {
    return <div className="p-8 text-center animate-pulse text-indigo-600 font-black">Cargando Indicadores de Caja...</div>;
  }
  if (error) {
    return (
      <div className="p-8 text-center text-rose-600 font-bold">
        Error: {error}
      </div>
    );
  }
  if (!data || data.empty) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-10 text-center">
        <div className="text-5xl mb-4">📒</div>
        <h3 className="text-xl font-black text-amber-800 uppercase mb-2">Sin registros en Control Diario</h3>
        <p className="text-amber-700 text-sm max-w-xl mx-auto">
          Este edificio aún no tiene registros en la tabla <code className="px-2 py-0.5 bg-amber-100 rounded">control_diario</code>.
          Los indicadores se activarán automáticamente al cargar el primer día de control.
        </p>
      </div>
    );
  }

  const { resumen, saludCaja, brechaCambiaria, perfilMorosidad, fondos, heatmap } = data;

  // --- Salud de caja: clasificación cualitativa
  const meses = saludCaja.mesesCubiertos;
  const saludClass =
    meses >= 6 ? { color: "#10b981", label: "Excelente", bg: "from-emerald-500 to-emerald-700", text: "text-emerald-700" } :
    meses >= 3 ? { color: "#22c55e", label: "Buena",     bg: "from-green-500 to-emerald-600",   text: "text-green-700" } :
    meses >= 1.5 ? { color: "#f59e0b", label: "Atenta",  bg: "from-amber-500 to-orange-600",    text: "text-amber-700" } :
    meses >= 0.5 ? { color: "#f97316", label: "Riesgo",  bg: "from-orange-500 to-red-600",      text: "text-orange-700" } :
                   { color: "#ef4444", label: "Crítica", bg: "from-red-500 to-red-800",         text: "text-red-700" };

  // Ángulo del velocímetro (semicírculo: 0 → -180°, escala max 12 meses)
  const gaugeMax = 12;
  const gaugePct = Math.min(meses / gaugeMax, 1);
  const gaugeAngle = -180 + 180 * gaugePct;

  // Heatmap color helper
  const heatmapMax = Math.max(1, ...heatmap.map((h: any) => h.movimiento));
  const cellColor = (val: number, color: "ingreso" | "egreso") => {
    const intensity = Math.min(val / heatmapMax, 1);
    if (color === "ingreso") {
      // verde
      const lightness = 95 - intensity * 50; // 95 → 45
      return `hsl(152, 60%, ${lightness}%)`;
    }
    const lightness = 95 - intensity * 50;
    return `hsl(0, 70%, ${lightness}%)`;
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* ENCABEZADO */}
      <header className="relative border-b pb-8 border-gray-100">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 border border-amber-100">
          📊 Indicadores Estratégicos
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-4">
          Indicadores de <span className="text-amber-600">Caja</span>
        </h1>
        <p className="text-gray-500 max-w-3xl font-medium">
          Tablero ejecutivo construido sobre el control diario del edificio. Permite a la Junta
          tomar decisiones informadas sobre liquidez, divisas, morosidad y fondos reservados.
        </p>
        <div className="mt-4 inline-flex items-center gap-3 text-[10px] font-black uppercase text-gray-400 tracking-widest">
          <span>📅 Último cierre: {formatDate(resumen.fecha)}</span>
          <span>•</span>
          <span>{data.registros} días registrados</span>
          <span>•</span>
          <span>Tasa BCV usada: Bs. {formatBs(resumen.tasaCambio)}</span>
        </div>
      </header>

      {/* TARJETAS RESUMEN */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Disponibilidad Total</div>
          <div className="text-2xl font-black text-gray-900">$ {formatUsd(resumen.disponibilidadUsd)}</div>
          <div className="text-xs text-gray-500 mt-1">Bs. {formatBs(resumen.disponibilidadBs)}</div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Saldo Final del Día</div>
          <div className="text-2xl font-black text-gray-900">$ {formatUsd(resumen.saldoFinalUsd)}</div>
          <div className="text-xs text-gray-500 mt-1">Bs. {formatBs(resumen.saldoFinalBs)}</div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Fondos Reservados</div>
          <div className="text-2xl font-black text-emerald-600">$ {formatUsd(resumen.totalFondosUsd)}</div>
          <div className="text-xs text-gray-500 mt-1">Bs. {formatBs(resumen.totalFondosBs)}</div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Recibos Pendientes</div>
          <div className="text-2xl font-black text-rose-600">{resumen.recibosPendientes}</div>
          <div className="text-xs text-gray-500 mt-1">Al cierre del último día</div>
        </div>
      </div>

      {/* 1. SALUD DE CAJA — VELOCÍMETRO */}
      <section className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-100/40">
        <header className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-3 border border-emerald-100">
            1 / 5 · Liquidez
          </div>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Índice de Salud de Caja</h2>
          <p className="text-sm text-gray-500 mt-2 max-w-2xl">
            Indica para cuántos meses de operación tiene dinero el edificio si <strong>nadie pagara
            condominio mañana</strong>. Calculado como Disponibilidad Total ÷ Egresos Promedio Mensuales.
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="flex flex-col items-center">
            {/* Gauge SVG semicircular */}
            <div className="relative w-[280px] h-[160px]">
              <svg viewBox="0 0 200 110" className="w-full h-full">
                {/* Arco fondo */}
                <path d="M 10 100 A 90 90 0 0 1 190 100" stroke="#f1f5f9" strokeWidth="18" fill="none" strokeLinecap="round" />
                {/* Arco progreso */}
                <path
                  d="M 10 100 A 90 90 0 0 1 190 100"
                  stroke={saludClass.color}
                  strokeWidth="18"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${gaugePct * 282.7} 282.7`}
                />
                {/* Aguja */}
                <line
                  x1="100" y1="100"
                  x2={100 + 75 * Math.cos((gaugeAngle * Math.PI) / 180)}
                  y2={100 + 75 * Math.sin((gaugeAngle * Math.PI) / 180)}
                  stroke="#1e293b" strokeWidth="3" strokeLinecap="round"
                />
                <circle cx="100" cy="100" r="6" fill="#1e293b" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                <div className="text-5xl font-black" style={{ color: saludClass.color }}>{formatNumber(meses, 1)}</div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">meses cubiertos</div>
              </div>
            </div>
            <div className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-50 ${saludClass.text} text-xs font-black uppercase tracking-widest`}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: saludClass.color }}></span>
              Salud {saludClass.label}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 p-5 rounded-2xl">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Disponibilidad Total</div>
              <div className="text-2xl font-black text-gray-900">$ {formatUsd(saludCaja.disponibilidadUsd)}</div>
            </div>
            <div className="bg-gray-50 p-5 rounded-2xl">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                Egresos Promedio Mensuales (últimos {saludCaja.mesesUsadosEnPromedio} meses)
              </div>
              <div className="text-2xl font-black text-gray-900">$ {formatUsd(saludCaja.egresosPromMensualUsd)}</div>
            </div>
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl text-xs text-amber-800 font-medium leading-relaxed">
              💡 <strong>Cómo leerlo:</strong> Un valor &lt; 1 mes significa que cualquier retraso en cobranza pone
              en riesgo los pagos del próximo mes. Lo ideal es mantenerse por encima de 3 meses como colchón.
            </div>
          </div>
        </div>
      </section>

      {/* 2. BRECHA CAMBIARIA */}
      <section className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-100/40">
        <header className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-50 text-violet-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-3 border border-violet-100">
            2 / 5 · Divisas
          </div>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Monitor de Brecha Cambiaria</h2>
          <p className="text-sm text-gray-500 mt-2 max-w-2xl">
            Compara el <strong>Saldo Final en USD</strong> contra el <strong>Saldo Final en Bs.
            convertido a la tasa de hoy</strong>. La diferencia muestra la pérdida (o ganancia)
            de poder adquisitivo por mantener efectivo en bolívares.
          </p>
        </header>
        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={brechaCambiaria}>
              <defs>
                <linearGradient id="gUsd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="gBs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }} tickFormatter={(d) => String(d).substring(5)} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }} tickFormatter={(v) => `$${formatNumber(v, 0)}`} />
              <Tooltip
                contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 25px rgb(0 0 0 / 0.1)", padding: "14px" }}
                formatter={(v: any, n: any) => {
                  const labels: Record<string, string> = { saldoUsd: "Saldo USD nominal", bsEnUsdHoy: "Saldo Bs (en USD a hoy)" };
                  return [`$ ${formatUsd(v)}`, labels[n] || n];
                }}
                labelFormatter={(l) => `Fecha: ${l}`}
              />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase" }} />
              <Area type="monotone" dataKey="saldoUsd" name="Saldo USD" stroke="#2563eb" strokeWidth={2} fill="url(#gUsd)" stackId="1" />
              <Area type="monotone" dataKey="bsEnUsdHoy" name="Saldo Bs (a tasa hoy)" stroke="#a78bfa" strokeWidth={2} fill="url(#gBs)" stackId="2" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 bg-violet-50 border border-violet-100 p-4 rounded-2xl text-xs text-violet-800 font-medium leading-relaxed">
          💡 <strong>Decisión clave:</strong> Si la curva morada (Bs en USD) cae respecto a la azul (USD nominal),
          el edificio está perdiendo poder de compra. Es señal para comprar divisas o reforzar el fondo de reserva en USD.
        </div>
      </section>

      {/* 3. PERFIL DE MOROSIDAD */}
      <section className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-100/40">
        <header className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-3 border border-rose-100">
            3 / 5 · Morosidad
          </div>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Perfil de Antigüedad de Deuda</h2>
          <p className="text-sm text-gray-500 mt-2 max-w-2xl">
            Muestra <strong>cuántos apartamentos deben 1, 2, 3 ó más cuotas</strong> al cierre de cada mes.
            Las barras apiladas separan por antigüedad y la línea roja indica el monto total adeudado en USD.
          </p>
        </header>

        {(!perfilMorosidad || perfilMorosidad.length === 0) ? (
          <div className="h-[200px] flex items-center justify-center text-gray-400 font-bold text-sm">
            Sin datos de historico_cobranza para este edificio.
          </div>
        ) : (
          <>
            {/* KPIs del último mes */}
            {(() => {
              const ultimo = perfilMorosidad[perfilMorosidad.length - 1];
              if (!ultimo) return null;
              const discrepancia = Math.abs((ultimo.montoUsd || 0) - (ultimo.montoSum || 0));
              const tieneDiscrepancia = ultimo.montoSum > 0 && discrepancia > 1;
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <div className="bg-gray-50 p-4 rounded-2xl text-center">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total con deuda</div>
                    <div className="text-3xl font-black text-gray-900">{ultimo.total}</div>
                    <div className="text-[10px] text-gray-400 font-bold">apartamentos</div>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-2xl text-center">
                    <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Solo 1 cuota</div>
                    <div className="text-3xl font-black text-amber-600">{ultimo.aptos1}</div>
                    <div className="text-[10px] text-amber-400 font-bold">deudores recientes</div>
                  </div>
                  <div className="bg-rose-50 p-4 rounded-2xl text-center">
                    <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">2 ó más cuotas</div>
                    <div className="text-3xl font-black text-rose-600">{ultimo.aptos2mas}</div>
                    <div className="text-[10px] text-rose-400 font-bold">{ultimo.pct2mas}% del total con deuda</div>
                  </div>
                  <div className={`p-4 rounded-2xl text-center ${tieneDiscrepancia ? "bg-amber-100 border-2 border-amber-400" : "bg-rose-100"}`}>
                    <div className="text-[10px] font-black text-rose-700 uppercase tracking-widest mb-1">Monto adeudado</div>
                    <div className="text-3xl font-black text-rose-800">$ {formatNumber(ultimo.montoUsd, 0)}</div>
                    <div className="text-[10px] text-rose-500 font-bold">USD total pendiente</div>
                    {tieneDiscrepancia && (
                      <div className="mt-2 text-[9px] text-amber-600 font-medium">
                        Verificar: suma buckets = $ {formatNumber(ultimo.montoSum, 0)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={perfilMorosidad} margin={{ top: 10, right: 50, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }} allowDecimals={false} label={{ value: "Aptos", angle: -90, position: "insideLeft", style: { fontSize: 9, fill: "#94a3b8", fontWeight: 700 } }} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "#f43f5e" }} tickFormatter={(v) => `$${formatNumber(v, 0)}`} />
                  <Tooltip
                    contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 25px rgb(0 0 0 / 0.1)", padding: "14px", fontSize: 11 }}
                    formatter={(v: any, name: any) => {
                      const labels: Record<string, string> = {
                        aptos1: "1 cuota (reciente)",
                        aptos2: "2 cuotas",
                        aptos3: "3 cuotas",
                        aptos4a6: "4 a 6 cuotas",
                        aptos7mas: "7+ cuotas (crítico)",
                        montoUsd: "Monto adeudado (USD)",
                      };
                      return [name === "montoUsd" ? `$ ${formatNumber(v, 0)}` : `${v} apt.`, labels[name] || name];
                    }}
                    labelFormatter={(l) => `Mes: ${l}`}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}
                    formatter={(value) => {
                      const map: Record<string, string> = {
                        aptos1: "1 cuota",
                        aptos2: "2 cuotas",
                        aptos3: "3 cuotas",
                        aptos4a6: "4–6 cuotas",
                        aptos7mas: "7+ cuotas",
                        montoUsd: "Monto USD",
                      };
                      return map[value] || value;
                    }}
                  />
                  {/* Barras apiladas por antigüedad */}
                  <Bar yAxisId="left" dataKey="aptos1"   name="aptos1"   stackId="a" fill="#fbbf24" radius={[0,0,0,0]} maxBarSize={40} />
                  <Bar yAxisId="left" dataKey="aptos2"   name="aptos2"   stackId="a" fill="#f97316" radius={[0,0,0,0]} maxBarSize={40} />
                  <Bar yAxisId="left" dataKey="aptos3"   name="aptos3"   stackId="a" fill="#ef4444" radius={[0,0,0,0]} maxBarSize={40} />
                  <Bar yAxisId="left" dataKey="aptos4a6" name="aptos4a6" stackId="a" fill="#dc2626" radius={[0,0,0,0]} maxBarSize={40} />
                  <Bar yAxisId="left" dataKey="aptos7mas" name="aptos7mas" stackId="a" fill="#7f1d1d" radius={[4,4,0,0]} maxBarSize={40} />
                  {/* Línea de monto adeudado en USD */}
                  <Line yAxisId="right" type="monotone" dataKey="montoUsd" name="montoUsd" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 3, fill: "#f43f5e" }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Leyenda de colores */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2 text-[10px] font-black uppercase">
              {[
                { color: "#fbbf24", label: "1 cuota", desc: "Reciente · aún recuperable" },
                { color: "#f97316", label: "2 cuotas", desc: "Atención · 2 meses sin pagar" },
                { color: "#ef4444", label: "3 cuotas", desc: "Alerta · trimestre en mora" },
                { color: "#dc2626", label: "4–6 cuotas", desc: "Grave · más de 3 meses" },
                { color: "#7f1d1d", label: "7+ cuotas", desc: "Crítico · gestión legal" },
              ].map(({ color, label, desc }) => (
                <div key={label} className="flex items-start gap-2 p-2 bg-gray-50 rounded-xl">
                  <span className="w-3 h-3 rounded-sm mt-0.5 flex-shrink-0" style={{ backgroundColor: color }}></span>
                  <div>
                    <div style={{ color }}>{label}</div>
                    <div className="text-gray-400 text-[9px] normal-case font-medium leading-tight mt-0.5">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-4 bg-rose-50 border border-rose-100 p-4 rounded-2xl text-xs text-rose-800 font-medium leading-relaxed">
          💡 <strong>Cómo leerlo:</strong> Las barras muestran cuántos apartamentos deben 1, 2, 3, 4–6 ó 7+ cuotas en cada mes.
          Mientras más crece la parte oscura (rojo intenso / marrón), más grave es la morosidad acumulada.
          La línea roja muestra el dinero total que se le debe al edificio en USD — si sube sostenidamente,
          la cobranza no está alcanzando para recuperar la deuda.
          <strong> Alarma preventiva:</strong> Si los apartamentos con 2+ cuotas superan el 30–40% del total, conviene
          activar gestión de cobranza formal o extrajudicial.
        </div>
      </section>

      {/* 4. COMPORTAMIENTO DE FONDOS */}
      <section className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-100/40">
        <header className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-3 border border-emerald-100">
            4 / 5 · Fondos
          </div>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Comportamiento de Fondos Específicos (USD)</h2>
          <p className="text-sm text-gray-500 mt-2 max-w-2xl">
            Evolución histórica de los <strong>fondos "intocables"</strong>: Reserva, Diferencial
            Cambiario e Intereses de Mora. Permite verificar que estén creciendo en el tiempo.
          </p>
        </header>
        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={fondos}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }} tickFormatter={(d) => String(d).substring(5)} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }} tickFormatter={(v) => `$${formatNumber(v, 0)}`} />
              <Tooltip
                contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 25px rgb(0 0 0 / 0.1)", padding: "14px" }}
                formatter={(v: any) => [`$ ${formatUsd(v)}`, ""]}
                labelFormatter={(l) => `Fecha: ${l}`}
              />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase" }} />
              <Line type="monotone" dataKey="reserva"     name="Fondo Reserva"        stroke="#10b981" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="difCambiaria" name="Fondo Dif. Cambiaria" stroke="#8b5cf6" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="intMora"     name="Fondo Int. Mora"      stroke="#f59e0b" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="total"       name="Total Fondos"         stroke="#0f172a" strokeWidth={2}   dot={false} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-xs text-emerald-800 font-medium leading-relaxed">
          💡 <strong>Garantía de transparencia:</strong> Si alguna línea cae sin justificación documentada,
          podría ser señal de que un fondo "intocable" se está usando para gastos corrientes.
        </div>
      </section>

      {/* 5. HEATMAP DÍA DE LA SEMANA */}
      <section className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-100/40">
        <header className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-3 border border-blue-100">
            5 / 5 · Operaciones
          </div>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Mapa de Calor — Movimiento por Día de la Semana</h2>
          <p className="text-sm text-gray-500 mt-2 max-w-2xl">
            Promedio histórico de <strong>ingresos y egresos en USD</strong> por día de la semana.
            Identifique los días con mayor flujo para coordinar pagos a proveedores o depósitos bancarios.
          </p>
        </header>

        <div className="grid grid-cols-7 gap-2 mb-6">
          {heatmap.map((h: any) => (
            <div key={h.dia} className="text-center">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{h.diaCorto}</div>
              <div className="rounded-2xl p-3 mb-1 transition-transform hover:scale-105" style={{ backgroundColor: cellColor(h.ingresos, "ingreso") }}>
                <div className="text-[9px] font-black text-emerald-700 uppercase">Ing.</div>
                <div className="text-sm font-black text-emerald-900">${formatNumber(h.ingresos, 0)}</div>
              </div>
              <div className="rounded-2xl p-3 transition-transform hover:scale-105" style={{ backgroundColor: cellColor(h.egresos, "egreso") }}>
                <div className="text-[9px] font-black text-rose-700 uppercase">Egr.</div>
                <div className="text-sm font-black text-rose-900">${formatNumber(h.egresos, 0)}</div>
              </div>
              <div className="text-[9px] text-gray-400 mt-2 font-bold">{h.count} días</div>
            </div>
          ))}
        </div>

        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={heatmap}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: "#64748b" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }} tickFormatter={(v) => `$${formatNumber(v, 0)}`} />
              <Tooltip
                cursor={{ fill: "#f8fafc" }}
                contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 25px rgb(0 0 0 / 0.1)", padding: "14px" }}
                formatter={(v: any, n: any) => [`$ ${formatUsd(v)}`, n]}
              />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase" }} />
              <Bar dataKey="ingresos" name="Ingresos prom." fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={36} />
              <Bar dataKey="egresos"  name="Egresos prom."  fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 bg-blue-50 border border-blue-100 p-4 rounded-2xl text-xs text-blue-800 font-medium leading-relaxed">
          💡 <strong>Programación operativa:</strong> Concentre los pagos a proveedores y depósitos bancarios
          en los días con mayor entrada de efectivo, y evite programar grandes egresos en los días de baja recaudación.
        </div>
      </section>
    </div>
  );
}
