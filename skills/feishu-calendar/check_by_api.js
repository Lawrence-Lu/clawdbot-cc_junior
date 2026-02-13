const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;

async function getTenantToken() {
    try {
        const res = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
            app_id: APP_ID,
            app_secret: APP_SECRET
        });
        return res.data.tenant_access_token;
    } catch (error) {
        console.error('获取token失败:', error.message);
        throw error;
    }
}

async function getPrimaryCalendar() {
    try {
        const token = await getTenantToken();
        console.log('获取到token\n');
        
        // 查询主日历
        console.log('查询主日历...');
        const res = await axios.get('https://open.feishu.cn/open-apis/calendar/v4/calendars/primary', {
            headers: {
                'Authorization': `Bearer ${token}`
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
        const token = await getTenantToken();
        
        // 昨天 2026-02-11
        const yesterday = new Date('2026-02-11');
        yesterday.setHours(0, 0, 0, 0);
        const endOfDay = new Date('2026-02-11');
        endOfDay.setHours(23, 59, 59, 999);
        
        const startTime = String(Math.floor(yesterday.getTime() / 1000));
        const endTime = String(Math.floor(endOfDay.getTime() / 1000));
        
        console.log(`\n查询日历 ${calendarId} 的日程...`);
        console.log(`时间范围: ${startTime} - ${endTime}\n`);
        
        const res = await axios.get(`https://open.feishu.cn/open-apis/calendar/v4/calendars/${calendarId}/events`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            params: {
                start_time: startTime,
                end_time: endTime,
                page_size: 100
            }
        });
        
        console.log('日程列表:', JSON.stringify(res.data, null, 2));
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
