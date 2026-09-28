param([string]$Configuration = "Release")
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
& (Join-Path $PSScriptRoot "build.ps1") -Configuration $Configuration

$output = Join-Path $root "Build\$Configuration"
$artifact = Join-Path $root "QuickLook.Plugin.StepViewer.qlplugin"
$tempZip = Join-Path $root "QuickLook.Plugin.StepViewer.zip"

if (-not (Test-Path (Join-Path $output "QuickLook.Plugin.StepViewer.dll"))) { throw "Plugin DLL is missing." }
if (-not (Test-Path (Join-Path $output "QuickLook.Plugin.Metadata.config"))) { throw "Plugin metadata is missing." }
if (-not (Test-Path (Join-Path $output "Web\vendor\occt-import-js.wasm"))) { throw "OCCT WebAssembly asset is missing." }

Remove-Item $artifact,$tempZip -Force -ErrorAction SilentlyContinue
$items = Get-ChildItem $output -Exclude *.pdb,*.xml
Compress-Archive -Path $items.FullName -DestinationPath $tempZip -CompressionLevel Optimal
Move-Item $tempZip $artifact
Write-Host "Created $artifact"
