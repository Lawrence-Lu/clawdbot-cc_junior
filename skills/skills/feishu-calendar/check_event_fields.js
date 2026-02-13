const axios = require('axios');

const USER_TOKEN = 'u-fw52rTJLJfF89YNnATfump5kirv4k1ohMyyamNk0041i';
const CALENDAR_ID = 'feishu.cn_35vVohahIlPn19zxfHCxqb@group.calendar.feishu.cn';
const EVENT_ID = '1233425a-2f6a-4b83-bbee-6ba8d63cd71a_0';

async function getFullEventDetail() {
    try {
        console.log('获取日程完整详情（包含所有字段）...\n');
        
        const res = await axios.get(
            `https://open.feishu.cn/open-apis/calendar/v4/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${EVENT_ID}`,
            {
                headers: { 'Authorization': `Bearer ${USER_TOKEN}` }
            }
        );
        
        console.log('完整响应:');
        console.log(JSON.stringify(res.data, null, 2));
        
        // 检查特定字段
        if (res.data.code === 0 && res.data.data && res.data.data.event) {
            const event = res.data.data.event;
            console.log('\n\n📋 字段检查:');
            console.log('- has attachments:', !!event.attachments);
            console.log('- has docs:', !!event.docs);
            console.log('- has chat:', !!event.chat);
            console.log('- has meeting_notes:', !!event.meeting_notes);
            console.log('- has event_notes:', !!event.event_notes);
            console.log('- has notes:', !!event.notes);
            
            // 打印所有字段名
            console.log('\n所有字段:', Object.keys(event).join(', '));
        }
        
    } catch (error) {
        console.error('查询失败:', error.message);
        if (error.response) {
            console.error('错误:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

getFullEventDetail();
