const axios = require('axios');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const REDIRECT_URI = 'http://localhost:3000/callback';
const TOKEN_FILE = path.join(__dirname, '.user_token.json');

// 步骤1: 生成授权链接
function generateAuthUrl() {
    const state = Math.random().toString(36).substring(7);
    const authUrl = `https://open.feishu.cn/open-apis/authen/v1/index?app_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}`;
    return { authUrl, state };
}

// 步骤2: 启动本地服务器接收回调
function startCallbackServer(state) {
    return new Promise((resolve, reject) => {
        const server = http.createServer(async (req, res) => {
            const parsedUrl = url.parse(req.url, true);
            
            if (parsedUrl.pathname === '/callback') {
                const code = parsedUrl.query.code;
                const returnedState = parsedUrl.query.state;
                
                if (returnedState !== state) {
                    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end('<h1>错误: state 不匹配</h1>');
                    return;
                }
                
                if (!code) {
                    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end('<h1>错误: 没有获取到授权码</h1>');
                    return;
                }
                
                try {
                    // 用授权码换取 token
                    const tokenData = await exchangeCodeForToken(code);
                    
                    // 保存 token
                    fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokenData, null, 2));
                    
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(`
                        <h1>✅ 授权成功！</h1>
                        <p>User Token 已获取并保存</p>
                        <p>Token 有效期: ${tokenData.expire} 秒</p>
                        <p>可以关闭此页面，返回终端继续使用。</p>
                    `);
                    
                    server.close();
                    resolve(tokenData);
                } catch (error) {
                    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(`<h1>错误: ${error.message}</h1>`);
                    server.close();
                    reject(error);
                }
            }
        });
        
        server.listen(3000, () => {
            console.log('🌐 回调服务器已启动: http://localhost:3000');
        });
        
        // 5分钟超时
        setTimeout(() => {
            server.close();
            reject(new Error('授权超时（5分钟）'));
        }, 5 * 60 * 1000);
    });
}

// 步骤3: 用授权码换取 User Token
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

// 刷新 token
async function refreshToken(refreshToken) {
    const res = await axios.post('https://open.feishu.cn/open-apis/authen/v1/oidc/refresh_access_token', {
        grant_type: 'refresh_token',
        refresh_token: refreshToken
    });
    
    if (res.data.code !== 0) {
        throw new Error(`刷新 token 失败: ${res.data.msg}`);
    }
    
    return {
        access_token: res.data.data.access_token,
        refresh_token: res.data.data.refresh_token,
        expire: res.data.data.expire,
        obtained_at: Date.now()
    };
}

// 主流程
async function main() {
    console.log('🚀 飞书日历 User Token 获取工具\n');
    
    // 检查是否已有有效 token
    if (fs.existsSync(TOKEN_FILE)) {
        const tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
        const expired = Date.now() > (tokenData.obtained_at + tokenData.expire * 1000);
        
        if (!expired) {
            console.log('✅ 发现有效的 User Token');
            console.log(`Token: ${tokenData.access_token.substring(0, 20)}...`);
            console.log(`过期时间: ${new Date(tokenData.obtained_at + tokenData.expire * 1000).toLocaleString('zh-CN')}\n`);
            
            const readline = require('readline');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            
            rl.question('是否重新授权? (y/N): ', (answer) => {
                rl.close();
                if (answer.toLowerCase() === 'y') {
                    doAuth();
                } else {
                    console.log('使用现有 token');
                    process.exit(0);
                }
            });
            return;
        } else if (tokenData.refresh_token) {
            console.log('🔄 Token 已过期，尝试刷新...');
            try {
                const newToken = await refreshToken(tokenData.refresh_token);
                fs.writeFileSync(TOKEN_FILE, JSON.stringify(newToken, null, 2));
                console.log('✅ Token 刷新成功！');
                console.log(`新 Token: ${newToken.access_token.substring(0, 20)}...`);
                process.exit(0);
            } catch (error) {
                console.log('刷新失败，需要重新授权');
                doAuth();
            }
            return;
        }
    }
    
    doAuth();
}

async function doAuth() {
    const { authUrl, state } = generateAuthUrl();
    
    console.log('🔗 请在浏览器中打开以下链接进行授权:\n');
    console.log(authUrl);
    console.log('\n⏳ 等待授权完成...\n');
    
    try {
        const tokenData = await startCallbackServer(state);
        console.log('\n✅ 授权成功！');
        console.log(`Token: ${tokenData.access_token}`);
        console.log(`\nToken 已保存到: ${TOKEN_FILE}`);
        console.log('有效期: 2 小时');
    } catch (error) {
        console.error('\n❌ 授权失败:', error.message);
    }
}

main();
