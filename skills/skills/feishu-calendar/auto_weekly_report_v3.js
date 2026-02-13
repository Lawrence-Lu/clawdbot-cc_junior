const axios = require('axios');

const USER_TOKEN = process.env.FEISHU_USER_TOKEN || 'u-fYUYV.k393prP.qAChU.IxgknVkQk1ijgwwGiNe82coS';
const CALENDAR_ID = 'feishu.cn_35vVohahIlPn19zxfHCxqb@group.calendar.feishu.cn';
const REPORT_FOLDER_TOKEN = 'SvbXfvafIlr3WWdHI4oc6XBqnHc';

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

// 解析会议纪要，提取结构化内容
function parseMeetingContent(content, title) {
    const lines = content.split('\n').filter(l => l.trim());
    const sections = [];
    let currentSection = null;
    
    // 检查是否有明显的分隔（如多次出现相同关键词或表名）
    const tableNameMatches = content.match(/([a-zA-Z_]+_result|[a-zA-Z_]+_table)/g);
    const hasMultipleTables = tableNameMatches && new Set(tableNameMatches).size > 1;
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        // 跳过空行和标记行
        if (!trimmed || trimmed.startsWith('@') || trimmed.includes('插入相关')) continue;
        
        // 检测可能的子任务分隔（表名、主题词等）
        if (trimmed.match(/^[a-zA-Z_]+_result/) || trimmed.match(/^[a-zA-Z_]+_table/)) {
            if (currentSection && currentSection.items.length > 0) {
                sections.push(currentSection);
            }
            currentSection = {
                title: trimmed,
                items: []
            };
        }
        // 列表项
        else if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
            if (!currentSection) {
                currentSection = { title: null, items: [] };
            }
            currentSection.items.push(trimmed.replace(/^[•\-\*]\s*/, ''));
        }
        // 普通文本（可能是描述）
        else if (trimmed.length > 5) {
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

// 获取本周日程
async function getWeeklyEvents() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const start = new Date(now);
    start.setDate(now.getDate() - dayOfWeek + 1);
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

// 创建文档块
function createBlocksFromMarkdown(content) {
    const lines = content.split('\n');
    const blocks = [];
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            // 空行
            blocks.push({
                block_type: 2,
                text: { elements: [{ text_run: { content: ' ' } }] }
            });
            continue;
        }
        
        // 一级标题 (# 标题)
        if (trimmed.match(/^#\s+/)) {
            blocks.push({
                block_type: 3, // Heading 1
                heading1: {
                    elements: [{ text_run: { content: trimmed.replace(/^#\s+/, '') } }]
                }
            });
        }
        // 二级标题 (## 标题)
        else if (trimmed.match(/^##\s+/)) {
            blocks.push({
                block_type: 4, // Heading 2
                heading2: {
                    elements: [{ text_run: { content: trimmed.replace(/^##\s+/, '') } }]
                }
            });
        }
        // 三级标题 (### 标题)
        else if (trimmed.match(/^###\s+/)) {
            blocks.push({
                block_type: 5, // Heading 3
                heading3: {
                    elements: [{ text_run: { content: trimmed.replace(/^###\s+/, '') } }]
                }
            });
        }
        // 列表项
        else if (trimmed.match(/^[\*\-\•]\s+/)) {
            blocks.push({
                block_type: 7, // Bullet
                bullet: {
                    elements: [{ text_run: { content: trimmed.replace(/^[\*\-\•]\s+/, '') } }]
                }
            });
        }
        // 普通文本
        else {
            blocks.push({
                block_type: 2,
                text: { elements: [{ text_run: { content: trimmed } }] }
            });
        }
    }
    
    return blocks;
}

// 创建周报文档
async function createWeeklyReportDoc(title, markdownContent) {
    // 1. 创建文档
    const createRes = await axios.post('https://open.feishu.cn/open-apis/docx/v1/documents', {
        title: title,
        folder_token: REPORT_FOLDER_TOKEN
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
    
    // 3. 从 Markdown 创建块
    const blocks = createBlocksFromMarkdown(markdownContent);
    
    // 分批添加块（避免请求过大）
    const batchSize = 50;
    for (let i = 0; i < blocks.length; i += batchSize) {
        const batch = blocks.slice(i, i + batchSize);
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

// 生成周报
async function generateWeeklyReport() {
    console.log('🚀 开始生成周报...\n');
    
    // 1. 获取本周日程
    console.log('📅 获取本周日程...');
    const events = await getWeeklyEvents();
    console.log(`   找到 ${events.length} 个日程\n`);
    
    // 2. 获取所有文档
    console.log('📄 获取会议纪要文档...');
    const docs = await listDocs();
    
    // 3. 处理每个日程
    const reportItems = [];
    
    for (const event of events) {
        const title = event.summary || '(无标题)';
        const start = new Date(parseInt(event.start_time.timestamp) * 1000);
        const date = start.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
        const category = classifyTask(title);
        
        // 查找关联文档
        const matchedDoc = docs.find(d => {
            const dDate = new Date(parseInt(d.created_time) * 1000).toLocaleDateString('zh-CN');
            const eDate = start.toLocaleDateString('zh-CN');
            return dDate === eDate && d.type === 'docx' && 
                   (d.name.includes(title.replace(/\s+\d{4}年\d+月\d+日$/, '')) || title.includes(d.name.split(' ')[0]));
        });
        
        let meetingContent = '';
        let sections = [];
        if (matchedDoc) {
            meetingContent = await readDoc(matchedDoc.token);
            sections = parseMeetingContent(meetingContent, title);
        }
        
        // 如果没有解析出结构化内容，使用简单提取
        if (sections.length === 0) {
            const items = meetingContent ? 
                meetingContent.split('\n').filter(l => l.trim().startsWith('•') && l.length > 5).map(l => l.trim().replace(/^•\s*/, '')) :
                ['完成相关讨论和工作'];
            sections.push({ title: null, items });
        }
        
        const nextSteps = meetingContent.toLowerCase().includes('下一步') || meetingContent.includes('计划') ?
            ['按计划推进'] : ['继续跟进相关工作'];
        
        reportItems.push({
            title,
            date,
            category,
            sections,
            nextSteps,
            meetingDoc: matchedDoc?.name || null
        });
    }
    
    // 4. 按分类整理
    const categories = {};
    reportItems.forEach(item => {
        if (!categories[item.category]) categories[item.category] = [];
        categories[item.category].push(item);
    });
    
    // 5. 生成 Markdown 格式的周报内容
    const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
    
    let md = `# 本周工作周报（${today}）\n\n`;
    
    // 第一部分：进度（一级标题）
    md += `# 一、本周工作进度\n\n`;
    
    let taskIndex = 1;
    for (const [category, items] of Object.entries(categories)) {
        // 分类作为二级标题
        md += `## ${taskIndex}. ${category}\n\n`;
        
        for (const item of items) {
            // 任务标题作为三级标题
            md += `### ${item.title}（${item.date}）\n`;
            if (item.meetingDoc) {
                md += `📄 纪要：${item.meetingDoc}\n`;
            }
            md += '\n';
            
            // 如果有多个子任务（sections），分别列出
            for (const section of item.sections) {
                if (section.title) {
                    md += `**${section.title}**\n\n`;
                }
                for (const subItem of section.items) {
                    md += `- ${subItem}\n`;
                }
                md += '\n';
            }
        }
        taskIndex++;
    }
    
    // 第二部分：问题与风险（一级标题）
    md += `# 二、问题与风险\n\n`;
    md += '本周暂无重大问题或风险。\n\n';
    md += '- 需关注数据样例输出进度\n';
    md += '- 指标加工逻辑需持续验证\n\n';
    
    // 第三部分：下一步计划（一级标题）
    md += `# 三、下周工作计划\n\n`;
    
    let planIndex = 1;
    for (const [category, items] of Object.entries(categories)) {
        md += `## ${planIndex}. ${category}\n\n`;
        const allNextSteps = items.flatMap(i => i.nextSteps);
        allNextSteps.forEach((step, idx) => {
            md += `${idx + 1}. ${step}\n`;
        });
        md += '\n';
        planIndex++;
    }
    
    md += `---\n\n`;
    md += `*周报生成时间：${new Date().toLocaleString('zh-CN')}*\n`;
    md += `*AI自动生成*\n`;
    
    // 6. 创建文档
    console.log('📝 创建周报文档...');
    const docTitle = `${today}_周报`;
    
    try {
        const docId = await createWeeklyReportDoc(docTitle, md);
        const docUrl = `https://la7bax2jx4y.feishu.cn/docx/${docId}`;
        
        console.log('\n✅ 周报生成完成！');
        console.log(`📄 文档标题: ${docTitle}`);
        console.log(`📁 位置: 产业信息平台 > 周报`);
        console.log(`🔗 文档链接: ${docUrl}`);
        console.log(`\n📊 统计:`);
        console.log(`   - 本周日程: ${events.length} 个`);
        console.log(`   - 任务分类: ${Object.keys(categories).join(', ')}`);
        
        return { 
            success: true,
            docId, 
            docTitle, 
            docUrl, 
            events: events.length,
            categories: Object.keys(categories)
        };
    } catch (error) {
        console.error('\n❌ 生成失败:', error.message);
        if (error.response?.data) {
            console.error('错误详情:', JSON.stringify(error.response.data, null, 2));
        }
        throw error;
    }
}

// 主函数
async function main() {
    try {
        const result = await generateWeeklyReport();
        console.log('\n📋 生成结果:');
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('❌ 程序错误:', error.message);
        process.exit(1);
    }
}

// 如果直接运行
if (require.main === module) {
    main();
}

module.exports = { generateWeeklyReport };
