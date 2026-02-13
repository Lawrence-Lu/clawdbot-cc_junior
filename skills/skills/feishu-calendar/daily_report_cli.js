#!/usr/bin/env node
const { isWorkday, loadHolidays } = require('./holiday_checker');
const { generateDailyReportDraft, writeDailyReport } = require('./daily_report_draft');

async function main() {
    // 1. 检查是否是工作日
    const holidaysData = loadHolidays();
    const today = new Date().toISOString().split('T')[0];
    
    console.log('📅 检查今天是否是工作日...');
    console.log(`日期: ${today}`);
    
    if (!isWorkday(today, holidaysData)) {
        console.log('❌ 今天不是工作日（节假日或周末），跳过日报生成');
        process.exit(0);
    }
    
    console.log('✅ 今天是工作日，继续生成日报\n');
    
    // 2. 生成日报草稿
    try {
        const result = await generateDailyReportDraft();
        
        if (!result.hasEvents) {
            console.log('\n📭 今天没有日程');
            console.log('请告诉我今日工作进度、问题与风险、明日工作计划');
            process.exit(0);
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('📋 日报草稿已生成，请确认：');
        console.log('='.repeat(60) + '\n');
        console.log(result.markdown);
        console.log('\n' + '='.repeat(60));
        
        if (result.existingDoc) {
            console.log(`\n⚠️  注意：今天已存在日报 [${result.existingDoc.name}]`);
            console.log('如需覆盖，请删除旧文档后再确认');
        }
        
        console.log('\n💡 操作提示：');
        console.log('   - 回复 "确认"：直接写入日报文件夹');
        console.log('   - 回复 "修改：xxx"：按意见修改后再写入');
        console.log('   - 回复 "覆盖"：删除旧日报，写入新日报');
        
        // 保存结果到临时文件，等待确认
        const fs = require('fs');
        const path = require('path');
        const tempFile = path.join(__dirname, '.daily_report_pending.json');
        fs.writeFileSync(tempFile, JSON.stringify({
            title: result.title,
            lines: result.lines,
            existingDocId: result.existingDoc?.token,
            generatedAt: new Date().toISOString()
        }, null, 2));
        
        console.log('\n⏳ 等待确认...');
        
    } catch (error) {
        console.error('❌ 生成日报草稿失败:', error.message);
        process.exit(1);
    }
}

// 写入日报（确认后调用）
async function confirmAndWrite(overwrite = false) {
    const fs = require('fs');
    const path = require('path');
    const tempFile = path.join(__dirname, '.daily_report_pending.json');
    
    if (!fs.existsSync(tempFile)) {
        console.error('❌ 没有找到待写入的日报数据');
        process.exit(1);
    }
    
    const pending = JSON.parse(fs.readFileSync(tempFile, 'utf8'));
    
    // 如果需要覆盖，先删除旧文档
    if (overwrite && pending.existingDocId) {
        console.log('🗑️  删除旧日报...');
        const axios = require('axios');
        const USER_TOKEN = process.env.FEISHU_USER_TOKEN;
        try {
            await axios.delete(`https://open.feishu.cn/open-apis/drive/v1/files/${pending.existingDocId}`, {
                headers: { 'Authorization': `Bearer ${USER_TOKEN}` }
            });
            console.log('✅ 旧日报已删除');
        } catch (e) {
            console.log('⚠️  删除旧日报失败，继续写入新日报');
        }
    }
    
    // 写入新日报
    console.log('📝 写入日报...');
    const docId = await writeDailyReport(pending.title, pending.lines);
    
    // 删除临时文件
    fs.unlinkSync(tempFile);
    
    console.log('✅ 日报写入完成！');
    console.log(`📄 ${pending.title}`);
    console.log(`🔗 https://la7bax2jx4y.feishu.cn/docx/${docId}`);
}

// 命令行参数处理
const command = process.argv[2];

if (command === 'confirm') {
    confirmAndWrite(false).catch(console.error);
} else if (command === 'overwrite') {
    confirmAndWrite(true).catch(console.error);
} else {
    main().catch(console.error);
}
