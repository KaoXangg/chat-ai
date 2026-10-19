Add-Type -AssemblyName System.Drawing

$srcPath = "c:\chat-ai\frontend\public\brand-logo.png"
if (-not (Test-Path $srcPath)) {
    Write-Error "Source image not found: $srcPath"
    exit 1
}

$orig = [System.Drawing.Image]::FromFile($srcPath)
Write-Output "Original dimensions: $($orig.Width)x$($orig.Height)"

function Resize-Image($source, $targetPath, $size, $padRatio = 0.0) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $gfx = [System.Drawing.Graphics]::FromImage($bmp)
    $gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gfx.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $gfx.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $gfx.Clear([System.Drawing.Color]::Transparent)

    if ($padRatio -gt 0) {
        $pad = [int]($size * $padRatio)
        $drawSize = $size - ($pad * 2)
        $gfx.DrawImage($source, $pad, $pad, $drawSize, $drawSize)
    } else {
        $gfx.DrawImage($source, 0, 0, $size, $size)
    }

    $gfx.Dispose()
    $bmp.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "Created: $targetPath ($size x $size)"
}

Resize-Image $orig "c:\chat-ai\frontend\public\pwa-192x192.png" 192
Resize-Image $orig "c:\chat-ai\frontend\public\pwa-512x512.png" 512
Resize-Image $orig "c:\chat-ai\frontend\public\apple-touch-icon.png" 180
Resize-Image $orig "c:\chat-ai\frontend\public\maskable-icon-512x512.png" 512 0.1

$orig.Dispose()
Write-Output "All icons generated successfully!"
