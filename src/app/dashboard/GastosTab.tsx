"use client";

import { useState } from "react";
import { formatBs, formatUsd, formatDate } from "@/lib/formatters";

interface GastosTabProps {
  activeTab: string;
  loading: boolean;
  gastos: any[];
  meses: string[];
  selectedMes: string;
  onMesChange: (mes: string) => void;
  tasaBCV: { dolar: number };
}

export function GastosTab({
  activeTab,
  loading,
  gastos,
  meses,
  selectedMes,
  onMesChange,
  tasaBCV
}: GastosTabProps) {
  if (activeTab !== "gastos") return null;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Listado Detallado de Gastos</h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
            Consulta los gastos registrados para el periodo seleccionado
          </p>
        </div>
        
        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100">
          <span className="text-[10px] font-black text-gray-400 uppercase ml-2">Periodo:</span>
          <select
            value={selectedMes}
            onChange={(e) => onMesChange(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          >
            <option value="">Mes Actual</option>
            {meses.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-sm text-gray-500 font-medium animate-pulse">Cargando listado de gastos...</p>
        </div>
      ) : gastos.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
          <div className="text-4xl mb-4">🧾</div>
          <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">No se encontraron gastos para este periodo</p>
          <p className="text-[10px] text-gray-400 mt-1">Intenta sincronizar los datos o seleccionar otro mes</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="text-left py-4 px-4 text-[10px] font-black uppercase tracking-widest">Fecha</th>
                <th className="text-left py-4 px-4 text-[10px] font-black uppercase tracking-widest">Código</th>
                <th className="text-left py-4 px-4 text-[10px] font-black uppercase tracking-widest">Descripción del Gasto</th>
                <th className="text-right py-4 px-4 text-[10px] font-black uppercase tracking-widest">Monto USD</th>
                <th className="text-right py-4 px-4 text-[10px] font-black uppercase tracking-widest">Monto Bs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {gastos.map((gasto, idx) => (
                <tr key={gasto.id || idx} className="hover:bg-indigo-50/30 transition-colors group">
                  <td className="py-4 px-4 text-xs font-bold text-gray-500 whitespace-nowrap">
                    {formatDate(gasto.fecha)}
                  </td>
                  <td className="py-4 px-4">
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-[10px] font-black font-mono">
                      {gasto.codigo}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm font-bold text-gray-800 group-hover:text-indigo-700 transition-colors">
                    {gasto.descripcion}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="text-sm font-black text-emerald-600">
                      $ {formatUsd(gasto.monto_usd)}
                    </div>
                    <div className="text-[9px] text-gray-400 font-bold uppercase">
                      Tasa: {formatBs(gasto.tasa_bcv || tasaBCV.dolar)}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="text-sm font-black text-gray-900">
                      Bs. {formatBs(gasto.monto)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-100">
              <tr>
                <td colSpan={3} className="py-4 px-4 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  Total Gastos del Periodo:
                </td>
                <td className="py-4 px-4 text-right text-sm font-black text-emerald-700">
                  $ {formatUsd(gastos.reduce((sum, g) => sum + (g.monto_usd || 0), 0))}
                </td>
                <td className="py-4 px-4 text-right text-lg font-black text-indigo-950">
                  Bs. {formatBs(gastos.reduce((sum, g) => sum + Number(g.monto), 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
