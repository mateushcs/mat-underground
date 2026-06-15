param(
  [string]$Name = "current",
  [int]$W = 1600,
  [int]$H = 940,
  [string]$Url = "http://localhost:8080/",
  [int]$Scale = 1
)
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$out = "E:\Claude\mats-subway\.claude\shots"
New-Item -ItemType Directory -Force -Path $out | Out-Null
$tmp = "$env:TEMP\chrome-shot-profile"
$path = Join-Path $out "$Name.png"
if (Test-Path $path) { Remove-Item $path -Force }
& $chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --force-device-scale-factor=$Scale --user-data-dir="$tmp" --window-size="$W,$H" --screenshot="$path" --virtual-time-budget=8000 "$Url" | Out-Null
if (Test-Path $path) { "OK $path $((Get-Item $path).Length) bytes" } else { "NO FILE" }
