#!/usr/bin/env node
/**
 * 日报生成 V2 - 优化流程
 * 使用方式: node daily_report_v2.js <user_token>
 */

const axios = require('axios');

// 配置
const CALENDAR_ID = 'feishu.cn_35vVohahIlPn19zxfHCxqb@group.calendar.feishu.cn';
const DAILY_FOLDER_TOKEN = 'OFPEf9ha0lEmQZdkj5vc5umUned';
let USER_TOKEN = process.argv[2] || process.env.FEISHU_USER_TOKEN;

if (!USER_TOKEN) {
  console.error('❌ 需要提供 User Token');
  console.error('用法: node daily_report_v2.js <token>');
  process.exit(1);
}

// 工具函数：延迟
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 1. 检查今天是否有日程
async function getTodayEvents() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const res = await axios.get(
    `https://open.feishu.cn/open-apis/calendar/v4/calendars/${encodeURIComponent(CALENDAR_ID)}/events`,
    {
      headers: { 'Authorization': `Bearer ${USER_TOKEN}` },
      params: {
        start_time: String(Math.floor(today.getTime() / 1000)),
        end_time: String(Math.floor(tomorrow.getTime() / 1000)),
        page_size: 100
      }
    }
  );
  
  if (res.data.code !== 0) {
    throw new Error(`获取日程失败: ${res.data.msg}`);
  }
  
  return res.data.data?.items || [];
}

// 2. 从日程描述中提取文档名称
function extractDocName(description) {
  if (!description) return null;
  
  // 匹配常见文档命名模式
  const patterns = [
    /《(.+?)》/,           // 《文档名》
    /"(.+?)"/,            // "文档名"
    /'(.+?)'/,             // '文档名'
    /文档[：:]\s*(.+?)(?:\n|$)/,  // 文档：xxx
    /纪要[：:]\s*(.+?)(?:\n|$)/,  // 纪要：xxx
    /记录[：:]\s*(.+?)(?:\n|$)/,  // 记录：xxx
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) return match[1].trim();
  }
  
  // 如果没匹配到，取描述第一行非空内容
  const firstLine = description.split('\n').find(l => l.trim());
  if (firstLine && firstLine.length < 50) return firstLine.trim();
  
  return null;
}

// 3. 搜索文档
async function searchDoc(docName) {
  if (!docName) return null;
  
  const res = await axios.post(
    'https://open.feishu.cn/open-apis/drive/v1/files/search',
    {
      search_key: docName,
      page_size: 10
    },
    {
      headers: {
        'Authorization': `Bearer ${USER_TOKEN}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (res.data.code !== 0) return null;
  
  const docs = res.data.data?.docs_entities || [];
  const today = new Date().toLocaleDateString('zh-CN');
  
  // 优先找今天创建的文档
  return docs.find(d => {
    const docDate = new Date(parseInt(d.created_time) * 1000).toLocaleDateString('zh-CN');
    return docDate === today && d.docs_type === 'docx';
  }) || docs[0];
}

// 4. 读取文档内容
async function readDoc(docToken) {
  if (!docToken) return null;
  
  try {
    const res = await axios.get(
      `https://open.feishu.cn/open-apis/docx/v1/documents/${docToken}/blocks`,
      {
        headers: { 'Authorization': `Bearer ${USER_TOKEN}` },
        params: { page_size: 500 }
      }
    );
    
    if (res.data.code !== 0) return null;
    
    const items = res.data.data.items;
    let content = '';
    
    items.forEach(block => {
      if (block.text?.elements) {
        content += block.text.elements.map(e => e.text_run?.content || '').join('') + '\n';
      }
      if (block.bullet?.elements) {
        content += '• ' + block.bullet.elements.map(e => e.text_run?.content || '').join('') + '\n';
      }
      if (block.heading1?.elements) {
        content += '# ' + block.heading1.elements.map(e => e.text_run?.content || '').join('') + '\n';
      }
      if (block.heading2?.elements) {
        content += '## ' + block.heading2.elements.map(e => e.text_run?.content || '').join('') + '\n';
      }
    });
    
    return content;
  } catch (error) {
    return null;
  }
}

// 5. 生成日报草稿
function generateDraft(events, contents) {
  const today = new Date().toLocaleDateString('zh-CN', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  }).replace(/\//g, '-');
  const weekday = new Date().toLocaleDateString('zh-CN', { weekday: 'long' });
  
  const lines = [];
  lines.push(`# 日报 - ${today}（${weekday}）`);
  lines.push('');
  lines.push('## 一、今日工作完成情况');
  lines.push('');
  
  if (events.length === 0) {
    lines.push('（今日无日程安排，请补充工作内容）');
  } else {
    events.forEach((event, index) => {
      const title = event.summary || '(无标题)';
      const content = contents[index];
      
      lines.push(`**${index + 1}. ${title}**`);
      lines.push('');
      
      if (content) {
        // 简单格式化会议纪要内容
        const summaryLines = content.split('\n').filter(l => l.trim() && !l.startsWith('@'));
        summaryLines.slice(0, 10).forEach(line => {  // 最多取10行
          lines.push(line.trim());
        });
        if (summaryLines.length > 10) {
          lines.push('...');
        }
      } else {
        lines.push('（无会议纪要，请补充）');
      }
      lines.push('');
    });
  }
  
  lines.push('## 二、问题与风险');
  lines.push('');
  lines.push('（请补充）');
  lines.push('');
  lines.push('## 三、明日计划');
  lines.push('');
  lines.push('（请补充）');
  lines.push('');
  lines.push('---');
  lines.push(`**提交时间：** ${today}`);
  
  return lines.join('\n');
}

// 6. 创建飞书文档
async function createDoc(title) {
  const res = await axios.post(
    'https://open.feishu.cn/open-apis/docx/v1/documents',
    {
      title: title,
      folder_token: DAILY_FOLDER_TOKEN
    },
    {
      headers: {
        'Authorization': `Bearer ${USER_TOKEN}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (res.data.code !== 0) {
    throw new Error(`创建文档失败: ${res.data.msg}`);
  }
  
  return res.data.data.document.document_id;
}

// 7. 写入文档内容
async function writeDoc(docId, content) {
  // 获取根块
  const blocksRes = await axios.get(
    `https://open.feishu.cn/open-apis/docx/v1/documents/${docId}/blocks`,
    {
      headers: { 'Authorization': `Bearer ${USER_TOKEN}` }
    }
  );
  
  const rootBlockId = blocksRes.data.data.items[0]?.block_id;
  
  // 分段添加内容
  const lines = content.split('\n');
  const children = lines.map(line => ({
    block_type: 2,
    text: { elements: [{ text_run: { content: line || ' ' } }] }
  }));
  
  // 分批添加
  const batchSize = 50;
  for (let i = 0; i < children.length; i += batchSize) {
    const batch = children.slice(i, i + batchSize);
    await axios.post(
      `https://open.feishu.cn/open-apis/docx/v1/documents/${docId}/blocks/${rootBlockId}/children`,
      { children: batch },
      {
        headers: {
          'Authorization': `Bearer ${USER_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
  }
  
  return `https://feishu.cn/docx/${docId}`;
}

// 主函数
async function main() {
  try {
    console.log('🚀 开始生成日报...\n');
    
    // 1. 获取今日日程
    console.log('📅 获取今日日程...');
    const events = await getTodayEvents();
    console.log(`   找到 ${events.length} 个日程\n`);
    
    // 2. 获取会议纪要
    console.log('📄 获取会议纪要...');
    const contents = [];
    
    for (const event of events) {
      const docName = extractDocName(event.description);
      if (docName) {
        console.log(`   查找: ${docName}`);
        const doc = await searchDoc(docName);
        if (doc) {
          console.log(`   ✓ 找到文档: ${doc.title}`);
          const content = await readDoc(doc.docs_token);
          contents.push(content);
        } else {
          console.log(`   ✗ 未找到文档`);
          contents.push(null);
        }
      } else {
        console.log(`   日程 "${event.summary}" 未包含文档名称`);
        contents.push(null);
      }
    }
    console.log('');
    
    // 3. 生成草稿
    console.log('📝 生成日报草稿...\n');
    const draft = generateDraft(events, contents);
    
    // 4. 创建文档（但不写入内容，等待确认）
    const today = new Date().toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    }).replace(/\//g, '-');
    
    console.log('📄 创建文档...');
    const docId = await createDoc(`${today}_日报`);
    const docUrl = `https://feishu.cn/docx/${docId}`;
    console.log(`   文档链接: ${docUrl}\n`);
    
    // 5. 保存草稿到临时文件
    const fs = require('fs');
    const path = require('path');
    const tempFile = path.join(__dirname, `.draft_${today}.txt`);
    fs.writeFileSync(tempFile, JSON.stringify({ docId, draft, events, contents }, null, 2));
    
    // 6. 输出结果
    console.log('✅ 日报草稿已生成！');
    console.log('');
    console.log('=== 日报草稿 ===');
    console.log(draft);
    console.log('');
    console.log('================');
    console.log('');
    console.log('📋 请确认以上日报内容');
    console.log('   - 回复 "确认" 直接写入飞书');
    console.log('   - 回复修改建议，我更新后再写入');
    console.log('   - 30分钟内未回复，我会提醒一次');
    console.log(`   - 文档链接: ${docUrl}`);
    console.log(`   - 临时文件: ${tempFile}`);
    
    return { docId, draft, docUrl, tempFile };
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

// 确认后写入的函数（单独调用）
async function confirmAndWrite(docId) {
  try {
    const fs = require('fs');
    const path = require('path');
    const today = new Date().toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    }).replace(/\//g, '-');
    const tempFile = path.join(__dirname, `.draft_${today}.txt`);
    
    if (!fs.existsSync(tempFile)) {
      console.error('❌ 找不到草稿文件，可能已过期');
      return;
    }
    
    const draft = JSON.parse(fs.readFileSync(tempFile, 'utf8'));
    
    console.log('📝 写入日报到飞书...');
    await writeDoc(docId || draft.docId, draft.draft);
    
    // 删除临时文件
    fs.unlinkSync(tempFile);
    
    console.log('✅ 日报已写入飞书！');
    console.log(`   链接: ${draft.docUrl}`);
    
  } catch (error) {
    console.error('❌ 写入失败:', error.message);
  }
}

// 命令行参数处理
const command = process.argv[3];
if (command === 'confirm') {
  confirmAndWrite(process.argv[4]);
} else {
  main();
}
