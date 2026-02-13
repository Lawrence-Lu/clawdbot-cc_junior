const axios = require('axios');

const USER_TOKEN = 'u-c_Flqz4rV4nEYUSqrqjmp25lgZiQk1WpMOaa7xU02cE5';
const CALENDAR_ID = 'feishu.cn_35vVohahIlPn19zxfHCxqb@group.calendar.feishu.cn';

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

// 获取所有文档
async function listDocs() {
    const res = await axios.get('https://open.feishu.cn/open-apis/drive/v1/files', {
        headers: { 'Authorization': `Bearer ${USER_TOKEN}` },
        params: { page_size: 200 }
    });
    return res.data.data.files || [];
}

// 读取文档内容
async function readDoc(token) {
    try {
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
    } catch (error) {
        return '';
    }
}

// 生成本周周报
async function generateWeeklyReport() {
    console.log('🚀 开始生成本周周报...\n');
    
    const events = await getWeeklyEvents();
    const docs = await listDocs();
    
    console.log(`📅 本周共 ${events.length} 个日程\n`);
    
    // 处理每个日程
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
        if (matchedDoc) {
            meetingContent = await readDoc(matchedDoc.token);
        }
        
        // 提取进度和下一步
        const progress = meetingContent ? 
            meetingContent.split('\n').filter(l => l.trim().startsWith('•') && l.length > 5).map(l => l.trim().replace(/^•\s*/, '')) :
            ['完成相关讨论和工作'];
        
        const nextSteps = meetingContent.toLowerCase().includes('下一步') || meetingContent.includes('计划') ?
            ['按计划推进'] : ['继续跟进相关工作'];
        
        reportItems.push({
            title,
            date,
            category,
            progress,
            nextSteps,
            meetingDoc: matchedDoc?.name || null
        });
    }
    
    // 按分类整理
    const categories = {};
    reportItems.forEach(item => {
        if (!categories[item.category]) categories[item.category] = [];
        categories[item.category].push(item);
    });
    
    // 生成周报内容
    let report = '# 本周工作周报（2026年2月10日-12日）\n\n';
    
    // 第一部分：进度
    report += '## 一、本周工作进度\n\n';
    for (const [category, items] of Object.entries(categories)) {
        report += `### ${category}\n\n`;
        items.forEach((item, idx) => {
            report += `${idx + 1}. **${item.title}**（${item.date}）`;
            if (item.meetingDoc) report += ` [📄 ${item.meetingDoc}]`;
            report += '\n';
            item.progress.forEach(p => {
                report += `   - ${p}\n`;
            });
            report += '\n';
        });
    }
    
    // 第二部分：问题与风险
    report += '## 二、问题与风险\n\n';
    report += '本周暂无重大问题或风险。\n\n';
    report += '- 需关注数据样例输出进度\n';
    report += '- 指标加工逻辑需持续验证\n\n';
    
    // 第三部分：下一步计划
    report += '## 三、下周工作计划\n\n';
    for (const [category, items] of Object.entries(categories)) {
        const allNextSteps = items.flatMap(i => i.nextSteps);
        if (allNextSteps.length > 0) {
            report += `### ${category}\n\n`;
            allNextSteps.forEach((step, idx) => {
                report += `${idx + 1}. ${step}\n`;
            });
            report += '\n';
        }
    }
    
    report += '---\n';
    report += '*周报生成时间：' + new Date().toLocaleString('zh-CN') + '*\n';
    
    console.log(report);
    console.log('='.repeat(70));
    console.log('\n✅ 周报生成完成！');
    console.log('📁 建议保存至: 产业信息平台 > 周报/日报夹 > 2026-02-12_周报');
    
    return report;
}

generateWeeklyReport().catch(console.error);
