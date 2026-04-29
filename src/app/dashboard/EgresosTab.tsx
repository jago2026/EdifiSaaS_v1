"use client";

import { formatBs, formatUsd, formatDate } from "@/lib/formatters";

interface EgresosTabProps {
  activeTab: string;
  egresos: any[];
  loadingEgresos: boolean;
  mesesEgresos: string[];
  selectedMesEgresos: string;
  setSelectedMesEgresos: (mes: string) => void;
  loadEgresos: (mes?: string) => void;
  tasaBCV: { dolar: number };
}

export function EgresosTab({
  activeTab,
  egresos,
  loadingEgresos,
  mesesEgresos,
  selectedMesEgresos,
  setSelectedMesEgresos,
  loadEgresos,
  tasaBCV
}: EgresosTabProps) {
  if (activeTab !== "egresos") return null;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Egresos Generales</h2>
        {mesesEgresos.length > 0 && (
          <select
            value={selectedMesEgresos}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedMesEgresos(val);
              loadEgresos(val);
            }}
            className="text-sm border-gray-200 rounded-lg bg-gray-50 px-3 py-1.5 font-medium text-gray-600 focus:ring-2 focus:ring-indigo-500"
          >
            {mesesEgresos.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        )}
      </div>
      {loadingEgresos ? (
        <p className="text-gray-500 text-center py-8">Cargando...</p>
      ) : egresos.length === 0 ? (
        <p className="text-gray-500 text-center py-8 border border-dashed border-gray-200 rounded-lg">
          No hay egresos registrados.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Beneficiario</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Operación</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Bs</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Monto USD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {egresos.filter(e => !e.isTotal).map((egreso: any) => (
                <tr key={egreso.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">{formatDate(egreso.fecha)}</td>
                  <td className="py-3 px-4 text-sm text-gray-900 font-medium">{egreso.beneficiario}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{egreso.descripcion}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{egreso.operacion}</td>
                  <td className="py-3 px-4 text-sm text-right font-bold text-red-600">
                    Bs. {formatBs(egreso.monto)}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-gray-500">
                    $ {formatUsd(egreso.monto_usd || (egreso.monto / tasaBCV.dolar))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 font-bold border-t-2">
              <tr>
                <td colSpan={4} className="py-4 px-4 text-right text-gray-900 uppercase text-xs">Total del Periodo:</td>
                <td className="py-4 px-4 text-right text-lg text-red-600">
                  Bs. {formatBs(egresos.find(e => e.isTotal)?.monto || 0)}
                </td>
                <td className="py-4 px-4 text-right text-gray-600">
                  $ {formatUsd(egresos.find(e => e.isTotal)?.monto_usd || (egresos.find(e => e.isTotal)?.monto / tasaBCV.dolar) || 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
