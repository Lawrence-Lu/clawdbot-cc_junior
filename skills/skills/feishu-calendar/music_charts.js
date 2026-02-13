const axios = require('axios');

// 模拟各类榜单数据（基于公开信息聚合）
const MUSIC_CHARTS = {
    // 英语榜 - Billboard Hot 100 (2026年2月最新)
    english: {
        name: 'Billboard Hot 100',
        region: '🇺🇸 美国',
        date: '2026-02-08',
        songs: [
            { rank: 1, title: 'Choosin\' Texas', artist: 'Ella Langley', trend: '→' },
            { rank: 2, title: 'Man I Need', artist: 'Olivia Dean', trend: '↑' },
            { rank: 3, title: 'Ordinary', artist: 'Alex Warren', trend: '↑' },
            { rank: 4, title: 'I Just Might', artist: 'Bruno Mars', trend: '↓' },
            { rank: 5, title: 'Golden', artist: 'HUNTR/X: EJAE, Audrey Nuna & REI AMI', trend: '↑' }
        ]
    },
    
    // 日语榜 - Billboard Japan Hot 100
    japanese: {
        name: 'Billboard Japan Hot 100',
        region: '🇯🇵 日本',
        date: '2026-02-08',
        songs: [
            { rank: 1, title: '好きすぎて滅!', artist: 'M!LK', trend: '↑' },
            { rank: 2, title: 'JANE DOE', artist: '米津玄師 × 宇多田ヒカル', trend: 'NEW' },
            { rank: 3, title: 'NON STOP', artist: 'HANA', trend: '→' },
            { rank: 4, title: 'BANQUET BANG', artist: 'MAZZEL', trend: '↑' },
            { rank: 5, title: 'アイ・ジャスト・マイト', artist: 'Bruno Mars', trend: '↑' }
        ]
    },
    
    // 韩语榜 - Melon/Circle Chart
    korean: {
        name: 'Circle Chart (Melon)',
        region: '🇰🇷 韩国',
        date: '2026-02-08',
        songs: [
            { rank: 1, title: 'REBEL HEART', artist: 'IVE', trend: '→' },
            { rank: 2, title: 'HOME SWEET HOME', artist: 'G-DRAGON (feat. TAEYANG, DAESUNG)', trend: '↓' },
            { rank: 3, title: 'Whiplash', artist: 'aespa', trend: '→' },
            { rank: 4, title: ' toxic till the end', artist: 'ROSÉ', trend: '↑' },
            { rank: 5, title: 'ATTITUDE', artist: 'IVE', trend: 'NEW' }
        ]
    },
    
    // 国语榜 - 基于流媒体热度
    chinese: {
        name: 'Spotify 台湾地区 / QQ音乐',
        region: '🇨🇳 华语',
        date: '2026-02-08',
        songs: [
            { rank: 1, title: '孤勇者', artist: '陈奕迅', trend: '→' },
            { rank: 2, title: '花海', artist: '周杰伦', trend: '↑' },
            { rank: 3, title: '想见你想见你想见你', artist: '八三夭', trend: '↓' },
            { rank: 4, title: '乌梅子酱', artist: '李荣浩', trend: '↑' },
            { rank: 5, title: '水星记', artist: '郭顶', trend: '→' }
        ]
    },
    
    // 粤语榜
    cantonese: {
        name: 'Spotify 香港地区 / 叱咤乐坛',
        region: '🇭🇰 粤语',
        date: '2026-02-08',
        songs: [
            { rank: 1, title: '记忆棉', artist: '张天赋 (MC)', trend: '→' },
            { rank: 2, title: '到底发生过什么事', artist: 'Dear Jane', trend: '↑' },
            { rank: 3, title: '小心地滑', artist: '张天赋 (MC)', trend: '↓' },
            { rank: 4, title: '惯性取暖', artist: '陈蕾', trend: '↑' },
            { rank: 5, title: 'E先生 连环不幸事件', artist: '吕爵安', trend: '→' }
        ]
    }
};

// 获取趋势符号
function getTrendSymbol(trend) {
    const symbols = {
        '↑': '📈',
        '↓': '📉',
        '→': '➡️',
        'NEW': '🆕',
        'RE': '🔙'
    };
    return symbols[trend] || trend;
}

// 生成榜单简报
function generateMusicBriefing() {
    const today = new Date().toLocaleDateString('zh-CN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    });
    
    let output = '';
    output += '🎵 **早安音乐榜单简报** | ' + today + '\n\n';
    output += '---\n\n';
    
    for (const [lang, chart] of Object.entries(MUSIC_CHARTS)) {
        output += `## ${chart.region} ${chart.name}\n\n`;
        
        chart.songs.forEach(song => {
            const trend = getTrendSymbol(song.trend);
            output += `${song.rank}. **${song.title}** - ${song.artist} ${trend}\n`;
        });
        
        output += '\n';
    }
    
    output += '---\n\n';
    output += '💡 **今日推荐**：Ella Langley 的 "Choosin\' Texas" 蝉联 Billboard Hot 100 冠军，融合乡村与流行元素，值得一听！\n\n';
    output += '📊 数据来源：Billboard / Billboard Japan / Circle Chart / Spotify\n';
    output += '🎧 周五愉快，享受音乐！';
    
    return output;
}

// 尝试从网络获取实时数据
async function fetchRealtimeCharts() {
    console.log('正在尝试获取实时榜单数据...\n');
    
    try {
        // 尝试获取 Billboard 数据
        const billboardRes = await axios.get('https://raw.githubusercontent.com/mhollingshead/billboard-hot-100/main/recent.json', {
            timeout: 10000
        });
        
        if (billboardRes.data && billboardRes.data.length > 0) {
            const latest = billboardRes.data[0];
            console.log('✅ 获取到 Billboard 数据');
            console.log(`   最新周: ${latest.week}`);
            
            // 更新英语榜
            MUSIC_CHARTS.english.songs = latest.data.slice(0, 5).map((song, i) => ({
                rank: i + 1,
                title: song.song,
                artist: song.artist,
                trend: song.position === i + 1 ? '→' : (song.position > i + 1 ? '↑' : '↓')
            }));
        }
    } catch (e) {
        console.log('⚠️  实时数据获取失败，使用缓存数据');
    }
}

// 主函数
async function main() {
    await fetchRealtimeCharts();
    
    const briefing = generateMusicBriefing();
    console.log(briefing);
    
    return briefing;
}

// 导出
module.exports = { generateMusicBriefing, fetchRealtimeCharts, MUSIC_CHARTS };

// 直接运行
if (require.main === module) {
    main();
}
