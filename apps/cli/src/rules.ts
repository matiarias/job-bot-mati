import { profile } from './profile.ts';
import type { Decision, Job, Screen } from './types.ts';

export function normalized(text: string) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

const frontend = /\b(front[\s-]?end|react(?:\.?js)?|next\.js|ui engineer|ux engineer)\b/i;
const unsuitable = /\b(manager|director|staff|principal|architect|intern|practicante|lead|lider|android|ios|react native|qa|sdet|devops|designer)\b/i;

function geography(job: Job): { decision: Decision; geography: string } {
  const lines = [job.title, ...job.description.split('\n')].map(line => line.trim().replace(/^[*•-]\s+/, '')).filter(Boolean);
  const local = lines.find(line => /(?:location|ubicaci[oó]n|work model|modalidad|remote|remoto|based in|residir)/i.test(line) &&
    /(?:\bhybrid\b|\bh[ií]brid[oa]\b|\bon[\s-]?site\b|\bpresencial\b|(?:office|oficina).{0,20}(?:days per week|d[ií]as por semana))/i.test(line));
  const foreign = lines.find(line => /(?:\b(?:US|USA|UK|EU|EE\.?\s*UU|Canada|Europe|Brasil|Brazil|Mexico|Chile|Colombia|Peru|Spain|Espa[nñ]a)\s+only\b|\bonly\s+(?:in\s+)?(?:the\s+)?(?:US|USA|UK|EU|EE\.?\s*UU|Canada|Europe|Brazil|Mexico|Chile|Colombia|Peru|Spain)\b|\bremote\s+(?:within|from|in)\s+(?:the\s+)?(?:US|USA|UK|EU|Canada|Europe)\b)/i.test(line) &&
    !/\b(argentina|latam|latin america)\b/i.test(line));
  const noArgentina = lines.find(line => /(?:excluding|except|exclu(?:ye|yendo)|excepto|not open to|no se acepta)\s+Argentina\b/i.test(line));
  if (local || foreign || noArgentina || job.mode === 'hybrid' || job.mode === 'onsite') {
    return { decision: 'exclude', geography: (noArgentina ?? foreign ?? local ?? job.mode).slice(0, 240) };
  }
  if (job.countries?.length && !job.countries.some(value => /^(ar|arg|argentina)$/i.test(value))) {
    return { decision: 'exclude', geography: 'Países habilitados por la fuente: ' + job.countries.join(', ') };
  }
  if (job.timezones?.length && !job.timezones.includes(-3)) {
    return { decision: 'exclude', geography: 'La fuente restringe los husos a ' + job.timezones.join(', ') + ' y no incluye UTC−3.' };
  }

  const explicit = lines.find(line => {
    const value = normalized(line);
    return /(?:^(?:location|ubicacion|location requirements|work location|hiring location)\s*:|remote\s*(?:[-–·:|/(]|from\b|within\b|in\b|across\b)|remot[oa]\s*(?:[-–·:|/(]|desde\b|en\b)|\b(?:remote|remot[oa])\s+(?:argentina|latam|latin america|worldwide|global)\b|\b(?:based|residir|ubicad[oa]s?)\s+(?:anywhere\s+)?(?:in|en)\b)/i.test(value)
      && /\b(argentina|latam|latin america|latinoamerica|america latina|worldwide|global|anywhere in the world)\b/.test(value);
  });
  const remote = job.mode === 'remote' || lines.some(line => /\b(remote|remot[oa]|work from home)\b/i.test(line));
  if (!remote) return { decision: 'location-review', geography: 'Modalidad remota sin confirmar.' };
  if (explicit) return { decision: 'eligible', geography: explicit.slice(0, 240) };
  if (job.countries?.some(value => /^(ar|arg|argentina)$/i.test(value))) {
    return { decision: 'eligible', geography: job.source + ' incluye Argentina entre los países habilitados.' };
  }
  if (job.worldwide) return { decision: 'eligible', geography: job.source + ' indica contratación remota global.' };
  return { decision: 'location-review', geography: 'La publicación indica remoto, pero falta confirmar si admite Argentina.' };
}

export function screen(job: Job, now = Date.now()): Screen {
  const geo = geography(job);
  const title = normalized(job.title);
  const description = normalized(job.description);
  const general = /\b(software|full[\s-]?stack|web)\b/i.test(title);
  const frontendFocus = /\b(frontend.focus|front[\s-]?end.first|strong front[\s-]?end focus|foco (?:en )?front[\s-]?end|enfoque (?:en )?front[\s-]?end|primarily.{0,90}\breact)\b/i.test(description);
  const reasons: string[] = [];
  const result = (decision: Decision, points = 0): Screen => ({ ...geo, decision, reasons, points });

  if (job.expires && job.expires * 1000 <= now) {
    reasons.push('Aviso vencido.');
    return result('exclude');
  }
  if (unsuitable.test(title) || /\b(community|talent pool|banco de talento)\b/.test(title) ||
      (!frontend.test(title) && !(general && frontendFocus))) {
    reasons.push('Sin foco frontend compatible.');
    return result('exclude');
  }
  if (geo.decision === 'exclude') return result('exclude');

  let optional = false;
  for (const line of (job.requirements ?? job.description).split('\n').map(value => normalized(value).trim().replace(/^[*•-]\s+/, ''))) {
    if (/^\s*(?:nice to have|preferred qualifications|desirable|deseables|plus|bonus|valorado|requisitos deseables)\b/.test(line)) optional = true;
    if (/^\s*(?:must.have|required qualifications|basic qualifications|requirements|requisitos obligatorios|what you bring|minimum qualifications|responsibilities)\b/.test(line)) optional = false;
    if (optional || /\b(benefit|holiday|vacation|team has|empresa tiene)\b/.test(line)) continue;

    const mandatory = line.split(/(?<=[.!?;])\s+/).filter(part => !/\b(preferred|optional|nice to have|deseable|not required|no excluyente)\b/.test(part));
    for (const part of mandatory) {
      const years = part.match(/\b(\d{1,2})\s*(?:\+|\s*[-–]\s*\d{1,2})?\s*(?:years?|anos)\s+(?:of |de )?(?:[\w./-]+\s+){0,7}(?:experience|experiencia)\b|\b(?:experience|experiencia)\s+(?:of |de )?(\d{1,2})\s*\+?\s*(?:years?|anos)\b/);
      if (years && Number(years[1] ?? years[2]) > profile.documentedYears) {
        reasons.push('Experiencia mínima superior al CV: ' + part.trim().slice(0, 180));
        return result('exclude');
      }
      if (/\b(?:english|ingles)\b.{0,40}\b(?:c1|c2)\b|\b(?:c1|c2)\b.{0,25}\b(?:english|ingles)\b/.test(part)) {
        reasons.push('Requiere inglés por encima del B2 documentado.');
        return result('exclude');
      }
      if (/\b(?:bachelor(?:'s)?|college degree|university degree|titulo universitario|licenciatura)\b/.test(part) &&
          !/\b(?:equivalent|equivalente|or related experience)\b/.test(part)) {
        reasons.push('El aviso pide título universitario. El CV documenta bootcamps.');
      }
      if (/\bapp router\b/.test(part) && /\b(production|produccion|required|excluyente|hands.on)\b/.test(part)) {
        reasons.push('Falta confirmar experiencia con Next.js App Router en producción.');
      }
    }
  }

  const senior = /\b(senior|sr)\b/.test(title + ' ' + (job.seniority ?? '').toLowerCase());
  const points = (senior ? 0 : 2) + (frontend.test(title) ? 3 : 0)
    + (/\breact\b/.test(description) ? 3 : 0) + (/\btypescript\b/.test(description) ? 2 : 0)
    + (/\b(fintech|banking|banca|payments|pagos|digital wallet)\b/.test(description) ? 3 : 0)
    + (/\b(bff|backend for frontend|nestjs|microfrontends?)\b/.test(description) ? 2 : 0);
  if (geo.decision === 'location-review') return result('location-review', points);
  return result(reasons.length ? 'requirements-review' : 'eligible', points);
}

export function canonicalUrl(value: string) {
  const url = new URL(value);
  url.hash = '';
  url.pathname = url.pathname.replace(/\/apply\/?$/, '').replace(/\/$/, '') || '/';
  for (const name of [...url.searchParams.keys()]) {
    if (/^(utm_|ref$|referrer$|source$|src$|gh_src$)/i.test(name)) url.searchParams.delete(name);
  }
  url.searchParams.sort();
  return url.href;
}
