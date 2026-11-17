import { createHash } from 'node:crypto';
import type { Job, Screen } from './types.ts';

function salary(job: Job): string {
  const value = job.salary;
  if (!value?.min && !value?.max) return value?.currency ? value.currency + ' (monto no publicado)' : 'No publicado';
  const range = value.min && value.max ? value.min + '–' + value.max
    : value.min ? 'desde ' + value.min : 'hasta ' + value.max;
  return [value.currency ?? 'Moneda sin indicar', range, value.period ? '/ ' + value.period : ''].filter(Boolean).join(' ');
}

export function catalogRecord({ job, screen }: { job: Job; screen: Screen }) {
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
}
