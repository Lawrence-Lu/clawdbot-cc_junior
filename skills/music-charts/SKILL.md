# Music Charts Skill

每日多语言音乐榜单推送

## 功能

- 每天早上 8:00 自动推送音乐榜单
- 支持5个语言榜单：英语、粤语、华语、日语、韩语
- 智能推荐3首歌曲并附带推荐理由
- 数据来源：Billboard / Billboard Japan / Circle Chart / Spotify

## 输出顺序

1. 🇺🇸 英语榜 (Billboard Hot 100)
2. 🇭🇰 粤语榜 (Spotify 香港 / 叱咤乐坛)
3. 🇨🇳 华语榜 (Spotify 台湾 / QQ音乐)
4. 🇯🇵 日语榜 (Billboard Japan Hot 100)
5. 🇰🇷 韩语榜 (Circle Chart / Melon)

## 使用方法

```bash
# 手动生成榜单
node music-charts.js

# 获取榜单文本
node -e "require('./music-charts').generateMusicBriefing().then(console.log)"
```

## 定时任务

每天 8:00 自动执行，推送至飞书
