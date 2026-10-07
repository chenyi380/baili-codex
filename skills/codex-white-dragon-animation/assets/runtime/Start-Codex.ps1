param([switch]$AcceptLocalDebugRisk,[switch]$Probe)
$ErrorActionPreference='Stop'
$taskNode=Get-Command node.exe -ErrorAction SilentlyContinue
if(-not $taskNode){throw 'Node.js 22 or newer is required. Read README.md.'}
if($Probe){ & $taskNode.Source (Join-Path $PSScriptRoot 'launcher.mjs') --probe; exit $LASTEXITCODE }
if($AcceptLocalDebugRisk){& $taskNode.Source (Join-Path $PSScriptRoot 'launcher.mjs') --accept-local-debug-risk}
else{& $taskNode.Source (Join-Path $PSScriptRoot 'launcher.mjs') --interactive}
exit $LASTEXITCODE
