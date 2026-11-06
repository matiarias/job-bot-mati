import type { Job } from '@job-bot/contracts';

export function createSupabaseJobsReader() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url && !key) return undefined;
  if (!url || !key?.startsWith('sb_publishable_')) {
    throw new Error('Configurá SUPABASE_URL y una SUPABASE_PUBLISHABLE_KEY válida.');
  }

  const endpoint = new URL('/rest/v1/jobs', url);
  endpoint.searchParams.set(
    'select',
    'id,company,title,location,contract,salary,skills,date:published_on,description,matches,questions',
  );
  endpoint.searchParams.set('order', 'published_on.desc,id.asc');

  return async (): Promise<Job[]> => {
    const response = await fetch(endpoint, {
      headers: { apikey: key },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`Supabase respondió con HTTP ${response.status}.`);

    const jobs: unknown = await response.json();
    if (!Array.isArray(jobs)) throw new Error('Supabase no devolvió una lista de ofertas.');
    return jobs;
  };
}
