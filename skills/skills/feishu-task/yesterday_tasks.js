const { Client } = require('@larksuiteoapi/node-sdk');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;

const client = new Client({ appId: APP_ID, appSecret: APP_SECRET });

async function getYesterdayTasks() {
    // 昨天 2026-02-11 的时间戳范围
    const yesterday = new Date('2026-02-11');
    const startOfDay = new Date(yesterday);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(yesterday);
    endOfDay.setHours(23, 59, 59, 999);
    
    const startTime = Math.floor(startOfDay.getTime() / 1000);
    const endTime = Math.floor(endOfDay.getTime() / 1000);
    
    console.log('查询 2026-02-11 的任务...');
    console.log(`时间范围: ${startTime} - ${endTime}\n`);
    
    try {
        const res = await client.task.task.list({
            params: {
                page_size: 100,
                user_id_type: 'open_id'
            }
        });

        if (res.code !== 0) {
            console.error('❌ API Error:', res.msg);
            return;
        }

        const tasks = res.data.items || [];
        
        if (tasks.length === 0) {
            console.log('没有找到任何任务。');
        } else {
            console.log(`找到 ${tasks.length} 个任务:\n`);
            
            // 筛选昨天的任务
            const yesterdayTasks = tasks.filter(task => {
                if (!task.due || !task.due.time) return false;
                const taskTime = parseInt(task.due.time);
                return taskTime >= startTime && taskTime <= endTime;
            });
            
            if (yesterdayTasks.length === 0) {
                console.log('昨天没有截止的任务。');
                console.log('\n所有任务列表（用于调试）:');
                tasks.forEach((task, i) => {
                    const dueTime = task.due && task.due.time ? new Date(parseInt(task.due.time) * 1000).toLocaleString('zh-CN') : '无截止日期';
                    console.log(`${i+1}. ${task.summary} - 截止: ${dueTime}`);
                });
            } else {
                yesterdayTasks.forEach((task, i) => {
                    const status = task.completed_at ? '✅' : '⬜';
                    const dueTime = new Date(parseInt(task.due.time) * 1000).toLocaleString('zh-CN');
                    console.log(`${i+1}. ${status} ${task.summary}`);
                    console.log(`   截止时间: ${dueTime}`);
                    if (task.description) {
                        console.log(`   描述: ${task.description}`);
                    }
                    console.log(`   链接: ${task.app_link}\n`);
                });
            }
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

getYesterdayTasks();
