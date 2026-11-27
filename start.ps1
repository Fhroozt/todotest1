# Starts the local server if needed, then opens Att göra in a small Edge or Chrome window.
# The address is always http://127.0.0.1:8742/ so the task list stays in one place.
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$port = 8742
$url = "http://127.0.0.1:$port/"
$log = Join-Path $root "start-log.txt"

function Write-StartLog($message) {
    $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    [System.IO.File]::AppendAllText($log, "$stamp  $message`r`n")
}

function Show-StartError($message) {
    Write-StartLog $message
    try {
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.MessageBox]::Show($message, "Att göra") | Out-Null
    } catch {
    }
    exit 1
}

function Test-ListenPort {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $client.Connect("127.0.0.1", $port)
        return $true
    } catch {
        return $false
    } finally {
        $client.Dispose()
    }
}

function Find-Browser {
    $memory = Join-Path $root ".att-gora-browser"
    if (Test-Path -LiteralPath $memory) {
        $saved = (Get-Content -LiteralPath $memory -Encoding Ascii | Select-Object -First 1)
        if ($saved) { $saved = $saved.Trim() }
        if ($saved -and (Test-Path -LiteralPath $saved)) { return $saved }
    }

    $programFilesX86 = ${env:ProgramFiles(x86)}
    if (-not $programFilesX86) { $programFilesX86 = $env:ProgramFiles }
    $candidates = @(
        (Join-Path $env:ProgramFiles "Microsoft\Edge\Application\msedge.exe"),
        (Join-Path $programFilesX86 "Microsoft\Edge\Application\msedge.exe"),
        (Join-Path $env:LocalAppData "Google\Chrome\Application\chrome.exe"),
        (Join-Path $env:ProgramFiles "Google\Chrome\Application\chrome.exe"),
        (Join-Path $programFilesX86 "Google\Chrome\Application\chrome.exe")
    )
    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path -LiteralPath $candidate)) {
            Set-Content -LiteralPath $memory -Value $candidate -Encoding Ascii
            return $candidate
        }
    }
    return $null
}

function New-AttGoraShortcut($path, $vbs, $icon) {
    if (Test-Path -LiteralPath $path) { return }
    $shortcut = (New-Object -ComObject WScript.Shell).CreateShortcut($path)
    $shortcut.TargetPath = Join-Path $env:WINDIR "System32\wscript.exe"
    $shortcut.Arguments = '"' + $vbs + '"'
    $shortcut.WorkingDirectory = $root
    $shortcut.WindowStyle = 7
    $shortcut.IconLocation = $icon + ",0"
    $shortcut.Description = "Att göra"
    $shortcut.Save()
}

try {
    if (-not (Test-ListenPort)) {
        $server = Join-Path $root "server.ps1"
        Start-Process -FilePath "powershell.exe" -WorkingDirectory $root -WindowStyle Hidden -ArgumentList @(
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-WindowStyle", "Hidden",
            "-File", $server
        ) | Out-Null

        $deadline = (Get-Date).AddSeconds(15)
        $up = $false
        while ((Get-Date) -lt $deadline) {
            Start-Sleep -Milliseconds 200
            if (Test-ListenPort) { $up = $true; break }
        }
        if (-not $up) {
            Show-StartError "Den lokala sidan svarade inte på $url`r`n`r`nProva att dubbelklicka på genvägen igen. Om det fortsätter, se start-log.txt."
        }
    }

    $browser = Find-Browser
    if (-not $browser) {
        Show-StartError "Hittade varken Microsoft Edge eller Google Chrome.`r`n`r`nInstallera Edge eller Chrome och dubbelklicka på genvägen igen."
    }

    $vbs = Join-Path $root "Att göra.vbs"
    $icon = Join-Path $root "icon.ico"
    if ((Test-Path -LiteralPath $vbs) -and (Test-Path -LiteralPath $icon)) {
        $desktop = [Environment]::GetFolderPath("Desktop")
        if ($desktop) {
            New-AttGoraShortcut (Join-Path $desktop "Att göra.lnk") $vbs $icon
        }
        $startMenu = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs"
        if (Test-Path -LiteralPath $startMenu) {
            New-AttGoraShortcut (Join-Path $startMenu "Att göra.lnk") $vbs $icon
        }
    }

    Start-Process -FilePath $browser -ArgumentList @(
        "--app=$url",
        "--window-size=440,720"
    ) | Out-Null
} catch {
    Show-StartError ("Kunde inte starta Att göra.`r`n`r`n" + $_.Exception.Message)
}
