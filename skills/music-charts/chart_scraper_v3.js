#!/usr/bin/env node
/**
 * 音乐榜单实时抓取器 v3.1 - Playwright 版
 * 使用真实浏览器抓取动态页面
 * 抓取失败则标注"抓取失败"，不使用历史数据
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  japanese: {
    name: '🇯🇵 Billboard Japan Hot 100',
    url: 'https://billboard-japan.com/charts/detail?a=hot100',
    enabled: true
  },
  english: {
    name: '🇺🇸 Billboard Hot 100',
    url: 'https://www.billboard.com/charts/hot-100/',
    enabled: true
  },
  chinese: {
    name: '🇨🇳 华语新歌流行榜',
    source: 'bocha-search',
    enabled: true
  },
  cantonese: {
    name: '🇭🇰 903专业推介',
    url: 'https://www.lemonmusic.com.hk/chart.htm',
    enabled: true
  }
};

// 工具函数：使用 Playwright 抓取动态页面
async function fetchWithPlaywright(url) {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // 使用更宽松的加载策略
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);
    
    const content = await page.content();
    await browser.close();
    
    return content;
  } catch (error) {
    if (browser) await browser.close();
    throw error;
  }
}

// ========== 🇯🇵 日语榜：Billboard Japan ==========
async function fetchJapaneseChart() {
  console.log('\n🎵 抓取日语榜 (Playwright)...');
  
  try {
    const html = await fetchWithPlaywright(CONFIG.japanese.url);
    
    // 解析榜单
    const songs = [];
    const lines = html.split('\n').map(l => l.trim()).filter(l => l);
    
    for (let i = 0; i < lines.length && songs.length < 5; i++) {
      const line = lines[i];
      
      if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(line) && 
          line.length < 50 && 
          !line.includes('<') &&
          !line.includes('function') &&
          !line.startsWith('チャートイン') &&
          !line.startsWith('前回') &&
          !line.startsWith('総合ポイント') &&
          !line.startsWith('全国推定売上')) {
        
        let artist = 'Unknown';
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const nextLine = lines[j];
          if (nextLine.includes('artists/detail/')) {
            const artistMatch = nextLine.match(/\[([^\]]+)\]/);
            if (artistMatch) {
              artist = artistMatch[1];
              break;
            }
          }
          if (nextLine.length < 30 && 
              !nextLine.includes('<') && 
              (nextLine.includes('、') || /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(nextLine))) {
            artist = nextLine;
            break;
          }
        }
        
        songs.push({ rank: songs.length + 1, title: line, artist });
      }
    }
    
    if (songs.length < 5) {
      throw new Error(`只提取到 ${songs.length} 首歌曲`);
    }
    
    return {
      name: CONFIG.japanese.name,
      date: new Date().toLocaleDateString('zh-CN'),
      songs: songs.slice(0, 5),
      success: true
    };
  } catch (error) {
    console.log(`   ❌ 抓取失败: ${error.message}`);
    return {
      name: CONFIG.japanese.name,
      error: '抓取失败',
      success: false
    };
  }
}

// ========== 🇺🇸 英语榜：Billboard Hot 100 ==========
async function fetchEnglishChart() {
  console.log('\n🎵 抓取英语榜 (Playwright)...');
  
  try {
    const html = await fetchWithPlaywright(CONFIG.english.url);
    
    const songs = [];
    const titleMatches = html.match(/title-of-a-story[^\u003e]*\u003e([^\u003c]+)/gi);
    
    if (titleMatches && titleMatches.length >= 5) {
      for (let i = 0; i < 5; i++) {
        const title = titleMatches[i].replace(/.*\u003e/, '').trim();
        if (title && title !== 'Songwriter(s)' && title !== 'Producer(s)') {
          songs.push({ rank: songs.length + 1, title, artist: 'Unknown' });
        }
      }
    }
    
    if (songs.length < 5) {
      throw new Error(`只提取到 ${songs.length} 首歌曲`);
    }
    
    return {
      name: CONFIG.english.name,
      date: 'Week of ' + new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      songs: songs.slice(0, 5),
      success: true
    };
  } catch (error) {
    console.log(`   ❌ 抓取失败: ${error.message}`);
    return {
      name: CONFIG.english.name,
      error: '抓取失败',
      success: false
    };
  }
}

// ========== 🇨🇳 华语榜 ==========
async function fetchChineseChart() {
  console.log('\n🎵 抓取华语榜...');
  
  console.log('   ❌ 抓取失败: 暂无稳定数据源');
  return {
    name: CONFIG.chinese.name,
    error: '抓取失败 - 暂无稳定数据源',
    success: false
  };
}

// ========== 🇭🇰 粤语榜 ==========
async function fetchCantoneseChart() {
  console.log('\n🎵 抓取粤语榜 (Playwright)...');
  
  try {
    const html = await fetchWithPlaywright(CONFIG.cantonese.url);
    
    const songs = [];
    const tableMatch = html.match(/<table[^\u003e]*>[\s\S]*?<\/table>/i);
    
    if (tableMatch) {
      const rows = tableMatch[0].match(/<tr[^\u003e]*>[\s\S]*?<\/tr>/gi);
      if (rows) {
        for (let i = 1; i < rows.length && songs.length < 5; i++) {
          const cells = rows[i].match(/<td[^\u003e]*>([\s\S]*?)<\/td>/gi);
          if (cells && cells.length >= 4) {
            const title = cells[2].replace(/<[^\u003e]+\u003e/g, '').trim();
            const artist = cells[3].replace(/<[^\u003e]+\u003e/g, '').trim();
            
            if (title && artist) {
              songs.push({ rank: songs.length + 1, title, artist });
            }
          }
        }
      }
    }
    
    if (songs.length < 5) {
      throw new Error(`只提取到 ${songs.length} 首歌曲`);
    }
    
    return {
      name: CONFIG.cantonese.name,
      songs: songs.slice(0, 5),
      success: true
    };
  } catch (error) {
    console.log(`   ❌ 抓取失败: ${error.message}`);
    return {
      name: CONFIG.cantonese.name,
      error: '抓取失败',
      success: false
    };
  }
}

// ========== 生成输出 ==========
function formatOutput(results) {
  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const weekday = new Date().toLocaleDateString('zh-CN', { weekday: 'long' });
  
  let output = `🎵 **早安！今日音乐榜单** | ${today} ${weekday}\n\n`;
  
  for (const [lang, data] of Object.entries(results)) {
    if (data) {
      output += `---\n\n**${data.name}**\n`;
      
      if (data.success) {
        if (data.date) output += `📅 ${data.date}\n`;
        output += '\n';
        data.songs.forEach(song => {
          output += `${song.rank}. **${song.title}** - ${song.artist}\n`;
        });
      } else {
        output += `❌ ${data.error}\n`;
      }
      output += '\n';
    }
  }
  
  output += '---\n\n💡 **特别说明**\n• 榜单数据实时抓取，失败则标注\n• 数据来源：Billboard、Lemon Music\n\n☕ 早安！祝你有好音乐陪伴~\n';
  
  return output;
}

// ========== 主函数 ==========
async function main() {
  console.log('🎶 音乐榜单实时抓取器 v3.1 (Playwright)\n');
  
  const results = {
    japanese: await fetchJapaneseChart(),
    english: await fetchEnglishChart(),
    chinese: await fetchChineseChart(),
    cantonese: await fetchCantoneseChart()
  };
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 抓取结果');
  console.log('='.repeat(60));
  
  for (const [lang, data] of Object.entries(results)) {
    if (data.success) {
      console.log(`\n${data.name}: ✅`);
      data.songs.forEach(s => console.log(`  ${s.rank}. ${s.title} - ${s.artist}`));
    } else {
      console.log(`\n${data.name}: ❌ ${data.error}`);
    }
  }
  
  const output = formatOutput(results);
  const outputFile = path.join(__dirname, `charts_${Date.now()}.txt`);
  fs.writeFileSync(outputFile, output);
  
  console.log(`\n✅ 完成！结果保存: ${outputFile}\n`);
  console.log(output);
  
  return output;
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
