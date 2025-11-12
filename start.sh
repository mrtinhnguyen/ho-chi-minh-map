#!/bin/bash

echo "========================================"
echo "  Ho Chi Minh Map - Local Server"
echo "========================================"
echo ""
echo "Starting local server on port 8000..."
echo ""
echo "Open your browser and visit: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop the server"
echo "========================================"
echo ""

python3 -m http.server 8000

