# Subscription Product Support Desk - Interactive API Demo
$ErrorActionPreference = "Stop"
$BaseUrl = "http://localhost:4000"

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "   SUBSCRIPTION PRODUCT SUPPORT DESK - API WALKTHROUGH   " -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# -------------------------------------------------------------
# STEP 1: PUBLIC ENDPOINTS (No Authentication Required)
# -------------------------------------------------------------
Write-Host "[STEP 1] Testing Public Routes..." -ForegroundColor Yellow

Write-Host "`n1.1 GET /api/status (Simulated Service Outages):" -ForegroundColor Green
$incidents = Invoke-RestMethod -Uri "$BaseUrl/api/status" -Method GET
$incidents.incidents | Format-Table title, feature, status, severity -AutoSize

Write-Host "1.2 GET /api/help (Version-Aware Help Articles):" -ForegroundColor Green
$articles = Invoke-RestMethod -Uri "$BaseUrl/api/help?productVersion=1.0" -Method GET
$articles.articles | Format-Table title, slug, productVersion -AutoSize

# -------------------------------------------------------------
# STEP 2: DEMO SCENARIO - ALEX (ACME ANALYTICS - BASIC PLAN)
# -------------------------------------------------------------
Write-Host "`n[STEP 2] Demonstration Scenario: Alex on Basic Plan (Acme Analytics)..." -ForegroundColor Yellow

$alexSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$csrfToken = (Invoke-RestMethod -Uri "$BaseUrl/api/csrf" -WebSession $alexSession).token

$alexLoginBody = @{
    email    = "customer@acme.test"
    password = "DemoPass!234"
} | ConvertTo-Json

$alexLogin = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" `
    -Method POST `
    -Headers @{ "x-csrf-token" = $csrfToken } `
    -ContentType "application/json" `
    -Body $alexLoginBody `
    -WebSession $alexSession

Write-Host "Logged in as:" $alexLogin.user.name "($($alexLogin.user.email)) [Role: $($alexLogin.user.role)]" -ForegroundColor Green

$question = "Why can't my team export this report?"
Write-Host "`nAlex asks: '$question'" -ForegroundColor Magenta

$chatBody = @{ question = $question; version = "1.0" } | ConvertTo-Json
$alexChat = Invoke-RestMethod -Uri "$BaseUrl/api/support-chat" `
    -Method POST `
    -Headers @{ "x-csrf-token" = $alexLogin.csrf } `
    -ContentType "application/json" `
    -Body $chatBody `
    -WebSession $alexSession

Write-Host "`n--- AI Assistant Diagnostic Result for Alex ---" -ForegroundColor Cyan
Write-Host "Answer: $($alexChat.answer)" -ForegroundColor White
Write-Host "`nDiagnostic Tool Checks Executed:" -ForegroundColor DarkCyan
$alexChat.checks | Format-Table tool, status -AutoSize
Write-Host "Citations:" -ForegroundColor DarkCyan
$alexChat.citations | Format-Table title, slug -AutoSize

# -------------------------------------------------------------
# STEP 3: DEMO SCENARIO - SAM (NORTHSTAR LABS - PRO PLAN)
# -------------------------------------------------------------
Write-Host "`n[STEP 3] Demonstration Scenario: Sam on Pro Plan (Northstar Labs)..." -ForegroundColor Yellow

$samSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$csrfToken = (Invoke-RestMethod -Uri "$BaseUrl/api/csrf" -WebSession $samSession).token

$samLoginBody = @{
    email    = "customer@northstar.test"
    password = "DemoPass!234"
} | ConvertTo-Json

$samLogin = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" `
    -Method POST `
    -Headers @{ "x-csrf-token" = $csrfToken } `
    -ContentType "application/json" `
    -Body $samLoginBody `
    -WebSession $samSession

Write-Host "Logged in as:" $samLogin.user.name "($($samLogin.user.email)) [Role: $($samLogin.user.role)]" -ForegroundColor Green

Write-Host "`nSam asks identical question: '$question'" -ForegroundColor Magenta

$samChat = Invoke-RestMethod -Uri "$BaseUrl/api/support-chat" `
    -Method POST `
    -Headers @{ "x-csrf-token" = $samLogin.csrf } `
    -ContentType "application/json" `
    -Body $chatBody `
    -WebSession $samSession

Write-Host "`n--- AI Assistant Diagnostic Result for Sam ---" -ForegroundColor Cyan
Write-Host "Answer: $($samChat.answer)" -ForegroundColor White
Write-Host "`nDiagnostic Tool Checks Executed:" -ForegroundColor DarkCyan
$samChat.checks | Format-Table tool, status -AutoSize

# -------------------------------------------------------------
# STEP 4: TICKET ESCALATION WORKFLOW
# -------------------------------------------------------------
Write-Host "`n[STEP 4] Alex creates and escalates a ticket to human support..." -ForegroundColor Yellow

$ticketBody = @{
    subject  = "Cannot export Q3 sales audit report"
    question = "Need help exporting our financial report for auditors today."
} | ConvertTo-Json

$ticketRes = Invoke-RestMethod -Uri "$BaseUrl/api/tickets" `
    -Method POST `
    -Headers @{ "x-csrf-token" = $alexLogin.csrf } `
    -ContentType "application/json" `
    -Body $ticketBody `
    -WebSession $alexSession

$ticketId = $ticketRes.ticket._id
Write-Host "Created Ticket ID: $ticketId [Status: $($ticketRes.ticket.status)]" -ForegroundColor Green

$escBody = @{
    reason = "Board meeting in 2 hours; urgent assistance requested."
} | ConvertTo-Json

$escRes = Invoke-RestMethod -Uri "$BaseUrl/api/tickets/$ticketId/escalation" `
    -Method POST `
    -Headers @{ "x-csrf-token" = $alexLogin.csrf } `
    -ContentType "application/json" `
    -Body $escBody `
    -WebSession $alexSession

Write-Host "Ticket Escalated! Status: $($escRes.ticket.status) | Reason: $($escRes.ticket.escalationReason)" -ForegroundColor Green

# -------------------------------------------------------------
# STEP 5: SUPERVISOR & SPECIALIST RESOLUTION
# -------------------------------------------------------------
Write-Host "`n[STEP 5] Supervisor assigns ticket; Specialist provides resolution..." -ForegroundColor Yellow

$supSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$csrfToken = (Invoke-RestMethod -Uri "$BaseUrl/api/csrf" -WebSession $supSession).token

$supLogin = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" `
    -Method POST `
    -Headers @{ "x-csrf-token" = $csrfToken } `
    -ContentType "application/json" `
    -Body (@{ email = "supervisor@support.test"; password = "DemoPass!234" } | ConvertTo-Json) `
    -WebSession $supSession

$specialists = Invoke-RestMethod -Uri "$BaseUrl/api/specialists" -Method GET -WebSession $supSession
$specialistId = $specialists.specialists[0]._id

# Assign ticket to Taylor Specialist
$assignRes = Invoke-RestMethod -Uri "$BaseUrl/api/tickets/$ticketId/assignment" `
    -Method POST `
    -Headers @{ "x-csrf-token" = $supLogin.csrf } `
    -ContentType "application/json" `
    -Body (@{ specialistId = $specialistId } | ConvertTo-Json) `
    -WebSession $supSession

Write-Host "Supervisor assigned Ticket $ticketId to Specialist $($specialists.specialists[0].name)" -ForegroundColor Green

# Login as Specialist Taylor
$specSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$csrfToken = (Invoke-RestMethod -Uri "$BaseUrl/api/csrf" -WebSession $specSession).token

$specLogin = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" `
    -Method POST `
    -Headers @{ "x-csrf-token" = $csrfToken } `
    -ContentType "application/json" `
    -Body (@{ email = "specialist@support.test"; password = "DemoPass!234" } | ConvertTo-Json) `
    -WebSession $specSession

$resBody = @{
    resolution = "Explained to customer that exports require Pro tier. Coordinated temporary manual export with management approval."
} | ConvertTo-Json

$resolved = Invoke-RestMethod -Uri "$BaseUrl/api/tickets/$ticketId/resolution" `
    -Method POST `
    -Headers @{ "x-csrf-token" = $specLogin.csrf } `
    -ContentType "application/json" `
    -Body $resBody `
    -WebSession $specSession

Write-Host "Specialist Resolved Ticket! Status: $($resolved.ticket.status)" -ForegroundColor Green
Write-Host "Resolution: $($resolved.ticket.resolution)" -ForegroundColor White

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "   BACKEND VERIFICATION DEMO COMPLETED SUCCESSFULLY!    " -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan
