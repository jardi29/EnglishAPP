#!/usr/bin/env bash
# Assembles the single-file artifact page from src/ parts.
set -euo pipefail
cd "$(dirname "$0")"
out=say-it-naturally.html
{
  cat src/01-head.html
  echo '<div id="app"><div class="boot">Loading Say It Naturally…</div></div>'
  echo '<script src="https://cdn.jsdelivr.net/npm/htm@3.1.1/preact/standalone.umd.js"></script>'
  echo '<script>'
  echo '(function () {'
  echo "'use strict';"
  echo "const appEl = document.getElementById('app');"
  echo "if (!window.htmPreact) { appEl.innerHTML = '<div class=\"boot\">The app couldn’t load its interface library. Check your connection and reload the page.</div>'; return; }"
  echo 'const { html, render, useState, useEffect, useRef, useMemo } = window.htmPreact;'
  for f in src/02-core.js src/03-ai.js src/04-ui-shared.js src/05-ui-home.js src/06-ui-speaking.js src/07-ui-writing.js src/08-ui-daily.js src/09-ui-progress.js; do
    echo
    cat "$f"
  done
  echo '})();'
  echo '</script>'
} > "$out"
echo "built $out ($(wc -c < "$out") bytes)"
