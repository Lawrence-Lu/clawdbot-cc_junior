const { Client } = require('@larksuiteoapi/node-sdk');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;

const client = new Client({ appId: APP_ID, appSecret: APP_SECRET });

async function checkPrimaryCalendar() {
    // 查询 2月10-12日，确保不遗漏
    const startDate = new Date('2026-02-10');
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date('2026-02-12');
    endDate.setHours(23, 59, 59, 999);
    
    const startTime = Math.floor(startDate.getTime() / 1000);
    const endTime = Math.floor(endDate.getTime() / 1000);
    
    console.log('查询主日历 (primary) 2026-02-10 至 2026-02-12...\n');
    
    try {
        const eventRes = await client.calendar.calendarEvent.list({
            path: { calendar_id: 'primary' },
            params: {
                start_time: String(startTime),
                end_time: String(endTime),
                page_size: 100
            }
        });
        
        console.log('API 响应:', JSON.stringify(eventRes, null, 2));
        
    } catch (error) {
        console.error('Error:', error.message);
        console.error('完整错误:', error);
    }
}

checkPrimaryCalendar();
