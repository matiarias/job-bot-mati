import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { identity } from '@job-bot/job-search/dedup';
import { assessment, model } from './matching.ts';
import { profile } from './profile.ts';
import type { Assessment } from './matching.ts';
import type { Job } from './types.ts';

export function openHistory(path: string) {
  const db = new DatabaseSync(path);
  db.exec(
    'CREATE TABLE IF NOT EXISTS listings (' +
    'source TEXT NOT NULL, id TEXT NOT NULL, record TEXT NOT NULL, first_seen TEXT NOT NULL, ' +
    'PRIMARY KEY (source, id)); ' +
    'CREATE TABLE IF NOT EXISTS seen (key TEXT PRIMARY KEY, shown_at TEXT NOT NULL); ' +
    'CREATE TABLE IF NOT EXISTS assessments (key TEXT PRIMARY KEY, value TEXT NOT NULL);'
  );
  const save = db.prepare(
    'INSERT INTO listings VALUES (?, ?, ?, ?) ON CONFLICT(source, id) DO UPDATE SET record = excluded.record'
  );
  const shown = db.prepare('SELECT key FROM seen WHERE key = ?');
  const mark = db.prepare('INSERT OR IGNORE INTO seen VALUES (?, ?)');
  const lookup = db.prepare('SELECT value FROM assessments WHERE key = ?');
  const cache = db.prepare('INSERT OR REPLACE INTO assessments VALUES (?, ?)');

  return {
    db,
    save(job: Job, time: string) { save.run(job.source, job.id, JSON.stringify(job), time); },
    wasShown(job: Job) { return identity(job).some(key => shown.get(key)); },
    markShown(job: Job, time: string) { for (const key of identity(job)) mark.run(key, time); },
    getAssessment(job: Job) {
      const row = lookup.get(assessmentKey(job));
      return row ? assessment.parse(JSON.parse(String(row.value))) : undefined;
    },
    cacheAssessment(job: Job, value: Assessment) { cache.run(assessmentKey(job), JSON.stringify(value)); },
  };
}

function assessmentKey(job: Job) {
  return createHash('sha256').update(JSON.stringify([
    1, model, profile, job.source, job.id, job.title, job.description, job.requirements,
  ])).digest('hex');
}

export { uniqueJobs } from '@job-bot/job-search/dedup';
