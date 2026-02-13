const axios = require('axios');

const USER_TOKEN = 'u-c_Flqz4rV4nEYUSqrqjmp25lgZiQk1WpMOaa7xU02cE5';
const DOC_TOKEN = 'KlREdb64FouxTaxkFCfcQRBgnod';

async function readDocContent() {
    try {
        console.log('读取文档内容...\n');
        
        // 获取文档 blocks
        const res = await axios.get(`https://open.feishu.cn/open-apis/docx/v1/documents/${DOC_TOKEN}/blocks`, {
            headers: {
                'Authorization': `Bearer ${USER_TOKEN}`
            },
            params: {
                page_size: 500
            }
        });
        
        console.log('文档内容:');
        console.log(JSON.stringify(res.data, null, 2));
        
        // 提取纯文本
        if (res.data.code === 0 && res.data.data && res.data.data.items) {
            console.log('\n\n📋 会议纪要摘要:\n');
            const items = res.data.data.items;
            
            items.forEach((block, idx) => {
                if (block.text && block.text.elements) {
                    const text = block.text.elements.map(e => e.text_run ? e.text_run.content : '').join('');
                    if (text.trim()) {
                        console.log(`${text}`);
                    }
                }
            });
        }
        
    } catch (error) {
        console.error('读取失败:', error.message);
        if (error.response) {
            console.error('错误:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

readDocContent();
