const axios = require('axios');

const USER_TOKEN = 'u-c_Flqz4rV4nEYUSqrqjmp25lgZiQk1WpMOaa7xU02cE5';
const CALENDAR_ID = 'feishu.cn_35vVohahIlPn19zxfHCxqb@group.calendar.feishu.cn';
const EVENT_ID = '1233425a-2f6a-4b83-bbee-6ba8d63cd71a_0';

async function getDetail() {
    try {
        const res = await axios.get(
            `https://open.feishu.cn/open-apis/calendar/v4/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${EVENT_ID}`,
            { headers: { 'Authorization': `Bearer ${USER_TOKEN}` } }
        );
        
        if (res.data.code === 0 && res.data.data && res.data.data.event) {
            const event = res.data.data.event;
            console.log('日程详情:\n');
            console.log(`标题: ${event.summary}`);
            console.log(`描述: ${event.description}`);
            console.log(`\n完整数据:`);
            console.log(JSON.stringify(event, null, 2));
        }
    } catch (error) {
        console.error('错误:', error.message);
    }
}

getDetail();
