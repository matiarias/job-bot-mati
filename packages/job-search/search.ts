import { uniqueJobs } from './dedup.ts';
import { screen } from './rules.ts';
import { collect, verify } from './sources.ts';
import type { Source } from './types.ts';

const sources: Source[] = ['Get on Board', 'Himalayas'];

export async function searchJobs(documentedYears: number, key?: string) {
  const signal = AbortSignal.timeout(30_000);
  const now = Date.now();
  const results = await Promise.all(sources.map(source => collect(source, key, signal)));
  const warnings = results.flatMap(result => result.errors);
  const ranked = uniqueJobs(results.flatMap(result => result.jobs))
    .map(job => ({ job, screen: screen(job, documentedYears, now) }))
    .sort((a, b) => b.screen.points - a.screen.points);
  const eligible = ranked.filter(entry => entry.screen.decision === 'eligible').slice(0, 15);
  const review = ranked.filter(entry => ['requirements-review', 'location-review'].includes(entry.screen.decision));
  const top: typeof ranked = [];

  for (let offset = 0; offset < eligible.length && top.length < 5; offset += 5) {
    const batch = await Promise.all(eligible.slice(offset, offset + 5).map(async entry => ({
      entry,
      status: await verify(entry.job, key, signal),
    })));
    for (const { entry, status } of batch) {
      if (status === 'open') top.push(entry);
      if (status === 'unknown') {
        review.push({ ...entry, screen: { ...entry.screen, reasons: ['Vigencia sin verificar.'] } });
      }
    }
  }

  return {
    entries: [...top.slice(0, 5), ...review.sort((a, b) => b.screen.points - a.screen.points).slice(0, 8)],
    warnings,
    failed: results.every(result => result.errors.length === result.queries),
  };
}
