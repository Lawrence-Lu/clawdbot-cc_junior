const { Client } = require('@larksuiteoapi/node-sdk');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;

const client = new Client({ appId: APP_ID, appSecret: APP_SECRET });

async function getPrimaryCalendarAndEvents() {
    try {
        // 步骤1: 查询主日历信息获取 calendar_id
        console.log('步骤1: 查询主日历信息...\n');
        const primaryRes = await client.request({
            url: '/open-apis/calendar/v4/calendars/primary',
            method: 'GET'
        });
        
        console.log('主日历信息:', JSON.stringify(primaryRes, null, 2));
        
        if (primaryRes.code !== 0 || !primaryRes.data || !primaryRes.data.calendar) {
            console.error('获取主日历失败');
            return;
        }
        
        const calendarId = primaryRes.data.calendar.calendar_id;
        console.log(`\n✅ 获取到主日历ID: ${calendarId}\n`);
        
        // 步骤2: 使用 calendar_id 获取日程列表
        console.log('步骤2: 获取日程列表...\n');
        
        // 昨天 2026-02-11 的时间范围
        const yesterday = new Date('2026-02-11');
        yesterday.setHours(0, 0, 0, 0);
        const endOfDay = new Date('2026-02-11');
        endOfDay.setHours(23, 59, 59, 999);
        
        const startTime = String(Math.floor(yesterday.getTime() / 1000));
        const endTime = String(Math.floor(endOfDay.getTime() / 1000));
        
        const eventsRes = await client.request({
            url: `/open-apis/calendar/v4/calendars/${calendarId}/events`,
            method: 'GET',
            params: {
                start_time: startTime,
                end_time: endTime,
                page_size: 100
            }
        });
        
        console.log('日程列表响应:', JSON.stringify(eventsRes, null, 2));
        
        if (eventsRes.code === 0 && eventsRes.data && eventsRes.data.items) {
            const events = eventsRes.data.items;
            console.log(`\n✅ 找到 ${events.length} 个日程\n`);
            
            events.forEach((e, i) => {
                const start = new Date(parseInt(e.start_time.timestamp) * 1000);
                const end = new Date(parseInt(e.end_time.timestamp) * 1000);
                const startStr = start.toLocaleString('zh-CN');
                const endStr = end.toLocaleString('zh-CN');
                
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
            console.log('没有找到日程或查询失败:', eventsRes.msg);
        }
        
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('响应:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

getPrimaryCalendarAndEvents();
