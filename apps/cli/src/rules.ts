import { screen as screenForProfile } from '@job-bot/job-search/rules';
import type { Job } from './types.ts';
import { profile } from './profile.ts';

export { canonicalUrl, normalized } from '@job-bot/job-search/rules';

export function screen(job: Job, now = Date.now()) {
  return screenForProfile(job, profile.documentedYears, now);
}
