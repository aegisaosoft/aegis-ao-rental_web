# Generate SSL certificates for local development using PowerShell

$certDir = "certs"
$certName = "localhost"

Write-Host "Generating SSL certificates for local development..." -ForegroundColor Green

# Create certs directory if it doesn't exist
New-Item -ItemType Directory -Force -Path $certDir | Out-Null

# Generate self-signed certificate using PowerShell
$cert = New-SelfSignedCertificate `
    -Subject "CN=$certName" `
    -DnsName $certName, "localhost" `
    -KeyAlgorithm RSA `
    -KeyLength 2048 `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -KeyExportPolicy Exportable `
    -KeyUsage DigitalSignature, KeyEncipherment `
    -NotAfter (Get-Date).AddYears(1)

# Export certificate to PFX format
$pfxPath = Join-Path $certDir "server.pfx"
$password = ConvertTo-SecureString -String "password" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $password

# Export certificate to CRT format
$crtPath = Join-Path $certDir "server.crt"
Export-Certificate -Cert $cert -FilePath $crtPath

# Export private key
$keyPath = Join-Path $certDir "server.key"
$pemKey = "-----BEGIN PRIVATE KEY-----$([System.Convert]::ToBase64String($cert.PrivateKey.Key.Export([System.Security.Cryptography.CngKeyBlobFormat]::Pkcs8PrivateBlob)))-----END PRIVATE KEY-----"
$pemKey | Out-File -FilePath $keyPath -Encoding ASCII

Write-Host "SSL certificates generated successfully!" -ForegroundColor Green
Write-Host "Certificate: $crtPath" -ForegroundColor Cyan
Write-Host "Private Key: $keyPath" -ForegroundColor Cyan
Write-Host "`nNote: You may need to trust this certificate in your browser." -ForegroundColor Yellow
