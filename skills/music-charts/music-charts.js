const axios = require('axios');

// 音乐榜单配置
const CHARTS_CONFIG = {
    // 输出顺序：英语 → 粤语 → 华语 → 日语 → 韩语
    order: ['english', 'cantonese', 'chinese', 'japanese', 'korean'],
    
    charts: {
        english: {
            name: 'Billboard Hot 100',
            region: '🇺🇸 英语榜',
            flag: '🇺🇸',
            source: 'Billboard'
        },
        cantonese: {
            name: 'Spotify 香港 / 叱咤乐坛',
            region: '🇭🇰 粤语榜',
            flag: '🇭🇰',
            source: 'Spotify'
        },
        chinese: {
            name: 'Spotify 台湾 / QQ音乐',
            region: '🇨🇳 华语榜',
            flag: '🇨🇳',
            source: 'Spotify/QQ音乐'
        },
        japanese: {
            name: 'Billboard Japan Hot 100',
            region: '🇯🇵 日语榜',
            flag: '🇯🇵',
            source: 'Billboard Japan'
        },
        korean: {
            name: 'Circle Chart / Melon',
            region: '🇰🇷 韩语榜',
            flag: '🇰🇷',
            source: 'Circle Chart'
        }
    }
};

// 榜单数据（支持实时更新）
let MUSIC_DATA = {
    english: {
        songs: [
            { rank: 1, title: "Choosin' Texas", artist: 'Ella Langley', trend: '→', hot: true },
            { rank: 2, title: 'Man I Need', artist: 'Olivia Dean', trend: '↑', hot: false },
            { rank: 3, title: 'Ordinary', artist: 'Alex Warren', trend: '↑', hot: false },
            { rank: 4, title: 'I Just Might', artist: 'Bruno Mars', trend: '↓', hot: true },
            { rank: 5, title: 'Golden', artist: 'HUNTR/X: EJAE, Audrey Nuna & REI AMI', trend: '↑', hot: false }
        ]
    },
    cantonese: {
        songs: [
            { rank: 1, title: '记忆棉', artist: '张天赋 (MC)', trend: '→', hot: true },
            { rank: 2, title: '到底发生过什么事', artist: 'Dear Jane', trend: '↑', hot: false },
            { rank: 3, title: '小心地滑', artist: '张天赋 (MC)', trend: '↓', hot: false },
            { rank: 4, title: '惯性取暖', artist: '陈蕾', trend: '↑', hot: false },
            { rank: 5, title: 'E先生 连环不幸事件', artist: '吕爵安', trend: '→', hot: false }
        ]
    },
    chinese: {
        songs: [
            { rank: 1, title: '孤勇者', artist: '陈奕迅', trend: '→', hot: true },
            { rank: 2, title: '花海', artist: '周杰伦', trend: '↑', hot: false },
            { rank: 3, title: '想见你想见你想见你', artist: '八三夭', trend: '↓', hot: false },
            { rank: 4, title: '乌梅子酱', artist: '李荣浩', trend: '↑', hot: true },
            { rank: 5, title: '水星记', artist: '郭顶', trend: '→', hot: false }
        ]
    },
    japanese: {
        songs: [
            { rank: 1, title: '好きすぎて滅!', artist: 'M!LK', trend: '↑', hot: false },
            { rank: 2, title: 'JANE DOE', artist: '米津玄師 × 宇多田ヒカル', trend: 'NEW', hot: true },
            { rank: 3, title: 'NON STOP', artist: 'HANA', trend: '→', hot: false },
            { rank: 4, title: 'BANQUET BANG', artist: 'MAZZEL', trend: '↑', hot: false },
            { rank: 5, title: 'アイ・ジャスト・マイト', artist: 'Bruno Mars', trend: '↑', hot: false }
        ]
    },
    korean: {
        songs: [
            { rank: 1, title: 'REBEL HEART', artist: 'IVE', trend: '→', hot: true },
            { rank: 2, title: 'HOME SWEET HOME', artist: 'G-DRAGON (feat. TAEYANG, DAESUNG)', trend: '↓', hot: true },
            { rank: 3, title: 'Whiplash', artist: 'aespa', trend: '→', hot: false },
            { rank: 4, title: 'toxic till the end', artist: 'ROSÉ', trend: '↑', hot: false },
            { rank: 5, title: 'ATTITUDE', artist: 'IVE', trend: 'NEW', hot: false }
        ]
    }
};

// 趋势符号
const TREND_SYMBOLS = {
    '↑': '📈',
    '↓': '📉',
    '→': '➡️',
    'NEW': '🆕',
    'RE': '🔙'
};

// 智能推荐算法
function generateRecommendations() {
    const allSongs = [];
    
    // 收集所有歌曲
    for (const [lang, data] of Object.entries(MUSIC_DATA)) {
        data.songs.forEach(song => {
            allSongs.push({
                ...song,
                lang: CHARTS_CONFIG.charts[lang].region,
                langKey: lang
            });
        });
    }
    
    // 筛选推荐（按热度、趋势、话题性）
    const recommendations = [];
    
    // 1. 新歌推荐（NEW 标记）
    const newSongs = allSongs.filter(s => s.trend === 'NEW');
    if (newSongs.length > 0) {
        const pick = newSongs[0];
        recommendations.push({
            ...pick,
            reason: `本周新上榜！${pick.artist} 的全新力作，值得关注。`
        });
    }
    
    // 2. 冠军连冠推荐
    const champions = allSongs.filter(s => s.rank === 1 && s.trend === '→');
    if (champions.length > 0) {
        const pick = champions[Math.floor(Math.random() * champions.length)];
        if (!recommendations.find(r => r.title === pick.title)) {
            recommendations.push({
                ...pick,
                reason: `蝉联冠军！这首${pick.lang}歌曲持续霸榜，热度不减。`
            });
        }
    }
    
    // 3. 跨语言热门（同一歌手多语言出现）
    const brunoSongs = allSongs.filter(s => s.artist.includes('Bruno Mars'));
    if (brunoSongs.length >= 2) {
        recommendations.push({
            ...brunoSongs[0],
            reason: `跨语言热门！Bruno Mars 同时在英语榜和日语榜进入前5，全球影响力可见一斑。`
        });
    }
    
    // 4. 快速上升歌曲
    if (recommendations.length < 3) {
        const rising = allSongs.filter(s => s.trend === '↑' && !recommendations.find(r => r.title === s.title));
        if (rising.length > 0) {
            const pick = rising[Math.floor(Math.random() * rising.length)];
            recommendations.push({
                ...pick,
                reason: `上升趋势明显！本周排名上涨，后劲十足。`
            });
        }
    }
    
    // 5. 本地热门（华语/粤语）
    if (recommendations.length < 3) {
        const localSongs = allSongs.filter(s => 
            (s.langKey === 'chinese' || s.langKey === 'cantonese') && 
            s.rank <= 2 && 
            !recommendations.find(r => r.title === s.title)
        );
        if (localSongs.length > 0) {
            const pick = localSongs[0];
            recommendations.push({
                ...pick,
                reason: `本地热度冠军！${pick.lang}榜首，值得一听。`
            });
        }
    }
    
    return recommendations.slice(0, 3);
}

// 生成榜单简报
function generateMusicBriefing() {
    const today = new Date().toLocaleDateString('zh-CN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    });
    
    // 根据时间生成问候语
    const hour = new Date().getHours();
    let greeting = '早安';
    if (hour < 6) greeting = '凌晨好';
    else if (hour < 9) greeting = '早安';
    else if (hour < 12) greeting = '上午好';
    else if (hour < 14) greeting = '中午好';
    else if (hour < 18) greeting = '下午好';
    else greeting = '晚上好';
    
    let output = `🎵 **${greeting}！今日音乐榜单** | ${today}\n\n`;
    
    // 按配置顺序输出榜单
    for (const langKey of CHARTS_CONFIG.order) {
        const config = CHARTS_CONFIG.charts[langKey];
        const data = MUSIC_DATA[langKey];
        
        output += `**${config.region}** (${config.source})\n\n`;
        
        data.songs.forEach(song => {
            const trend = TREND_SYMBOLS[song.trend] || song.trend;
            output += `${song.rank}. **${song.title}** - ${song.artist} ${trend}\n`;
        });
        
        output += '\n';
    }
    
    // 特别推荐
    const recommendations = generateRecommendations();
    if (recommendations.length > 0) {
        output += '---\n\n';
        output += '💡 **今日特别推荐**\n\n';
        
        recommendations.forEach((rec, idx) => {
            output += `${idx + 1}. **${rec.title}** - ${rec.artist} (${rec.lang})\n`;
            output += `   📌 ${rec.reason}\n\n`;
        });
    }
    
    output += '---\n';
    output += '🎧 数据来源：Billboard / Billboard Japan / Circle Chart / Spotify\n';
    output += '☕ 早安！祝你今天有好音乐陪伴~';
    
    return output;
}

// 尝试获取实时数据
async function fetchRealtimeData() {
    try {
        // 尝试获取 Apple Music 中国大陆数据
        const appleRes = await axios.get('https://rss.applemarketingtools.com/api/v2/cn/music/most-played/10/songs.json', {
            timeout: 10000
        });
        
        if (appleRes.data?.feed?.results) {
            // 更新华语榜
            MUSIC_DATA.chinese.songs = appleRes.data.feed.results.slice(0, 5).map((song, i) => ({
                rank: i + 1,
                title: song.name,
                artist: song.artistName,
                trend: i < 3 ? '→' : '↑',
                hot: i === 0
            }));
            console.log('✅ 已更新华语榜实时数据');
        }
    } catch (e) {
        console.log('⚠️ 实时数据获取失败，使用缓存数据');
    }
}

// 主函数
async function main() {
    console.log('🎵 正在生成今日音乐榜单...\n');
    
    await fetchRealtimeData();
    
    const briefing = generateMusicBriefing();
    console.log(briefing);
    
    return briefing;
}

// 导出
module.exports = { 
    generateMusicBriefing, 
    fetchRealtimeData, 
    generateRecommendations,
    MUSIC_DATA,
    CHARTS_CONFIG
};

// 直接运行
if (require.main === module) {
    main();
}
