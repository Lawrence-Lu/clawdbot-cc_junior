const { Client } = require('@larksuiteoapi/node-sdk');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;

const client = new Client({ appId: APP_ID, appSecret: APP_SECRET });

async function getEventsByTime() {
    // 昨天
    const yesterday = new Date('2026-02-11');
    yesterday.setHours(0, 0, 0, 0);
    const endOfDay = new Date('2026-02-11');
    endOfDay.setHours(23, 59, 59, 999);
    
    const startTime = String(Math.floor(yesterday.getTime() / 1000));
    const endTime = String(Math.floor(endOfDay.getTime() / 1000));
    
    console.log('查询时间范围:', startTime, '-', endTime);
    console.log('日期:', yesterday.toISOString(), '至', endOfDay.toISOString());
    
    try {
        // 尝试列出所有事件（不指定日历ID）
        const res = await client.request({
            url: '/open-apis/calendar/v4/calendar_events',
            method: 'GET',
            params: {
                start_time: startTime,
                end_time: endTime,
                page_size: '100'
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

getEventsByTime();
