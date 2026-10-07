param(
  [Parameter(Mandatory = $true)][string]$Token,
  [string]$Publish = "false"
)

# Deers Rock Zenodo upload — mirrors the Kronos Engine zenodo-package/upload.ps1 pattern.
# Token is supplied at runtime (never hard-coded). Requires human authorization to publish.
$ErrorActionPreference = "Stop"
$base = "C:\Users\think\Project_v2\Deers-Rock\zenodo-package"
$headers = @{ "Authorization" = "Bearer $Token"; "Content-Type" = "application/json" }

# 1. Create deposition
$meta = Get-Content "$base\metadata.json" -Raw
$dep = Invoke-RestMethod -Uri "https://zenodo.org/api/deposit/depositions" -Headers $headers -Method Post -Body $meta
$bucket = $dep.links.bucket
$depId = $dep.id
Write-Output "Deposition created: $depId"
Write-Output "Bucket: $bucket"

# 2. Upload files (local path -> remote name)
$uploads = @(
  @{ Local = "$base\README.md"; Remote = "README.md" },
  @{ Local = "$base\ZENODO-REPORT.md"; Remote = "ZENODO-REPORT.md" },
  @{ Local = "$base\manuscript\jamia-dr-submission.md"; Remote = "manuscript-jamia-dr-submission.md" },
  @{ Local = "$base\evidence\e1-baseline\e1-10seeds-summary.json"; Remote = "evidence-e1-10seeds-summary.json" },
  @{ Local = "$base\evidence\e1-baseline\e1-10seeds-runs.csv"; Remote = "evidence-e1-10seeds-runs.csv" },
  @{ Local = "$base\documentation\EXPERIMENT-FREEZE-2026-09-10.md"; Remote = "doc-EXPERIMENT-FREEZE-2026-09-10.md" },
  @{ Local = "$base\software\CITATION.cff"; Remote = "CITATION.cff" },
  @{ Local = "$base\software\LICENSE"; Remote = "LICENSE" }
)

$putHeaders = @{ "Authorization" = "Bearer $Token" }
foreach ($f in $uploads) {
  if (-not (Test-Path $f.Local)) { Write-Output "SKIP (missing): $($f.Remote)"; continue }
  $bytes = [System.IO.File]::ReadAllBytes($f.Local)
  $name = [uri]::EscapeDataString($f.Remote)
  try {
    $r = Invoke-RestMethod -Uri "$bucket/$name" -Headers $putHeaders -Method Put -Body $bytes -ContentType "application/octet-stream" -TimeoutSec 120
    Write-Output "OK: $($r.filename) ($($r.filesize) bytes)"
  } catch {
    Write-Output "FAIL: $($f.Remote) - $($_.Exception.Message)"
  }
  Start-Sleep -Seconds 1
}

Write-Output "Deposition ID: $depId"
Write-Output "Draft URL: $($dep.links.html)"
if ($Publish -eq "true") {
  Invoke-RestMethod -Uri "https://zenodo.org/api/deposit/depositions/$depId/actions/publish" -Headers $headers -Method Post | Out-Null
  Write-Output "PUBLISHED (DOI minted)"
} else {
  Write-Output "Draft only (not published). Set -Publish true to mint DOI."
}
