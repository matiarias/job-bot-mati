import { createHash, timingSafeEqual } from 'node:crypto';
import { HttpException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { searchJobs } from '@job-bot/job-search/server';
import { catalogRecord } from '@job-bot/job-search/server-catalog';
import type { JobRefreshResult } from '@job-bot/contracts';

function digest(value: string) {
  return createHash('sha256').update(value).digest();
}

@Injectable()
export class JobRefreshService {
  async refresh(authorization?: string): Promise<JobRefreshResult> {
    const token = process.env.JOB_REFRESH_TOKEN?.trim();
    if (!token || token.length < 32) {
      throw new ServiceUnavailableException('La búsqueda manual todavía no está configurada.');
    }
    if (!authorization || !timingSafeEqual(digest(authorization), digest('Bearer ' + token))) {
      throw new UnauthorizedException('La clave de actualización no es válida.');
    }

    const url = URL.parse(process.env.SUPABASE_URL?.trim() ?? '');
    const key = process.env.SUPABASE_SECRET_KEY?.trim();
    const years = process.env.JOB_BOT_DOCUMENTED_YEARS?.trim();
    const documentedYears = Number(years);
    if (url?.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co') ||
        !key?.startsWith('sb_secret_') || !years || !Number.isFinite(documentedYears) || documentedYears < 0) {
      throw new ServiceUnavailableException('Falta configurar Supabase o los años de experiencia para la búsqueda.');
    }

    const headers = { apikey: key, 'Content-Type': 'application/json' };
    const request = async (path: string, body: unknown, prefer?: string) => {
      try {
        const response = await fetch(new URL(path, url), {
          method: 'POST',
          headers: prefer ? { ...headers, Prefer: prefer } : headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(10_000),
          redirect: 'error',
        });
        if (response.ok) return response;
      } catch {
        // Do not return internal Supabase errors or configuration to the browser.
      }
      throw new ServiceUnavailableException('No se pudo actualizar Supabase. El catálogo sigue disponible para consultar.');
    };

    const claim = await request('/rest/v1/rpc/claim_job_refresh', {});
    const claimed: unknown = await claim.json().catch(() => null);
    if (claimed === false) {
      throw new HttpException('Ya se inició una búsqueda reciente. Esperá dos minutos e intentá de nuevo.', 429);
    }
    if (claimed !== true) {
      throw new ServiceUnavailableException('No se pudo verificar la disponibilidad de la búsqueda.');
    }

    const result = await searchJobs(documentedYears, process.env.HIMALAYAS_API_KEY?.trim());
    if (result.failed) {
      throw new ServiceUnavailableException('Los portales no respondieron. Se conservaron las ofertas del catálogo.');
    }

    const records = result.entries.map(catalogRecord);
    if (records.length) {
      await request('/rest/v1/jobs?on_conflict=id', records, 'resolution=merge-duplicates,return=minimal');
    }
    return { processed: records.length, warnings: result.warnings, completedAt: new Date().toISOString() };
  }
}
