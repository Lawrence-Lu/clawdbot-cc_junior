const axios = require('axios');

const USER_TOKEN = 'u-fw52rTJLJfF89YNnATfump5kirv4k1ohMyyamNk0041i';
const CALENDAR_ID = 'feishu.cn_35vVohahIlPn19zxfHCxqb@group.calendar.feishu.cn';

async function getEventDetail() {
    try {
        // 先获取事件列表
        const yesterday = new Date('2026-02-11');
        yesterday.setHours(0, 0, 0, 0);
        const endOfDay = new Date('2026-02-11');
        endOfDay.setHours(23, 59, 59, 999);
        
        const startTime = String(Math.floor(yesterday.getTime() / 1000));
        const endTime = String(Math.floor(endOfDay.getTime() / 1000));
        
        console.log('获取日程详情...\n');
        
        const listRes = await axios.get(`https://open.feishu.cn/open-apis/calendar/v4/calendars/${encodeURIComponent(CALENDAR_ID)}/events`, {
            headers: {
                'Authorization': `Bearer ${USER_TOKEN}`
            },
            params: {
                start_time: startTime,
                end_time: endTime,
                page_size: 100
            }
        });
        
        if (listRes.data.code === 0 && listRes.data.data && listRes.data.data.items && listRes.data.data.items.length > 0) {
            const event = listRes.data.data.items[0];
            const eventId = event.event_id;
            
            console.log('基本信息:');
            console.log(`标题: ${event.summary}`);
            console.log(`时间: ${new Date(parseInt(event.start_time.timestamp) * 1000).toLocaleString('zh-CN')} - ${new Date(parseInt(event.end_time.timestamp) * 1000).toLocaleTimeString('zh-CN')}`);
            console.log(`事件ID: ${eventId}\n`);
            
            // 获取完整详情
            console.log('获取完整详情...\n');
            const detailRes = await axios.get(`https://open.feishu.cn/open-apis/calendar/v4/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${eventId}`, {
                headers: {
                    'Authorization': `Bearer ${USER_TOKEN}`
                }
            });
            
            console.log('完整详情:');
            console.log(JSON.stringify(detailRes.data, null, 2));
            
        } else {
            console.log('没有找到日程');
        }
        
    } catch (error) {
        console.error('查询失败:', error.message);
        if (error.response) {
            console.error('错误详情:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

getEventDetail();
