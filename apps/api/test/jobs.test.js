import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../dist/app.module.js';
import { JobsService } from '../dist/jobs/jobs.service.js';

const originalFetch = globalThis.fetch;
const url = 'https://example.supabase.co';
const key = 'sb_publishable_test';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('GET /api/jobs', () => {
  it('responde con las cinco ofertas de ejemplo a través de HTTP', async () => {
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', '');
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.listen(0, '127.0.0.1');
    try {
      const response = await originalFetch(await app.getUrl() + '/api/jobs');
      const jobs = await response.json();
      expect(response.status).toBe(200);
      expect(jobs.map(job => job.id)).toEqual(['litoral', 'pampa', 'andes', 'rio', 'delta']);
    } finally {
      await app.close();
    }
  });

  it('consulta Supabase y conserva la lista vacía', async () => {
    vi.stubEnv('SUPABASE_URL', url);
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', key);
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json([]));
    const service = new JobsService();
    expect(await service.list()).toEqual([]);
    const [request, options] = fetcher.mock.calls[0];
    expect(request.pathname).toBe('/rest/v1/jobs');
    expect(request.searchParams.get('select')).toContain('date:published_on');
    expect(options.headers.apikey).toBe(key);
  });

  it('responde 503 si falla Supabase', async () => {
    vi.stubEnv('SUPABASE_URL', url);
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', key);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 503 }));
    await expect(new JobsService().list()).rejects.toMatchObject({ status: 503 });
  });

  it('rechaza una configuración incompleta en vez de usar ejemplos', () => {
    vi.stubEnv('SUPABASE_URL', url);
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', '');
    expect(() => new JobsService()).toThrow(/SUPABASE_PUBLISHABLE_KEY/);
  });
});
