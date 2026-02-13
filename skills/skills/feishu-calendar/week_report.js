const axios = require('axios');

const USER_TOKEN = 'u-c_Flqz4rV4nEYUSqrqjmp25lgZiQk1WpMOaa7xU02cE5';
const CALENDAR_ID = 'feishu.cn_35vVohahIlPn19zxfHCxqb@group.calendar.feishu.cn';

async function getWeeklyEvents() {
    const start = new Date('2026-02-10');
    start.setHours(0,0,0,0);
    const end = new Date('2026-02-12');
    end.setHours(23,59,59,999);
    
    const res = await axios.get(
        `https://open.feishu.cn/open-apis/calendar/v4/calendars/${encodeURIComponent(CALENDAR_ID)}/events`,
        {
            headers: { 'Authorization': `Bearer ${USER_TOKEN}` },
            params: { 
                start_time: String(Math.floor(start.getTime()/1000)), 
                end_time: String(Math.floor(end.getTime()/1000)), 
                page_size: 100 
            }
        }
    );
    
    return res.data.data.items || [];
}

async function listDocs() {
    const res = await axios.get('https://open.feishu.cn/open-apis/drive/v1/files', {
        headers: { 'Authorization': `Bearer ${USER_TOKEN}` },
        params: { page_size: 200 }
    });
    return res.data.data.files || [];
}

async function readDoc(token) {
    const res = await axios.get(`https://open.feishu.cn/open-apis/docx/v1/documents/${token}/blocks`, {
        headers: { 'Authorization': `Bearer ${USER_TOKEN}` },
        params: { page_size: 500 }
    });
    
    const items = res.data.data.items;
    let content = '';
    items.forEach(block => {
        if (block.text?.elements) {
            content += block.text.elements.map(e => e.text_run?.content || '').join('') + '\n';
        }
        if (block.bullet?.elements) {
            content += '• ' + block.bullet.elements.map(e => e.text_run?.content || '').join('') + '\n';
        }
    });
    return content;
}

function classify(title) {
    if (!title) return '其他';
    const cats = {
        '数据加工': ['加工', '标签', '复刻', '指标'],
        '数仓设计': ['数仓', '模型', '星型', 'DWT'],
        '数据质量': ['质量', '核验', '校验'],
        '产品库': ['产品库'],
        '会议沟通': ['沟通', '研讨', '讨论'],
    };
    for (const [cat, keys] of Object.entries(cats)) {
        if (keys.some(k => title.includes(k))) return cat;
    }
    return '其他';
}

async function main() {
    console.log('🚀 生成本周周报（2月10-12日）\n');
    
    const events = await getWeeklyEvents();
    const docs = await listDocs();
    
    console.log(`📅 本周共 ${events.length} 个日程\n`);
    console.log('='.repeat(60));
    
    for (const e of events) {
        const title = e.summary || '(无标题)';
        const start = new Date(parseInt(e.start_time.timestamp) * 1000);
        console.log(`\n📌 ${title}`);
        console.log(`   时间: ${start.toLocaleString('zh-CN')}`);
        
        // 查找匹配文档
        const doc = docs.find(d => {
            const dDate = new Date(parseInt(d.created_time) * 1000).toLocaleDateString('zh-CN');
            const eDate = start.toLocaleDateString('zh-CN');
            return dDate === eDate && d.type === 'docx';
        });
        
        if (doc) {
            console.log(`   文档: ${doc.name}`);
            const content = await readDoc(doc.token);
            console.log(`   纪要: ${content.substring(0, 200)}${content.length > 200 ? '...' : ''}`);
        } else {
            console.log('   文档: 未找到');
        }
        
        console.log(`   分类: ${classify(title)}`);
    }
    
    console.log('\n' + '='.repeat(60));
}

main();
