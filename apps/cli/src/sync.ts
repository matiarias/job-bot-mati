import { catalogRecord } from '@job-bot/job-search/catalog';
import { join } from 'node:path';
import { scan } from './scan.ts';


async function main() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key?.startsWith('sb_secret_')) {
    throw new Error('Configurá SUPABASE_URL y SUPABASE_SECRET_KEY en .env para publicar ofertas.');
  }
  const endpoint = new URL('/rest/v1/jobs', url);
  if (endpoint.protocol !== 'https:' || !endpoint.hostname.endsWith('.supabase.co')) {
    throw new Error('SUPABASE_URL debe ser una dirección HTTPS de Supabase.');
  }
  endpoint.searchParams.set('on_conflict', 'id');

  const result = await scan({
    preview: true,
    calibrate: false,
    directory: join(import.meta.dirname, '..', '..', '..', 'data'),
    key: process.env.HIMALAYAS_API_KEY?.trim(),
  });
  if (result.failed) throw new Error('Fallaron las fuentes. El catálogo no se modificó.');
  const entries = [...result.top, ...result.pending];
  const records = entries.map(catalogRecord);
  if (!records.length) {
    console.log('La búsqueda no encontró ofertas para publicar. El catálogo se conservó.');
    return;
  }
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(records),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error('Supabase rechazó la publicación (HTTP ' + response.status + ').');
  console.log('Ofertas publicadas o actualizadas: ' + records.length);
  for (const warning of result.errors) console.warn(warning);
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : 'No se pudo publicar el catálogo.');
  process.exitCode = 1;
}
