#!/usr/bin/env node
/**
 * 确认并写入日报
 * 使用方式: node daily_report_confirm.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const USER_TOKEN = process.argv[2];
const DAILY_FOLDER_TOKEN = 'OFPEf9ha0lEmQZdkj5vc5umUned';

if (!USER_TOKEN) {
  console.error('❌ 需要提供 User Token');
  process.exit(1);
}

async function main() {
  try {
    const today = new Date().toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    }).replace(/\//g, '-');
    
    const tempFile = path.join(__dirname, `.draft_${today}.txt`);
    
    if (!fs.existsSync(tempFile)) {
      console.error('❌ 找不到草稿文件');
      console.error('可能的原因：');
      console.error('   1. 今天还没有生成草稿');
      console.error('   2. 草稿已过期被清理');
      console.error('   3. 日期不对（检查系统时间）');
      process.exit(1);
    }
    
    console.log('📄 读取草稿文件...');
    const draft = JSON.parse(fs.readFileSync(tempFile, 'utf8'));
    
    console.log('📝 写入日报到飞书...');
    
    // 获取根块
    const blocksRes = await axios.get(
      `https://open.feishu.cn/open-apis/docx/v1/documents/${draft.docId}/blocks`,
      {
        headers: { 'Authorization': `Bearer ${USER_TOKEN}` }
      }
    );
    
    const rootBlockId = blocksRes.data.data.items[0]?.block_id;
    
    // 分段添加内容
    const lines = draft.draft.split('\n');
    const children = lines.map(line => ({
      block_type: 2,
      text: { elements: [{ text_run: { content: line || ' ' } }] }
    }));
    
    // 分批添加
    const batchSize = 50;
    for (let i = 0; i < children.length; i += batchSize) {
      const batch = children.slice(i, i + batchSize);
      await axios.post(
        `https://open.feishu.cn/open-apis/docx/v1/documents/${draft.docId}/blocks/${rootBlockId}/children`,
        { children: batch },
        {
          headers: {
            'Authorization': `Bearer ${USER_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    // 删除临时文件
    fs.unlinkSync(tempFile);
    
    console.log('✅ 日报已写入飞书！');
    console.log(`   链接: ${draft.docUrl}`);
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    if (error.response) {
      console.error('API 返回:', error.response.data);
    }
    process.exit(1);
  }
}

main();
