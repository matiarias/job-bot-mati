import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { profile } from './profile.ts';
import { screen } from './rules.ts';
import { collect, verify } from './sources.ts';
import { openHistory, uniqueJobs } from './store.ts';
import type { Assessment } from './matching.ts';
import type { Job, Screen, Source } from './types.ts';

const sources: Source[] = ['Get on Board', 'Himalayas'];
const fitPoints = { high: 30, medium: 15, low: 0 };

interface Entry {
  job: Job;
  screen: Screen;
  assessment?: Assessment;
  score: number;
  status?: Awaited<ReturnType<typeof verify>>;
}

interface Options {
  preview: boolean;
  calibrate: boolean;
  directory: string;
  matcher?: (job: Job) => Promise<Assessment>;
  key?: string;
  collectJobs?: typeof collect;
  checkJob?: typeof verify;
}

export async function scan(options: Options) {
  const now = new Date();
  const time = now.toISOString();
  const collector = options.collectJobs ?? collect;
  const checkJob = options.checkJob ?? verify;
  const results = await Promise.all(sources.map(source => collector(source, options.key)));
  const errors = results.flatMap(result => result.errors);
  const jobs = uniqueJobs(results.flatMap(result => result.jobs));
  const candidates: Entry[] = jobs.map(job => {
    const result = screen(job, now.getTime());
    return { job, screen: result, score: result.points };
  }).sort((a, b) => b.score - a.score);

  if (!options.preview) mkdirSync(options.directory, { recursive: true });
  const history = openHistory(options.preview ? ':memory:' : join(options.directory, 'jobs.sqlite'));
  let transaction = false;
  try {
    history.db.exec('BEGIN IMMEDIATE');
    transaction = true;
    for (const job of jobs) history.save(job, time);

    const candidatesForRanking = candidates.filter(entry => entry.screen.decision === 'eligible' && !history.wasShown(entry.job));
    const checked: Entry[] = [];
    const review = candidates.filter(entry =>
      ['requirements-review', 'location-review'].includes(entry.screen.decision) && !history.wasShown(entry.job));
    let aiFailures = 0;
    // Bound network and model calls even when all sources return a full page.
    for (const entry of candidatesForRanking.slice(0, 15)) {
      entry.status = await checkJob(entry.job, options.key);
      if (entry.status === 'unknown') {
        review.push({ ...entry, screen: { ...entry.screen, reasons: ['Vigencia sin verificar.'] } });
        continue;
      }
      if (entry.status === 'closed' || history.wasShown(entry.job)) continue;
      history.save(entry.job, time);
      if (options.matcher) {
        try {
          entry.assessment = history.getAssessment(entry.job) ?? await options.matcher(entry.job);
          history.cacheAssessment(entry.job, entry.assessment);
        } catch {
          aiFailures++;
          continue;
        }
        const result = entry.assessment;
        if (!result.meetsRoleFocus || result.fit === 'low') continue;
        if (result.requirementsToConfirm.length) {
          review.push({ ...entry, screen: { ...entry.screen, reasons: result.requirementsToConfirm } });
          continue;
        }
        entry.score += fitPoints[result.fit];
      }
      checked.push(entry);
    }

    if (aiFailures) errors.push('OpenAI: ' + aiFailures + ' evaluaciones fallidas. Revisá la clave, el modelo y el saldo. Esas ofertas podrán reintentarse.');
    const ranked = checked.sort((a, b) => b.score - a.score);
    const top = ranked.slice(0, 5);
    const pending = review.sort((a, b) => b.score - a.score).slice(0, 8);
    const lines = [
      '# Búsqueda laboral · ' + now.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour12: false }),
      '',
      sources.map((source, index) => source + ': ' + results[index].jobs.length + ' resultados recibidos').join(' · '),
      'Ofertas únicas: ' + jobs.length + ' · Preselección nueva: ' + candidatesForRanking.length,
      options.matcher ? 'Evaluación: reglas + IA' : 'Evaluación preliminar por reglas',
      ...(errors.length ? ['', 'Avisos de ejecución', ...errors.map(error => '- ' + error)] : []),
      '',
      '## ' + (options.matcher ? 'Prioridades' : 'Prioridades preliminares'),
      ...list(top),
      '',
      '## Por confirmar',
      ...list(pending),
    ];
    if (options.calibrate) {
      // Sample both positives and negatives to tune precision and catch false exclusions.
      const rejected = candidates.filter(entry => entry.screen.decision === 'exclude' && entry.screen.reasons.some(reason => reason !== 'Sin foco frontend compatible.'));
      const sample = [...ranked, ...pending, ...rejected, ...candidates]
        .filter((entry, index, all) => all.findIndex(other => other.job === entry.job) === index)
        .slice(0, 18);
      lines.push('', '## Muestra para calibrar', ...sample.map((entry, index) =>
        (index + 1) + '. ' + line(entry.job.title) + ' [' + entry.job.source + '] · ' +
        (entry.status === 'closed' ? 'cerrada' : ranked.includes(entry) ? 'prioridad preliminar' : pending.includes(entry) ? 'por confirmar' : entry.screen.decision === 'exclude' ? 'descartada' : 'pendiente de revisión') +
        ' · ' + line(entry.screen.reasons[0] ?? entry.screen.geography) + ' · ' + entry.job.url));
    }

    const report = lines.join('\n') + '\n';
    let reportPath: string | undefined;
    if (!options.preview) {
      const directory = join(options.directory, 'reports');
      mkdirSync(directory, { recursive: true });
      reportPath = join(directory, time.replace(/[:.]/g, '-') + '-' + randomUUID().slice(0, 8) + '.md');
      writeFileSync(reportPath, report, { encoding: 'utf8', flag: 'wx', flush: true });
      for (const entry of [...top, ...pending]) history.markShown(entry.job, time);
    }
    history.db.exec('COMMIT');
    transaction = false;
    return { report, reportPath, top, pending, errors, failed: results.every(result => result.errors.length === result.queries) ||
      (aiFailures > 0 && checked.length === 0) };
  } finally {
    if (transaction) history.db.exec('ROLLBACK');
    history.db.close();
  }
}

function line(text: string) {
  return text.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, ' ').trim();
}

function list(entries: Entry[]) {
  if (!entries.length) return ['Sin ofertas para mostrar.'];
  return entries.flatMap(({ job, screen: result, assessment }, index) => {
    const compensation = job.description.split('\n').find(value =>
      /\b(?:payment|pay|paid|salary|sueldo|pago|remuneraci[oó]n|compensation)\b/i.test(value) &&
      /\b(?:USD|ARS|EUR|CAD|GBP|BRL)\b/i.test(value) && value.length <= 200);
    const currency = job.salary?.currency ?? compensation?.match(/\b(?:USD|ARS|EUR|CAD|GBP|BRL)\b/i)?.[0].toUpperCase();
    const { min, max, period } = job.salary ?? {};
    const labels: Record<string, string> = { hourly: 'hora', weekly: 'semana', fortnightly: 'quincena', monthly: 'mes', annual: 'año' };
    const range = min === max ? String(min ?? '') : min && max ? min + '–' + max : min ? 'desde ' + min : max ? 'hasta ' + max : '';
    const salary = range
      ? [currency ?? 'moneda sin indicar', range, period && labels[period] ? '/ ' + labels[period] : ''].filter(Boolean).join(' ')
      : compensation && /(?:\b(?:USD|ARS|EUR|CAD|GBP|BRL)\s*\$?\s*\d|\d(?:[kK])?\s*(?:USD|ARS|EUR|CAD|GBP|BRL)\b)/i.test(compensation)
        ? compensation : currency ? currency + ' (monto no publicado)' : 'No publicado';
    const evidence = [...new Set(assessment?.evidence ?? [])].slice(0, 3).map(key => profile.evidence[key]);
    return [
      '',
      (index + 1) + '. ' + line(job.title) + ' · ' + line(job.company) + ' · ' + job.source,
      '   - Enlace: ' + job.url,
      '   - Ubicación: ' + line(result.geography),
      '   - Salario: ' + line(salary),
      ...(job.contract ? ['   - Modalidad contractual: ' + line(job.contract)] : []),
      ...(assessment ? ['   - Encaje: ' + ({ high: 'alto', medium: 'medio', low: 'bajo' })[assessment.fit]] : []),
      ...evidence.map(item => '   - Coincidencia: ' + item),
      ...[...new Set([...result.reasons, ...(assessment?.gaps ?? [])])].slice(0, 4).map(item => '   - Por revisar: ' + line(item)),
    ];
  });
}
