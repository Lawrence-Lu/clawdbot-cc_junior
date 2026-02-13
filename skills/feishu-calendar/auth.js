const axios = require('axios');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const TOKEN_FILE = path.join(__dirname, '.user_token.json');

// 生成授权链接
function generateAuthUrl() {
    const redirectUri = 'https://open.feishu.cn/app/cli_a80c55c9cd325013/credentials';
    const state = Math.random().toString(36).substring(7);
    return `https://open.feishu.cn/open-apis/authen/v1/index?app_id=${APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
}

// 用授权码换取 token
async function exchangeCodeForToken(code) {
    const res = await axios.post('https://open.feishu.cn/open-apis/authen/v1/oidc/access_token', {
        grant_type: 'authorization_code',
        code: code
    }, {
        headers: {
            'Content-Type': 'application/json; charset=utf-8'
        }
    });
    
    if (res.data.code !== 0) {
        throw new Error(`换取 token 失败: ${res.data.msg}`);
    }
    
    return {
        access_token: res.data.data.access_token,
        refresh_token: res.data.data.refresh_token,
        expire: res.data.data.expire,
        obtained_at: Date.now()
    };
}

// 🔄 使用 refresh_token 续期
async function refreshToken(refreshToken) {
    console.log('🔄 正在使用 Refresh Token 续期...\n');
    
    const res = await axios.post('https://open.feishu.cn/open-apis/authen/v1/oidc/refresh_access_token', {
        grant_type: 'refresh_token',
        refresh_token: refreshToken
    }, {
        headers: {
            'Content-Type': 'application/json; charset=utf-8'
        }
    });
    
    if (res.data.code !== 0) {
        throw new Error(`续期失败: ${res.data.msg}`);
    }
    
    return {
        access_token: res.data.data.access_token,
        refresh_token: res.data.data.refresh_token,
        expire: res.data.data.expire,
        obtained_at: Date.now()
    };
}

// 检查并续期 token
async function ensureValidToken() {
    // 检查是否已有 token 文件
    if (!fs.existsSync(TOKEN_FILE)) {
        return { needAuth: true, token: null };
    }
    
    const tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
    const expiresAt = tokenData.obtained_at + tokenData.expire * 1000;
    const expired = Date.now() > expiresAt;
    
    if (!expired) {
        // Token 还有效
        const remainingMinutes = Math.floor((expiresAt - Date.now()) / 60000);
        console.log('✅ Token 仍然有效');
        console.log(`剩余有效期: ${remainingMinutes} 分钟\n`);
        return { needAuth: false, token: tokenData.access_token };
    }
    
    // Token 已过期，尝试刷新
    if (tokenData.refresh_token) {
        try {
            const newTokenData = await refreshToken(tokenData.refresh_token);
            fs.writeFileSync(TOKEN_FILE, JSON.stringify(newTokenData, null, 2));
            console.log('✅ Token 自动续期成功！');
            console.log(`新 Token: ${newTokenData.access_token.substring(0, 30)}...\n`);
            return { needAuth: false, token: newTokenData.access_token };
        } catch (error) {
            console.log(`⚠️  自动续期失败: ${error.message}`);
            console.log('需要重新授权\n');
            return { needAuth: true, token: null };
        }
    }
    
    return { needAuth: true, token: null };
}

// 引导用户授权
async function doAuth() {
    const authUrl = generateAuthUrl();
    
    console.log('请按以下步骤操作:\n');
    console.log('1️⃣  复制以下链接并在浏览器中打开:');
    console.log(`   ${authUrl}\n`);
    console.log('2️⃣  登录飞书并点击「授权」\n');
    console.log('3️⃣  授权后会跳转到调试工具页面');
    console.log('   查看页面 URL，找到 code=xxx 参数\n');
    console.log('   例如: https://open.feishu.cn/app/.../credentials?code=xxxx\n');
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    const code = await new Promise(resolve => {
        rl.question('4️⃣  请输入授权码 (code): ', resolve);
    });
    rl.close();
    
    if (!code || code.trim() === '') {
        console.error('❌ 授权码不能为空');
        return null;
    }
    
    console.log('\n🔄 正在换取 Token...\n');
    
    const tokenData = await exchangeCodeForToken(code.trim());
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokenData, null, 2));
    
    console.log('✅ 授权成功！\n');
    console.log(`Token: ${tokenData.access_token.substring(0, 30)}...`);
    console.log(`有效期: ${tokenData.expire} 秒 (约 ${Math.floor(tokenData.expire/60)} 分钟)\n`);
    console.log(`Token 已保存到: ${TOKEN_FILE}\n`);
    
    return tokenData.access_token;
}

// 主流程
async function main() {
    console.log('🚀 飞书日历 User Token 管理工具\n');
    console.log('本工具会自动续期 Token，无需每次重新授权\n');
    console.log('-'.repeat(50) + '\n');
    
    // 检查/续期 token
    const { needAuth, token } = await ensureValidToken();
    
    if (!needAuth) {
        console.log('\n现在你可以运行:');
        console.log('  node get_yesterday_v2.js');
        return;
    }
    
    // 需要重新授权
    const newToken = await doAuth();
    
    if (newToken) {
        console.log('\n现在你可以运行:');
        console.log('  node get_yesterday_v2.js');
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main();
}

// 导出函数供其他脚本使用
module.exports = {
    ensureValidToken,
    doAuth,
    TOKEN_FILE
};
