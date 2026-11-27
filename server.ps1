# Local static server for Att göra. Binds only to 127.0.0.1:8742.
# Uses TcpListener so Windows does not need an admin URL reservation.
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$port = 8742

function Send-Bytes($stream, $status, $contentType, [byte[]]$body) {
    if (-not $body) { $body = New-Object byte[] 0 }
    $header = "HTTP/1.1 $status`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`nConnection: close`r`nCache-Control: no-cache`r`n`r`n"
    $head = [System.Text.Encoding]::ASCII.GetBytes($header)
    $stream.Write($head, 0, $head.Length)
    if ($body.Length -gt 0) { $stream.Write($body, 0, $body.Length) }
    $stream.Flush()
}

function Get-ContentType($path) {
    switch ([System.IO.Path]::GetExtension($path).ToLowerInvariant()) {
        ".html" { return "text/html; charset=utf-8" }
        ".css" { return "text/css; charset=utf-8" }
        ".js" { return "text/javascript; charset=utf-8" }
        ".webmanifest" { return "application/manifest+json" }
        ".png" { return "image/png" }
        ".ico" { return "image/x-icon" }
        ".svg" { return "image/svg+xml" }
        ".woff2" { return "font/woff2" }
        default { return "application/octet-stream" }
    }
}

function Serve-Client($client) {
    $stream = $client.GetStream()
    $stream.ReadTimeout = 4000
    $buffer = New-Object byte[] 4096
    $received = New-Object System.IO.MemoryStream
    try {
        while ($received.Length -lt 65536) {
            $n = $stream.Read($buffer, 0, $buffer.Length)
            if ($n -le 0) { break }
            $received.Write($buffer, 0, $n)
            $soFar = [System.Text.Encoding]::ASCII.GetString($received.ToArray())
            if ($soFar.Contains("`r`n`r`n")) { break }
        }
    } catch {
        return
    }

    $raw = [System.Text.Encoding]::ASCII.GetString($received.ToArray())
    $line = ""
    if ($raw.Length -gt 0) { $line = ($raw -split "`r`n", 2)[0] }
    if ($line -notmatch '^GET\s+(\S+)\s+HTTP/1\.[01]$') {
        Send-Bytes $stream "405 Method Not Allowed" "text/plain; charset=utf-8" ([System.Text.Encoding]::ASCII.GetBytes("Method not allowed"))
        return
    }

    $urlPath = $Matches[1]
    $q = $urlPath.IndexOf("?")
    if ($q -ge 0) { $urlPath = $urlPath.Substring(0, $q) }
    try { $urlPath = [System.Uri]::UnescapeDataString($urlPath) } catch { $urlPath = "/" }
    $urlPath = $urlPath.Replace("\", "/")
    if ($urlPath -eq "" -or $urlPath -eq "/") { $relative = "index.html" }
    else { $relative = $urlPath.TrimStart("/") }

    if ($relative.Contains("..")) {
        Send-Bytes $stream "403 Forbidden" "text/plain; charset=utf-8" ([System.Text.Encoding]::ASCII.GetBytes("Forbidden"))
        return
    }

    $rootFull = [System.IO.Path]::GetFullPath($root)
    if (-not $rootFull.EndsWith([System.IO.Path]::DirectorySeparatorChar)) {
        $rootFull = $rootFull + [System.IO.Path]::DirectorySeparatorChar
    }
    $full = [System.IO.Path]::GetFullPath((Join-Path $root $relative))
    $name = [System.IO.Path]::GetFileName($full)
    $ext = [System.IO.Path]::GetExtension($full).ToLowerInvariant()
    if ($name.StartsWith(".") -or $ext -eq ".ps1" -or $ext -eq ".vbs") {
        Send-Bytes $stream "403 Forbidden" "text/plain; charset=utf-8" ([System.Text.Encoding]::ASCII.GetBytes("Forbidden"))
        return
    }
    if (-not $full.StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase)) {
        Send-Bytes $stream "403 Forbidden" "text/plain; charset=utf-8" ([System.Text.Encoding]::ASCII.GetBytes("Forbidden"))
        return
    }
    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) {
        Send-Bytes $stream "404 Not Found" "text/plain; charset=utf-8" ([System.Text.Encoding]::ASCII.GetBytes("Not found"))
        return
    }

    $bytes = [System.IO.File]::ReadAllBytes($full)
    Send-Bytes $stream "200 OK" (Get-ContentType $full) $bytes
}

$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $port)
try {
    $listener.Start()
} catch {
    exit 0
}

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        try {
            Serve-Client $client
        } catch {
        } finally {
            $client.Close()
        }
    }
} finally {
    $listener.Stop()
}
