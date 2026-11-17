import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AppModule } from '../dist/app.module.js';

const realFetch = globalThis.fetch;
const token = 'clave-de-prueba-01234567890123456789';

beforeEach(() => {
  vi.stubEnv('JOB_REFRESH_TOKEN', token);
  vi.stubEnv('JOB_BOT_DOCUMENTED_YEARS', '3');
  vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test');
  vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
  vi.stubEnv('HIMALAYAS_API_KEY', '');
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

async function postRefresh(authorization, check) {
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = module.createNestApplication();
  app.setGlobalPrefix('api');
  await app.listen(0, '127.0.0.1');
  try {
    const response = await realFetch(await app.getUrl() + '/api/jobs/refresh', {
      method: 'POST', headers: { Authorization: authorization },
    });
    await check(response);
  } finally {
    await app.close();
  }
}

it('rechaza credenciales incorrectas sin invocar Supabase ni los portales', async () => {
  const fetcher = vi.spyOn(globalThis, 'fetch');
  await postRefresh('Bearer incorrecta', response => expect(response.status).toBe(401));
  expect(fetcher).not.toHaveBeenCalled();
});

it('respeta el intervalo de refresco entre instancias', async () => {
  const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(false));
  await postRefresh('Bearer ' + token, response => expect(response.status).toBe(429));
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('publica una oferta válida aunque la otra fuente falle', async () => {
  const writes = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
    const url = new URL(input);
    if (url.pathname.endsWith('/claim_job_refresh')) return Response.json(true);
    if (url.hostname === 'www.getonbrd.com') return new Response(null, { status: 503 });
    if (url.pathname === '/jobs/api/search') return Response.json({ jobs: [{
      guid: 'https://himalayas.app/companies/example/jobs/frontend-engineer', title: 'Frontend Engineer', companyName: 'Estudio Ejemplo',
      description: 'Remote from Argentina. React and TypeScript.',
      applicationLink: 'https://himalayas.app/companies/example/jobs/frontend-engineer',
      locationRestrictions: [{ alpha2: 'AR' }], expiryDate: 4_000_000_000,
    }] });
    if (url.hostname === 'himalayas.app') return Response.json({ job: {} });
    if (url.pathname === '/rest/v1/jobs') {
      writes.push(JSON.parse(options.body));
      expect(options.headers.Prefer).toContain('merge-duplicates');
      return new Response(null, { status: 201 });
    }
    throw new Error('Destino inesperado');
  });
  await postRefresh('Bearer ' + token, async response => {
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ processed: 1, warnings: expect.arrayContaining([expect.stringContaining('Get on Board')]) });
  });
  expect(writes).toEqual([[expect.objectContaining({ title: 'Frontend Engineer', source: 'Himalayas' })]]);
});

it('conserva el catálogo si todos los portales fallan', async () => {
  const fetcher = vi.spyOn(globalThis, 'fetch')
    .mockImplementation(async input => new URL(input).pathname.endsWith('/claim_job_refresh')
      ? Response.json(true)
      : new Response(null, { status: 503 }));
  await postRefresh('Bearer ' + token, response => expect(response.status).toBe(503));
  expect(fetcher.mock.calls.some(([input]) => new URL(input).pathname === '/rest/v1/jobs')).toBe(false);
});
