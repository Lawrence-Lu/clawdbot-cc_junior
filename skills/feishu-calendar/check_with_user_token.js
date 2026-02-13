const axios = require('axios');

const USER_TOKEN = 'u-fw52rTJLJfF89YNnATfump5kirv4k1ohMyyamNk0041i';

async function getPrimaryCalendar() {
    try {
        console.log('使用 User_access_token 查询主日历...\n');
        
        const res = await axios.get('https://open.feishu.cn/open-apis/calendar/v4/calendars/primary', {
            headers: {
                'Authorization': `Bearer ${USER_TOKEN}`
            }
        });
        
        console.log('主日历信息:', JSON.stringify(res.data, null, 2));
        return res.data;
    } catch (error) {
        console.error('查询主日历失败:', error.message);
        if (error.response) {
            console.error('错误详情:', JSON.stringify(error.response.data, null, 2));
        }
        throw error;
    }
}

async function getEvents(calendarId) {
    try {
        // 昨天 2026-02-11
        const yesterday = new Date('2026-02-11');
        yesterday.setHours(0, 0, 0, 0);
        const endOfDay = new Date('2026-02-11');
        endOfDay.setHours(23, 59, 59, 999);
        
        const startTime = String(Math.floor(yesterday.getTime() / 1000));
        const endTime = String(Math.floor(endOfDay.getTime() / 1000));
        
        console.log(`\n查询日历 ${calendarId} 的日程...`);
        console.log(`时间范围: 2026-02-11 ${startTime} - ${endTime}\n`);
        
        const res = await axios.get(`https://open.feishu.cn/open-apis/calendar/v4/calendars/${encodeURIComponent(calendarId)}/events`, {
            headers: {
                'Authorization': `Bearer ${USER_TOKEN}`
            },
            params: {
                start_time: startTime,
                end_time: endTime,
                page_size: 100
            }
        });
        
        console.log('日程列表:', JSON.stringify(res.data, null, 2));
        
        if (res.data.code === 0 && res.data.data && res.data.data.items) {
            const events = res.data.data.items;
            console.log(`\n✅ 找到 ${events.length} 个日程\n`);
            
            events.forEach((e, i) => {
                const start = new Date(parseInt(e.start_time.timestamp) * 1000);
                const end = new Date(parseInt(e.end_time.timestamp) * 1000);
                const startStr = start.toLocaleString('zh-CN', { 
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                });
                const endStr = end.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                
                console.log(`\n${i + 1}. 📅 ${e.summary || '(无标题)'}`);
                console.log(`   时间: ${startStr} - ${endStr}`);
                if (e.description) {
                    console.log(`   描述: ${e.description}`);
                }
                if (e.location && e.location.name) {
                    console.log(`   地点: ${e.location.name}`);
                }
            });
        } else {
            console.log('没有找到日程');
        }
        
        return res.data;
    } catch (error) {
        console.error('查询日程失败:', error.message);
        if (error.response) {
            console.error('错误详情:', JSON.stringify(error.response.data, null, 2));
        }
        throw error;
    }
}

async function main() {
    try {
        const primaryCal = await getPrimaryCalendar();
        if (primaryCal.data && primaryCal.data.calendar) {
            await getEvents(primaryCal.data.calendar.calendar_id);
        }
    } catch (error) {
        console.error('主流程错误:', error.message);
    }
}

main();
