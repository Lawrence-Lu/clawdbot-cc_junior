const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 节假日数据缓存文件
const CACHE_FILE = path.join(__dirname, '.holidays_cache.json');

// 默认中国节假日（2024-2026）- 包含调休
const DEFAULT_HOLIDAYS = {
    '2024': {
        holidays: ['2024-01-01', '2024-02-10', '2024-02-11', '2024-02-12', '2024-02-13', '2024-02-14', '2024-02-15', '2024-02-16', '2024-02-17', '2024-04-04', '2024-04-05', '2024-04-06', '2024-05-01', '2024-05-02', '2024-05-03', '2024-05-04', '2024-05-05', '2024-06-10', '2024-09-15', '2024-09-16', '2024-09-17', '2024-10-01', '2024-10-02', '2024-10-03', '2024-10-04', '2024-10-05', '2024-10-06', '2024-10-07'],
        workdays: ['2024-02-04', '2024-02-18', '2024-04-07', '2024-04-28', '2024-05-11', '2024-09-14', '2024-09-29', '2024-10-12']
    },
    '2025': {
        holidays: ['2025-01-01', '2025-01-28', '2025-01-29', '2025-01-30', '2025-01-31', '2025-02-01', '2025-02-02', '2025-02-03', '2025-02-04', '2025-04-04', '2025-04-05', '2025-04-06', '2025-05-01', '2025-05-02', '2025-05-03', '2025-05-04', '2025-05-05', '2025-05-31', '2025-06-01', '2025-06-02', '2025-10-01', '2025-10-02', '2025-10-03', '2025-10-04', '2025-10-05', '2025-10-06', '2025-10-07', '2025-10-08'],
        workdays: ['2025-01-26', '2025-02-08', '2025-04-27', '2025-09-28', '2025-10-11']
    },
    '2026': {
        // 2026年节假日安排（根据国务院官方数据）
        // 春节：2月15日(周日)-23日(周一)放假，共9天；2月14日(周六)、2月28日(周六)上班
        // 清明节：4月4日-6日放假
        // 劳动节：5月1日-5日放假；5月9日(周六)上班
        // 端午节：6月19日-21日放假
        // 中秋节：9月25日-27日放假
        // 国庆节：10月1日-7日放假；9月20日(周日)、10月10日(周六)上班
        holidays: [
            '2026-01-01',           // 元旦
            '2026-02-15', '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', '2026-02-21', '2026-02-22', '2026-02-23', // 春节
            '2026-04-04', '2026-04-05', '2026-04-06',           // 清明节
            '2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05', // 劳动节
            '2026-06-19', '2026-06-20', '2026-06-21',           // 端午节
            '2026-09-25', '2026-09-26', '2026-09-27',           // 中秋节
            '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07' // 国庆节
        ],
        workdays: ['2026-02-14', '2026-02-28', '2026-05-09', '2026-09-20', '2026-10-10']
    }
};

// 获取远程节假日数据（备用）
async function fetchHolidaysFromAPI(year) {
    try {
        // 使用 Nager API 获取节假日
        const res = await axios.get(`https://date.nager.at/api/v3/publicholidays/${year}/CN`, {
            timeout: 10000
        });
        
        const holidays = res.data.map(h => h.date);
        return { holidays, workdays: [] };
    } catch (error) {
        console.error(`获取 ${year} 年节假日数据失败:`, error.message);
        return null;
    }
}

// 加载节假日数据
function loadHolidays() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
            return { ...DEFAULT_HOLIDAYS, ...data };
        }
    } catch (error) {
        console.error('加载缓存失败:', error.message);
    }
    return DEFAULT_HOLIDAYS;
}

// 保存节假日数据
function saveHolidays(data) {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('保存缓存失败:', error.message);
    }
}

// 判断是否是工作日
function isWorkday(date, holidaysData) {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    const year = dateStr.split('-')[0];
    
    const yearData = holidaysData[year];
    if (!yearData) {
        // 如果没有数据，使用简单规则：周一到周五为工作日
        const day = new Date(dateStr).getDay();
        return day >= 1 && day <= 5;
    }
    
    // 检查是否是节假日
    if (yearData.holidays.includes(dateStr)) {
        return false;
    }
    
    // 检查是否是调休工作日
    if (yearData.workdays.includes(dateStr)) {
        return true;
    }
    
    // 检查是否是周末
    const day = new Date(dateStr).getDay();
    return day >= 1 && day <= 5;
}

// 判断是否是节假日
function isHoliday(date, holidaysData) {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    const year = dateStr.split('-')[0];
    
    const yearData = holidaysData[year];
    if (!yearData) return false;
    
    return yearData.holidays.includes(dateStr);
}

// 获取今天的状态
function getTodayStatus() {
    const holidaysData = loadHolidays();
    const today = new Date().toISOString().split('T')[0];
    
    return {
        date: today,
        isWorkday: isWorkday(today, holidaysData),
        isHoliday: isHoliday(today, holidaysData),
        dayOfWeek: new Date().toLocaleDateString('zh-CN', { weekday: 'long' })
    };
}

// 获取指定月份的节假日
function getMonthHolidays(year, month) {
    const holidaysData = loadHolidays();
    const yearData = holidaysData[year];
    
    if (!yearData) return [];
    
    const monthStr = month.toString().padStart(2, '0');
    return yearData.holidays.filter(d => d.startsWith(`${year}-${monthStr}`));
}

// 主函数
async function main() {
    const holidaysData = loadHolidays();
    const today = new Date().toISOString().split('T')[0];
    const year = today.split('-')[0];
    
    console.log('📅 中国节假日判断工具\n');
    console.log(`今天是: ${today} ${new Date().toLocaleDateString('zh-CN', { weekday: 'long' })}`);
    console.log(`是否是工作日: ${isWorkday(today, holidaysData) ? '✅ 是' : '❌ 否'}`);
    console.log(`是否是节假日: ${isHoliday(today, holidaysData) ? '✅ 是' : '❌ 否'}`);
    
    console.log(`\n📊 ${year} 年节假日统计:`);
    const yearData = holidaysData[year];
    if (yearData) {
        console.log(`   - 节假日: ${yearData.holidays.length} 天`);
        console.log(`   - 调休工作日: ${yearData.workdays.length} 天`);
    }
}

// 导出函数
module.exports = {
    isWorkday,
    isHoliday,
    getTodayStatus,
    getMonthHolidays,
    loadHolidays,
    fetchHolidaysFromAPI
};

// 如果直接运行
if (require.main === module) {
    main();
}
