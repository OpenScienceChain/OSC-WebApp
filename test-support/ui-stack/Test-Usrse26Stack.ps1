[CmdletBinding()]
param(
  [ValidateSet('simulator', 'gateway')]
  [string]$Mode = 'simulator',
  [string]$OscIsRoot,
  [switch]$KeepRunning
)

$ErrorActionPreference = 'Stop'
$stackDirectory = $PSScriptRoot
$composeFile = Join-Path $stackDirectory 'compose.yaml'

if (-not $OscIsRoot) {
  $candidate = Resolve-Path (Join-Path $stackDirectory '..\..\..')
  if (Test-Path (Join-Path $candidate 'OSC-APIGateway')) {
    $OscIsRoot = $candidate.Path
  } else {
    $OscIsRoot = (Resolve-Path (Join-Path $stackDirectory '..\..\..\..')).Path
  }
}

$env:OSC_IS_ROOT = $OscIsRoot
$compose = @('compose', '--project-name', 'osc-usrse26-ux', '--file', $composeFile, '--profile', $Mode)

try {
  & docker @compose up --build --detach --wait
  if ($LASTEXITCODE -ne 0) { throw "The $Mode stack failed to start." }

  $health = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:18080/healthz'
  if ($health.StatusCode -ne 200) { throw 'The WebApp health check failed.' }

  if ($Mode -eq 'simulator') {
    $artifacts = Invoke-RestMethod -Uri 'http://127.0.0.1:18080/api/v1/artifacts'
    $workflows = Invoke-RestMethod -Uri 'http://127.0.0.1:18080/api/v1/workflows'
    if ($artifacts.Count -lt 2 -or $workflows.Count -lt 2) {
      throw 'The simulator did not return both organization fixtures.'
    }
    [pscustomobject]@{
      Status = 'passed'
      Mode = $Mode
      ArtifactCount = $artifacts.Count
      WorkflowCount = $workflows.Count
      WebApp = 'http://127.0.0.1:18080/'
      Simulator = 'http://127.0.0.1:13310/'
    }
  } else {
    & (Join-Path $stackDirectory 'Initialize-GatewayFixtures.ps1')
    if ($LASTEXITCODE -ne 0) { throw 'Gateway fixture validation failed.' }
  }
} finally {
  if (-not $KeepRunning) {
    & docker @compose down --volumes --remove-orphans
  }
}
