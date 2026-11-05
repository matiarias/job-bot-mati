import { join } from 'node:path';
import { createMatcher } from './matching.ts';
import { scan } from './scan.ts';

const args = new Set(process.argv.slice(2));
const preview = args.has('--preview') || args.has('--calibrate');
const key = process.env.OPENAI_API_KEY?.trim();

try {
  if ([...args].some(arg => !['--preview', '--calibrate', '--help'].includes(arg))) {
    throw new Error('Opción desconocida. Usá --help.');
  }
  if (args.has('--help')) {
    console.log('npm run jobs:scan -- [--preview | --calibrate]\n' +
      'Sin opciones guarda el historial y el informe. --preview no cambia el historial.\n' +
      '--calibrate muestra además una muestra de hasta 18 avisos. Sin clave, ambas vistas usan reglas.');
  } else {
    if (!key && !preview) {
      throw new Error('Configurá OPENAI_API_KEY en .env o usá --preview para probar sin clave.');
    }
    const result = await scan({
      preview,
      calibrate: args.has('--calibrate'),
      directory: join(import.meta.dirname, '..', 'data'),
      matcher: key ? createMatcher(key) : undefined,
      key: process.env.HIMALAYAS_API_KEY?.trim(),
    });
    console.log(result.report);
    if (result.reportPath) console.log('Informe: ' + result.reportPath);
    if (result.failed) process.exitCode = 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'No se pudo completar la búsqueda.');
  process.exitCode = 1;
}
