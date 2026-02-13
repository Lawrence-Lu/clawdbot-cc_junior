const { Client } = require('@larksuiteoapi/node-sdk');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;

const client = new Client({ appId: APP_ID, appSecret: APP_SECRET });

async function getMyCalendar() {
    try {
        // 获取当前应用/用户的主日历
        const res = await client.calendar.calendar.get({
            path: { calendar_id: 'primary' }
        });
        
        console.log('主日历信息:');
        console.log(JSON.stringify(res, null, 2));
        
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('响应:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

getMyCalendar();
