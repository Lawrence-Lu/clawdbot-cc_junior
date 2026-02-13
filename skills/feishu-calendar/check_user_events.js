const { Client } = require('@larksuiteoapi/node-sdk');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;

const client = new Client({ appId: APP_ID, appSecret: APP_SECRET });

async function getUserEvents() {
    const userId = 'ou_cb3caf70db513bea773d02f330906b67';
    
    // 昨天
    const yesterday = new Date('2026-02-11');
    yesterday.setHours(0, 0, 0, 0);
    const endOfDay = new Date('2026-02-11');
    endOfDay.setHours(23, 59, 59, 999);
    
    const startTime = Math.floor(yesterday.getTime() / 1000);
    const endTime = Math.floor(endOfDay.getTime() / 1000);
    
    console.log('以用户身份查询日历事件...');
    console.log(`用户: ${userId}`);
    console.log(`时间: 2026-02-11\n`);
    
    try {
        // 尝试使用 user_access_token 方式
        const res = await client.calendar.calendarEvent.list({
            path: { calendar_id: userId },
            params: {
                start_time: String(startTime),
                end_time: String(endTime),
                page_size: 100
            }
        }, {
            // 尝试使用用户 token
            headers: {
                'X-User-Key': userId
            }
        });
        
        console.log('结果:', JSON.stringify(res, null, 2));
        
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('响应:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

getUserEvents();
