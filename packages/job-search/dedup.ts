import { createHash } from 'node:crypto';
import { canonicalUrl, normalized } from './rules.ts';
import type { Job } from './types.ts';

export function identity(job: Job) {
  return [
    JSON.stringify([job.source, job.id]),
    canonicalUrl(job.url),
    canonicalUrl(job.statusUrl),
    ...(job.directUrl ? [canonicalUrl(job.directUrl)] : []),
    ...(job.company !== 'Empresa por confirmar' && job.description.length >= 150 ? [
      'content:' + createHash('sha256').update(
        normalized([job.company, job.title, job.description].join('\n')).replace(/\s+/g, ' ')
      ).digest('hex'),
    ] : []),
  ];
}

export function uniqueJobs(jobs: Job[]) {
  const seen = new Set<string>();
  return jobs.filter(job => {
    const keys = identity(job);
    const duplicate = keys.some(key => seen.has(key));
    for (const key of keys) seen.add(key);
    return !duplicate;
  });
}
