import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Job, JobRefreshResult } from '@job-bot/contracts';

const jobsKey = ['jobs'] as const;
const jobsUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '') + '/api/jobs';

async function fetchJobs(signal: AbortSignal): Promise<Job[]> {
  const response = await fetch(jobsUrl, { signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]) });
  if (!response.ok) throw new Error('No pudimos cargar el catálogo.');
  const data: Job[] = await response.json();
  if (!Array.isArray(data)) throw new Error('La API no devolvió una lista de ofertas.');
  return data;
}

export function useJobs() {
  return useQuery({
    queryKey: jobsKey,
    queryFn: ({ signal }) => fetchJobs(signal),
    staleTime: 60_000,
    retry: false,
  });
}

export function useJobRefresh() {
  const client = useQueryClient();
  return useMutation({
    networkMode: 'always',
    mutationFn: async (token: string): Promise<JobRefreshResult> => {
      const response = await fetch(jobsUrl + '/refresh', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        signal: AbortSignal.timeout(60_000),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(typeof data?.message === 'string' ? data.message : 'No pudimos completar la búsqueda.');
      }
      return data;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: jobsKey }),
  });
}
