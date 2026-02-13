const { Client } = require('@larksuiteoapi/node-sdk');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;

const client = new Client({ appId: APP_ID, appSecret: APP_SECRET });

async function getEvents() {
    // 查询 2月10日-12日的日程
    const startDate = new Date('2026-02-10');
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date('2026-02-12');
    endDate.setHours(23, 59, 59, 999);
    
    const startTime = Math.floor(startDate.getTime() / 1000);
    const endTime = Math.floor(endDate.getTime() / 1000);
    
    console.log('查询 2026-02-10 至 2026-02-12 的日程...\n');
    
    try {
        const eventRes = await client.calendar.calendarEvent.list({
            path: { calendar_id: 'feishu.cn_W1W2bNUIDpiGMvyvSglxGh@group.calendar.feishu.cn' },
            params: {
                start_time: String(startTime),
                end_time: String(endTime),
                page_size: 100
            }
        });

        if (eventRes.code !== 0) {
            console.error('Error:', eventRes.msg);
            return;
        }

        const events = eventRes.data.items || [];
        console.log(`找到 ${events.length} 个日程:\n`);
        
        if (events.length === 0) {
            console.log('没有找到任何日程安排。');
        } else {
            events.forEach((e, i) => {
                const start = new Date(parseInt(e.start_time.timestamp) * 1000);
                const end = new Date(parseInt(e.end_time.timestamp) * 1000);
                const dateStr = start.toLocaleDateString('zh-CN');
                const startStr = start.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                const endStr = end.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                
                console.log(`${i + 1}. 📅 ${e.summary || '(无标题)'}`);
                console.log(`   日期: ${dateStr}`);
                console.log(`   时间: ${startStr} - ${endStr}`);
                if (e.description) {
                    console.log(`   描述: ${e.description}`);
                }
                if (e.location && e.location.name) {
                    console.log(`   地点: ${e.location.name}`);
                }
                console.log('');
            });
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

getEvents();
