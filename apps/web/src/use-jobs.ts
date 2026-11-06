import useSWRImmutable from 'swr/immutable';
import type { Job } from '@job-bot/contracts';

async function fetchJobs(url: string): Promise<Job[]> {
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`La API de ofertas respondió con ${response.status}.`);

  const data: Job[] = await response.json();
  if (!Array.isArray(data)) throw new Error('La API no devolvió una lista de ofertas.');
  return data;
}

export function useJobs() {
  return useSWRImmutable('/api/jobs', fetchJobs, { shouldRetryOnError: false });
}
