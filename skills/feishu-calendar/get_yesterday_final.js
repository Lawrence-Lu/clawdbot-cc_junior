const axios = require('axios');

const USER_TOKEN = 'u-fw52rTJLJfF89YNnATfump5kirv4k1ohMyyamNk0041i';
const CALENDAR_ID = 'feishu.cn_35vVohahIlPn19zxfHCxqb@group.calendar.feishu.cn';

async function getYesterdayEvents() {
    try {
        // 昨天 2026-02-11
        const yesterday = new Date('2026-02-11');
        yesterday.setHours(0, 0, 0, 0);
        const endOfDay = new Date('2026-02-11');
        endOfDay.setHours(23, 59, 59, 999);
        
        const startTime = String(Math.floor(yesterday.getTime() / 1000));
        const endTime = String(Math.floor(endOfDay.getTime() / 1000));
        
        console.log('查询 卢佑聪 日历 2026-02-11 的日程...\n');
        
        const res = await axios.get(`https://open.feishu.cn/open-apis/calendar/v4/calendars/${encodeURIComponent(CALENDAR_ID)}/events`, {
            headers: {
                'Authorization': `Bearer ${USER_TOKEN}`
            },
            params: {
                start_time: startTime,
                end_time: endTime,
                page_size: 100
            }
        });
        
        if (res.data.code === 0 && res.data.data && res.data.data.items) {
            const events = res.data.data.items;
            
            if (events.length === 0) {
                console.log('昨天没有找到任何日程。');
            } else {
                console.log(`✅ 找到 ${events.length} 个日程\n`);
                
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
                    
                    // 如果有会议纪要，显示更多详情
                    if (e.notes) {
                        console.log(`   纪要: ${e.notes}`);
                    }
                });
            }
        } else {
            console.log('查询结果:', JSON.stringify(res.data, null, 2));
        }
        
    } catch (error) {
        console.error('查询失败:', error.message);
        if (error.response) {
            console.error('错误详情:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

getYesterdayEvents();
