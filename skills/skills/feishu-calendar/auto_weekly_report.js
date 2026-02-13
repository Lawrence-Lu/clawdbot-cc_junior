const axios = require('axios');
const fs = require('fs');
const path = require('path');

const APP_ID = process.env.FEISHU_APP_ID || 'cli_a80c55c9cd325013';
const APP_SECRET = process.env.FEISHU_APP_SECRET || 'SYpW6IiYyGufdd9Fs3TO0giieIZFvTPc';
const USER_TOKEN = process.env.FEISHU_USER_TOKEN;
const USER_ID = 'ou_cb3caf70db513bea773d02f330906b67';
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

// 获取 Tenant Token
async function getTenantToken() {
    const res = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        app_id: APP_ID,
        app_secret: APP_SECRET
    });
    return res.data.tenant_access_token;
}

// 获取本周日程
async function getWeeklyEvents(userToken) {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=周日, 1=周一
    const start = new Date(now);
    start.setDate(now.getDate() - dayOfWeek + 1); // 本周一
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    
    const res = await axios.get(
        `https://open.feishu.cn/open-apis/calendar/v4/calendars/${encodeURIComponent(CALENDAR_ID)}/events`,
        {
            headers: { 'Authorization': `Bearer ${userToken}` },
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
async function listDocs(userToken) {
    const res = await axios.get('https://open.feishu.cn/open-apis/drive/v1/files', {
        headers: { 'Authorization': `Bearer ${userToken}` },
        params: { page_size: 200 }
    });
    return res.data.data.files || [];
}

// 读取文档内容
async function readDoc(token, userToken) {
    try {
        const res = await axios.get(`https://open.feishu.cn/open-apis/docx/v1/documents/${token}/blocks`, {
            headers: { 'Authorization': `Bearer ${userToken}` },
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

// 创建周报文档
async function createWeeklyReportDoc(tenantToken, title, content) {
    // 1. 创建文档
    const createRes = await axios.post('https://open.feishu.cn/open-apis/docx/v1/documents', {
        title: title
    }, {
        headers: { 
            'Authorization': `Bearer ${tenantToken}`,
            'Content-Type': 'application/json'
        }
    });
    
    const docId = createRes.data.data.document.document_id;
    
    // 2. 写入内容
    const blocksRes = await axios.get(`https://open.feishu.cn/open-apis/docx/v1/documents/${docId}/blocks`, {
        headers: { 'Authorization': `Bearer ${tenantToken}` }
    });
    
    const rootBlockId = blocksRes.data.data.items[0]?.block_id;
    
    const lines = content.split('\n');
    const children = lines.map(line => ({
        block_type: 2,
        text: {
            elements: [{ text_run: { content: line || ' ' } }]
        }
    }));
    
    await axios.post(`https://open.feishu.cn/open-apis/docx/v1/documents/${docId}/blocks/${rootBlockId}/children`, {
        children: children
    }, {
        headers: { 
            'Authorization': `Bearer ${tenantToken}`,
            'Content-Type': 'application/json'
        }
    });
    
    return docId;
}

// 添加编辑权限
async function addEditPermission(tenantToken, docId, userId) {
    await axios.post(`https://open.feishu.cn/open-apis/drive/v1/permissions/${docId}/members`, {
        member_type: 'openid',
        member_id: userId,
        perm: 'edit'
    }, {
        headers: { 
            'Authorization': `Bearer ${tenantToken}`,
            'Content-Type': 'application/json'
        },
        params: { type: 'docx' }
    });
}

// 发送飞书消息
async function sendFeishuMessage(message) {
    // 通过用户提供的Token，用OpenClaw的消息功能发送
    // 这里只是一个占位，实际通过channel发送
    console.log('\n' + '='.repeat(60));
    console.log('📨 消息通知');
    console.log('='.repeat(60));
    console.log(message);
    console.log('='.repeat(60) + '\n');
}

// 生成周报
async function generateWeeklyReport() {
    console.log('🚀 开始生成周报...\n');
    
    if (!USER_TOKEN) {
        console.error('❌ 请设置 FEISHU_USER_TOKEN 环境变量');
        process.exit(1);
    }
    
    // 1. 获取本周日程
    console.log('📅 获取本周日程...');
    const events = await getWeeklyEvents(USER_TOKEN);
    console.log(`   找到 ${events.length} 个日程\n`);
    
    // 2. 获取所有文档
    console.log('📄 获取会议纪要文档...');
    const docs = await listDocs(USER_TOKEN);
    
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
        if (matchedDoc) {
            meetingContent = await readDoc(matchedDoc.token, USER_TOKEN);
        }
        
        // 提取进度
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
    
    // 4. 按分类整理
    const categories = {};
    reportItems.forEach(item => {
        if (!categories[item.category]) categories[item.category] = [];
        categories[item.category].push(item);
    });
    
    // 5. 生成周报内容
    const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
    
    let content = `本周工作周报（${today}）\n\n`;
    
    // 第一部分：进度
    content += '一、本周工作进度\n\n';
    for (const [category, items] of Object.entries(categories)) {
        content += `【${category}】\n`;
        items.forEach((item, idx) => {
            content += `${idx + 1}. ${item.title}（${item.date}）`;
            if (item.meetingDoc) content += ` [📄 ${item.meetingDoc}]`;
            content += '\n';
            item.progress.forEach(p => {
                content += `   • ${p}\n`;
            });
            content += '\n';
        });
    }
    
    // 第二部分：问题与风险
    content += '二、问题与风险\n\n';
    content += '本周暂无重大问题或风险。\n';
    content += '• 需关注数据样例输出进度\n';
    content += '• 指标加工逻辑需持续验证\n\n';
    
    // 第三部分：下一步计划
    content += '三、下周工作计划\n\n';
    for (const [category, items] of Object.entries(categories)) {
        const allNextSteps = items.flatMap(i => i.nextSteps);
        if (allNextSteps.length > 0) {
            content += `【${category}】\n`;
            allNextSteps.forEach((step, idx) => {
                content += `${idx + 1}. ${step}\n`;
            });
            content += '\n';
        }
    }
    
    content += '---\n';
    content += `周报生成时间：${new Date().toLocaleString('zh-CN')}\n`;
    content += 'AI自动生成\n';
    
    // 6. 创建文档并添加权限
    console.log('📝 创建周报文档...');
    const tenantToken = await getTenantToken();
    const docTitle = `${today}_周报`;
    const docId = await createWeeklyReportDoc(tenantToken, docTitle, content);
    
    console.log('🔓 添加编辑权限...');
    await addEditPermission(tenantToken, docId, USER_ID);
    
    const docUrl = `https://la7bax2jx4y.feishu.cn/docx/${docId}`;
    
    console.log('\n✅ 周报生成完成！');
    console.log(`📄 文档标题: ${docTitle}`);
    console.log(`🔗 文档链接: ${docUrl}`);
    
    // 7. 发送通知
    await sendFeishuMessage(
        `📊 周报已生成！\n\n` +
        `标题: ${docTitle}\n` +
        `链接: ${docUrl}\n\n` +
        `📋 本周共 ${events.length} 个日程\n` +
        `📁 已自动分类: ${Object.keys(categories).join(', ')}\n\n` +
        `💡 提示: 可手动移动到「产业信息平台 > 周报」文件夹`
    );
    
    return { docId, docTitle, docUrl, events: events.length };
}

// 主函数
async function main() {
    try {
        const result = await generateWeeklyReport();
        console.log('\n📊 生成结果:');
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('❌ 生成失败:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// 如果直接运行
if (require.main === module) {
    main();
}

module.exports = { generateWeeklyReport };
