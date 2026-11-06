import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { scan } from './scan.ts';
import type { Job } from './types.ts';

function salary(job: Job): string {
  const value = job.salary;
  if (!value?.min && !value?.max) return value?.currency ? value.currency + ' (monto no publicado)' : 'No publicado';
  const range = value.min && value.max ? value.min + '–' + value.max
    : value.min ? 'desde ' + value.min : 'hasta ' + value.max;
  return [value.currency ?? 'Moneda sin indicar', range, value.period ? '/ ' + value.period : ''].filter(Boolean).join(' ');
}

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
  const records = entries.map(({ job, screen }) => {
    const id = createHash('sha256').update(JSON.stringify([job.source, job.id])).digest('hex');
    const timestamp = job.published && Number.isFinite(job.published) ? new Date(job.published * 1000) : null;
    const date = timestamp && Number.isFinite(timestamp.getTime()) ? timestamp.toISOString().slice(0, 10) : null;
    const skills = ['React', 'TypeScript', 'Next.js', 'Node.js', 'NestJS']
      .filter(skill => job.description.toLowerCase().includes(skill.toLowerCase()));
    return {
      id, company: job.company, title: job.title, location: screen.geography,
      contract: job.contract ?? 'No publicada', salary: salary(job), skills,
      published_on: date, description: job.description, matches: [],
      questions: screen.decision === 'location-review'
        ? [screen.geography, ...screen.reasons]
        : screen.reasons,
      url: job.url, source: job.source,
    };
  });
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
