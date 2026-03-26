#!/usr/bin/env pwsh
# Set all Vercel environment variables for cheggie-studios
$ErrorActionPreference = "Continue"

$VT = $env:VERCEL_TOKEN  # Export VERCEL_TOKEN in your shell before running this script
$PROJECT_ID = "prj_ynAWuq5XP3aEUkf21I8gi7Vu0btL"
$TEAM_ID = "team_2MkWeFBaSCv7DOvEy0OlX4s3"
$BASE_URL = "https://api.vercel.com/v10/projects/$PROJECT_ID/env?teamId=$TEAM_ID"
$HDR = @{
    "Authorization" = "Bearer $VT"
    "Content-Type"  = "application/json"
}

function Set-VEnv {
    param($Key, $Val, $Type, $Targets)
    $body = @{
        key    = $Key
        value  = $Val
        type   = $Type
        target = $Targets
    } | ConvertTo-Json -Compress
    try {
        $r = Invoke-WebRequest -Uri $BASE_URL -Method POST -Headers $HDR -Body $body -UseBasicParsing -ErrorAction Stop
        Write-Host "[OK]  $Key -> $($r.StatusCode)"
        return $true
    } catch {
        $detail = $_.ErrorDetails.Message
        if ($detail -match "already") {
            Write-Host "[SKP] $Key already exists"
            return $true
        }
        Write-Host "[ERR] $Key : $detail"
        return $false
    }
}

$prod_prev = @("production","preview")
$all = @("production","preview","development")

Write-Host "=== Setting Vercel env vars for cheggie-studios ==="

Set-VEnv "NEXTAUTH_SECRET" $env:NEXTAUTH_SECRET "encrypted" $prod_prev
Set-VEnv "NEXTAUTH_URL" "https://cheggie-studios.vercel.app" "plain" @("production")
Set-VEnv "NEXTAUTH_URL" "https://cheggie-studios-git-main-executiveusa.vercel.app" "plain" @("preview")
Set-VEnv "DATABASE_URL" $env:DATABASE_URL "encrypted" $all
Set-VEnv "SKIP_ENV_VALIDATION" "1" "plain" $prod_prev
Set-VEnv "NODE_ENV" "production" "plain" @("production")
Set-VEnv "OPENAI_API_KEY" $env:OPENAI_API_KEY "encrypted" $all
Set-VEnv "ANTHROPIC_API_KEY" $env:ANTHROPIC_API_KEY "encrypted" $all
Set-VEnv "REDIS_URL" "redis://localhost:6379" "plain" $all
Set-VEnv "STORAGE_ADAPTER" "local" "plain" $all
Set-VEnv "LOCAL_STORAGE_PATH" "./uploads" "plain" $all
Set-VEnv "TRANSCRIPT_ENGINE" "openai" "plain" @("production")
Set-VEnv "TRANSCRIPT_ENGINE" "mock" "plain" @("preview","development")
Set-VEnv "NEXT_PUBLIC_SUPABASE_URL" "https://nfhejlqgvghzafrnmpsl.supabase.co" "plain" $all
Set-VEnv "SUPABASE_PROJECT_ID" "nfhejlqgvghzafrnmpsl" "plain" $all
Set-VEnv "SUPABASE_ACCESS_TOKEN" "sbp_2295b22d756e0a11f74a0f159cda20761a689638" "encrypted" $all
Set-VEnv "MAX_UPLOAD_SIZE_MB" "500" "plain" $all
Set-VEnv "OPENAI_ORG_ID" "-z9Dwhxd0AycYe4jBwI2r" "encrypted" $all

Write-Host "=== Done ==="
