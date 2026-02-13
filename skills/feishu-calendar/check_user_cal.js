const axios = require('axios');

const USER_TOKEN = 'u-fw52rTJLJfF89YNnATfump5kirv4k1ohMyyamNk0041i';
const USER_ID = 'ou_cb3caf70db513bea773d02f330906b67';

async function getUserCalendarEvents() {
    try {
        // 昨天 2026-02-11
        const yesterday = new Date('2026-02-11');
        yesterday.setHours(0, 0, 0, 0);
        const endOfDay = new Date('2026-02-11');
        endOfDay.setHours(23, 59, 59, 999);
        
        const startTime = String(Math.floor(yesterday.getTime() / 1000));
        const endTime = String(Math.floor(endOfDay.getTime() / 1000));
        
        console.log('使用 User_access_token 查询用户日历...');
        console.log(`用户ID: ${USER_ID}`);
        console.log(`时间: 2026-02-11\n`);
        
        // 尝试使用用户ID作为calendar_id
        const res = await axios.get(`https://open.feishu.cn/open-apis/calendar/v4/calendars/${USER_ID}/events`, {
            headers: {
                'Authorization': `Bearer ${USER_TOKEN}`
            },
            params: {
                start_time: startTime,
                end_time: endTime,
                page_size: 100
            }
        });
        
        console.log('响应:', JSON.stringify(res.data, null, 2));
        
    } catch (error) {
        console.error('查询失败:', error.message);
        if (error.response) {
            console.error('错误详情:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

getUserCalendarEvents();
