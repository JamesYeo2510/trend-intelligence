param(
    [string]$IngestUrl = "https://trend-intelligence-iota.vercel.app/api/reddit-trends",
    [string]$ProjectDir,
    [int]$PostLimit = 15,
    [string[]]$Subreddits = @("LocalLLaMA", "machinelearning", "webdev"),
    [switch]$SkipDatabaseWrite
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ProjectDir)) {
    $ProjectDir = Split-Path -Parent $PSScriptRoot
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

# Reddit requires a descriptive User-Agent to avoid 429 / 403 errors
$RedditHeaders = @{
    "User-Agent" = "TrendIntelligenceBot/1.0 (automated scraper; contact: trend-intelligence)"
}

function Get-RedditHot {
    param(
        [string]$Subreddit,
        [int]$Limit
    )

    $uri = "https://www.reddit.com/r/$Subreddit/hot.json?limit=$Limit"
    $response = Invoke-RestMethod -Uri $uri -Headers $RedditHeaders -TimeoutSec 30

    $posts = New-Object System.Collections.Generic.List[object]

    foreach ($child in $response.data.children) {
        $data = $child.data

        # Skip stickied mod posts — they are not community signals
        if ($data.stickied -eq $true) { continue }

        $selftext = $data.selftext
        if ($selftext -eq "[removed]" -or $selftext -eq "[deleted]") {
            $selftext = $null
        }
        if (-not [string]::IsNullOrWhiteSpace($selftext) -and $selftext.Length -gt 2000) {
            $selftext = $selftext.Substring(0, 2000).TrimEnd() + "..."
        }

        $posts.Add([pscustomobject]@{
            post_id      = "t3_$($data.id)"
            subreddit    = $data.subreddit
            title        = $data.title
            selftext     = if ([string]::IsNullOrWhiteSpace($selftext)) { $null } else { $selftext }
            score        = [int]$data.score
            num_comments = [int]$data.num_comments
            permalink    = $data.permalink
        })
    }

    return $posts.ToArray()
}

# ── Scrape all target subreddits ────────────────────────────────────────────────

$allPosts = New-Object System.Collections.Generic.List[object]

foreach ($sub in $Subreddits) {
    Write-Output "Scraping r/$sub ..."
    try {
        $posts = Get-RedditHot -Subreddit $sub -Limit $PostLimit
        Write-Output "  -> $($posts.Count) posts"
        foreach ($p in $posts) { $allPosts.Add($p) }

        # Polite delay between subreddit requests to respect Reddit rate limits
        Start-Sleep -Milliseconds 1200
    } catch {
        Write-Warning "Failed to scrape r/${sub}: $($_.Exception.Message)"
    }
}

Write-Output "Total posts collected: $($allPosts.Count)"

# ── Ingest into database ─────────────────────────────────────────────────────────

if (-not $SkipDatabaseWrite -and $allPosts.Count -gt 0) {
    $json = ($allPosts | ConvertTo-Json -Depth 5)

    $ingestHeaders = @{
        "Content-Type" = "application/json"
    }

    $cronSecret = Get-LocalEnvValue -Name "CRON_SECRET"
    if ([string]::IsNullOrWhiteSpace($cronSecret)) {
        $cronSecret = $env:CRON_SECRET
    }

    if (-not [string]::IsNullOrWhiteSpace($cronSecret)) {
        $ingestHeaders["Authorization"] = "Bearer $cronSecret"
        $ingestHeaders["x-cron-secret"]  = $cronSecret
    }

    $result = Invoke-RestMethod `
        -Uri $IngestUrl `
        -Method Post `
        -Headers $ingestHeaders `
        -Body $json `
        -TimeoutSec 30

    Write-Output "Inserted: $($result.inserted)  Skipped (duplicates): $($result.skipped)"
} elseif ($SkipDatabaseWrite) {
    Write-Output "Database write skipped (-SkipDatabaseWrite flag set)."
} else {
    Write-Output "No posts collected - nothing to ingest."
}
