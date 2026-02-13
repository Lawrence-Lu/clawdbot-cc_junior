const axios = require('axios');

const USER_TOKEN = 'u-c_Flqz4rV4nEYUSqrqjmp25lgZiQk1WpMOaa7xU02cE5';
const CALENDAR_ID = 'feishu.cn_35vVohahIlPn19zxfHCxqb@group.calendar.feishu.cn';

// 任务分类器
function classifyTask(title) {
    const categories = {
        '数据加工': ['加工', '标签', '复刻', '指标', '指标表', '开发'],
        '数仓设计': ['数仓', '模型', '星型', 'DWT', 'DWS', '设计'],
        '数据质量': ['质量', '核验', '校验', '问题', '数据问题'],
        '产品库': ['产品库', '产品'],
        '会议沟通': ['沟通', '研讨', '讨论', '对齐', '会议'],
        '数据样例': ['样例', '数据样例', '样本'],
        '培训': ['培训'],
        '上链': ['上链'],
        '运维': ['运维'],
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
        for (const keyword of keywords) {
            if (title && title.includes(keyword)) return category;
        }
    }
    return '其他';
}

// 提取下一步计划
function extractNextSteps(content) {
    const lines = content.split('\n');
    const nextSteps = [];
    let inNextSection = false;
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.includes('下一步') || trimmed.includes('计划') || trimmed.includes('todo') || trimmed.includes('待办')) {
            inNextSection = true;
            continue;
        }
        if (inNextSection && trimmed.startsWith('•')) {
            nextSteps.push(trimmed.replace(/^•\s*/, ''));
        }
    }
    
    return nextSteps.length > 0 ? nextSteps : ['根据会议纪要推进'];
}

// 提取讨论结论/进度
function extractProgress(content) {
    const lines = content.split('\n');
    const progress = [];
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('•') && trimmed.length > 3) {
            progress.push(trimmed.replace(/^•\s*/, ''));
        }
    }
    
    return progress.length > 0 ? progress : ['完成相关讨论和工作'];
}

async function main() {
    console.log('📊 本周周报（2026年2月10日-12日）\n');
    console.log('='.repeat(70));
    
    // 本周数据
    const weekData = [
        {
            title: '准备数据和样例给到结果',
            date: '2月11日',
            category: '数据样例',
            progress: ['形成多维表格，包含需求说明、应用截图、样例数据样本、后端ES查询、开发脚本及预期查询结果'],
            nextSteps: ['明天完成输出']
        },
        {
            title: '开发民营企业指标表',
            date: '2月12日',
            category: '数据加工',
            progress: ['完成ads_private_enterprise_index_result结果表开发', '新增指标10字段及加工逻辑', '优化城市-年份矩阵生成逻辑，确保每个城市固定6条记录'],
            nextSteps: ['继续完善指标加工', '验证数据准确性']
        },
        {
            title: '工作日报',
            date: '2月11日',
            category: '其他',
            progress: ['完成日常工作'],
            nextSteps: ['按日报计划推进']
        }
    ];
    
    // 按分类整理
    const categories = {};
    weekData.forEach(item => {
        if (!categories[item.category]) {
            categories[item.category] = [];
        }
        categories[item.category].push(item);
    });
    
    // 第一部分：进度
    console.log('\n## 一、本周工作进度\n');
    for (const [category, items] of Object.entries(categories)) {
        console.log(`\n### ${category}\n`);
        items.forEach((item, idx) => {
            console.log(`${idx + 1}. **${item.title}**（${item.date}）`);
            item.progress.forEach(p => {
                console.log(`   - ${p}`);
            });
        });
    }
    
    // 第二部分：问题和风险
    console.log('\n\n## 二、问题与风险\n');
    console.log('本周暂无重大问题或风险。');
    console.log('- 需关注数据样例输出进度');
    console.log('- 指标加工逻辑需持续验证');
    
    // 第三部分：下一步计划
    console.log('\n\n## 三、下周工作计划\n');
    for (const [category, items] of Object.entries(categories)) {
        const allNextSteps = items.flatMap(i => i.nextSteps);
        if (allNextSteps.length > 0) {
            console.log(`\n### ${category}\n`);
            allNextSteps.forEach((step, idx) => {
                console.log(`${idx + 1}. ${step}`);
            });
        }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('\n✅ 周报生成完成！');
    console.log('📁 建议保存至: 产业信息平台 > 周报/日报夹 > 2026-02-12_周报');
}

main();
