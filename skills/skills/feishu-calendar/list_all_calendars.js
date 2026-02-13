const axios = require('axios');

const USER_TOKEN = 'u-fw52rTJLJfF89YNnATfump5kirv4k1ohMyyamNk0041i';

async function listCalendars() {
    try {
        console.log('列出所有日历...\n');
        
        const res = await axios.get('https://open.feishu.cn/open-apis/calendar/v4/calendars', {
            headers: {
                'Authorization': `Bearer ${USER_TOKEN}`
            },
            params: {
                page_size: 100
            }
        });
        
        console.log('日历列表:', JSON.stringify(res.data, null, 2));
        
        if (res.data.code === 0 && res.data.data && res.data.data.calendar_list) {
            const calendars = res.data.data.calendar_list;
            console.log(`\n✅ 找到 ${calendars.length} 个日历\n`);
            
            calendars.forEach((cal, i) => {
                console.log(`${i + 1}. 📅 ${cal.summary}`);
                console.log(`   ID: ${cal.calendar_id}`);
                console.log(`   角色: ${cal.role || '无'}`);
                console.log(`   类型: ${cal.calendar_type || '未知'}`);
                console.log('');
            });
            
            return calendars;
        }
    } catch (error) {
        console.error('查询失败:', error.message);
        if (error.response) {
            console.error('错误详情:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

listCalendars();
