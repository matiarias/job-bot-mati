import { convert } from 'html-to-text';
import { z } from 'zod';
import type { Job, Source } from './types.ts';

const board = 'https://www.getonbrd.com';
const himalayas = 'https://himalayas.app';
const text = z.string().nullish();
const amount = z.number().positive().nullish();
const httpUrl = z.url({ protocol: /^https?$/ }).refine(value => {
  const url = new URL(value);
  return !url.username && !url.password;
});

const boardPage = z.object({
  data: z.array(z.object({
    id: z.string(),
    links: z.object({ public_url: httpUrl }),
    attributes: z.object({
      title: z.string(), projects: text, functions: text, description: text, benefits: text,
      desirable: text, remote: z.boolean().optional(), remote_modality: text,
      countries: z.array(z.string()).optional(), remote_zone: text,
      min_salary: amount, max_salary: amount, application_url: httpUrl.nullish(),
      company: z.object({ data: z.object({ id: z.union([z.string(), z.number()]) }).nullish() }).optional(),
    }),
  })),
});

const himalayasPage = z.object({
  jobs: z.array(z.object({
    guid: z.string(), title: z.string(), companyName: z.string(), description: z.string(),
    applicationLink: httpUrl, expiryDate: z.number().nullish(), employmentType: text,
    locationRestrictions: z.array(z.union([z.string(), z.object({ alpha2: z.string() })])).optional(),
    timezoneRestrictions: z.array(z.union([z.number(), z.string()])).optional(),
    seniority: z.array(z.string()).optional(), minSalary: amount, maxSalary: amount,
    salaryPeriod: text, currency: text,
  })),
});

export function plain(html?: string | null) {
  return convert(html ?? '', {
    wordwrap: false,
    selectors: [
      { selector: 'a', options: { ignoreHref: true } },
      { selector: 'ul', options: { itemPrefix: '' } },
      { selector: 'img', format: 'skip' },
    ],
  }).trim();
}

async function get(url: string, headers: Record<string, string> = {}) {
  return fetch(url, { headers, signal: AbortSignal.timeout(15_000), redirect: 'manual' });
}

async function json(url: string, headers?: Record<string, string>): Promise<unknown> {
  const response = await get(url, headers);
  if (!response.ok) throw new Error('HTTP ' + response.status);
  return response.json();
}

export function parseBoard(input: unknown): Job[] {
  return boardPage.parse(input).data.map(({ id, attributes: a, links }) => {
    const url = new URL('/jobs/' + encodeURIComponent(id), board).href;
    const published = new URL(links.public_url);
    const directUrl = a.application_url ?? undefined;
    const mode = a.remote_modality === 'hybrid' ? 'hybrid' :
      a.remote ? 'remote' : a.remote === false ? 'onsite' : 'unknown';
    const requirements = plain(a.description);
    return {
      source: 'Get on Board', id, title: a.title,
      company: 'Empresa por confirmar',
      url: published.origin === board ? published.href : url,
      statusUrl: url, directUrl, mode,
      countries: a.countries?.filter(country => !/^(remote|remoto|worldwide|global|latam)$/i.test(country)),
      worldwide: a.remote_modality === 'fully_remote',
      description: [
        a.remote_zone ? 'Ubicación: ' + a.remote_zone : '',
        plain(a.projects), plain(a.functions), 'Requisitos obligatorios\n' + requirements,
        plain(a.benefits), 'Deseable\n' + plain(a.desirable),
      ].filter(Boolean).join('\n'),
      requirements,
      salary: a.min_salary || a.max_salary
        ? { min: a.min_salary ?? undefined, max: a.max_salary ?? undefined, currency: 'USD', period: 'monthly' }
        : undefined,
    };
  });
}

function offset(value: number | string) {
  if (typeof value === 'number') return value;
  const match = value.match(/^(?:UTC)?([+-])(\d{1,2})(?::(\d{2}))?$/i);
  if (!match) return NaN;
  return (match[1] === '-' ? -1 : 1) * (Number(match[2]) + Number(match[3] ?? 0) / 60);
}

export function parseHimalayas(input: unknown): Job[] {
  return himalayasPage.parse(input).jobs.flatMap(a => {
    const path = /^https:\/\/himalayas\.app(\/companies\/[\w-]+\/jobs\/[\w-]+)\/?$/.exec(a.guid)?.[1];
    if (!path || new URL(a.applicationLink).origin !== himalayas) return [];
    const timezones = a.timezoneRestrictions?.map(offset);
    return [{
      source: 'Himalayas', id: a.guid, title: a.title, company: a.companyName,
      description: plain(a.description), url: a.applicationLink,
      statusUrl: himalayas + '/jobs/api' + path,
      mode: 'remote',
      countries: a.locationRestrictions?.map(country => typeof country === 'string' ? country : country.alpha2),
      worldwide: a.locationRestrictions?.length === 0,
      timezones: timezones?.every(Number.isFinite) ? timezones : undefined,
      seniority: a.seniority?.join(', '), contract: a.employmentType ?? undefined,
      expires: a.expiryDate ?? undefined,
      salary: a.minSalary || a.maxSalary || a.currency
        ? { min: a.minSalary ?? undefined, max: a.maxSalary ?? undefined, currency: a.currency ?? undefined, period: a.salaryPeriod ?? undefined }
        : undefined,
    }];
  });
}

export async function collect(source: Source, key?: string) {
  const jobs: Job[] = [];
  const errors: string[] = [];
  const queries = source === 'Get on Board' ? ['frontend react', 'react typescript', 'software engineer react'] :
    ['frontend engineer', 'react developer', 'software engineer react'];
  const headers = source === 'Himalayas' && key ? { Authorization: 'Bearer ' + key } : undefined;
  for (const query of queries) {
    const boardSource = source === 'Get on Board';
    const params = new URLSearchParams(boardSource ? { query, per_page: '20' } : { q: query, country: 'AR' });
    try {
      const data = await json((boardSource ? board + '/api/v0/search/jobs?' : himalayas + '/jobs/api/search?') + params, headers);
      jobs.push(...(boardSource ? parseBoard(data) : parseHimalayas(data)));
    } catch (error) {
      errors.push(source + ' (' + query + '): ' + networkError(error));
    }
  }
  return { jobs, errors, queries: queries.length };
}

function networkError(error: unknown) {
  if (error instanceof z.ZodError) return 'Respuesta con formato inesperado.';
  if (error instanceof Error) return error.message;
  return 'Error desconocido.';
}

export async function verify(job: Job, key?: string): Promise<'open' | 'closed' | 'unknown'> {
  try {
    if (job.source === 'Himalayas') {
      const response = await get(job.statusUrl, key ? { Authorization: 'Bearer ' + key } : {});
      if (response.status === 404 || response.status === 410) return 'closed';
      if (!response.ok) return 'unknown';
      const result = z.object({ job: z.unknown().refine(value => value !== undefined) }).safeParse(await response.json());
      return result.success ? 'open' : 'unknown';
    }

    let url = job.statusUrl;
    for (let hops = 0; hops < 4; hops++) {
      const response = await get(url);
      if (response.status === 404 || response.status === 410) return 'closed';
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) return 'unknown';
        const target = new URL(location, url);
        if (target.origin !== board || !target.pathname.startsWith('/jobs/')) return 'unknown';
        url = target.href;
        continue;
      }
      if (!response.ok) return 'unknown';
      const page = await response.text();
      const title = page.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
      const posting = /"@type"\s*:\s*"JobPosting"|itemtype="https?:\/\/schema\.org\/JobPosting"/i.test(page);
      if (!title || !posting) return 'unknown';
      const company = page.match(/<strong itemprop="name">([^<]+)<\/strong>/i)?.[1];
      if (company) job.company = plain(company);
      job.url = url;
      return 'open';
    }
  } catch {
    return 'unknown';
  }
  return 'unknown';
}
