#!/bin/bash
# 音乐榜单抓取脚本 - 使用 agent-browser

set -e

echo "🎶 开始抓取音乐榜单..."

# 创建临时文件
TMP_FILE=$(mktemp)
TODAY=$(date +"%Y/%m/%d")
WEEKDAY=$(date +"%A")

# 抓取日语榜
echo "🎵 抓取 Billboard Japan..."
agent-browser open "https://www.billboard.com/charts/japan-hot-100/" 2>/dev/null
sleep 8
JAPAN_SNAPSHOT=$(agent-browser snapshot 2>/dev/null)
agent-browser close 2>/dev/null

# 解析日语榜
JAPAN_SONGS=$(echo "$JAPAN_SNAPSHOT" | grep -E 'heading.*level=3' | head -5 | sed 's/.*heading "\([^"]*\)".*/\1/')
JAPAN_ARTISTS=$(echo "$JAPAN_SNAPSHOT" | grep -E '(text:|link).*Kenshi|Yonezu|Mrs|GREEN APPLE|King Gnu|Snow Man|MILK' | head -5 | sed 's/.*text: \([^ ]*\).*/\1/')

echo "$JAPAN_SONGS"
echo "$JAPAN_ARTISTS"

# 清理
rm -f "$TMP_FILE"

echo "✅ 完成"
