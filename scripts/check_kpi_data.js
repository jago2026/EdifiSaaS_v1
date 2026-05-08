
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

// Try to find env vars in nearby files or just use placeholders to see if it works with system env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const { data: edificios } = await supabase.from('edificios').select('id, nombre, unidades');
  console.log("Edificios:", edificios);

  if (edificios && edificios.length > 0) {
    const eid = edificios[0].id;
    const { data: balances } = await supabase.from('balances').select('*').eq('edificio_id', eid).eq('mes', '2026-04');
    console.log("Balances April:", balances);
    
    const { data: alicuotas } = await supabase.from('alicuotas').select('id').eq('edificio_id', eid);
    console.log("Alicuotas count:", alicuotas?.length);
  }
}

checkData();
