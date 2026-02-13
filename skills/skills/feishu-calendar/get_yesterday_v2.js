const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { ensureValidToken } = require('./auth.js');

async function getYesterdayEvents() {
    // 获取 token（优先使用传入的参数）
    let USER_TOKEN = process.argv[2];
    
    if (!USER_TOKEN) {
        // 尝试从环境变量获取
        USER_TOKEN = process.env.FEISHU_USER_TOKEN;
    }
    
    if (!USER_TOKEN) {
        // 尝试自动续期
        const { needAuth, token } = await ensureValidToken();
        if (needAuth) {
            console.log('❌ 需要提供 User Token');
            console.log('方式1: node get_yesterday_v2.js <token>');
            console.log('方式2: 设置 FEISHU_USER_TOKEN 环境变量');
            console.log('方式3: 先运行 node auth.js 获取 token');
            return;
        }
        USER_TOKEN = token;
    }
    
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
        
        // 找到主日历
        const primaryCal = calendars.find(cal => cal.summary === '卢佑聪' && cal.type === 'primary');
        if (!primaryCal) {
            console.error('❌ 未找到主日历');
            return;
        }

        const calendarId = primaryCal.calendar_id;
        console.log(`✅ 找到主日历: ${primaryCal.summary}`);
        console.log(`📍 日历ID: ${calendarId}\n`);

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

                    // 获取详情
                    if (e.event_id) {
                        try {
                            const detailRes = await axios.get(
                                `https://open.feishu.cn/open-apis/calendar/v4/calendars/${encodeURIComponent(calendarId)}/events/${e.event_id}`,
                                { headers: { 'Authorization': `Bearer ${USER_TOKEN}` } }
                            );

                            if (detailRes.data.code === 0 && detailRes.data.data && detailRes.data.data.event) {
                                const detail = detailRes.data.data.event;
                                if (detail.description && detail.description !== e.description) {
                                    console.log(`📄 详细描述: ${detail.description}`);
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
            const errorData = error.response.data;
            if (errorData.code === 99991677) {
                console.error('\nToken 已过期，请重新运行: node auth.js');
            } else {
                console.error('错误详情:', JSON.stringify(errorData, null, 2));
            }
        }
    }
}

getYesterdayEvents();
