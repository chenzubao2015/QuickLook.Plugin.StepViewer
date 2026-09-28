$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$artifact = Join-Path $root "QuickLook.Plugin.StepViewer.Source.zip"
Remove-Item $artifact -Force -ErrorAction SilentlyContinue

$include = @(
    ".gitignore",
    ".gitattributes",
    ".github",
    "CHANGELOG.md",
    "LICENSE.txt",
    "licenses",
    "package.json",
    "package-lock.json",
    "Plugin.cs",
    "QuickLook.Plugin.Metadata.config",
    "QuickLook.Plugin.StepViewer.csproj",
    "README.md",
    "README_EN.md",
    "PUBLISHING.md",
    "RELEASE_NOTES_v1.4.0.md",
    "StepViewerPanel.cs",
    "THIRD-PARTY-NOTICES.txt",
    "docs",
    "Scripts",
    "Web\index.html",
    "Web\viewer-src.js",
    "Web\viewer.css"
)
$paths = $include | ForEach-Object { Join-Path $root $_ }
Compress-Archive -Path $paths -DestinationPath $artifact -CompressionLevel Optimal
Write-Host "Created $artifact"
