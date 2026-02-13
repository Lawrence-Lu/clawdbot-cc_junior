const { Client } = require('@larksuiteoapi/node-sdk');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;

const client = new Client({ appId: APP_ID, appSecret: APP_SECRET });

async function checkAllCalendars() {
    try {
        // 1. 获取所有日历
        const listRes = await client.calendar.calendar.list();
        if (listRes.code !== 0) {
            console.error('获取日历列表失败:', listRes.msg);
            return;
        }
        
        const calendars = listRes.data.calendar_list || [];
        console.log(`找到 ${calendars.length} 个日历:\n`);
        
        calendars.forEach((cal, idx) => {
            console.log(`${idx + 1}. ${cal.summary} (ID: ${cal.calendar_id}, 角色: ${cal.role})`);
        });
        console.log('');
        
        // 2. 查询昨天的日程（2月11日）
        const yesterday = new Date('2026-02-11');
        yesterday.setHours(0, 0, 0, 0);
        const endOfDay = new Date('2026-02-11');
        endOfDay.setHours(23, 59, 59, 999);
        
        const startTime = Math.floor(yesterday.getTime() / 1000);
        const endTime = Math.floor(endOfDay.getTime() / 1000);
        
        console.log('查询 2026-02-11 的所有日程...\n');
        
        let foundAny = false;
        
        for (const cal of calendars) {
            try {
                const eventRes = await client.calendar.calendarEvent.list({
                    path: { calendar_id: cal.calendar_id },
                    params: {
                        start_time: String(startTime),
                        end_time: String(endTime),
                        page_size: 100
                    }
                });
                
                if (eventRes.code === 0) {
                    const events = eventRes.data.items || [];
                    if (events.length > 0) {
                        foundAny = true;
                        console.log(`\n📅 日历: ${cal.summary}`);
                        console.log('─'.repeat(50));
                        
                        events.forEach((e, i) => {
                            const start = new Date(parseInt(e.start_time.timestamp) * 1000);
                            const end = new Date(parseInt(e.end_time.timestamp) * 1000);
                            const startStr = start.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                            const endStr = end.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                            
                            console.log(`\n${i + 1}. 📝 ${e.summary || '(无标题)'}`);
                            console.log(`   时间: ${startStr} - ${endStr}`);
                            if (e.description) {
                                console.log(`   描述: ${e.description.substring(0, 200)}${e.description.length > 200 ? '...' : ''}`);
                            }
                            if (e.location && e.location.name) {
                                console.log(`   地点: ${e.location.name}`);
                            }
                            if (e.event_id) {
                                console.log(`   ID: ${e.event_id}`);
                            }
                        });
                    }
                }
            } catch (err) {
                console.log(`日历 ${cal.summary} 查询失败: ${err.message}`);
            }
        }
        
        if (!foundAny) {
            console.log('所有日历中都没有找到 2026-02-11 的日程。');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkAllCalendars();
