
# ============================================================
#  ProjectLens — Privacy Mode Starter
#  Run this script whenever you need the tunnel URL.
#  It starts the Local Agent + Cloudflare Tunnel together.
# ============================================================

Write-Host ""
Write-Host "  =============================================" -ForegroundColor Cyan
Write-Host "   ProjectLens Privacy Mode Starter" -ForegroundColor Cyan
Write-Host "  =============================================" -ForegroundColor Cyan
Write-Host ""

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
$AGENT_DIR = Join-Path $ROOT "local-agent"
$CLOUDFLARED = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
$LOG = "$env:TEMP\cloudflared-projectlens.log"

# 1. Start Local Agent
Write-Host "  [1/2] Starting Local Agent on port 3847..." -ForegroundColor Yellow
$agent = Start-Process -FilePath "node" -ArgumentList "--watch index.js" -WorkingDirectory $AGENT_DIR -PassThru -WindowStyle Minimized
Write-Host "        Local Agent started (PID: $($agent.Id))" -ForegroundColor Green
Start-Sleep -Seconds 2

# 2. Start Cloudflare Tunnel
Write-Host "  [2/2] Starting Cloudflare Tunnel..." -ForegroundColor Yellow
Remove-Item $LOG -ErrorAction SilentlyContinue
$tunnel = Start-Process -FilePath $CLOUDFLARED -ArgumentList "tunnel --url http://localhost:3847 --logfile `"$LOG`"" -PassThru -WindowStyle Minimized

# Wait for tunnel URL to appear in log
Write-Host "        Waiting for tunnel URL..." -ForegroundColor DarkGray
$url = $null
$attempts = 0
while (-not $url -and $attempts -lt 30) {
    Start-Sleep -Seconds 1
    $attempts++
    if (Test-Path $LOG) {
        $content = Get-Content $LOG -Raw -ErrorAction SilentlyContinue
        if ($content -match 'https://[a-z0-9\-]+\.trycloudflare\.com') {
            $url = $matches[0]
        }
    }
}

Write-Host ""
if ($url) {
    Write-Host "  =============================================" -ForegroundColor Green
    Write-Host "   TUNNEL IS LIVE!" -ForegroundColor Green
    Write-Host "  =============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "   Paste this URL in your deployed app:" -ForegroundColor White
    Write-Host ""
    Write-Host "   $url" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   Steps:" -ForegroundColor White
    Write-Host "   1. Open your deployed app" -ForegroundColor Gray
    Write-Host "   2. Go to Project Settings > Privacy Mode" -ForegroundColor Gray
    Write-Host "   3. Click Advanced and paste the URL above" -ForegroundColor Gray
    Write-Host "   4. Click Check Connection" -ForegroundColor Gray
    Write-Host ""

    # Copy to clipboard automatically
    $url | Set-Clipboard
    Write-Host "   (URL copied to clipboard!)" -ForegroundColor DarkGreen
} else {
    Write-Host "  [ERROR] Could not get tunnel URL. Check cloudflared is installed." -ForegroundColor Red
}

Write-Host ""
Write-Host "  Press any key to STOP everything and exit..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Cleanup
Write-Host "  Stopping services..." -ForegroundColor Yellow
Stop-Process -Id $agent.Id -ErrorAction SilentlyContinue
Stop-Process -Id $tunnel.Id -ErrorAction SilentlyContinue
Write-Host "  Done. Goodbye!" -ForegroundColor Cyan
