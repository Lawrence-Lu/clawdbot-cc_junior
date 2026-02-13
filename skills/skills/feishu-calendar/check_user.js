const { Client } = require('@larksuiteoapi/node-sdk');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;

const client = new Client({ appId: APP_ID, appSecret: APP_SECRET });

async function checkUserCalendar() {
    // 用户 open_id
    const userId = 'ou_cb3caf70db513bea773d02f330906b67';
    
    // 昨天的时间范围
    const yesterday = new Date('2026-02-11');
    yesterday.setHours(0, 0, 0, 0);
    const endOfDay = new Date('2026-02-11');
    endOfDay.setHours(23, 59, 59, 999);
    
    const startTime = Math.floor(yesterday.getTime() / 1000);
    const endTime = Math.floor(endOfDay.getTime() / 1000);
    
    console.log('查询用户日历事件...');
    console.log(`用户: ${userId}`);
    console.log(`时间: 2026-02-11\n`);
    
    try {
        // 尝试查询用户的主日历
        const res = await client.calendar.calendarEvent.list({
            path: { calendar_id: userId },  // 使用用户ID作为日历ID
            params: {
                start_time: String(startTime),
                end_time: String(endTime),
                page_size: 100
            }
        });
        
        console.log('API 响应:', JSON.stringify(res, null, 2));
        
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('响应:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

checkUserCalendar();
