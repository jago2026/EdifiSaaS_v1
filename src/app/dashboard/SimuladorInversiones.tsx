"use client";

import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function SimuladorInversiones({ edificioId }: { edificioId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [montoProyecto, setMontoProyecto] = useState<number>(5000);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/analytics/inversiones?edificioId=${edificioId}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Error loading inversiones data:", err);
      } finally {
        setLoading(setLoading(false) as any);
      }
    }
    loadData();
  }, [edificioId]);

  if (loading) return <div className="p-8 text-center animate-pulse text-indigo-600 font-black">Cargando Simulador...</div>;
  if (!data) return <div className="p-8 text-center text-gray-400">No hay datos suficientes para la simulación.</div>;

  const mesesNecesarios = Math.ceil(Math.max(0, montoProyecto - data.disponibleParaInvertirUsd) / (data.excedentePromedioUsd || 1));

  const formatUsd = (num: number) => num.toLocaleString("en-US", { style: "currency", currency: "USD" });

  return (
    <div className="space-y-8 animate-in slide-in-from-right duration-700">
      <header className="relative border-b pb-8 border-gray-100">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 border border-amber-100">
          💰 Planificación Estratégica
        </div>
        <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-4">
          Simulador de <span className="text-amber-500">Inversiones</span>
        </h2>
        <p className="text-gray-500 max-w-2xl font-medium">
          ¿Tiene un proyecto para el edificio? Calcule cuándo podrá financiarlo basado en su flujo de caja histórico.
        </p>
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Panel de Configuración */}
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-100/50 space-y-8">
           <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4">Costo del Proyecto (USD)</label>
              <input 
                type="number" 
                value={montoProyecto}
                onChange={(e) => setMontoProyecto(Number(e.target.value))}
                className="w-full text-4xl font-black text-indigo-600 border-b-4 border-indigo-100 focus:border-indigo-600 outline-none pb-2 transition-all"
              />
           </div>

           <div className="space-y-4">
              <div className="flex justify-between items-center">
                 <span className="text-xs font-bold text-gray-500 uppercase">Disponible Hoy</span>
                 <span className="text-lg font-black text-gray-900">{formatUsd(data.disponibilidadActualUsd)}</span>
              </div>
              <div className="flex justify-between items-center">
                 <span className="text-xs font-bold text-gray-500 uppercase">Fondo Reserva (Bloqueado)</span>
                 <span className="text-lg font-black text-rose-500">-{formatUsd(data.fondoReservaUsd)}</span>
              </div>
              <div className="pt-4 border-t flex justify-between items-center">
                 <span className="text-xs font-black text-indigo-600 uppercase">Para Inversión</span>
                 <span className="text-2xl font-black text-indigo-600">{formatUsd(data.disponibleParaInvertirUsd)}</span>
              </div>
           </div>

           <div className="p-6 bg-indigo-50 rounded-3xl space-y-2">
              <div className="text-[10px] font-black text-indigo-400 uppercase">Capacidad de Ahorro Mensual</div>
              <div className="text-2xl font-black text-indigo-700">{formatUsd(data.excedentePromedioUsd)}</div>
              <p className="text-[9px] font-bold text-indigo-300 uppercase italic leading-tight">
                * Promedio de los últimos 6 meses (Ingresos - Egresos)
              </p>
           </div>
        </div>

        {/* Resultado de la Simulación */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-10 rounded-[2rem] text-white shadow-xl shadow-amber-100 relative overflow-hidden group">
            <div className="absolute -right-10 -bottom-10 opacity-10 text-[15rem] font-black rotate-12 transition-transform group-hover:rotate-0 duration-1000">🏗️</div>
            <div className="relative z-10">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-4">Resultado del Análisis</div>
                {montoProyecto <= data.disponibleParaInvertirUsd ? (
                    <div className="space-y-4">
                        <div className="text-5xl font-black tracking-tighter leading-none">¡Proyecto Viable <br/> <span className="text-indigo-900">Hoy Mismo</span>!</div>
                        <p className="text-lg font-medium opacity-90 max-w-md">
                            Su disponibilidad actual de <span className="font-black">{formatUsd(data.disponibleParaInvertirUsd)}</span> cubre el 100% del costo sin tocar el fondo de reserva.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="text-5xl font-black tracking-tighter leading-none">Disponible en <br/> <span className="text-indigo-900">{mesesNecesarios} meses</span></div>
                        <p className="text-lg font-medium opacity-90 max-w-md">
                            Basado en su ritmo de recaudación, podrá iniciar la obra en <span className="font-black uppercase">{new Date(new Date().setMonth(new Date().getMonth() + mesesNecesarios)).toLocaleDateString('es-VE', { month: 'long', year: 'numeric' })}</span>.
                        </p>
                    </div>
                )}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-100/50">
             <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Historial de Disponibilidad (USD)</h3>
             <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.historial}>
                        <defs>
                            <linearGradient id="colorDisp" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="fecha" hide />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} hide />
                        <Tooltip 
                            contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '15px' }}
                            formatter={(val: any) => formatUsd(val)}
                        />
                        <Area type="monotone" dataKey="disponibilidad_total_usd" stroke="#f59e0b" strokeWidth={4} fillOpacity={1} fill="url(#colorDisp)" />
                    </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
