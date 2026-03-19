#!/usr/bin/env bash
set -uo pipefail

NOTION_URL="https://succinct-scar-f20.notion.site"
BASELINE_FILE="${BASELINE_FILE:-baselines/notion-snapshot.json}"
USER_AGENT="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Helper: count grep matches safely (returns 0 on no match)
count_matches() {
  grep -c "$1" "$2" 2>/dev/null || true
}

# Helper: cross-platform hash
hash_string() {
  if command -v sha256sum &>/dev/null; then
    sha256sum | cut -d' ' -f1
  elif command -v shasum &>/dev/null; then
    shasum -a 256 | cut -d' ' -f1
  else
    cat > /dev/null; echo "NO_HASH_TOOL"
  fi
}

echo "=== Notion Client Monitor ==="
echo "Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# 1. Fetch HTML
echo "Fetching Notion page..."
curl -s -A "$USER_AGENT" "$NOTION_URL" -o "$TEMP_DIR/page.html"

# 2. Extract version
notion_version=$(grep -oE 'data-notion-version="[^"]+"' "$TEMP_DIR/page.html" | head -1 | sed 's/data-notion-version="//;s/"//' || echo "NOT_FOUND")
echo "Notion version: $notion_version"

# 3. Find app JS URL
app_js_path=$(grep -oE 'src="/_assets/app-[^"]*\.js"' "$TEMP_DIR/page.html" | head -1 | sed 's/src="//;s/"//' || echo "")
if [ -z "$app_js_path" ]; then
  app_js_path=$(grep -oE 'src="/app-[^"]*\.js"' "$TEMP_DIR/page.html" | head -1 | sed 's/src="//;s/"//' || echo "")
fi
app_js_filename=$(basename "$app_js_path" 2>/dev/null || echo "NOT_FOUND")
echo "App JS: $app_js_filename"

# Count asset JS files
asset_js_count=$(count_matches '/_assets/.*\.js' "$TEMP_DIR/page.html")
echo "Asset JS files: $asset_js_count"

# 4. Fetch app JS
if [ -n "$app_js_path" ]; then
  echo "Fetching app JS..."
  curl -s "${NOTION_URL}${app_js_path}" -o "$TEMP_DIR/app.js"
else
  echo "ERROR: Could not find app JS path"
  touch "$TEMP_DIR/app.js"
fi

# 5. Extract patterns from JS
pdn_count=$(count_matches 'publicDomainName' "$TEMP_DIR/app.js")
ns_count=$(count_matches '"notion\.site"' "$TEMP_DIR/app.js")
ed_count=$(count_matches 'requestedOnExternalDomain' "$TEMP_DIR/app.js")
ri_count=$(count_matches 'requireInterstitial' "$TEMP_DIR/app.js")
endswith_check=$(count_matches 'endsWith(e\.publicDomainName)' "$TEMP_DIR/app.js")
dot_endswith_check=$(count_matches 'endsWith("\.' "$TEMP_DIR/app.js")

# Extract domain check function signature hash
domain_check_hash=$(grep -oE 'endsWith\([^)]*publicDomainName[^)]*\)' "$TEMP_DIR/app.js" 2>/dev/null | sort -u | hash_string || echo "NOT_FOUND")

# Extract the publicDomainName config pattern
config_pattern=$(grep -oE 'publicDomainName:"[^"]*"' "$TEMP_DIR/app.js" | head -1 || echo "NOT_FOUND")

echo "publicDomainName occurrences: $pdn_count"
echo "notion.site literals: $ns_count"
echo "requestedOnExternalDomain: $ed_count"
echo "requireInterstitial: $ri_count"
echo "endsWith checks: $endswith_check"
echo "Config pattern: $config_pattern"

# 6. Call getPublicPageData API to check response structure
echo "Checking getPublicPageData API..."
api_response=$(curl -s -X POST "${NOTION_URL}/api/v3/getPublicPageData" \
  -H "Content-Type: application/json;charset=UTF-8" \
  -A "$USER_AGENT" \
  -d '{"type":"block-space","spaceDomain":"succinct-scar-f20"}' || echo "{}")
api_fields=$(echo "$api_response" | jq -r 'keys[]' 2>/dev/null | sort | tr '\n' ',' || echo "ERROR")
echo "API fields: $api_fields"

# 7. Build current snapshot (use --arg for all values, convert in jq)
jq -n \
  --arg version "$notion_version" \
  --arg app_js "$app_js_filename" \
  --arg asset_js_count "$asset_js_count" \
  --arg pdn_count "$pdn_count" \
  --arg ns_count "$ns_count" \
  --arg ed_count "$ed_count" \
  --arg ri_count "$ri_count" \
  --arg domain_check_hash "$domain_check_hash" \
  --arg config_pattern "$config_pattern" \
  --arg endswith_check "$endswith_check" \
  --arg dot_endswith_check "$dot_endswith_check" \
  --arg api_fields "$api_fields" \
  --arg snapshot_date "$(date -u +%Y-%m-%d)" \
  '{
    notion_version: $version,
    app_js_filename: $app_js,
    asset_js_count: ($asset_js_count | tonumber),
    public_domain_name_count: ($pdn_count | tonumber),
    notion_site_literal_count: ($ns_count | tonumber),
    external_domain_count: ($ed_count | tonumber),
    require_interstitial_count: ($ri_count | tonumber),
    domain_check_hash: $domain_check_hash,
    config_pattern: $config_pattern,
    has_endswith_check: ($endswith_check | tonumber),
    has_dot_endswith_check: ($dot_endswith_check | tonumber),
    api_fields: $api_fields,
    snapshot_date: $snapshot_date
  }' > "$TEMP_DIR/current.json"

echo ""
echo "=== Current Snapshot ==="
cat "$TEMP_DIR/current.json"

# 8. Compare with baseline
if [ ! -f "$BASELINE_FILE" ]; then
  echo ""
  echo "No baseline found. Saving current snapshot as baseline."
  cp "$TEMP_DIR/current.json" "$BASELINE_FILE"
  exit 0
fi

echo ""
echo "=== Comparing with baseline ==="

changes_found=false

# Compare key fields (ignore snapshot_date and app_js_filename which change frequently)
for field in notion_version public_domain_name_count notion_site_literal_count external_domain_count require_interstitial_count domain_check_hash config_pattern has_endswith_check has_dot_endswith_check api_fields; do
  baseline_val=$(jq -r ".$field" "$BASELINE_FILE")
  current_val=$(jq -r ".$field" "$TEMP_DIR/current.json")

  if [ "$baseline_val" != "$current_val" ]; then
    echo "CHANGED: $field"
    echo "  baseline: $baseline_val"
    echo "  current:  $current_val"
    changes_found=true
  fi
done

if [ "$changes_found" = true ]; then
  echo ""
  echo "=== CHANGES DETECTED ==="
  echo "Notion client-side code has changed. Review required."
  exit 1
else
  echo ""
  echo "No significant changes detected."
  exit 0
fi
