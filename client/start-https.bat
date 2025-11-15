@echo off
REM Start React dev server with HTTPS enabled
REM Note: This will use a self-signed certificate that browsers will warn about
REM You'll need to click "Advanced" > "Proceed to localhost (unsafe)" in your browser

set HTTPS=true
npm start

