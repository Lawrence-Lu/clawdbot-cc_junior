const axios = require('axios');

const USER_TOKEN = 'u-c_Flqz4rV4nEYUSqrqjmp25lgZiQk1WpMOaa7xU02cE5';

async function listDocs() {
    try {
        console.log('列出用户的云文档...\n');
        
        // 尝试列出文档
        const res = await axios.get('https://open.feishu.cn/open-apis/drive/v1/files', {
            headers: {
                'Authorization': `Bearer ${USER_TOKEN}`
            },
            params: {
                page_size: 100
            }
        });
        
        console.log('文档列表:', JSON.stringify(res.data, null, 2));
        
        // 查找匹配的文档
        if (res.data.code === 0 && res.data.data && res.data.data.files) {
            const files = res.data.data.files;
            const targetDoc = files.find(f => 
                f.name && f.name.includes('准备数据和样例给到结果')
            );
            
            if (targetDoc) {
                console.log('\n✅ 找到匹配的文档!');
                console.log(`名称: ${targetDoc.name}`);
                console.log(`Token: ${targetDoc.token}`);
                console.log(`类型: ${targetDoc.type}`);
            } else {
                console.log('\n❌ 没有找到匹配的文档');
                console.log('\n最近的文档:');
                files.slice(0, 10).forEach((f, i) => {
                    console.log(`${i+1}. ${f.name} (${f.type})`);
                });
            }
        }
        
    } catch (error) {
        console.error('查询失败:', error.message);
        if (error.response) {
            console.error('错误:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

listDocs();
