param(
    [string]$ReportDir = "C:\Users\user\OneDrive\Desktop\James\Automations\AntiGravity\trend-intelligence\reports\github",
    [string]$IngestUrl = "https://trend-intelligence-iota.vercel.app/api/github-trends",
    [string]$ProjectDir,
    [string]$AnthropicModel = "claude-sonnet-4-6",
    [switch]$SkipDatabaseWrite,
    [int]$WeeklyLimit = 10,
    [int]$MonthlyLimit = 5
)

$ErrorActionPreference = "Stop"

$Headers = @{
    "Accept" = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    "User-Agent" = "Trend Intelligence GitHub Tracker"
}

if ([string]::IsNullOrWhiteSpace($ProjectDir)) {
    $ProjectDir = Split-Path -Parent $PSScriptRoot
}

function Get-SingaporeNow {
    try {
        $timeZone = [System.TimeZoneInfo]::FindSystemTimeZoneById("Singapore Standard Time")
        return [System.TimeZoneInfo]::ConvertTimeFromUtc((Get-Date).ToUniversalTime(), $timeZone)
    } catch {
        return Get-Date
    }
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
            return $value
        }
    }

    return $null
}

function Invoke-MarketingAngle {
    param(
        [object]$Item,
        [string]$ApiKey
    )

    $prompt = @"
Write one sentence, max 28 words, explaining how this GitHub repo could be used for business automation.
Keep it outcome-focused, plain, and specific. No hype. No em dash. Return only the sentence.

Repo: $($Item.Name)
Language: $($Item.Language)
Description: $($Item.Description)
"@

    $body = @{
        model = $AnthropicModel
        max_tokens = 90
        messages = @(
            @{
                role = "user"
                content = $prompt
            }
        )
    } | ConvertTo-Json -Depth 6

    $headers = @{
        "x-api-key" = $ApiKey
        "anthropic-version" = "2023-06-01"
        "content-type" = "application/json"
    }

    $response = Invoke-RestMethod -Uri "https://api.anthropic.com/v1/messages" -Method Post -Headers $headers -Body $body -TimeoutSec 45
    $textBlock = @($response.content | Where-Object { $_.type -eq "text" } | Select-Object -First 1)[0]

    if ($null -eq $textBlock -or [string]::IsNullOrWhiteSpace($textBlock.text)) {
        return $null
    }

    $angle = ([regex]::Replace($textBlock.text, "\s+", " ")).Trim()
    return $angle.Trim('"').Trim("'")
}

function Add-MarketingAngles {
    param([object[]]$Items)

    $aiItems = @($Items | Where-Object { $_.Tags -contains "AI" })
    if ($aiItems.Count -eq 0) {
        foreach ($item in $Items) {
            $item | Add-Member -NotePropertyName MarketingAngle -NotePropertyValue $null -Force
        }
        return
    }

    $apiKey = Get-LocalEnvValue -Name "ANTHROPIC_API_KEY"
    if ([string]::IsNullOrWhiteSpace($apiKey)) {
        throw "ANTHROPIC_API_KEY is required to generate marketing angles for AI repos."
    }

    $angleCache = @{}

    foreach ($item in $Items) {
        if ($item.Tags -notcontains "AI") {
            $item | Add-Member -NotePropertyName MarketingAngle -NotePropertyValue $null -Force
            continue
        }

        if (-not $angleCache.ContainsKey($item.Name)) {
            try {
                $angleCache[$item.Name] = Invoke-MarketingAngle -Item $item -ApiKey $apiKey
            } catch {
                Write-Warning "Marketing angle skipped for $($item.Name): $($_.Exception.Message)"
                $angleCache[$item.Name] = $null
            }
        }

        $item | Add-Member -NotePropertyName MarketingAngle -NotePropertyValue $angleCache[$item.Name] -Force
    }
}

function ConvertFrom-HtmlText {
    param([AllowNull()][string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return ""
    }

    $withoutTags = [regex]::Replace($Value, "<[^>]+>", " ")
    $decoded = [System.Net.WebUtility]::HtmlDecode($withoutTags)
    return ([regex]::Replace($decoded, "\s+", " ")).Trim()
}

function ConvertTo-PlainNumber {
    param([AllowNull()][string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return 0
    }

    $clean = $Value -replace "[^0-9]", ""
    if ([string]::IsNullOrWhiteSpace($clean)) {
        return 0
    }

    return [int]$clean
}

function Get-TrendTags {
    param(
        [string]$Name,
        [string]$Description,
        [string]$Language
    )

    $haystack = "$Name $Description $Language".ToLowerInvariant()
    $tags = New-Object System.Collections.Generic.List[string]

    $aiPattern = "(^|[^a-z])(ai|llm|agent|agents|gpt|claude|openai|anthropic|anthropics|transformer|diffusion|machine learning|deep learning|neural|model|rag|embedding|inference|ollama|llama|langchain|mcp|chatbot|copilot|generative|tars)([^a-z]|$)"
    $devPattern = "(api|sdk|cli|framework|library|runtime|compiler|database|server|frontend|backend|developer|devtool|automation|testing|docker|kubernetes|typescript|javascript|python|rust|go|java|react|next|node)"

    if ($haystack -match $aiPattern) {
        $tags.Add("AI")
    }

    if ($haystack -match $devPattern) {
        $tags.Add("DEV")
    }

    if ($tags.Count -eq 0) {
        $tags.Add("DEV")
    }

    return $tags.ToArray()
}

function Get-RepoMetric {
    param(
        [string]$Article,
        [string]$Slug,
        [string]$Metric
    )

    $escapedSlug = [regex]::Escape($Slug)
    $match = [regex]::Match($Article, "href=""/$escapedSlug/$Metric""[\s\S]*?([0-9,]+)</a>")

    if (-not $match.Success) {
        return 0
    }

    return ConvertTo-PlainNumber $match.Groups[1].Value
}

function Get-PeriodStars {
    param(
        [string]$Article,
        [string]$Period
    )

    $label = if ($Period -eq "monthly") { "month" } else { "week" }
    $match = [regex]::Match($Article, "([0-9,]+)\s+stars this $label")

    if (-not $match.Success) {
        return 0
    }

    return ConvertTo-PlainNumber $match.Groups[1].Value
}

function Get-GitHubTrending {
    param(
        [ValidateSet("weekly", "monthly")]
        [string]$Period,
        [int]$Limit
    )

    $uri = "https://github.com/trending?since=$Period"
    $html = Invoke-RestMethod -Uri $uri -Headers $Headers -TimeoutSec 30
    $articles = [regex]::Matches($html, "(?s)<article\b.*?</article>")
    $items = New-Object System.Collections.Generic.List[object]

    foreach ($articleMatch in $articles) {
        if ($items.Count -ge $Limit) {
            break
        }

        $article = $articleMatch.Value
        $repoMatch = [regex]::Match($article, "(?s)<h2\b.*?<a[^>]+href=""/([^/""]+/[^/""]+)""[^>]*>.*?</a>")

        if (-not $repoMatch.Success) {
            continue
        }

        $slug = $repoMatch.Groups[1].Value.Trim()
        $descriptionMatch = [regex]::Match($article, "(?s)<p[^>]*>(.*?)</p>")
        $languageMatch = [regex]::Match($article, "<span itemprop=""programmingLanguage"">([^<]+)</span>")

        $name = $slug -replace "\s+", ""
        $description = ConvertFrom-HtmlText $descriptionMatch.Groups[1].Value
        $language = ConvertFrom-HtmlText $languageMatch.Groups[1].Value
        $stars = Get-RepoMetric -Article $article -Slug $slug -Metric "stargazers"
        $forks = Get-RepoMetric -Article $article -Slug $slug -Metric "forks"
        $periodStars = Get-PeriodStars -Article $article -Period $Period
        $tags = Get-TrendTags -Name $name -Description $description -Language $language

        $items.Add([pscustomobject]@{
            Name = $name
            Url = "https://github.com/$slug"
            Description = $description
            Language = $language
            Stars = $stars
            Forks = $forks
            PeriodStars = $periodStars
            Tags = $tags
        })
    }

    return $items.ToArray()
}

function Format-RepoSection {
    param(
        [string]$Title,
        [object[]]$Items,
        [string]$PeriodLabel
    )

    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add("## $Title")
    $lines.Add("")

    for ($i = 0; $i -lt $Items.Count; $i++) {
        $item = $Items[$i]
        $rank = $i + 1
        $tagText = ($item.Tags | ForEach-Object { "#$_" }) -join " "
        $languageText = if ($item.Language) { $item.Language } else { "Unknown" }
        $descriptionText = if ($item.Description) { $item.Description } else { "No description provided." }
        $periodStarsText = "{0:N0}" -f $item.PeriodStars
        $starsText = "{0:N0}" -f $item.Stars
        $forksText = "{0:N0}" -f $item.Forks

        $lines.Add("### $rank. [$($item.Name)]($($item.Url))")
        $lines.Add("$tagText")
        $lines.Add("")
        $lines.Add($descriptionText)
        $lines.Add("")
        $lines.Add("- Language: $languageText")
        $lines.Add("- $PeriodLabel stars: $periodStarsText")
        $lines.Add("- Total stars: $starsText")
        $lines.Add("- Forks: $forksText")
        if ($item.MarketingAngle) {
            $lines.Add("- Marketing angle: $($item.MarketingAngle)")
        }
        $lines.Add("")
    }

    return $lines
}

function ConvertTo-IngestItem {
    param([object]$Item)

    return [pscustomobject]@{
        name = $Item.Name
        stars = $Item.Stars
        description = $Item.Description
        language = $Item.Language
        url = $Item.Url
        is_ai_dev = ($Item.Tags -contains "AI")
        marketing_angle = $Item.MarketingAngle
    }
}

New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null

$now = Get-SingaporeNow
$weekly = Get-GitHubTrending -Period "weekly" -Limit $WeeklyLimit
$monthly = Get-GitHubTrending -Period "monthly" -Limit $MonthlyLimit
Add-MarketingAngles -Items @($weekly + $monthly)

$dateStamp = $now.ToString("yyyy-MM-dd")
$fileName = "github-trending-$dateStamp.md"
$reportPath = Join-Path $ReportDir $fileName

$report = New-Object System.Collections.Generic.List[string]
$report.Add("# GitHub Trending Tracker")
$report.Add("")
$report.Add("- Generated: $($now.ToString("yyyy-MM-dd HH:mm")) SGT")
$report.Add("- Source: https://github.com/trending")
$report.Add("- Scope: Top $WeeklyLimit weekly, Top $MonthlyLimit monthly")
$report.Add("- Tags: AI means AI-native repo signal. DEV means developer tooling or code repo signal.")
$report.Add("")
foreach ($line in (Format-RepoSection -Title "Top $WeeklyLimit Weekly" -Items $weekly -PeriodLabel "Weekly")) {
    $report.Add($line)
}

foreach ($line in (Format-RepoSection -Title "Top $MonthlyLimit Monthly" -Items $monthly -PeriodLabel "Monthly")) {
    $report.Add($line)
}

Set-Content -Path $reportPath -Value $report -Encoding UTF8

if (-not $SkipDatabaseWrite) {
    $payload = [pscustomobject]@{
        weekly = @($weekly | ForEach-Object { ConvertTo-IngestItem -Item $_ })
        monthly = @($monthly | ForEach-Object { ConvertTo-IngestItem -Item $_ })
    }

    $json = $payload | ConvertTo-Json -Depth 5
    $ingestHeaders = @{}
    $cronSecret = Get-LocalEnvValue -Name "CRON_SECRET"

    if (-not [string]::IsNullOrWhiteSpace($cronSecret)) {
        $ingestHeaders["Authorization"] = "Bearer $cronSecret"
        $ingestHeaders["x-cron-secret"] = $cronSecret
    }

    $ingestResult = Invoke-RestMethod -Uri $IngestUrl -Method Post -Headers $ingestHeaders -ContentType "application/json" -Body $json -TimeoutSec 30
    Write-Output "Inserted GitHub trend rows: $($ingestResult.inserted)"
}

Write-Output $reportPath
