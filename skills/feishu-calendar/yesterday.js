const { Client } = require('@larksuiteoapi/node-sdk');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;

const client = new Client({ appId: APP_ID, appSecret: APP_SECRET });

async function getYesterdayEvents() {
    // 昨天是 2026-02-11
    const yesterday = new Date('2026-02-11');
    const startOfDay = new Date(yesterday);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(yesterday);
    endOfDay.setHours(23, 59, 59, 999);
    
    const startTime = Math.floor(startOfDay.getTime() / 1000);
    const endTime = Math.floor(endOfDay.getTime() / 1000);
    
    console.log('查询 2026-02-11 的日程...');
    
    try {
        // 使用获取到的日历ID
        const eventRes = await client.calendar.calendarEvent.list({
            path: { calendar_id: 'feishu.cn_W1W2bNUIDpiGMvyvSglxGh@group.calendar.feishu.cn' },
            params: {
                start_time: String(startTime),
                end_time: String(endTime),
                page_size: 50
            }
        });

        if (eventRes.code !== 0) {
            console.error('Error:', eventRes.msg);
            return;
        }

        const events = eventRes.data.items || [];
        if (events.length === 0) {
            console.log('昨天没有找到任何日程安排。');
        } else {
            console.log(`找到 ${events.length} 个日程:`);
            events.forEach(e => {
                const start = new Date(parseInt(e.start_time.timestamp) * 1000).toLocaleString('zh-CN', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                const end = new Date(parseInt(e.end_time.timestamp) * 1000).toLocaleString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                console.log(`\n📅 ${e.summary || '(无标题)'}`);
                console.log(`   时间: ${start} - ${end}`);
                if (e.description) {
                    console.log(`   描述: ${e.description}`);
                }
                if (e.location) {
                    console.log(`   地点: ${e.location}`);
                }
            });
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

getYesterdayEvents();
