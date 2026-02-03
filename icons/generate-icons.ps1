# Substack Icon Generator - PowerShell Script
# Using .NET System.Drawing

Add-Type -AssemblyName System.Drawing

function DrawRoundedRect($g, $x, $y, $w, $h, $r, $brush) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc($x, $y, $r * 2, $r * 2, 180, 90)
    $path.AddArc(($x + $w - $r * 2), $y, $r * 2, $r * 2, 270, 90)
    $path.AddArc(($x + $w - $r * 2), ($y + $h - $r * 2), $r * 2, $r * 2, 0, 90)
    $path.AddArc($x, ($y + $h - $r * 2), $r * 2, $r * 2, 90, 90)
    $path.CloseFigure()
    $g.FillPath($brush, $path)
}

function CreateIcon($size) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    $scale = $size / 128.0

    # Background circle (Substack orange)
    $orange = [System.Drawing.Color]::FromArgb(255, 103, 25)
    $brush = New-Object System.Drawing.SolidBrush $orange
    $g.FillEllipse($brush, 0, 0, $size, $size)

    # White color
    $white = [System.Drawing.Color]::FromArgb(255, 255, 255)
    $whiteBrush = New-Object System.Drawing.SolidBrush $white

    # Scale function
    function S($v) { return [int]($v * $scale) }

    # Stack lines (rounded rectangles)
    DrawRoundedRect $g (S 28) (S 43) (S 72) (S 8) (S 2) $whiteBrush
    DrawRoundedRect $g (S 28) (S 59) (S 72) (S 8) (S 2) $whiteBrush
    DrawRoundedRect $g (S 28) (S 75) (S 72) (S 8) (S 2) $whiteBrush

    # Arrow
    $pen = New-Object System.Drawing.Pen $white, (3 * $scale)
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    $g.DrawLine($pen, (S 64), (S 20), (S 64), (S 38))
    $g.DrawLine($pen, (S 64), (S 38), (S 58), (S 32))
    $g.DrawLine($pen, (S 64), (S 38), (S 70), (S 32))

    # MD text (for larger sizes)
    if ($size -ge 48) {
        $font = New-Object System.Drawing.Font 'Arial', (10 * $scale), [System.Drawing.FontStyle]::Bold
        $text = 'MD'
        $stringSize = $g.MeasureString($text, $font)
        $x = ($size - $stringSize.Width) / 2
        $y = (S 110) - ($stringSize.Height / 2)
        $g.DrawString($text, $font, $whiteBrush, $x, $y)
    }

    return $bmp
}

# Main
Write-Host "Generating icons..." -ForegroundColor Cyan
$sizes = @(16, 48, 128)
$currentDir = Split-Path -Parent $MyInvocation.MyCommand.Path

foreach ($size in $sizes) {
    $bmp = CreateIcon $size
    $filename = Join-Path $currentDir "icon$size.png"
    $bmp.Save($filename, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "Created: icon$size.png ($size x $size)" -ForegroundColor Green
    $bmp.Dispose()
}

Write-Host ""
Write-Host "All icons generated successfully!" -ForegroundColor Green
Write-Host "Location: $currentDir"
