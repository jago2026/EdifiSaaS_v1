"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

export function SaludFinanciera({ edificioId }: { edificioId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const formatCurrency = (amount: number | undefined | null, decimals: number = 2): string => {
    if (amount === undefined || amount === null || isNaN(amount)) return "-";
    const parts = amount.toFixed(decimals).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return parts.join(',');
  };

  const formatBs = (num: number) => formatCurrency(num, 2);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/analytics/salud-financiera?edificioId=${edificioId}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Error loading salud financiera data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [edificioId]);

  if (loading) return <div className="p-8 text-center animate-pulse text-indigo-600 font-black">Cargando KPIs...</div>;
  if (!data) return <div className="p-8 text-center text-gray-400">No hay datos suficientes para el reporte de salud.</div>;

  const chartData = Object.entries(data.statsByDay || {}).map(([name, stats]: any) => ({
    name,
    total: stats.total
  }));

  return (
    <div className="space-y-8 animate-in zoom-in duration-700">
      <header className="relative border-b pb-8 border-gray-100">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 border border-emerald-100">
          🏢 KPIs Ejecutivos
        </div>
        <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-4">
          Salud <span className="text-emerald-600">Financiera</span>
        </h2>
        <p className="text-gray-500 max-w-2xl font-medium">
          Indicadores clave para la toma de decisiones estratégicas de la Junta de Condominio.
        </p>
      </header>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-100/50 flex flex-col items-center text-center">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Índice de Liquidez</div>
          <div className={`text-6xl font-black mb-4 ${data.liquidez.valor >= 1 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatCurrency(data.liquidez.valor, 2)}
          </div>
          <div className="text-xs font-bold text-gray-500 uppercase mb-6">Caja vs Gastos Facturados</div>
          <div className="w-full bg-gray-50 p-4 rounded-2xl space-y-2">
             <div className="flex justify-between text-[10px] font-black uppercase">
                <span className="text-gray-400">Disponible</span>
                <span className="text-gray-900">Bs. {formatBs(data.liquidez.disponibilidad)}</span>
             </div>
             <div className="flex justify-between text-[10px] font-black uppercase">
                <span className="text-gray-400">Gastos</span>
                <span className="text-gray-900">Bs. {formatBs(data.liquidez.gastos)}</span>
             </div>
          </div>
          <p className="mt-6 text-[10px] leading-relaxed text-gray-400 font-medium">
            {data.liquidez.valor >= 1 
                ? "✅ Excelente: Tenemos fondos para cubrir el 100% de los gastos facturados." 
                : "⚠️ Alerta: El flujo de caja no alcanza para cubrir todos los gastos del mes."}
          </p>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-100/50 flex flex-col items-center text-center">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Efectividad 1ra Sem.</div>
          <div className="text-6xl font-black text-indigo-600 mb-4">
            {formatCurrency(data.efectividad.valor, 0)}%
          </div>
          <div className="text-xs font-bold text-gray-500 uppercase mb-6">{data.efectividad.aptos} de {data.efectividad.totalAptos} Apartamentos</div>
          
          <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden mb-6">
            <div className="h-full bg-indigo-600 rounded-full" style={{width: `${data.efectividad.valor}%`}}></div>
          </div>
          
          <p className="text-[10px] leading-relaxed text-gray-400 font-medium">
            Porcentaje de vecinos que pagan sus recibos en los primeros 7 días tras la emisión. Una efectividad alta garantiza operatividad sin retrasos.
          </p>
        </div>

        <div className="bg-indigo-900 p-8 rounded-[2rem] text-white flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 text-8xl">🏆</div>
          <div className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-6">El Día de Oro</div>
          <div className="text-5xl font-black text-amber-400 mb-4 uppercase italic">
            {data.diaDeOro.nombre}
          </div>
          <div className="text-xs font-bold text-indigo-200 uppercase mb-8">Mayor Recaudación Histórica</div>
          
          <div className="w-full bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10">
             <div className="text-[10px] font-black uppercase text-indigo-300 mb-2">Total Recaudado en {data.diaDeOro.nombre}s</div>
             <div className="text-2xl font-black">Bs. {formatBs(data.diaDeOro.total)}</div>
          </div>

          <p className="mt-6 text-[10px] leading-relaxed text-indigo-300 font-medium italic">
            "Programe los pagos a proveedores o reparaciones mayores para este día, ya que es cuando hay mayor ingreso de liquidez."
          </p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-100/50">
          <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-8">Flujo de Ingresos por Día de la Semana</h3>
          <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#64748b'}} />
                   <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#64748b'}} hide />
                   <Tooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '15px' }}
                   />
                   <Bar dataKey="total" radius={[10, 10, 10, 10]} barSize={50} fill="#4f46e5">
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-kpi-${index}`} fill={entry.name === data.diaDeOro.nombre ? '#fbbf24' : '#4f46e5'} />
                      ))}
                   </Bar>
                </BarChart>
             </ResponsiveContainer>
          </div>
      </div>
    </div>
  );
}
