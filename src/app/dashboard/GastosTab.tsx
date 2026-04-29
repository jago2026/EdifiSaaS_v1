"use client";

import { formatBs, formatUsd, formatDate } from "@/lib/formatters";

interface GastosTabProps {
  activeTab: string;
  gastos: any[];
  loadingGastos: boolean;
  mesesGastos: string[];
  selectedMesGastos: string;
  setSelectedMesGastos: (mes: string) => void;
  loadGastos: (mes?: string) => void;
  tasaBCV: { dolar: number };
}

export function GastosTab({
  activeTab,
  gastos,
  loadingGastos,
  mesesGastos,
  selectedMesGastos,
  setSelectedMesGastos,
  loadGastos,
  tasaBCV
}: GastosTabProps) {
  if (activeTab !== "gastos") return null;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Gastos del Edificio</h2>
        {mesesGastos.length > 0 && (
          <select
            value={selectedMesGastos}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedMesGastos(val);
              loadGastos(val);
            }}
            className="text-sm border-gray-200 rounded-lg bg-gray-50 px-3 py-1.5 font-medium text-gray-600 focus:ring-2 focus:ring-indigo-500"
          >
            {mesesGastos.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        )}
      </div>
      {loadingGastos ? (
        <p className="text-gray-500 text-center py-8">Cargando...</p>
      ) : gastos.length === 0 ? (
        <p className="text-gray-500 text-center py-8 border border-dashed border-gray-200 rounded-lg">
          No hay gastos registrados.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Beneficiario</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Bs</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Monto USD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {gastos.filter(g => !g.isTotal).map((gasto: any) => (
                <tr key={gasto.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">{formatDate(gasto.fecha)}</td>
                  <td className="py-3 px-4 text-sm text-gray-900 font-medium">{gasto.beneficiario}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{gasto.descripcion}</td>
                  <td className="py-3 px-4 text-sm text-right font-bold text-orange-600">
                    Bs. {formatBs(gasto.monto)}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-gray-500">
                    $ {formatUsd(gasto.monto_usd || (gasto.monto / tasaBCV.dolar))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 font-bold border-t-2">
              <tr>
                <td colSpan={3} className="py-4 px-4 text-right text-gray-900 uppercase text-xs">Total del Periodo:</td>
                <td className="py-4 px-4 text-right text-lg text-orange-600">
                  Bs. {formatBs(gastos.find(g => g.isTotal)?.monto || 0)}
                </td>
                <td className="py-4 px-4 text-right text-gray-600">
                  $ {formatUsd(gastos.find(g => g.isTotal)?.monto_usd || (gastos.find(g => g.isTotal)?.monto / tasaBCV.dolar) || 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
