param(
    [string]$ProjectDir,
    [string]$ScrapeUrl = "https://trend-intelligence-iota.vercel.app/api/scrape",
    [string]$GitHubScript,
    [int]$TimeoutSeconds = 900,
    [switch]$SkipIfCompletedToday
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ProjectDir)) {
    $ProjectDir = Split-Path -Parent $PSScriptRoot
}

if ([string]::IsNullOrWhiteSpace($GitHubScript)) {
    $GitHubScript = Join-Path $PSScriptRoot "fetch-github-trending.ps1"
}

$StateDir = Join-Path $ProjectDir "state"
$LogDir = Join-Path $ProjectDir "logs\daily-intelligence"
$SuccessMarker = Join-Path $StateDir "daily-intelligence-last-success.txt"

New-Item -ItemType Directory -Force -Path $StateDir, $LogDir | Out-Null

$today = (Get-Date).ToString("yyyy-MM-dd")
if ($SkipIfCompletedToday -and (Test-Path -LiteralPath $SuccessMarker)) {
    $lastSuccess = (Get-Content -LiteralPath $SuccessMarker -Raw).Trim()
    if ($lastSuccess -eq $today) {
        Write-Output "Daily intelligence already completed for $today."
        return
    }
}

$LogPath = Join-Path $LogDir ("daily-intelligence-{0}.log" -f (Get-Date).ToString("yyyy-MM-dd-HHmmss"))
Start-Transcript -Path $LogPath -Append | Out-Null

try {

function Get-LocalEnvValue {
    param([string]$Name)

    $processValue = [Environment]::GetEnvironmentVariable($Name, "Process")
    if (-not [string]::IsNullOrWhiteSpace($processValue)) {
        return $processValue
    }

    $envPath = Join-Path $ProjectDir ".env.local"
    if (-not (Test-Path -LiteralPath $envPath)) {
        return $null
    }

    foreach ($line in Get-Content -LiteralPath $envPath) {
        if ($line -match "^\s*$([regex]::Escape($Name))\s*=\s*(.+?)\s*$") {
            $value = $matches[1].Trim()
            if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            $value = $value.Trim([char]0xFEFF).Trim()
            return $value
        }
    }

    return $null
}

if (-not (Test-Path -LiteralPath $GitHubScript)) {
    throw "GitHub script not found: $GitHubScript"
}

$cronSecret = Get-LocalEnvValue -Name "CRON_SECRET"
if ([string]::IsNullOrWhiteSpace($cronSecret)) {
    throw "CRON_SECRET is required to run the protected production scrape endpoints."
}

$jobs = @()
$jobs += Start-Job -Name "github-intelligence" -ArgumentList $GitHubScript, $ProjectDir -ScriptBlock {
    param($ScriptPath, $ProjectDir)
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File $ScriptPath -ProjectDir $ProjectDir
}

$jobs += Start-Job -Name "target-scrape" -ArgumentList $ScrapeUrl, $cronSecret -ScriptBlock {
    param($Url, $Secret)
    $headers = @{
        Authorization = "Bearer $Secret"
        "x-cron-secret" = $Secret
    }

    try {
        Invoke-RestMethod -Uri $Url -Method Post -Headers $headers -ContentType "application/json" -Body "{}" -TimeoutSec 600
    } catch {
        $body = $_.ErrorDetails.Message

        if ([string]::IsNullOrWhiteSpace($body) -and $_.Exception.Response) {
            try {
                $stream = $_.Exception.Response.GetResponseStream()
                if ($stream) {
                    $reader = New-Object System.IO.StreamReader($stream)
                    $body = $reader.ReadToEnd()
                }
            } catch {
                $body = ""
            }
        }

        $detail = if ([string]::IsNullOrWhiteSpace($body)) { $_.Exception.Message } else { "$($_.Exception.Message) $body" }
        throw "Target scrape failed: $detail"
    }
}

$completed = Wait-Job -Job $jobs -Timeout $TimeoutSeconds
$timedOut = @($jobs | Where-Object { $_.State -eq "Running" })

if ($timedOut.Count -gt 0) {
    $timedOut | Stop-Job
}

$failures = New-Object System.Collections.Generic.List[string]

foreach ($job in $jobs) {
    $jobErrors = @()
    $output = Receive-Job -Job $job -Keep -ErrorAction SilentlyContinue -ErrorVariable jobErrors
    if ($output) {
        Write-Output "[$($job.Name)]"
        $output
    }

    if ($jobErrors.Count -gt 0) {
        Write-Output "[$($job.Name) errors]"
        foreach ($jobError in $jobErrors) {
            Write-Output $jobError.ToString()
            $failures.Add("$($job.Name): $($jobError.ToString())")
        }
    }

    if ($job.State -ne "Completed") {
        $failures.Add("$($job.Name) ended with state $($job.State)")
    }
}

Remove-Job -Job $jobs -Force

if ($completed.Count -ne $jobs.Count -or $failures.Count -gt 0) {
    throw ($failures -join "; ")
}

Set-Content -LiteralPath $SuccessMarker -Value $today -Encoding ASCII
Write-Output "Daily intelligence completed for $today."
} finally {
    Stop-Transcript | Out-Null
    Write-Output "Log written to $LogPath"
}
