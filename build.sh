#!/bin/bash
set -euo pipefail

rm -rf dist
mkdir -p dist/icons
cp manifest.json background.js supabase-client.js questions.json dist/
cp blocked.html blocked.css blocked.js dist/
cp popup.html popup.css popup.js dist/
cp options.html options.css options.js dist/
cp login.html login.js dist/
cp upgrade.html dist/
cp icons/* dist/icons/
echo "Build complete. Upload the 'dist' folder to Chrome Web Store."
