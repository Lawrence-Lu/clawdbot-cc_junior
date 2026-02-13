const axios = require('axios');

const USER_TOKEN = 'u-c_Flqz4rV4nEYUSqrqjmp25lgZiQk1WpMOaa7xU02cE5';
const DOC_NAME = '准备数据和样例给到结果 2026年2月11';

async function searchDoc() {
    try {
        console.log(`搜索文档: "${DOC_NAME}"\n`);
        
        // 尝试搜索文档
        const res = await axios.post('https://open.feishu.cn/open-apis/docs/v1/search', {
            query: DOC_NAME,
            page_size: 10
        }, {
            headers: {
                'Authorization': `Bearer ${USER_TOKEN}`,
                'Content-Type': 'application/json; charset=utf-8'
            }
        });
        
        console.log('搜索结果:', JSON.stringify(res.data, null, 2));
        
    } catch (error) {
        console.error('搜索失败:', error.message);
        if (error.response) {
            console.error('错误:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

searchDoc();
