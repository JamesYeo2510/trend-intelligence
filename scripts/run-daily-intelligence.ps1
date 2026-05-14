param(
    [string]$ProjectDir,
    [string]$ScrapeUrl = "https://trend-intelligence-iota.vercel.app/api/scrape",
    [string]$GitHubScript,
    [int]$TimeoutSeconds = 900
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ProjectDir)) {
    $ProjectDir = Split-Path -Parent $PSScriptRoot
}

if ([string]::IsNullOrWhiteSpace($GitHubScript)) {
    $GitHubScript = Join-Path $PSScriptRoot "fetch-github-trending.ps1"
}

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

    Invoke-RestMethod -Uri $Url -Method Post -Headers $headers -ContentType "application/json" -Body "{}" -TimeoutSec 600
}

$completed = Wait-Job -Job $jobs -Timeout $TimeoutSeconds
$timedOut = @($jobs | Where-Object { $_.State -eq "Running" })

if ($timedOut.Count -gt 0) {
    $timedOut | Stop-Job
}

$failures = New-Object System.Collections.Generic.List[string]

foreach ($job in $jobs) {
    $output = Receive-Job -Job $job -Keep
    if ($output) {
        Write-Output "[$($job.Name)]"
        $output
    }

    if ($job.State -ne "Completed") {
        $failures.Add("$($job.Name) ended with state $($job.State)")
    }
}

Remove-Job -Job $jobs -Force

if ($completed.Count -ne $jobs.Count -or $failures.Count -gt 0) {
    throw ($failures -join "; ")
}
