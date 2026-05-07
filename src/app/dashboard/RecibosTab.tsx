"use client";

import { formatBs, formatUsd, formatDate, formatNumber } from "@/lib/formatters";

interface RecibosTabProps {
  activeTab: string;
  recibos: any[];
  reciboGeneral: any[];
  selectedMesRecibos: string;
  setSelectedMesRecibos: (mes: string) => void;
  building: any;
  tasaBCV: { dolar: number };
  loadingRecibos: boolean;
  onRefresh: () => void;
}

export function RecibosTab({
  activeTab,
  recibos,
  reciboGeneral,
  selectedMesRecibos,
  setSelectedMesRecibos,
  building,
  tasaBCV,
  loadingRecibos,
  onRefresh
}: RecibosTabProps) {
  if (activeTab !== "recibos") return null;

  return (
    <div className="space-y-6">
      {selectedMesRecibos && selectedMesRecibos !== "" && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          {(() => {
            const firstRecibo = recibos[0];
            const rate = (firstRecibo && typeof firstRecibo.deuda_usd === 'number' && firstRecibo.deuda_usd > 0)
              ? (firstRecibo.deuda / firstRecibo.deuda_usd)
              : (tasaBCV.dolar || 1);

            const uniqueItems = Array.from(new Set(reciboGeneral.map(i => `${i.codigo}-${i.descripcion}-${i.monto}`)))
              .map(u => reciboGeneral.find(i => `${i.codigo}-${i.descripcion}-${i.monto}` === u));

            const itemsFondos = uniqueItems.filter(i => i?.descripcion?.toUpperCase().includes('FONDO') || i?.codigo === '00001' && i?.descripcion?.toUpperCase().includes('FONDO'));
            const itemsNoComunes = uniqueItems.filter(i => i?.codigo === '00085' || i?.descripcion?.toUpperCase().includes('FONDO DIFERENCIAL'));
            const itemsComunes = uniqueItems.filter(i => i && !itemsFondos.includes(i) && !itemsNoComunes.includes(i));

            const sumMonto = (arr: any[]) => arr.filter(i => i.tipo !== 'subtotal').reduce((sum, i) => sum + Number(i.monto || 0), 0);
            const totalGeneral = sumMonto(uniqueItems);

            return (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 uppercase">Recibo de Condominio General</h2>
                    <p className="text-sm text-gray-500 font-medium">Resumen de gastos facturados para el periodo: <span className="text-blue-600">{selectedMesRecibos || "Último Mes"}</span></p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400 uppercase font-bold mb-1">Total Facturación</div>
                    <div className="text-2xl font-black text-gray-900">Bs. {formatBs(totalGeneral)}</div>
                    <div className="text-sm font-bold text-gray-500">$ {formatUsd(totalGeneral / rate)}</div>
                  </div>
                </div>

                <div className="overflow-x-auto border rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase">Código</th>
                        <th className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase">Descripción de Gasto</th>
                        <th className="py-3 px-4 text-right text-[10px] font-bold text-gray-500 uppercase">Monto (Bs)</th>
                        <th className="py-3 px-4 text-right text-[10px] font-bold text-gray-500 uppercase">Monto (USD)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {itemsComunes.map((item, idx) => (
                        <tr key={`com-${idx}`} className="hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm text-gray-400 font-mono">{item.codigo?.split('#')[0]}</td>
                          <td className="py-3 px-4 text-sm text-gray-800 font-medium uppercase">{item.descripcion}</td>
                          <td className="py-3 px-4 text-sm text-right text-gray-900 font-bold">Bs. {formatBs(item.monto)}</td>
                          <td className="py-3 px-4 text-sm text-right text-gray-400">$ {formatUsd(item.monto / rate)}</td>
                        </tr>
                      ))}
                      {itemsFondos.length > 0 && (
                        <>
                          <tr className="bg-gray-50 font-bold">
                            <td colSpan={2} className="py-2 px-4 text-xs text-gray-500 uppercase">FONDOS Y RESERVAS</td>
                            <td className="py-2 px-4 text-right text-sm">Bs. {formatBs(sumMonto(itemsFondos))}</td>
                            <td></td>
                          </tr>
                          {itemsFondos.map((item, idx) => (
                            <tr key={`fond-${idx}`} className="hover:bg-gray-50 italic">
                              <td className="py-2 px-4 text-xs text-gray-400 font-mono">{item.codigo?.split('#')[0]}</td>
                              <td className="py-2 px-4 text-xs text-gray-600 uppercase">{item.descripcion}</td>
                              <td className="py-2 px-4 text-right text-xs text-gray-600">Bs. {formatBs(item.monto)}</td>
                              <td className="py-2 px-4 text-right text-xs text-gray-400">$ {formatUsd(item.monto / rate)}</td>
                            </tr>
                          ))}
                        </>
                      )}
                      {itemsNoComunes.length > 0 && (
                        <>
                          <tr className="bg-gray-50 font-bold">
                            <td colSpan={2} className="py-2 px-4 text-xs text-gray-500 uppercase">GASTOS NO COMUNES (PRIVATIVOS)</td>
                            <td className="py-2 px-4 text-right text-sm">Bs. {formatBs(sumMonto(itemsNoComunes))}</td>
                            <td></td>
                          </tr>
                          {itemsNoComunes.map((item, idx) => (
                            <tr key={`nocom-${idx}`} className="hover:bg-gray-50 italic">
                              <td className="py-2 px-4 text-xs text-gray-400 font-mono">{item.codigo?.split('#')[0]}</td>
                              <td className="py-2 px-4 text-xs text-gray-600 uppercase">{item.descripcion}</td>
                              <td className="py-2 px-4 text-right text-xs text-gray-600">Bs. {formatBs(item.monto)}</td>
                              <td className="py-2 px-4 text-right text-xs text-gray-400">$ {formatUsd(item.monto / rate)}</td>
                            </tr>
                          ))}
                        </>
                      )}
                    </tbody>
                    <tfoot className="bg-gray-900 text-white font-black border-t-2">
                      <tr>
                        <td colSpan={2} className="py-4 px-4 text-left uppercase text-[10px]">
                          Cant. conceptos: {uniqueItems.length}
                        </td>
                        <td className="py-4 px-4 text-right text-lg text-blue-400">Bs. {formatBs(totalGeneral)}</td>
                        <td className="py-4 px-4 text-right text-gray-300">$ {formatUsd(totalGeneral / rate)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            );
          })()}
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900 uppercase">Estado de Cuenta por Unidades</h2>
          <button 
            onClick={onRefresh}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            title="Refrescar lista"
          >
            🔄
          </button>
        </div>

        {loadingRecibos ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-4 font-medium">Cargando recibos...</p>
          </div>
        ) : recibos.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-2xl bg-gray-50">
            <p className="text-gray-500">No hay recibos registrados para este edificio.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border rounded-xl">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="py-3 px-4 text-left text-[10px] font-bold text-gray-500 uppercase">Unidad</th>
                  <th className="py-3 px-4 text-left text-[10px] font-bold text-gray-500 uppercase">Propietario</th>
                  <th className="py-3 px-4 text-center text-[10px] font-bold text-gray-500 uppercase">Recibos</th>
                  <th className="py-3 px-4 text-right text-[10px] font-bold text-gray-500 uppercase">Deuda Total (Bs)</th>
                  <th className="py-3 px-4 text-right text-[10px] font-bold text-gray-500 uppercase">Deuda (USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recibos.map((rec) => (
                  <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-sm font-bold text-gray-900">{rec.unidad}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{rec.propietario}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${rec.num_recibos > 1 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {rec.num_recibos}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-sm font-black text-gray-900">Bs. {formatBs(rec.deuda)}</td>
                    <td className="py-3 px-4 text-right text-sm font-bold text-blue-600">$ {formatUsd(rec.deuda_usd || (rec.deuda / tasaBCV.dolar))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-900 text-white font-bold">
                <tr>
                  <td colSpan={2} className="py-4 px-4 text-left uppercase text-[10px]">
                    Total Unidades: {recibos.length} | Recibos: {recibos.reduce((sum, r) => sum + r.num_recibos, 0)}
                  </td>
                  <td className="py-4 px-4 text-right uppercase text-[10px]">Total General por Cobrar:</td>
                  <td className="py-4 px-4 text-right text-lg">
                    Bs. {formatBs(recibos.reduce((sum, r) => sum + Number(r.deuda), 0))}
                  </td>
                  <td className="py-4 px-4 text-right text-blue-400">
                    $ {formatUsd(recibos.reduce((sum, r) => sum + Number(r.deuda_usd || (r.deuda / tasaBCV.dolar)), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
