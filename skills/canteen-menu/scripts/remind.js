#!/usr/bin/env node
/**
 * 食堂菜单提醒系统
 * 读取菜单数据并发送提醒
 */

const fs = require('fs');
const path = require('path');

// 配置文件
const DATA_DIR = path.join(__dirname, '../data');

// 星期映射
const WEEKDAY_MAP = {
  'Monday': '周一',
  'Tuesday': '周二', 
  'Wednesday': '周三',
  'Thursday': '周四',
  'Friday': '周五',
  'Saturday': '周六',
  'Sunday': '周日'
};

// 获取当前菜单（最新的菜单文件）
function getCurrentMenu() {
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.startsWith('menu_') && f.endsWith('.json'))
    .sort()
    .reverse();
  
  if (files.length === 0) {
    throw new Error('没有找到菜单数据');
  }
  
  const menuPath = path.join(DATA_DIR, files[0]);
  return JSON.parse(fs.readFileSync(menuPath, 'utf8'));
}

// 获取今天/明天的菜单
function getTodayMenu(menuData, offset = 0) {
  const today = new Date();
  today.setDate(today.getDate() + offset);
  
  const weekdayEn = today.toLocaleDateString('en-US', { weekday: 'long' });
  const weekdayCn = WEEKDAY_MAP[weekdayEn];
  
  if (!weekdayCn || !menuData.menu[weekdayCn]) {
    return null;
  }
  
  return {
    weekday: weekdayCn,
    date: today.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
    ...menuData.menu[weekdayCn]
  };
}

// 格式化午餐消息
function formatLunchMessage(menu) {
  if (!menu || !menu.lunch) {
    return null;
  }
  
  const lunch = menu.lunch;
  let msg = `🍽️ **午餐提醒** | ${menu.weekday} ${menu.date}\n\n`;
  msg += `🥘 **主荤**：${lunch.main}\n`;
  
  if (lunch.sub && lunch.sub.length > 0) {
    msg += `🍖 **副荤**：${lunch.sub.join('、')}\n`;
  }
  
  if (lunch.vegetable) {
    msg += `🥬 **素菜**：${lunch.vegetable}\n`;
  }
  
  if (lunch.soup) {
    msg += `🍲 **汤品**：${lunch.soup}\n`;
  }
  
  msg += `\n记得去吃饭哦！😊`;
  
  return msg;
}

// 格式化晚餐消息
function formatDinnerMessage(menu) {
  if (!menu || !menu.dinner) {
    return null;
  }
  
  const dinner = menu.dinner;
  let msg = `🍽️ **晚餐提醒** | ${menu.weekday} ${menu.date}\n\n`;
  msg += `🥘 **主荤**：${dinner.main}\n`;
  
  if (dinner.sub && dinner.sub.length > 0) {
    msg += `🍖 **副荤**：${dinner.sub.join('、')}\n`;
  }
  
  if (dinner.vegetable) {
    msg += `🥬 **素菜**：${dinner.vegetable}\n`;
  }
  
  if (dinner.soup) {
    msg += `🍲 **汤品**：${dinner.soup}\n`;
  }
  
  msg += `\n记得去吃饭哦！😊`;
  
  return msg;
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  const type = args[0]; // 'lunch' 或 'dinner'
  
  try {
    const menuData = getCurrentMenu();
    const todayMenu = getTodayMenu(menuData);
    
    if (!todayMenu) {
      console.log('今天没有菜单数据');
      process.exit(0);
    }
    
    let message;
    if (type === 'lunch') {
      message = formatLunchMessage(todayMenu);
    } else if (type === 'dinner') {
      message = formatDinnerMessage(todayMenu);
    } else {
      console.error('用法: node remind.js [lunch|dinner]');
      process.exit(1);
    }
    
    if (message) {
      console.log(message);
    } else {
      console.log(`今天没有${type === 'lunch' ? '午餐' : '晚餐'}菜单`);
    }
    
  } catch (error) {
    console.error('错误:', error.message);
    process.exit(1);
  }
}

// 如果直接运行
if (require.main === module) {
  main();
}

module.exports = { getCurrentMenu, getTodayMenu, formatLunchMessage, formatDinnerMessage };
