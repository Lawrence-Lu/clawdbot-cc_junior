const axios = require('axios');

const USER_TOKEN = process.env.FEISHU_USER_TOKEN;
const CALENDAR_ID = 'feishu.cn_35vVohahIlPn19zxfHCxqb@group.calendar.feishu.cn';
const DAILY_FOLDER_TOKEN = 'OFPEf9ha0lEmQZdkj5vc5umUned';

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

// 检查今天是否已存在日报
async function checkExistingDailyReport() {
    const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
    
    const res = await axios.get('https://open.feishu.cn/open-apis/drive/v1/files', {
        headers: { 'Authorization': `Bearer ${USER_TOKEN}` },
        params: { 
            folder_token: DAILY_FOLDER_TOKEN,
            page_size: 10
        }
    });
    
    const existing = res.data.data.files.find(f => 
        f.type === 'docx' && f.name === `${today}_日报`
    );
    
    return existing;
}

// 创建日报文档（确认后使用）
async function createDailyReportDoc(title, lines) {
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
    
    const blocksRes = await axios.get(`https://open.feishu.cn/open-apis/docx/v1/documents/${docId}/blocks`, {
        headers: { 'Authorization': `Bearer ${USER_TOKEN}` }
    });
    
    const rootBlockId = blocksRes.data.data.items[0]?.block_id;
    
    const children = lines.map(line => ({
        block_type: 2,
        text: { elements: [{ text_run: { content: line || ' ' } }] }
    }));
    
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

// 生成日报草稿（Markdown 格式，用于确认）
async function generateDailyReportDraft() {
    const events = await getTodayEvents();
    const docs = await listDocs();
    
    const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
    const weekday = new Date().toLocaleDateString('zh-CN', { weekday: 'long' });
    
    if (events.length === 0) {
        return {
            hasEvents: false,
            message: '今天没有日程，请告诉我今日工作进度、问题与风险、明日工作计划'
        };
    }
    
    // 处理日程
    const reportItems = [];
    for (const event of events) {
        const title = event.summary || '(无标题)';
        const start = new Date(parseInt(event.start_time.timestamp) * 1000);
        const time = start.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        const category = classifyTask(title);
        
        const todayStr = new Date().toLocaleDateString('zh-CN');
        const matchedDoc = docs.find(d => {
            const dDate = new Date(parseInt(d.created_time) * 1000).toLocaleDateString('zh-CN');
            return dDate === todayStr && d.type === 'docx' && 
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
    
    // 按分类整理
    const categories = {};
    reportItems.forEach(item => {
        if (!categories[item.category]) categories[item.category] = [];
        categories[item.category].push(item);
    });
    
    // 生成 Markdown 草稿
    let md = `# 工作日报（${today} ${weekday}）\n\n`;
    
    md += `## 一、今日工作进度\n\n`;
    
    let taskIndex = 1;
    for (const [category, items] of Object.entries(categories)) {
        md += `### ${taskIndex}. 【${category}】\n\n`;
        
        for (const item of items) {
            const meetingTag = item.meetingDoc ? `  [📄 ${item.meetingDoc}]` : '';
            md += `**${item.title}（${item.time}）**${meetingTag}\n\n`;
            
            for (const section of item.sections) {
                if (section.title) {
                    md += `- **${section.title}**\n`;
                    for (const subItem of section.items) {
                        md += `  - ${subItem}\n`;
                    }
                } else {
                    for (const subItem of section.items) {
                        md += `- ${subItem}\n`;
                    }
                }
            }
            md += '\n';
        }
        taskIndex++;
    }
    
    md += `## 二、问题与风险\n\n`;
    md += '今日暂无重大问题或风险。\n\n';
    md += '- 需关注数据加工进度\n';
    md += '- 数据质量验证\n\n';
    
    md += `## 三、明日工作计划\n\n`;
    md += '1. 完成当前版本指标结果表SQL确认\n';
    md += '2. 确认相关数据问题处理进度\n\n';
    
    md += `---\n*日报生成时间：${new Date().toLocaleString('zh-CN')}*\n`;
    
    // 同时生成飞书文档格式的内容行
    const lines = [];
    lines.push(`工作日报（${today} ${weekday}）`);
    lines.push('');
    lines.push('━'.repeat(60));
    lines.push('一、今日工作进度');
    lines.push('━'.repeat(60));
    lines.push('');
    
    taskIndex = 1;
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
    
    lines.push('━'.repeat(60));
    lines.push('三、明日工作计划');
    lines.push('━'.repeat(60));
    lines.push('');
    lines.push('1. 完成当前版本指标结果表SQL确认');
    lines.push('2. 确认相关数据问题处理进度');
    lines.push('');
    
    lines.push('━'.repeat(60));
    lines.push(`日报生成时间：${new Date().toLocaleString('zh-CN')}  |  AI自动生成`);
    
    // 检查是否已存在
    const existing = await checkExistingDailyReport();
    
    return {
        hasEvents: true,
        markdown: md,
        lines: lines,
        title: `${today}_日报`,
        events: events.length,
        categories: Object.keys(categories),
        existingDoc: existing
    };
}

// 主函数
async function main() {
    try {
        if (!USER_TOKEN) {
            console.error('请设置 FEISHU_USER_TOKEN 环境变量');
            process.exit(1);
        }
        
        const result = await generateDailyReportDraft();
        
        if (!result.hasEvents) {
            console.log('\n' + result.message);
            return;
        }
        
        console.log('📋 日报草稿已生成\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(result.markdown);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        if (result.existingDoc) {
            console.log(`⚠️ 注意：今天已存在日报文档 [${result.existingDoc.name}]`);
            console.log('如需覆盖，请删除旧文档后再确认\n');
        }
        
        console.log('📊 统计:');
        console.log(`   - 今日日程: ${result.events} 个`);
        console.log(`   - 任务分类: ${result.categories.join(', ')}`);
        console.log(`   - 文档标题: ${result.title}`);
        console.log('\n💡 请确认内容后，我将写入日报文件夹');
        
        // 导出结果供后续使用
        global.dailyReportData = {
            title: result.title,
            lines: result.lines,
            existingDocId: result.existingDoc?.token
        };
        
    } catch (error) {
        console.error('❌ 错误:', error.message);
        process.exit(1);
    }
}

// 写入日报（确认后调用）
async function writeDailyReport(title, lines) {
    try {
        const docId = await createDailyReportDoc(title, lines);
        const docUrl = `https://la7bax2jx4y.feishu.cn/docx/${docId}`;
        console.log(`✅ 日报已写入: ${docUrl}`);
        return docId;
    } catch (error) {
        console.error('❌ 写入失败:', error.message);
        throw error;
    }
}

// 删除旧日报（确认后调用）
async function deleteOldDailyReport(docId) {
    try {
        await axios.delete(`https://open.feishu.cn/open-apis/drive/v1/files/${docId}`, {
            headers: { 'Authorization': `Bearer ${USER_TOKEN}` }
        });
        console.log('✅ 已删除旧日报');
    } catch (error) {
        console.log('⚠️ 删除旧日报失败（可能权限不足）');
    }
}

module.exports = { 
    generateDailyReportDraft, 
    writeDailyReport, 
    deleteOldDailyReport,
    getTodayEvents
};

// 如果直接运行
if (require.main === module) {
    main();
}
