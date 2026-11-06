# Bot de búsqueda laboral · Argentina

CLI personal para puestos remotos de frontend y software engineering con foco frontend. Prioriza semisenior, incluye Senior selectivo y admite empleo local o internacional, incluido contractor.

## Qué necesitás

- Windows con PowerShell, Git y Node.js 24 compatible.
- Conexión a internet para consultar los portales. No necesitás una cuenta de OpenAI para la vista previa.
- El proyecto incluye la CLI y una bandeja web con ofertas de ejemplo.

## Preparación

Usá la última versión con parches de [Node.js 24 LTS](https://nodejs.org/dist/latest-v24.x/). La versión verificada el 5 de noviembre de 2026 fue `v24.22.2`. Abrí PowerShell dentro de la carpeta del proyecto.

```powershell
node --version
node -p "process.execPath"
npm.cmd ci
Copy-Item profile.example.json profile.local.json
notepad.exe profile.local.json
npm.cmd run jobs:scan -- --calibrate
```

Completá `profile.local.json` con tu experiencia, sin datos de contacto. El ejemplo contiene información ficticia. El archivo local está excluido de Git; si ya tenés un perfil configurado, conservá ese archivo y no lo sobrescribas. El filtro de requisitos está calibrado para inglés B2 y formación en bootcamps, por lo que debe adaptarse en el código si tu perfil difiere.

`--calibrate` muestra hasta 18 avisos y `--preview` muestra solo el resumen. Ambas opciones usan las APIs en vivo y dejan el historial intacto. Sin clave de OpenAI aplican reglas. Si hay una clave configurada, también llaman al modelo y pueden generar cargos.

## Entender los resultados

El informe muestra oportunidades prioritarias, enlaces, ubicación y salario si está publicado; también separa avisos con datos geográficos o requisitos por confirmar. Revisá cada aviso antes de postularte: el bot no postula por vos y las reglas pueden equivocarse. Los datos dependen de las fuentes disponibles.

## Activar el matching con IA (opcional)

```powershell
Copy-Item .env.example .env
notepad.exe .env
npm.cmd run jobs:scan
```

Pegá una clave de tu [proyecto en OpenAI](https://platform.openai.com/api-keys) en `OPENAI_API_KEY`. El proyecto de API debe tener acceso al modelo y saldo o facturación activa. `OPENAI_MODEL` permite elegir otro modelo compatible con Responses y salidas estructuradas. `HIMALAYAS_API_KEY` es opcional y sirve para ampliar el límite de su API.

El bot guarda el historial en `data/jobs.sqlite` y un informe por ejecución en `data/reports`. Una búsqueda normal omite avisos ya mostrados. El modelo recibe una descripción y un resumen técnico editable en `profile.local.json`. El CV completo, los datos de contacto y las claves quedan fuera de ese pedido.

## Programar en Windows

Después de completar y revisar una búsqueda normal con IA, registrá la tarea desde PowerShell. Usa la zona argentina de Windows y el ejecutable de Node detectado al registrarla.

```powershell
.\scripts\register-daily.ps1 -Time '09:00'
(Get-ScheduledTask -TaskName 'JobBot-Argentina').Actions |
  Format-List Execute, Arguments, WorkingDirectory
Start-ScheduledTask -TaskName 'JobBot-Argentina'
Get-ScheduledTaskInfo -TaskName 'JobBot-Argentina'
```

Revisá `data/reports` cuando termine. Si la PC está apagada, Windows intentará ejecutar la tarea cuando vuelva a estar disponible.

## Cómo funciona

- `apps/cli/src/sources.ts` consulta la primera página de tres búsquedas por portal, normaliza la respuesta y comprueba la vigencia de los candidatos prioritarios. Himalayas conserva su enlace oficial de postulación. LinkedIn se usa por sus alertas, en paralelo.
- `apps/cli/src/rules.ts` separa ubicación, requisitos obligatorios y afinidad del puesto. `apps/cli/src/matching.ts` usa Responses y Zod para aportar coincidencias y brechas a partir de la descripción y el perfil.
- `apps/cli/src/store.ts` deduplica por ID, URL directa cuando el portal la entrega y coincidencia de contenido. La deduplicación entre portales puede dejar pasar avisos con enlaces diferentes y textos reescritos.
- `apps/cli/src/scan.ts` verifica y evalúa hasta 15 candidatos por búsqueda, prioriza hasta cinco y separa los avisos que requieren revisión. Un error en una fuente se informa junto con los resultados disponibles.

```powershell
npm.cmd test
npm.cmd run typecheck
```

`npm.cmd test` ejecuta las pruebas de la CLI y las de la API con Vitest. Para ejecutar solo las de NestJS, usá `npm.cmd test --workspace=@job-bot/api`.

[Get on Board](https://www.getonbrd.com/user-manual/get-on-board-s-api) · [Himalayas](https://himalayas.app/docs/remote-jobs-api) · [Alertas de LinkedIn](https://www.linkedin.com/help/linkedin/answer/a511279) · [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses)

## Interfaz web

Instalá las dependencias desde la raíz con `npm.cmd ci`. Después, desde la misma carpeta, iniciá la API y la web en dos terminales.

```powershell
# Terminal 1
npm.cmd run dev:api

# Terminal 2
npm.cmd run dev:web
```

Abrí la URL que muestra Vite. NestJS escucha en `http://127.0.0.1:3000` y Vite reenvía `/api/jobs` a ese servidor. La API de ejemplo no requiere cuentas ni claves.

`GET /api/jobs` responde con estado `200` y una lista JSON de ofertas ficticias. Una lista sin ofertas se representa como `[]`. El tipo compartido `Job` conserva los IDs, el puesto, la empresa, la ubicación, la modalidad contractual, el salario, las tecnologías, la fecha, la descripción, las coincidencias y los puntos por confirmar.

Podés buscar por puesto, empresa o tecnología, ordenar por fecha y guardar ofertas en este navegador. Para comprobar el reintento, detené la API y recargá la web. Cuando aparezca el mensaje de error, iniciá nuevamente la API y elegí **Reintentar**. Tus guardadas se conservan.

Para compilar ambos workspaces, ejecutá `npm.cmd run build:api` y `npm.cmd run build:web`. Para ejecutar la API compilada, usá `npm.cmd start --workspace=@job-bot/api`.

## Catálogo en Supabase

La bandeja puede mostrar el catálogo sin login. Las ofertas de la tabla `jobs` son públicas y las guardadas siguen en el navegador. No guardes perfiles, preferencias ni historial personal en esa tabla.

1. En el SQL Editor de tu proyecto de Supabase, ejecutá `supabase/migrations/202611060001_create_jobs.sql`. La migración activa RLS y concede solo lectura a los roles de la API pública.
2. Si querés probar con las cinco ofertas ficticias, ejecutá también `supabase/seed.sql` en el SQL Editor.
3. Agregá `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` al `.env` de la raíz y reiniciá NestJS. Usá la clave publicable del proyecto, que empieza con `sb_publishable_`.

Si dejás ambas variables vacías, la API sirve los ejemplos desde el código. Con Supabase configurado, una tabla vacía devuelve `[]` y una falla devuelve `503` para que la web pueda ofrecer un reintento.

## Próximos pasos

El siguiente paso es conectar el escaneo de la CLI para actualizar el catálogo con ofertas reales. Si agregamos preferencias sincronizadas, historial privado o controles de administración en la web, esas funciones tendrán acceso restringido.

## Estructura del repositorio

Este repositorio usa npm workspaces. `apps/cli` contiene el bot, `apps/web` la interfaz, `apps/api` la API de NestJS y `packages/contracts` el contrato TypeScript compartido. El `package.json` de la raíz coordina la instalación y los comandos. El perfil, `.env` y `data/` permanecen en la raíz.

Desde la raíz, `npm.cmd ci` instala todos los workspaces. Para ejecutar un comando específico: `npm.cmd run test --workspace=@job-bot/cli`.
