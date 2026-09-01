#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this helper as root on the dedicated ScootSolute VPS." >&2
  exit 1
fi

archive=${1:?"Archive path is required."}
expected_sha=${2:?"Expected SHA-256 is required."}
source_commit=${3:?"Source commit is required."}
live=/opt/scootsolute/showcase/showrooms/water
server=/opt/scootsolute/showcase/server.mjs
release_root=/opt/scootsolute/water-releases
stamp=$(date -u +%Y%m%dT%H%M%SZ)
candidate="${release_root}/${stamp}-candidate"
test_root="${release_root}/${stamp}-test"
previous="${release_root}/${stamp}-previous"
next_live="${live}.next-${stamp}"
failed_live="${live}.failed-${stamp}"

[[ "${expected_sha}" =~ ^[0-9a-f]{64}$ ]] || { echo "Invalid expected SHA-256." >&2; exit 1; }
[[ "${source_commit}" =~ ^[0-9a-f]{40}$ ]] || { echo "Invalid source commit." >&2; exit 1; }
[[ -f "${archive}" ]] || { echo "Archive not found: ${archive}" >&2; exit 1; }
[[ -f "${server}" ]] || { echo "Live showroom server not found." >&2; exit 1; }

actual_sha=$(sha256sum "${archive}" | cut -d ' ' -f1)
[[ "${actual_sha}" == "${expected_sha}" ]] || { echo "Archive checksum mismatch." >&2; exit 1; }

if tar -tzf "${archive}" | grep -Eq '(^/|(^|/)\.\.(/|$))'; then
  echo "Archive contains an unsafe path." >&2
  exit 1
fi

install -d -o scootsolute-showcase -g scootsolute-showcase "${candidate}" "${test_root}/showrooms" "${previous}"
tar -xzf "${archive}" -C "${candidate}"
[[ -f "${candidate}/index.html" ]] || { echo "Candidate index.html is missing." >&2; exit 1; }
[[ -d "${candidate}/assets" ]] || { echo "Candidate assets directory is missing." >&2; exit 1; }

cp -a "${server}" "${test_root}/server.mjs"
cp -a "${candidate}" "${test_root}/showrooms/water"
chown -R scootsolute-showcase:scootsolute-showcase "${candidate}" "${test_root}"
runuser -u scootsolute-showcase -- /usr/local/bin/node --check "${test_root}/server.mjs"

runuser -u scootsolute-showcase -- env \
  NODE_ENV=production HOST=127.0.0.1 PORT=3301 \
  /usr/local/bin/node "${test_root}/server.mjs" \
  >"/tmp/scootsolute-water-${stamp}.log" 2>&1 &
candidate_pid=$!
cleanup() {
  kill "${candidate_pid}" 2>/dev/null || true
}
trap cleanup EXIT
sleep 1

candidate_headers="/tmp/scootsolute-water-${stamp}.headers"
candidate_html="/tmp/scootsolute-water-${stamp}.html"
curl --fail --silent --show-error \
  --header 'Host: water.scootsolute.org' \
  --dump-header "${candidate_headers}" \
  --output "${candidate_html}" \
  http://127.0.0.1:3301/
grep -q '<title>Arizona Basin Monitor</title>' "${candidate_html}"
grep -qi 'connect-src https://azwatermaps.azwater.gov' "${candidate_headers}"

while IFS= read -r asset_path; do
  curl --fail --silent --show-error \
    --header 'Host: water.scootsolute.org' \
    --output /dev/null \
    "http://127.0.0.1:3301${asset_path}"
done < <(grep -oE '(src|href)="/assets/[^"]+"' "${candidate_html}" | cut -d '"' -f2 | sort -u)

kill "${candidate_pid}" 2>/dev/null || true
wait "${candidate_pid}" 2>/dev/null || true
trap - EXIT

cp -a "${candidate}" "${next_live}"
chown -R scootsolute-showcase:scootsolute-showcase "${next_live}"
mv "${live}" "${previous}/water"

if ! mv "${next_live}" "${live}"; then
  mv "${previous}/water" "${live}"
  echo "Could not activate the candidate; restored the previous directory." >&2
  exit 1
fi

restore_previous() {
  mv "${live}" "${failed_live}"
  mv "${previous}/water" "${live}"
  systemctl restart scootsolute-showcase.service
}

if ! systemctl restart scootsolute-showcase.service; then
  restore_previous
  echo "Service restart failed; restored the previous directory." >&2
  exit 1
fi

sleep 1
live_html="/tmp/scootsolute-water-${stamp}.live.html"
if ! systemctl is-active --quiet scootsolute-showcase.service \
  || ! bash /root/scootsolute-deploy/verify-local-origins.sh \
  || ! curl --fail --silent --show-error \
    --header 'Host: water.scootsolute.org' \
    --output "${live_html}" \
    http://127.0.0.1:3300/ \
  || ! grep -q '<title>Arizona Basin Monitor</title>' "${live_html}"; then
  restore_previous
  echo "Post-activation verification failed; restored the previous directory." >&2
  exit 1
fi

printf '{"sourceCommit":"%s","archiveSha256":"%s","deployedAt":"%s"}\n' \
  "${source_commit}" "${actual_sha}" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  > /opt/scootsolute/showcase/water-release.json
chown root:root /opt/scootsolute/showcase/water-release.json
chmod 0644 /opt/scootsolute/showcase/water-release.json

echo "Water showroom deployed from ${source_commit}; previous release preserved at ${previous}/water."
