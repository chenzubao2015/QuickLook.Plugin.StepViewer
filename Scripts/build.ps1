param([string]$Configuration = "Release")
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$dotnet = Join-Path (Split-Path -Parent $root) ".dotnet\dotnet.exe"
if (-not (Test-Path $dotnet)) { $dotnet = "dotnet" }

Push-Location $root
try {
    npm install --ignore-scripts
    if ($LASTEXITCODE -ne 0) { throw "npm install failed." }

    Remove-Item "Web\vendor" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item "Build\$Configuration" -Recurse -Force -ErrorAction SilentlyContinue
    New-Item -ItemType Directory -Force -Path "Web\vendor" | Out-Null
    Copy-Item "node_modules\occt-import-js\dist\occt-import-js.js" "Web\vendor\" -Force
    Copy-Item "node_modules\occt-import-js\dist\occt-import-js.wasm" "Web\vendor\" -Force
    & ".\node_modules\.bin\esbuild.cmd" "Web\viewer-src.js" --bundle --format=iife --target=chrome90 --outfile="Web\viewer.js"
    if ($LASTEXITCODE -ne 0) { throw "JavaScript bundle failed." }

    & $dotnet build ".\QuickLook.Plugin.StepViewer.csproj" -c $Configuration
    if ($LASTEXITCODE -ne 0) { throw "dotnet build failed." }
} finally {
    Pop-Location
}
