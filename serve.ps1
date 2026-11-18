# Minimal static file server for local preview of the Vreymar Hardware site.
# Usage:  powershell -ExecutionPolicy Bypass -File serve.ps1 [-Port 8080]
param([int]$Port = 8080)
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Vreymar Hardware running at http://localhost:$Port/  (Ctrl+C to stop)"
$types = @{ '.html'='text/html; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.js'='application/javascript; charset=utf-8';
  '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.png'='image/png'; '.svg'='image/svg+xml'; '.ico'='image/x-icon'; '.json'='application/json' }
try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $res = $ctx.Response
    try {
      $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
      if ($path -eq '' -or $path.EndsWith('/')) { $path += 'index.html' }
      $file = [IO.Path]::GetFullPath((Join-Path $root $path))
      $head = $ctx.Request.HttpMethod -eq 'HEAD'
      if ($file.StartsWith($root) -and (Test-Path $file -PathType Leaf)) {
        $bytes = [IO.File]::ReadAllBytes($file)
        $ext = [IO.Path]::GetExtension($file).ToLower()
        $res.ContentType = if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' }
        $res.Headers.Add('Cache-Control', 'no-cache')
      } else {
        $res.StatusCode = 404
        $bytes = [Text.Encoding]::UTF8.GetBytes('Not found')
      }
      $res.ContentLength64 = $bytes.Length
      if (-not $head) { $res.OutputStream.Write($bytes, 0, $bytes.Length) }
    } catch { Write-Host "Request error: $($_.Exception.Message)" }
    finally { try { $res.Close() } catch {} }
  }
} finally { $listener.Stop() }
