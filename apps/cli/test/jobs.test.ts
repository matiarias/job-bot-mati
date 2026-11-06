import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
process.env.JOB_BOT_PROFILE_PATH = join(import.meta.dirname, '..', '..', '..', 'profile.example.json');
const { screen } = await import('../src/rules.ts');
const { scan } = await import('../src/scan.ts');
const { parseBoard, parseHimalayas, verify } = await import('../src/sources.ts');
const { uniqueJobs } = await import('../src/store.ts');
const { loadProfile } = await import('../src/profile.ts');
import type { Job } from '../src/types.ts';

function job(fields: Partial<Job> = {}): Job {
  return {
    source: 'Get on Board', id: '1042', title: 'Senior Frontend / UX Engineer · Remote · LATAM',
    company: 'Darwoft', mode: 'remote',
    description: 'Location: Remote – Latin America\nFrontend-first fintech role using React, TypeScript and BFF.\nEnglish Level: B2\nPayment in USD.',
    url: 'https://www.getonbrd.com/jobs/1042', statusUrl: 'https://www.getonbrd.com/jobs/1042',
    ...fields,
  };
}

test('prioriza Senior frontend afín sin mínimo excesivo', () => {
  const result = screen(job());
  assert.equal(result.decision, 'eligible');
  assert.match(result.geography, /LATAM|Latin America/);
});

test('distingue requisitos obligatorios de preferidos', () => {
  assert.equal(screen(job({ requirements: '3+ years of professional software development experience. 5+ years preferred.' })).decision, 'eligible');
  assert.equal(screen(job({ requirements: '8+ years of software engineering experience.' })).decision, 'exclude');
  assert.equal(screen(job({ requirements: '4+ years of professional experience with backend development using Node.js.' })).decision, 'exclude');
  assert.equal(screen(job({ requirements: 'English: C1' })).decision, 'exclude');
  assert.equal(screen(job({ requirements: 'A four-year college degree is required.' })).decision, 'requirements-review');
  assert.equal(screen(job({ requirements: 'Production experience with Next.js App Router.' })).decision, 'requirements-review');
  assert.equal(screen(job({ requirements: 'Nice to Have\n7+ years of experience.' })).decision, 'eligible');
});

test('separa remoto ambiguo y excluye restricciones incompatibles', () => {
  const base = { title: 'Frontend Engineer', description: 'Remote\nReact TypeScript' };
  assert.equal(screen(job(base)).decision, 'location-review');
  assert.equal(screen(job({ ...base, description: 'Remote US only\nReact TypeScript' })).decision, 'exclude');
  assert.equal(screen(job({ ...base, description: 'Remote LATAM excluding Argentina' })).decision, 'exclude');
  assert.equal(screen(job({ ...base, countries: ['Chile'] })).decision, 'exclude');
  assert.equal(screen(job({ ...base, countries: ['AR'], timezones: [-8] })).decision, 'exclude');
  assert.equal(screen(job({ ...base, countries: ['AR'], timezones: [-3, -4] })).decision, 'eligible');
  assert.equal(screen(job({ ...base, worldwide: true, mode: 'hybrid' })).decision, 'exclude');
  assert.equal(screen(job({ ...base, expires: 1 })).decision, 'exclude');
});

test('normaliza formatos reales de las dos fuentes', () => {
  const [board] = parseBoard({ data: [{
    id: 'react-job', links: { public_url: 'https://www.getonbrd.com/jobs/react-job' },
    attributes: { title: 'React Engineer', remote: true, remote_modality: 'remote_local',
      countries: ['Remote'], min_salary: 3000, description: '<ul><li>4+ years of experience.</li></ul>' },
  }] });
  assert.deepEqual(board.countries, []);
  assert.match(board.requirements ?? '', /4\+ years/);
  assert.equal(board.salary?.currency, 'USD');
  const [remote] = parseHimalayas({ jobs: [{
    guid: 'https://himalayas.app/companies/example/jobs/example-job',
    applicationLink: 'https://himalayas.app/companies/example/jobs/example-job?utm_source=api',
    title: 'React Engineer', companyName: 'Example', description: '<p>Remote &amp; React</p>',
    locationRestrictions: ['Argentina', { alpha2: 'CL' }], timezoneRestrictions: [-3, 'UTC-04:00'],
  }] });
  assert.deepEqual(remote.countries, ['Argentina', 'CL']);
  assert.deepEqual(remote.timezones, [-3, -4]);
  assert.match(remote.statusUrl, /\/jobs\/api\/companies\//);
});

test('deduplica por ID de fuente y enlace directo entre fuentes', () => {
  const first = job({ directUrl: 'https://example.com/jobs/1?utm_campaign=one' });
  const same = job({ url: 'https://example.com/other', directUrl: undefined });
  const crossSource = job({ source: 'Himalayas', id: 'different', url: 'https://himalayas.app/job', statusUrl: 'https://himalayas.app/api/job',
    directUrl: 'https://example.com/jobs/1/apply?source=two' });
  assert.deepEqual(uniqueJobs([first, same, crossSource]), [first]);
});

test('considera 404 y 410 como cerradas y un error temporal como desconocido', async context => {
  const vacancy = job({ source: 'Himalayas', statusUrl: 'https://himalayas.app/jobs/api/companies/demo/jobs/job' });
  const mock = context.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 410 }));
  assert.equal(await verify(vacancy), 'closed');
  mock.mock.mockImplementation(async () => new Response(null, { status: 404 }));
  assert.equal(await verify(vacancy), 'closed');
  mock.mock.mockImplementation(async () => new Response(null, { status: 503 }));
  assert.equal(await verify(vacancy), 'unknown');
});

test('escanea con una fuente caída, omite cerradas y no repite avisos mostrados', async () => {
  const directory = mkdtempSync(join(import.meta.dirname, '..', 'data-test-'));
  let matches = 0;
  const valid = job();
  const closed = job({ id: 'closed', url: 'https://www.getonbrd.com/jobs/closed', statusUrl: 'https://www.getonbrd.com/jobs/closed' });
  try {
    const options = {
      directory, preview: false, calibrate: false,
      collectJobs: async (source: Job['source']) => source === 'Get on Board'
        ? { jobs: [valid, closed], errors: [], queries: 1 }
        : { jobs: [], errors: ['Himalayas indisponible'], queries: 1 },
      checkJob: async (entry: Job) => entry.id === 'closed' ? 'closed' as const : 'open' as const,
      matcher: async () => {
        matches++;
        return { fit: 'high' as const, evidence: ['finance' as const], gaps: [], requirementsToConfirm: [], meetsRoleFocus: true };
      },
    };
    const first = await scan(options);
    assert.equal(first.failed, false);
    assert.equal(first.top.length, 1);
    assert.match(first.report, /Himalayas indisponible/);
    assert.match(first.report, /USD \(monto no publicado\)/);
    assert.ok(first.reportPath);
    const second = await scan(options);
    assert.equal(second.top.length, 0);
    assert.equal(matches, 1);
  } finally {
    rmSync(directory, { recursive: true });
  }
});

test('valida perfiles existentes, ausentes e inválidos', () => {
  const directory = mkdtempSync(join(import.meta.dirname, '..', 'data-test-'));
  try {
    assert.equal(loadProfile(join(import.meta.dirname, '..', '..', '..', 'profile.example.json')).documentedYears, 3);
    assert.throws(() => loadProfile(join(directory, 'missing.json')), /No se pudo leer el perfil/);
    writeFileSync(join(directory, 'invalid.json'), '{"documentedYears": "tres"}');
    assert.throws(() => loadProfile(join(directory, 'invalid.json')), /no es válido/);
  } finally { rmSync(directory, { recursive: true }); }
});
