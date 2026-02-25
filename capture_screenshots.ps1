$Urls = @{
    "neoriemannian" = "https://neoriemannian.vercel.app/"
    "four-letters" = "https://four-letters-two.vercel.app/"
    "sustainalytics" = "https://github.com/rexheng/sustainlyticsscraper/tree/main"
    "sustainable-report" = "https://docs.google.com/document/d/1e5PgHN8UrYMhesZB3XK-g0LJO-lboEt4aJv-cW73s4Y/edit?usp=sharing"
    "landmark" = "https://the-delta-ten.vercel.app/"
    "the-republic" = "https://the-republic-ashy.vercel.app/"
    "bloom-ai" = "https://bloomai-orpin.vercel.app/"
    "attic-band" = "https://attictheband.com"
    "rex-tech" = "https://rextechconsult.vercel.app/"
}

$EdgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $EdgePath)) {
    Write-Host "Edge not found at $EdgePath"
    exit
}

foreach ($Entry in $Urls.GetEnumerator()) {
    $Name = $Entry.Key
    $Url = $Entry.Value
    $OutPath = "$PWD\public\screenshots\$Name.png"
    Write-Host "Capturing $Name..."
    & $EdgePath --headless --window-size=1280,720 --screenshot=$OutPath $Url
    Start-Sleep -Seconds 2
}
Write-Host "Done!"
