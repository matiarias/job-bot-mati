# Bot de búsqueda laboral · Argentina

CLI personal para puestos remotos de frontend y software engineering con foco frontend. Prioriza semisenior, incluye Senior selectivo y admite empleo local o internacional, incluido contractor.

## Qué necesitás

- Windows con PowerShell, Git y Node.js 24 compatible.
- Conexión a internet para consultar los portales. No necesitás una cuenta de OpenAI para la vista previa.
- Esta versión funciona en consola: todavía no tiene interfaz web ni PostgreSQL.

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

- `src/sources.ts` consulta la primera página de tres búsquedas por portal, normaliza la respuesta y comprueba la vigencia de los candidatos prioritarios. Himalayas conserva su enlace oficial de postulación. LinkedIn se usa por sus alertas, en paralelo.
- `src/rules.ts` separa ubicación, requisitos obligatorios y afinidad del puesto. `src/matching.ts` usa Responses y Zod para aportar coincidencias y brechas a partir de la descripción y el perfil.
- `src/store.ts` deduplica por ID, URL directa cuando el portal la entrega y coincidencia de contenido. La deduplicación entre portales puede dejar pasar avisos con enlaces diferentes y textos reescritos.
- `src/scan.ts` verifica y evalúa hasta 15 candidatos por búsqueda, prioriza hasta cinco y separa los avisos que requieren revisión. Un error en una fuente se informa junto con los resultados disponibles.

```powershell
npm.cmd test
npm.cmd run typecheck
```

[Get on Board](https://www.getonbrd.com/user-manual/get-on-board-s-api) · [Himalayas](https://himalayas.app/docs/remote-jobs-api) · [Alertas de LinkedIn](https://www.linkedin.com/help/linkedin/answer/a511279) · [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses)

## Próximos pasos

Están planificados prototipos y una interfaz React, una API con NestJS y almacenamiento PostgreSQL en Supabase. Todavía no forman parte del proyecto.
