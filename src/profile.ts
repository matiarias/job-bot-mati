import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const profileSchema = z.object({
  documentedYears: z.number().nonnegative(), english: z.string().min(1),
  evidence: z.object({ react: z.string(), bff: z.string(), finance: z.string(), ownership: z.string(), quality: z.string(), tooling: z.string(), education: z.string() }),
  unknown: z.string(),
});
export function loadProfile(path: string) {
  let content: string;
  try { content = readFileSync(path, 'utf8').replace(/^\uFEFF/, ''); }
  catch { throw new Error('No se pudo leer el perfil en ' + path + '. Copiá profile.example.json a profile.local.json y completalo.'); }
  try { return profileSchema.parse(JSON.parse(content)); }
  catch { throw new Error('El perfil ' + path + ' no es válido. Revisá el JSON y comparalo con profile.example.json.'); }
}
export const profile = loadProfile(process.env.JOB_BOT_PROFILE_PATH || fileURLToPath(new URL('../profile.local.json', import.meta.url)));
