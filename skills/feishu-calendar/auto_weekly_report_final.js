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

// 解析会议纪要，按子任务分组
function parseMeetingContent(content) {
    const lines = content.split('\n').filter(l => l.trim());
    const sections = [];
    let currentSection = null;
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        if (!trimmed || trimmed.startsWith('@') || trimmed.includes('插入相关')) continue;
        
        // 检测表名作为子任务分隔
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

// 创建周报文档
async function createWeeklyReportDoc(title, contentLines) {
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
    
    // 3. 将内容行转换为块 - 只使用 text 和 bullet 块，通过样式区分
    const blocks = [];
    for (const line of contentLines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        // 一级标题 - 大字号加粗
        if (line.startsWith('【H1】')) {
            blocks.push({
                block_type: 2,
                text: { 
                    elements: [{ 
                        text_run: { 
                            content: line.replace(/^【H1】/, ''),
                            text_style: { bold: true, font_size: 16 }
                        } 
                    }] 
                }
            });
        }
        // 二级标题 - 加粗
        else if (line.startsWith('【H2】')) {
            blocks.push({
                block_type: 2,
                text: { 
                    elements: [{ 
                        text_run: { 
                            content: line.replace(/^【H2】/, ''),
                            text_style: { bold: true, font_size: 14 }
                        } 
                    }] 
                }
            });
        }
        // 三级标题 - 斜体
        else if (line.startsWith('【H3】')) {
            blocks.push({
                block_type: 2,
                text: { 
                    elements: [{ 
                        text_run: { 
                            content: line.replace(/^【H3】/, ''),
                            text_style: { bold: true, italic: true }
                        } 
                    }] 
                }
            });
        }
        // 子任务标题 - 缩进加粗
        else if (line.startsWith('【SUB】')) {
            blocks.push({
                block_type: 2,
                text: { 
                    elements: [{ 
                        text_run: { 
                            content: '    ' + line.replace(/^【SUB】/, ''),
                            text_style: { bold: true }
                        } 
                    }] 
                }
            });
        }
        // 列表项 - 用 bullet 块
        else if (line.startsWith('- ')) {
            blocks.push({
                block_type: 7,
                bullet: { elements: [{ text_run: { content: line.replace(/^- /, '') } }] }
            });
        }
        // 缩进列表项
        else if (line.startsWith('  - ')) {
            blocks.push({
                block_type: 2,
                text: { elements: [{ text_run: { content: '        ' + line.replace(/^  - /, '• ') } }] }
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
    
    // 4. 分批添加块
    const batchSize = 40;
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
            date,
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
    
    // 5. 生成内容行
    const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
    const contentLines = [];
    
    // 标题
    contentLines.push(`【H1】本周工作周报（${today}）`);
    contentLines.push('');
    
    // 第一部分：进度
    contentLines.push('【H1】一、本周工作进度');
    contentLines.push('');
    
    let taskIndex = 1;
    for (const [category, items] of Object.entries(categories)) {
        // 分类作为二级标题
        contentLines.push(`【H2】${taskIndex}. ${category}`);
        contentLines.push('');
        
        for (const item of items) {
            // 任务标题作为三级标题
            contentLines.push(`【H3】${item.title}（${item.date}）`);
            if (item.meetingDoc) {
                contentLines.push(`📄 纪要：${item.meetingDoc}`);
            }
            contentLines.push('');
            
            // 子任务/进度项
            for (const section of item.sections) {
                if (section.title) {
                    contentLines.push(`【SUB】${section.title}`);
                }
                for (const subItem of section.items) {
                    contentLines.push(`- ${subItem}`);
                }
                if (section.title) contentLines.push('');
            }
        }
        taskIndex++;
    }
    
    // 第二部分：问题与风险
    contentLines.push('【H1】二、问题与风险');
    contentLines.push('');
    contentLines.push('本周暂无重大问题或风险。');
    contentLines.push('- 需关注数据样例输出进度');
    contentLines.push('- 指标加工逻辑需持续验证');
    contentLines.push('');
    
    // 第三部分：下一步计划
    contentLines.push('【H1】三、下周工作计划');
    contentLines.push('');
    
    let planIndex = 1;
    for (const [category, items] of Object.entries(categories)) {
        contentLines.push(`【H2】${planIndex}. ${category}`);
        contentLines.push('');
        const allNextSteps = items.flatMap(i => ['继续完善相关工作', '按计划推进']);
        allNextSteps.forEach((step, idx) => {
            contentLines.push(`${idx + 1}. ${step}`);
        });
        contentLines.push('');
        planIndex++;
    }
    
    contentLines.push('---');
    contentLines.push(`*周报生成时间：${new Date().toLocaleString('zh-CN')}*`);
    contentLines.push('*AI自动生成*');
    
    // 6. 创建文档
    console.log('📝 创建结构化周报文档...');
    const docTitle = `${today}_周报`;
    
    try {
        const docId = await createWeeklyReportDoc(docTitle, contentLines);
        const docUrl = `https://la7bax2jx4y.feishu.cn/docx/${docId}`;
        
        console.log('\n✅ 周报生成完成！');
        console.log(`📄 文档标题: ${docTitle}`);
        console.log(`📁 位置: 产业信息平台 > 周报`);
        console.log(`🔗 文档链接: ${docUrl}`);
        console.log(`\n📊 结构说明:`);
        console.log(`   【一级标题】章节（本周工作进度/问题与风险/下一步计划）`);
        console.log(`   【二级标题】任务分类（数据加工、数据样例等）`);
        console.log(`   【三级标题】具体任务名称`);
        console.log(`   【子任务】如有多个表/模块，会单独列出`);
        console.log(`   【列表项】具体进度点`);
        
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
