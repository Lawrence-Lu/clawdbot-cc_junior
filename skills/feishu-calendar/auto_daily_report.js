const axios = require('axios');

const USER_TOKEN = process.env.FEISHU_USER_TOKEN || 'u-fYUYV.k393prP.qAChU.IxgknVkQk1ijgwwGiNe82coS';
const CALENDAR_ID = 'feishu.cn_35vVohahIlPn19zxfHCxqb@group.calendar.feishu.cn';
const DAILY_FOLDER_TOKEN = 'OFPEf9ha0lEmQZdkj5vc5umUned'; // 日报文件夹

// 任务分类器
function classifyTask(title) {
    if (!title) return '其他';
    const categories = {
        '数据加工': ['加工', '标签', '复刻', '指标', '指标表', '开发'],
        '数仓设计': ['数仓', '模型', '星型', 'DWT', 'DWS', '设计'],
        '数据质量': ['质量', '核验', '校验', '问题'],
        '产品库': ['产品库', '产品'],
        '会议沟通': ['沟通', '研讨', '讨论', '对齐', '会议'],
        '数据样例': ['样例', '数据样例', '样本'],
        '培训': ['培训'],
        '上链': ['上链'],
        '运维': ['运维'],
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
        for (const keyword of keywords) {
            if (title.includes(keyword)) return category;
        }
    }
    return '其他';
}

// 获取今日日程
async function getTodayEvents() {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    
    const res = await axios.get(
        `https://open.feishu.cn/open-apis/calendar/v4/calendars/${encodeURIComponent(CALENDAR_ID)}/events`,
        {
            headers: { 'Authorization': `Bearer ${USER_TOKEN}` },
            params: { 
                start_time: String(Math.floor(start.getTime() / 1000)), 
                end_time: String(Math.floor(end.getTime() / 1000)), 
                page_size: 100 
            }
        }
    );
    
    return res.data.data.items || [];
}

// 获取所有文档
async function listDocs() {
    const res = await axios.get('https://open.feishu.cn/open-apis/drive/v1/files', {
        headers: { 'Authorization': `Bearer ${USER_TOKEN}` },
        params: { page_size: 200 }
    });
    return res.data.data.files || [];
}

// 读取文档内容
async function readDoc(docToken) {
    try {
        const res = await axios.get(`https://open.feishu.cn/open-apis/docx/v1/documents/${docToken}/blocks`, {
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
    } catch (error) {
        return '';
    }
}

// 解析会议纪要
function parseMeetingContent(content) {
    const lines = content.split('\n').filter(l => l.trim());
    const sections = [];
    let currentSection = null;
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        if (!trimmed || trimmed.startsWith('@') || trimmed.includes('插入相关')) continue;
        
        // 检测表名/结果表作为子任务分隔
        if (trimmed.match(/^[a-zA-Z_]+_result/) || trimmed.match(/^[a-zA-Z_]+_table/)) {
            if (currentSection && currentSection.items.length > 0) {
                sections.push(currentSection);
            }
            currentSection = {
                title: trimmed,
                items: []
            };
        }
        else if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
            if (!currentSection) {
                currentSection = { title: null, items: [] };
            }
            currentSection.items.push(trimmed.replace(/^[•\-\*]\s*/, ''));
        }
        else if (trimmed.length > 3) {
            if (!currentSection) {
                currentSection = { title: null, items: [] };
            }
            currentSection.items.push(trimmed);
        }
    }
    
    if (currentSection && currentSection.items.length > 0) {
        sections.push(currentSection);
    }
    
    return sections;
}

// 创建日报文档
async function createDailyReportDoc(title, lines) {
    // 1. 创建文档
    const createRes = await axios.post('https://open.feishu.cn/open-apis/docx/v1/documents', {
        title: title,
        folder_token: DAILY_FOLDER_TOKEN
    }, {
        headers: { 
            'Authorization': `Bearer ${USER_TOKEN}`,
            'Content-Type': 'application/json'
        }
    });
    
    const docId = createRes.data.data.document.document_id;
    
    // 2. 获取根块
    const blocksRes = await axios.get(`https://open.feishu.cn/open-apis/docx/v1/documents/${docId}/blocks`, {
        headers: { 'Authorization': `Bearer ${USER_TOKEN}` }
    });
    
    const rootBlockId = blocksRes.data.data.items[0]?.block_id;
    
    // 3. 创建块
    const children = lines.map(line => ({
        block_type: 2,
        text: { elements: [{ text_run: { content: line || ' ' } }] }
    }));
    
    // 4. 分批添加
    const batchSize = 50;
    for (let i = 0; i < children.length; i += batchSize) {
        const batch = children.slice(i, i + batchSize);
        await axios.post(`https://open.feishu.cn/open-apis/docx/v1/documents/${docId}/blocks/${rootBlockId}/children`, {
            children: batch
        }, {
            headers: { 
                'Authorization': `Bearer ${USER_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
    }
    
    return docId;
}

// 生成日报
async function generateDailyReport() {
    console.log('🚀 开始生成日报...\n');
    
    // 1. 获取今日日程
    console.log('📅 获取今日日程...');
    const events = await getTodayEvents();
    console.log(`   找到 ${events.length} 个日程\n`);
    
    if (events.length === 0) {
        console.log('⚠️ 今日没有日程，不生成日报');
        return null;
    }
    
    // 2. 获取所有文档
    console.log('📄 获取会议纪要文档...');
    const docs = await listDocs();
    
    // 3. 处理每个日程
    const reportItems = [];
    
    for (const event of events) {
        const title = event.summary || '(无标题)';
        const start = new Date(parseInt(event.start_time.timestamp) * 1000);
        const time = start.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        const category = classifyTask(title);
        
        // 查找关联文档
        const today = new Date().toLocaleDateString('zh-CN');
        const matchedDoc = docs.find(d => {
            const dDate = new Date(parseInt(d.created_time) * 1000).toLocaleDateString('zh-CN');
            return dDate === today && d.type === 'docx' && 
                   (d.name.includes(title.replace(/\s+\d{4}年\d+月\d+日$/, '')) || title.includes(d.name.split(' ')[0]));
        });
        
        let sections = [];
        if (matchedDoc) {
            const meetingContent = await readDoc(matchedDoc.token);
            sections = parseMeetingContent(meetingContent);
        }
        
        if (sections.length === 0) {
            sections.push({ title: null, items: ['完成相关讨论和工作'] });
        }
        
        reportItems.push({
            title,
            time,
            category,
            sections,
            meetingDoc: matchedDoc?.name || null
        });
    }
    
    // 4. 按分类整理
    const categories = {};
    reportItems.forEach(item => {
        if (!categories[item.category]) categories[item.category] = [];
        categories[item.category].push(item);
    });
    
    // 5. 生成内容
    const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
    const weekday = new Date().toLocaleDateString('zh-CN', { weekday: 'long' });
    const lines = [];
    
    // 标题
    lines.push(`工作日报（${today} ${weekday}）`);
    lines.push('');
    
    // 第一部分：今日工作进度
    lines.push('━'.repeat(60));
    lines.push('一、今日工作进度');
    lines.push('━'.repeat(60));
    lines.push('');
    
    let taskIndex = 1;
    for (const [category, items] of Object.entries(categories)) {
        lines.push(`${taskIndex}. 【${category}】`);
        lines.push('');
        
        for (const item of items) {
            const meetingTag = item.meetingDoc ? `  [📄 ${item.meetingDoc}]` : '';
            lines.push(`   ▶ ${item.title}（${item.time}）${meetingTag}`);
            lines.push('');
            
            for (const section of item.sections) {
                if (section.title) {
                    lines.push(`      □ ${section.title}`);
                    for (const subItem of section.items) {
                        lines.push(`         • ${subItem}`);
                    }
                } else {
                    for (const subItem of section.items) {
                        lines.push(`      • ${subItem}`);
                    }
                }
                lines.push('');
            }
        }
        taskIndex++;
    }
    
    // 第二部分：问题与风险
    lines.push('━'.repeat(60));
    lines.push('二、问题与风险');
    lines.push('━'.repeat(60));
    lines.push('');
    lines.push('今日暂无重大问题或风险。');
    lines.push('');
    lines.push('⚠ 需关注事项：');
    lines.push('   • 数据加工进度');
    lines.push('   • 数据质量验证');
    lines.push('');
    
    // 第三部分：明日工作计划
    lines.push('━'.repeat(60));
    lines.push('三、明日工作计划');
    lines.push('━'.repeat(60));
    lines.push('');
    lines.push('1. 完成当前版本指标结果表SQL确认');
    lines.push('2. 确认相关数据问题处理进度');
    lines.push('');
    
    lines.push('━'.repeat(60));
    lines.push(`日报生成时间：${new Date().toLocaleString('zh-CN')}  |  AI自动生成`);
    
    return { lines, events: events.length, categories: Object.keys(categories), today };
}

// 主函数
async function main() {
    try {
        const result = await generateDailyReport();
        
        if (!result) {
            console.log('今日无日程，退出');
            return;
        }
        
        const { lines, events, categories, today } = result;
        
        console.log('\n📋 生成的内容预览:');
        console.log('-'.repeat(60));
        lines.slice(0, 40).forEach(l => console.log(l || ' '));
        if (lines.length > 40) console.log('... (更多内容)');
        console.log('-'.repeat(60));
        
        const docTitle = `${today}_日报`;
        
        console.log('\n📝 创建日报文档...');
        const docId = await createDailyReportDoc(docTitle, lines);
        const docUrl = `https://la7bax2jx4y.feishu.cn/docx/${docId}`;
        
        console.log('\n✅ 日报生成完成！');
        console.log(`📄 文档标题: ${docTitle}`);
        console.log(`📁 位置: 产业信息平台 > 日报`);
        console.log(`🔗 文档链接: ${docUrl}`);
        console.log(`\n📊 统计:`);
        console.log(`   - 今日日程: ${events} 个`);
        console.log(`   - 任务分类: ${categories.join(', ')}`);
        
    } catch (error) {
        console.error('\n❌ 程序错误:', error.message);
        if (error.response?.data) {
            console.error('错误详情:', JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    }
}

// 如果直接运行
if (require.main === module) {
    main();
}

module.exports = { generateDailyReport, createDailyReportDoc };
