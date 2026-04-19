#!/usr/bin/env pwsh
# Set GitHub repo secrets for cheggie-studios CI/CD
$ErrorActionPreference = "Continue"

$GH_PAT = $env:GH_PAT  # Export GH_PAT in your shell before running this script
$REPO = "executiveusa/cheggie-studios-"
$HDR = @{
    "Authorization" = "token $GH_PAT"
    "Accept"        = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
}

# Step 1: Get the repo's public key for secret encryption
Write-Host "Fetching repo public key..."
$keyResp = Invoke-RestMethod -Uri "https://api.github.com/repos/$REPO/actions/secrets/public-key" -Headers $HDR
$pubKey = $keyResp.key
$keyId = $keyResp.key_id
Write-Host "Key ID: $keyId"

# Step 2: Encrypt a secret value using libsodium (via .NET / PowerShell)
# GitHub requires Sealed Box encryption with the repo public key
# We use the sodium-net approach via .NET interop OR use a workaround with GitHub CLI

# Check if gh CLI is available
$ghAvail = Get-Command gh -ErrorAction SilentlyContinue
if ($ghAvail) {
    Write-Host "Using GitHub CLI for secret encryption..."
    $env:GH_TOKEN = $GH_PAT
    
    $secrets = @{
        "VERCEL_TOKEN"    = $env:VERCEL_TOKEN
        "GH_PAT"          = $GH_PAT
        "DATABASE_URL"    = $env:DATABASE_URL
        "NEXTAUTH_SECRET" = $env:NEXTAUTH_SECRET
        "OPENAI_API_KEY"  = $env:OPENAI_API_KEY
        "ANTHROPIC_API_KEY" = $env:ANTHROPIC_API_KEY
        "SKIP_ENV_VALIDATION" = "1"
    }
    
    foreach ($s in $secrets.GetEnumerator()) {
        $val = $s.Value
        $name = $s.Key
        Write-Host "Setting secret: $name"
        $val | gh secret set $name --repo $REPO 2>&1 | Write-Host
    }
    Write-Host "=== GitHub secrets set via CLI ==="
} else {
    Write-Host "gh CLI not available. Please install it or set secrets manually."
    Write-Host "Secrets to set in https://github.com/$REPO/settings/secrets/actions:"
    Write-Host "  VERCEL_TOKEN = (set env:VERCEL_TOKEN)"
    Write-Host "  GH_PAT = (set env:GH_PAT)"
    Write-Host "  DATABASE_URL = (set env:DATABASE_URL)"
    Write-Host "  NEXTAUTH_SECRET = (set env:NEXTAUTH_SECRET)"
    Write-Host "  OPENAI_API_KEY = (set env:OPENAI_API_KEY)"
    Write-Host "  SKIP_ENV_VALIDATION = 1"
}
