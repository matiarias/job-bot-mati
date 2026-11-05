param(
    [ValidatePattern('^(?:[01]\d|2[0-3]):[0-5]\d$')]
    [string]$Time = '09:00'
)

$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
$node = (Get-Command node.exe -ErrorAction Stop).Source
$version = [version]((& $node --version).TrimStart('v'))
if ($version.Major -ne 24 -or $version -lt [version]'24.22.2') {
    throw 'Seleccioná una versión actualizada de Node.js 24 LTS.'
}
if ((Get-TimeZone).Id -ne 'Argentina Standard Time') {
    throw 'El horario usa la zona local de Windows. Configurá la zona de Argentina antes de registrarla.'
}
$envFile = Join-Path $project '.env'
if (-not (Test-Path -LiteralPath $envFile)) {
    throw 'Creá .env y validá una ejecución con OpenAI antes de programarla.'
}
& $node "--env-file=$envFile" -e "process.exit(process.env.OPENAI_API_KEY?.trim() ? 0 : 1)"
if ($LASTEXITCODE -ne 0) {
    throw 'Falta OPENAI_API_KEY en .env.'
}
if (-not (Get-ChildItem -LiteralPath (Join-Path $project 'data/reports') -Filter '*.md' -ErrorAction SilentlyContinue |
          Select-String -Pattern '^\s+- Encaje: (alto|medio)$' | Select-Object -First 1)) {
    throw 'Primero corré una búsqueda normal y revisá un informe con resultados evaluados por IA.'
}

$taskName = 'JobBot-Argentina'
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
    throw "Ya existe la tarea $taskName. Podés ajustar su horario en el Programador de tareas."
}
$at = [datetime]::Today.Add([TimeSpan]::Parse($Time))
$action = New-ScheduledTaskAction -Execute $node -Argument '--env-file=.env src/cli.ts' -WorkingDirectory $project
$trigger = New-ScheduledTaskTrigger -Daily -At $at
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description 'Busca ofertas frontend compatibles con trabajo remoto desde Argentina.'
Write-Host "Node seleccionado: $node ($version)"
Write-Host "Tarea registrada para las $Time de Argentina."
