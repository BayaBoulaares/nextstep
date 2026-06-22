find /opt/app-root/src -maxdepth 3 -type f 2>/dev/null | while read f; do
  name=$(basename "$f")
  size=$(stat -c%s "$f" 2>/dev/null || echo 0)
  mtime=$(stat -c%Y "$f" 2>/dev/null || echo 0)
  echo "$name$size$mtime"
done
