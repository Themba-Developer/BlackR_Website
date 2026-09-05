param(
  [string] $ProjectName = "black-r-website",
  [string] $AdminEmail = "mahlangu843@gmail.com"
)

$ErrorActionPreference = "Stop"

function ConvertTo-Base64Url([byte[]] $Bytes) {
  return [Convert]::ToBase64String($Bytes).TrimEnd("=").Replace("+", "-").Replace("/", "_")
}

$sessionBytes = New-Object byte[] 32
$passwordBytes = New-Object byte[] 18
$random = [Security.Cryptography.RandomNumberGenerator]::Create()
try {
  $random.GetBytes($sessionBytes)
  $random.GetBytes($passwordBytes)
} finally {
  $random.Dispose()
}

$sessionSecret = ConvertTo-Base64Url $sessionBytes
$adminPassword = ConvertTo-Base64Url $passwordBytes
$hmac = [Security.Cryptography.HMACSHA256]::new($sessionBytes)
try {
  $passwordHash = ConvertTo-Base64Url ($hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($adminPassword)))
} finally {
  $hmac.Dispose()
}

$sessionSecret | npx.cmd --yes wrangler@latest pages secret put ADMIN_SESSION_SECRET --project-name $ProjectName
if ($LASTEXITCODE -ne 0) { throw "Could not update ADMIN_SESSION_SECRET." }

$passwordHash | npx.cmd --yes wrangler@latest pages secret put ADMIN_PASSWORD_HASH --project-name $ProjectName
if ($LASTEXITCODE -ne 0) { throw "Could not update ADMIN_PASSWORD_HASH." }

Write-Output "Admin credentials rotated. All earlier sessions are now invalid."
Write-Output "Email: $AdminEmail"
Write-Output "Password: $adminPassword"
Write-Output "Save this password now. It was not written to disk."
