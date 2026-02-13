const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// 尝试从多个来源获取 Token
function getUserToken() {
    if (process.argv[2]) return process.argv[2];
    if (process.env.FEISHU_USER_TOKEN) return process.env.FEISHU_USER_TOKEN;
    
    const tokenFile = path.join(__dirname, '.user_token.json');
    if (fs.existsSync(tokenFile)) {
        const tokenData = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
        const expiresAt = tokenData.obtained_at + tokenData.expire * 1000;
        if (Date.now() < expiresAt) return tokenData.access_token;
    }
    return null;
}

const USER_TOKEN = getUserToken();

if (!USER_TOKEN) {
    console.error('❌ 错误: 需要先运行 auth.js 获取 User Token');
    console.error('运行: node auth.js');
    process.exit(1);
}

async function getYesterdayEventsWithDocs() {
    try {
        // 步骤1: 获取所有日历
        console.log('📅 查询日历列表...\n');
        const listRes = await axios.get('https://open.feishu.cn/open-apis/calendar/v4/calendars', {
            headers: { 'Authorization': `Bearer ${USER_TOKEN}` },
            params: { page_size: 100 }
        });

        if (listRes.data.code !== 0) {
            console.error('获取日历列表失败:', listRes.data.msg);
            return;
        }

        const calendars = listRes.data.data.calendar_list;
        const primaryCal = calendars.find(cal => cal.summary === '卢佑聪' && cal.type === 'primary');
        if (!primaryCal) {
            console.error('❌ 未找到主日历');
            return;
        }

        const calendarId = primaryCal.calendar_id;
        console.log(`✅ 找到主日历: ${primaryCal.summary}\n`);

        // 步骤2: 查询昨天日程
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        const endOfDay = new Date(yesterday);
        endOfDay.setHours(23, 59, 59, 999);

        const startTime = String(Math.floor(yesterday.getTime() / 1000));
        const endTime = String(Math.floor(endOfDay.getTime() / 1000));

        console.log(`📆 查询 ${yesterday.toLocaleDateString('zh-CN')} 的日程...\n`);

        const eventsRes = await axios.get(
            `https://open.feishu.cn/open-apis/calendar/v4/calendars/${encodeURIComponent(calendarId)}/events`,
            {
                headers: { 'Authorization': `Bearer ${USER_TOKEN}` },
                params: { start_time: startTime, end_time: endTime, page_size: 100 }
            }
        );

        if (eventsRes.data.code === 0 && eventsRes.data.data && eventsRes.data.data.items) {
            const events = eventsRes.data.data.items;

            if (events.length === 0) {
                console.log('📭 昨天没有找到任何日程。');
            } else {
                console.log(`✅ 找到 ${events.length} 个日程\n`);
                console.log('='.repeat(60));

                for (const e of events) {
                    const start = new Date(parseInt(e.start_time.timestamp) * 1000);
                    const end = new Date(parseInt(e.end_time.timestamp) * 1000);

                    console.log(`\n📌 ${e.summary || '(无标题)'}`);
                    console.log(`🕐 时间: ${start.toLocaleString('zh-CN')} - ${end.toLocaleTimeString('zh-CN')}`);

                    if (e.description) {
                        console.log(`📝 描述: ${e.description}`);
                    }

                    if (e.vchat && e.vchat.meeting_url) {
                        console.log(`🔗 会议: ${e.vchat.meeting_url}`);
                    }

                    // 获取详情（包含关联文档）
                    if (e.event_id) {
                        try {
                            const detailRes = await axios.get(
                                `https://open.feishu.cn/open-apis/calendar/v4/calendars/${encodeURIComponent(calendarId)}/events/${e.event_id}`,
                                { headers: { 'Authorization': `Bearer ${USER_TOKEN}` } }
                            );

                            if (detailRes.data.code === 0 && detailRes.data.data && detailRes.data.data.event) {
                                const detail = detailRes.data.data.event;
                                
                                // 显示关联文档
                                if (detail.attachments && detail.attachments.length > 0) {
                                    console.log(`\n📎 关联文档 (${detail.attachments.length}个):`);
                                    detail.attachments.forEach((att, idx) => {
                                        console.log(`   ${idx + 1}. ${att.title || '未命名'}`);
                                        if (att.url) console.log(`      链接: ${att.url}`);
                                        if (att.token) console.log(`      Token: ${att.token}`);
                                    });
                                }
                                
                                // 显示关联群组
                                if (detail.chat && detail.chat.chat_id) {
                                    console.log(`\n💬 关联群组: ${detail.chat.chat_id}`);
                                }
                                
                                // 显示会议纪要文档
                                if (detail.docs) {
                                    console.log(`\n📄 会议文档:`);
                                    console.log(JSON.stringify(detail.docs, null, 2));
                                }
                            }
                        } catch (err) {
                            // 忽略详情查询错误
                        }
                    }
                }
                console.log('\n' + '='.repeat(60));
            }
        }

    } catch (error) {
        console.error('❌ 查询失败:', error.message);
        if (error.response) {
            console.error('错误详情:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

getYesterdayEventsWithDocs();
