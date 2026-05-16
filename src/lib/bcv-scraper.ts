
export interface BCVRates {
  dolar: number;
  euro: number;
  fecha: string;
  fuente: string;
}

export async function scrapeBCV(): Promise<BCVRates | null> {
  const urls = [
    "https://www.bcv.org.ve/glosario/cambio-oficial", // Plan A
    "https://www.bcv.org.ve/"                         // Plan B
  ];

  for (const url of urls) {
    try {
      console.log(`[BCV-Scraper] Intentando fuente: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        console.warn(`[BCV-Scraper] Fallo HTTP ${response.status} para ${url}`);
        continue;
      }

      const htmlContent = await response.text();
      
      if (htmlContent.length < 1000) {
        console.warn(`[BCV-Scraper] Contenido demasiado corto para ${url}`);
        continue;
      }

      // === REGEX MEJORADOS (basados en script del usuario) ===
      const dMatch = htmlContent.match(/id="dolar"[\s\S]*?strong[^>]*>[\s]*([\d.,]+)/i);
      const eMatch = htmlContent.match(/id="euro"[\s\S]*?strong[^>]*>[\s]*([\d.,]+)/i);
      
      // Intentar varias formas de extraer la fecha
      const tMatch = htmlContent.match(/Fecha Valor:?\s*([^\n<]+)/i) ||
                     htmlContent.match(/class="date-display-single"[^>]*content="([^"]+)"/i) ||
                     htmlContent.match(/(\d{1,2}\s+(?:de\s+)?(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+\d{4})/i);

      if (dMatch && eMatch) {
        const dolarStr = dMatch[1].replace(/\./g, '').replace(',', '.').trim();
        const euroStr  = eMatch[1].replace(/\./g, '').replace(',', '.').trim();
        
        const rates: BCVRates = {
          dolar: parseFloat(dolarStr),
          euro:  parseFloat(euroStr),
          fecha: new Date().toISOString().split('T')[0],
          fuente: url
        };

        // Parsear fecha si se encontró
        if (tMatch) {
          const fechaTexto = tMatch[1].trim();
          const matchFecha = fechaTexto.match(/(\d{1,2})[^0-9]+(\d{4})/);
          if (matchFecha) {
            const dia = parseInt(matchFecha[1]);
            const anio = parseInt(matchFecha[2]);
            const mes = getMesNumero(fechaTexto);
            // Asegurar que la fecha sea correcta en el huso horario local (Venezuela)
            const dateObj = new Date(anio, mes, dia);
            rates.fecha = dateObj.toISOString().split('T')[0];
          }
        }
        
        console.log(`[BCV-Scraper] ✅ Éxito desde ${url}: Dólar=${rates.dolar}, Euro=${rates.euro}, Fecha=${rates.fecha}`);
        return rates;
      }
    } catch (e: any) {
      console.error(`[BCV-Scraper] Error al acceder a ${url}:`, e.message);
    }
  }

  return null;
}

// Función auxiliar para meses en español/inglés
function getMesNumero(texto: string): number {
  const meses: { [key: string]: number } = {
    enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
    julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
    january:0, february:1, march:2, april:3, may:4, june:5, july:6, 
    august:7, september:8, october:9, november:10, december:11
  };
  texto = texto.toLowerCase();
  for (const mes in meses) {
    if (texto.includes(mes)) return meses[mes];
  }
  return new Date().getMonth();
}
