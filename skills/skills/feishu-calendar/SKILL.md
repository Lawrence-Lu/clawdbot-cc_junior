# feishu-calendar

Manage Feishu (Lark) Calendars. Use this skill to list calendars, check schedules, and sync events.

## 🔥 新增功能：使用 User Token 查询个人日程

由于飞书 API 限制，应用 Token 无法访问个人主日历。新增脚本支持使用 User Access Token 查询。

### 🚀 自动获取 User Token（推荐）
```bash
# 运行授权脚本，按提示操作
node skills/feishu-calendar/auth.js

# 授权完成后，直接查询昨日日程
node skills/feishu-calendar/get_yesterday_v2.js
```

### 手动获取 User Token
如果自动授权不方便，可以手动获取：
1. 访问 [飞书开放平台](https://open.feishu.cn/app/cli_a80c55c9cd325013/credentials)
2. 点击「工具」→「接口调试」
3. 选择「获取 user_access_token」
4. 点击「发送请求」获取 token
5. 复制 token 使用

### 查询昨日日程
```bash
# 方式1：自动（已运行过 auth.js）
node skills/feishu-calendar/get_yesterday_v2.js

# 方式2：传入 Token
node skills/feishu-calendar/get_yesterday_v2.js <your_user_token>

# 方式3：环境变量
export FEISHU_USER_TOKEN=xxx
node skills/feishu-calendar/get_yesterday_v2.js
```

### Token 保存位置
授权成功后，Token 自动保存到：
```
skills/feishu-calendar/.user_token.json
```
有效期约 2 小时，过期后需要重新运行 `auth.js`。

## 基础功能

### List Calendars
Check available calendars and their IDs.
```bash
node skills/feishu-calendar/list_test.js
```

### Search Calendar
Find a calendar by name/summary.
```bash
node skills/feishu-calendar/search_cal.js
```

### Check Master's Calendar
Specific check for the Master's calendar status.
```bash
node skills/feishu-calendar/check_master.js
```

### Sync Routine
Run the calendar synchronization routine (syncs events to local state/memory).
```bash
node skills/feishu-calendar/sync_routine.js
```

## Setup
Requires `FEISHU_APP_ID` and `FEISHU_APP_SECRET` in `.env`.
For User Token features, also set `FEISHU_USER_TOKEN` or pass it as argument.

## Standard Protocol: Task Marking
**Trigger**: User says "Mark this task" or "Remind me to...".
**Action**:
1. **Analyze**: Extract date/time (e.g., "Feb 4th" -> YYYY-MM-04).
2. **Execute**: Run `create.js` with `--attendees` set to the requester's ID.
3. **Format**:
   ```bash
   node skills/feishu-calendar/create.js --summary "Task: <Title>" --desc "<Context>" --start "<ISO>" --end "<ISO+1h>" --attendees "<User_ID>"
   ```

### Setup Shared Calendar
Create a shared calendar for a project and add members.
```bash
node skills/feishu-calendar/setup_shared.js --name "Project Name" --desc "Description" --members "ou_1,ou_2" --role "writer"
```
