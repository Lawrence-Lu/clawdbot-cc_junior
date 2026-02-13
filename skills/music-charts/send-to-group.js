#!/usr/bin/env node
/**
 * 早安音乐榜单推送脚本
 * 发送到「随便唠唠」群
 */

const { generateMusicBriefing } = require('./music-charts');

// 飞书群聊配置
const TARGET_GROUP_NAME = '随便唠唠';

async function sendToFeishuGroup(content) {
    // 输出到控制台，OpenClaw会通过channel路由到飞书
    console.log(content);
    return true;
}

async function main() {
    try {
        // 生成榜单内容
        const briefing = await generateMusicBriefing();
        
        // 发送到飞书群
        await sendToFeishuGroup(briefing);
        
        console.log('\n✅ 榜单已生成');
        console.log(`📱 发送目标: ${TARGET_GROUP_NAME}群`);
        
    } catch (error) {
        console.error('❌ 发送失败:', error.message);
        process.exit(1);
    }
}

main();
