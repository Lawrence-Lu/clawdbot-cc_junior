const axios = require('axios');

const USER_TOKEN = 'u-fw52rTJLJfF89YNnATfump5kirv4k1ohMyyamNk0041i';
const MEETING_URL = 'https://vc.feishu.cn/j/276669562';

async function getMeetingInfo() {
    try {
        console.log('尝试获取会议信息...\n');
        
        // 尝试获取用户的会议列表
        const res = await axios.get('https://open.feishu.cn/open-apis/vc/v1/meetings', {
            headers: { 'Authorization': `Bearer ${USER_TOKEN}` },
            params: {
                start_time: '1770773400',
                end_time: '1770778800',
                page_size: 100
            }
        });
        
        console.log('会议列表:', JSON.stringify(res.data, null, 2));
        
    } catch (error) {
        console.error('查询失败:', error.message);
        if (error.response) {
            console.error('错误:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

getMeetingInfo();
