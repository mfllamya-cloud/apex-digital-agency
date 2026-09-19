# push-clean.ps1
# One-shot script: removes the leaked secret folder, resets local git history, and
# force-pushes a clean repository to GitHub.
#
# WHAT THIS DOES, IN ORDER:
#   1. Enables git long-path support (avoids Windows path-length errors).
#   2. Permanently deletes frontend\Claude outputs (the folder that leaked a secret).
#   3. Renames the old .git folder aside instead of deleting it (fast, avoids long-path errors).
#   4. Initializes a brand-new git repo, stages everything, and checks staged files for
#      anything that still looks sensitive before committing anything.
#   5. Commits and force-pushes to GitHub, overwriting the remote's history.
#
# Run it by opening PowerShell in this folder and typing:  .\push-clean.ps1
# (If Windows blocks the script, right-click it -> Properties -> check "Unblock" -> OK,
#  or run once: powershell -ExecutionPolicy Bypass -File .\push-clean.ps1)

$ErrorActionPreference = "Stop"
$repoRoot        = "C:\Users\Mon pc\content-calendar"
$sensitiveFolder = Join-Path $repoRoot "frontend\Claude outputs"
$remoteUrl       = "https://github.com/mfllamya-cloud/apex-digital-agency.git"

function Fail($msg) {
    Write-Host ""
    Write-Host "ABORTED: $msg" -ForegroundColor Red
    Write-Host "Nothing further was committed or pushed." -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
}

Set-Location -LiteralPath $repoRoot
Write-Host "==> Working in $repoRoot" -ForegroundColor Cyan

# 1. Long path support
git config --global core.longpaths true
Write-Host "==> core.longpaths enabled" -ForegroundColor Green

# 2. Remove the sensitive folder, if still present
if (Test-Path -LiteralPath $sensitiveFolder) {
    Remove-Item -LiteralPath $sensitiveFolder -Recurse -Force
    Write-Host "==> Permanently deleted: $sensitiveFolder" -ForegroundColor Green
} else {
    Write-Host "==> Sensitive folder already gone, skipping" -ForegroundColor Yellow
}

# 3. Make sure .gitignore actually covers it before going any further
if (-not (Test-Path ".gitignore") -or -not (Select-String -Path ".gitignore" -Pattern "Claude outputs" -Quiet)) {
    Fail ".gitignore is missing or doesn't mention 'Claude outputs' -- refusing to continue."
}
Write-Host "==> .gitignore confirmed to exclude the sensitive folder" -ForegroundColor Green

# 4. Move the old, tainted git history aside (rename, not delete -- instant, no long-path risk)
if (Test-Path ".git") {
    $backupName = ".git_old_DELETE_ME_" + (Get-Date -Format "yyyyMMdd_HHmmss")
    Rename-Item -LiteralPath ".git" -NewName $backupName
    Write-Host "==> Old git history moved aside to $backupName (delete it later once you've confirmed GitHub looks right)" -ForegroundColor Green
}

# 5. Fresh repo
git init | Out-Null
git branch -M main
git remote add origin $remoteUrl
Write-Host "==> Fresh repo initialized, remote set to $remoteUrl" -ForegroundColor Green

# 6. Stage everything
git add .

# 7. Safety net -- refuse to commit if anything staged still looks sensitive
$staged = git diff --cached --name-only
$suspicious = $staged | Where-Object { $_ -match "(?i)(^|[\\/])\.env$|\.env$|serviceAccountKey\.json|Claude outputs" }
if ($suspicious) {
    Write-Host "Refusing to commit -- these staged files look sensitive:" -ForegroundColor Red
    $suspicious | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    Fail "Remove these from staging (update .gitignore, git rm --cached <file>) and re-run the script."
}
Write-Host "==> Staged-file safety check passed -- nothing sensitive found" -ForegroundColor Green

# 8. Commit
git commit -m "Clean project history: remove secret file, add Vercel deployment config"

# 9. Force-push the clean history to GitHub
git push -u origin main --force

Write-Host ""
Write-Host "==> Done. Clean history pushed to $remoteUrl" -ForegroundColor Cyan
Write-Host "==> Once you've checked GitHub looks right, you can delete the folder(s) named .git_old_DELETE_ME_*"
Read-Host "Press Enter to close"
