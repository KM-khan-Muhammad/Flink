# Flink Development Start Script
# Detects LAN IP and starts both frontend and backend for mobile testing

$ErrorActionPreference = "SilentlyContinue"

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "  ║              FLINK - LAN Development Mode           ║" -ForegroundColor Magenta
Write-Host "  ╚══════════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""

# Detect LAN IP
$LAN_IP = "unable-to-detect"
try {
    $interfaces = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
        $_.IPAddress -ne "127.0.0.1" -and
        $_.IPAddress -ne "::1" -and
        $_.PrefixOrigin -ne "WellKnown"
    }
    $bestInterface = $interfaces | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.InterfaceAlias -notlike "*Teredo*" } | Select-Object -First 1
    if ($bestInterface) {
        $LAN_IP = $bestInterface.IPAddress
    } else {
        $LAN_IP = ($interfaces | Select-Object -First 1).IPAddress
    }
} catch {
    # Fallback: try ipconfig
    $ipConfig = ipconfig | Select-String "IPv4" | Select-String -NotMatch "127.0.0.1" | Select-String -NotMatch "Loopback"
    if ($ipConfig) {
        $LAN_IP = ($ipConfig | Select-String -Pattern "(\d+\.\d+\.\d+\.\d+)").Matches[0].Value
    }
}

Write-Host "  Network Detection:" -ForegroundColor Cyan
Write-Host "    LAN IP Address:  $LAN_IP" -ForegroundColor Yellow
Write-Host ""

Write-Host "  ╔══════════════════════════════════════════════════════╗" -ForegroundColor DarkGray
Write-Host "  ║  URLs                                                ║" -ForegroundColor DarkGray
Write-Host "  ╠══════════════════════════════════════════════════════╣" -ForegroundColor DarkGray
Write-Host "  ║                                                     ║" -ForegroundColor DarkGray
Write-Host "  ║  Frontend (Local):   " -NoNewline -ForegroundColor DarkGray
Write-Host "http://localhost:4200" -ForegroundColor Green
Write-Host "  ║  Frontend (Mobile):  " -NoNewline -ForegroundColor DarkGray
Write-Host "http://${LAN_IP}:4200" -ForegroundColor Green -BackgroundColor DarkGray
Write-Host "  ║                                                     ║" -ForegroundColor DarkGray
Write-Host "  ║  Backend (Local):    " -NoNewline -ForegroundColor DarkGray
Write-Host "https://localhost:7030" -ForegroundColor Cyan
Write-Host "  ║  Backend (LAN HTTP): " -NoNewline -ForegroundColor DarkGray
Write-Host "http://${LAN_IP}:5223" -ForegroundColor Cyan -BackgroundColor DarkGray
Write-Host "  ║  Backend (LAN HTTPS):" -NoNewline -ForegroundColor DarkGray
Write-Host "https://${LAN_IP}:7030" -ForegroundColor Cyan -BackgroundColor DarkGray
Write-Host "  ║                                                     ║" -ForegroundColor DarkGray
Write-Host "  ║  SignalR Hub:  " -NoNewline -ForegroundColor DarkGray
Write-Host "/hubs/call" -ForegroundColor Yellow
Write-Host "  ║                                                     ║" -ForegroundColor DarkGray
Write-Host "  ╚══════════════════════════════════════════════════════╝" -ForegroundColor DarkGray
Write-Host ""

# Generate QR Code URL
$QR_URL = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=http://${LAN_IP}:4200"
Write-Host "  QR Code URL (open in browser to scan):" -ForegroundColor Cyan
Write-Host "  $QR_URL" -ForegroundColor Yellow
Write-Host ""

Write-Host "  ─────────────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host "  Open this URL on your phone's browser to test:" -ForegroundColor White
Write-Host "  >>>  http://${LAN_IP}:4200  <<<" -ForegroundColor Green -BackgroundColor DarkGray
Write-Host "  ─────────────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""

Write-Host "  Starting servers..." -ForegroundColor Cyan
Write-Host ""

# Start Backend in background
Write-Host "  [Backend] Starting ASP.NET Core on http://${LAN_IP}:5223 ..." -ForegroundColor Yellow
$backendJob = Start-Process -FilePath "dotnet" -ArgumentList "run --urls http://0.0.0.0:5223;https://0.0.0.0:7030" -WorkingDirectory "$PSScriptRoot\Backend\Flink\Flink.web" -PassThru -NoNewWindow
Write-Host "  [Backend] Started (PID: $($backendJob.Id))" -ForegroundColor Green

Start-Sleep -Seconds 2

# Start Frontend
Write-Host "  [Frontend] Starting Angular dev server on http://0.0.0.0:4200 ..." -ForegroundColor Yellow

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║  Ready! Open on your phone:                         ║" -ForegroundColor Green
Write-Host "  ║  http://${LAN_IP}:4200" -ForegroundColor Green -BackgroundColor DarkGray
Write-Host "  ╚══════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Run Angular dev server (foreground - keeps script alive)
ng serve --host 0.0.0.0 --port 4200
