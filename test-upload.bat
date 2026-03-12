@echo off
REM Create a test image file
echo test image data > temp-test.jpg

REM Upload using curl
curl -X POST http://localhost:3000/api/admin/images/upload -H "X-Customer-ID: d0240c2d-5f70-4331-83ee-466908f177ca" -F "file=@temp-test.jpg"

REM Clean up
del temp-test.jpg
