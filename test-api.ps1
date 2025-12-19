# Quick API Test Script
# Test referral system API endpoints

$API_BASE = "https://api.instantllycards.com"
$ADMIN_KEY = "your-secure-admin-key-here"

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "REFERRAL SYSTEM API TEST" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: GET current config (no auth needed)
Write-Host "TEST 1: Fetching current configuration..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_BASE/api/credits/config" -Method Get
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host "Current Config:" -ForegroundColor White
    Write-Host "  Signup Bonus: $($response.config.signupBonus)" -ForegroundColor White
    Write-Host "  Referral Reward: $($response.config.referralReward)" -ForegroundColor White
    Write-Host "  Last Updated: $($response.config.lastUpdatedAt)" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Test 2: PUT update config (requires admin key)
Write-Host "TEST 2: Updating configuration..." -ForegroundColor Yellow
Write-Host "  (Set ADMIN_KEY variable first!)" -ForegroundColor Gray
Write-Host ""

$headers = @{
    "x-admin-key" = $ADMIN_KEY
    "Content-Type" = "application/json"
}

$body = @{
    signupBonus = 250
    referralReward = 350
    updatedBy = "test-script"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$API_BASE/api/credits/config" -Method Put -Headers $headers -Body $body
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host "Updated Config:" -ForegroundColor White
    Write-Host "  Signup Bonus: $($response.config.signupBonus)" -ForegroundColor White
    Write-Host "  Referral Reward: $($response.config.referralReward)" -ForegroundColor White
    Write-Host "  Updated By: $($response.config.lastUpdatedBy)" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "  Hint: Check your ADMIN_KEY matches backend" -ForegroundColor Gray
    }
    Write-Host ""
}

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Test Complete!" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
