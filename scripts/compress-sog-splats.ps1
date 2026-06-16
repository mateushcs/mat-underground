$ErrorActionPreference = "Stop"

$PublicDir = Join-Path (Split-Path -Parent $PSScriptRoot) "public"
$Force = $args -contains "--force"
$Harmonics = if ($env:SOG_HARMONICS) { $env:SOG_HARMONICS } else { "0" }
$Decimate = if ($env:SOG_DECIMATE) { $env:SOG_DECIMATE } else { "30%" }
$Iterations = if ($env:SOG_ITERATIONS) { $env:SOG_ITERATIONS } else { "10" }

function MB($bytes) {
  return "{0:N2}" -f ($bytes / 1MB)
}

Write-Host "SOG options: harmonics=$Harmonics, decimate=$Decimate, iterations=$Iterations"

$totalIn = 0
$totalOut = 0
$plys = Get-ChildItem -LiteralPath $PublicDir -Recurse -Filter *.ply
$PublicPrefix = $PublicDir.TrimEnd("\") + "\"

foreach ($ply in $plys) {
  $sog = [System.IO.Path]::ChangeExtension($ply.FullName, ".sog")
  $rel = $ply.FullName.Substring($PublicPrefix.Length).Replace("\", "/")
  $outRel = $sog.Substring($PublicPrefix.Length).Replace("\", "/")

  if ((-not $Force) -and (Test-Path -LiteralPath $sog)) {
    $sogItem = Get-Item -LiteralPath $sog
    if ($sogItem.LastWriteTimeUtc -ge $ply.LastWriteTimeUtc) {
      $totalIn += $ply.Length
      $totalOut += $sogItem.Length
      Write-Host "skip  $outRel  ($(MB $sogItem.Length)MB)"
      continue
    }
  }

  & npx --yes '@playcanvas/splat-transform' -w $ply.FullName -H $Harmonics -F $Decimate -i $Iterations $sog
  if ($LASTEXITCODE -ne 0) {
    throw "splat-transform failed for $rel"
  }

  $sogItem = Get-Item -LiteralPath $sog
  $totalIn += $ply.Length
  $totalOut += $sogItem.Length
  Write-Host "ok    $rel -> $outRel  $(MB $ply.Length)MB -> $(MB $sogItem.Length)MB"
}

Write-Host ""
Write-Host "SOG splats: $($plys.Count) file(s): $(MB $totalIn)MB -> $(MB $totalOut)MB  ($("{0:N2}" -f ($totalIn / $totalOut))x smaller)"
