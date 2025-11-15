@echo off
echo Starting React dev server with HTTPS...
echo.
echo Certificates:
echo - cert.pem
echo - key.pem
echo.
echo Dev server will run on:
echo - https://localhost:3000
echo - https://192.168.1.147:3000
echo.

set HTTPS=true
set SSL_CRT_FILE=cert.pem
set SSL_KEY_FILE=key.pem

npm start

