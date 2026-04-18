// backend/lib/services/syncService.ts
import { supabase } from '../db.js';
import { generateHash } from '../utils.js';
import { loginToAdmin, downloadReceipts, downloadExpenses, downloadGastos, downloadBalance, downloadAlicuotas } from '../scraping.js';

export async function ejecutarSync(buildingId: number) {
  try {
    // Obtener configuración del edificio para el baseUrl
    const { data: config } = await supabase
      .from('configuracion')
      .select('url_login')
      .eq('building_id', buildingId)
      .single();
    
    if (!config) throw new Error('Configuración no encontrada');
    const baseUrl = new URL(config.url_login).origin;

    const sessionCookie = await loginToAdmin(buildingId);

    const [receipts, expenses, gastos, balanceData, alicuotas] = await Promise.all([
      downloadReceipts(sessionCookie, baseUrl),
      downloadExpenses(sessionCookie, baseUrl),
      downloadGastos(sessionCookie, baseUrl),
      downloadBalance(sessionCookie, baseUrl),
      downloadAlicuotas(sessionCookie, baseUrl)
    ]);

    let newReceipts = 0, newExpenses = 0, newGastos = 0, newBalance = false, newAlicuotas = 0;

    // Procesar Recibos
    if (receipts.length > 0) {
      await supabase.from('recibos').delete().eq('building_id', buildingId);
      await supabase.from('recibos').insert(receipts.map(r => ({ ...r, building_id: buildingId, sincronizado: true })));
      newReceipts = receipts.length;
    }

    // Procesar Alicuotas
    if (alicuotas.length > 0) {
      await supabase.from('alicuotas').delete().eq('building_id', buildingId);
      await supabase.from('alicuotas').insert(alicuotas.map(a => ({ ...a, building_id: buildingId, sincronizado: true })));
      newAlicuotas = alicuotas.length;
    }

    // Procesar Egresos (con hashing para evitar duplicados en historial)
    for (const e of expenses) {
      const hash = await generateHash(`${e.fecha}|${e.beneficiario}|${e.monto}`);
      const { data: exists } = await supabase
        .from('egresos')
        .select('id')
        .eq('hash', hash)
        .eq('building_id', buildingId)
        .single();

      if (!exists) {
        await supabase.from('egresos').insert({
          building_id: buildingId,
          ...e,
          hash,
          sincronizado: true
        });
        newExpenses++;
      }
    }

    // Procesar Gastos
    for (const g of gastos) {
      const hash = await generateHash(`GASTO|${g.codigo}|${g.monto}`);
      await supabase.from('gastos').upsert({
        building_id: buildingId,
        ...g,
        hash,
        sincronizado: true
      }, { onConflict: 'building_id,hash' });
      newGastos++;
    }

    // Procesar Balance
    if (balanceData) {
      await supabase.from('balances').upsert({
        ...balanceData,
        building_id: buildingId,
        sincronizado: true
      }, { onConflict: 'building_id,mes' }); // Asumiendo que mes está en balanceData o se maneja por building_id
      newBalance = true;
    }

    // Registrar log
    await supabase.from('log_proceso').insert({
      building_id: buildingId,
      tipo: 'sync',
      status: 'success',
      mensaje: `Sync completado. Recibos(${newReceipts}), Egresos(${newExpenses}), Gastos(${newGastos}), Alicuotas(${newAlicuotas})`
    });

    return { success: true, newReceipts, newExpenses, newGastos, newBalance, newAlicuotas };
  } catch (error: any) {
    await supabase.from('log_proceso').insert({
      building_id: buildingId,
      tipo: 'sync',
      status: 'error',
      mensaje: error.message
    });
    throw error;
  }
}
