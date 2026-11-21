#!/usr/bin/env bash
# 인생 한 턴 — Capacitor iOS 로 넣을 웹 자산만 www/ 로 모은다.
#   ./tools/pack-www.sh
# 바뀐 웹 파일만 지우고 다시 복사한다(캐시된 옛 파일이 앱에 남지 않게).
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/www"

rm -rf "$OUT"
mkdir -p "$OUT"

cp "$ROOT/index.html" "$ROOT/privacy.html" "$ROOT/terms.html" "$OUT/"
cp -R "$ROOT/assets" "$OUT/assets"

# 검사·개발용 파일은 앱에 넣지 않는다
rm -rf "$OUT/assets/events/.DS_Store" 2>/dev/null || true

echo "www/ 준비 완료 — $(find "$OUT" -type f | wc -l | tr -d ' ')개 파일"
echo "다음: npx cap sync ios"
