#!/usr/bin/env node
/**
 * 菜单更新系统
 * 解析菜单图片并保存为JSON
 * 
 * 使用方式：
 * 1. 用户发送菜单图片
 * 2. 调用此脚本解析（需要手动输入或OCR）
 * 3. 保存为JSON文件
 * 4. 设置本周提醒定时任务
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');

// 创建空的菜单模板
function createMenuTemplate(weekStartDate) {
  const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const menu = {};
  
  weekdays.forEach((day, index) => {
    const date = new Date(weekStartDate);
    date.setDate(date.getDate() + index);
    
    menu[day] = {
      date: date.toISOString().split('T')[0],
      lunch: {
        main: "",
        sub: [],
        vegetable: "",
        soup: "",
        staple: "",
        noodles: ""
      },
      dinner: {
        main: "",
        sub: [],
        vegetable: "",
        soup: "",
        staple: "",
        noodles: ""
      }
    };
  });
  
  return {
    week: `${weekStartDate} 开始的一周`,
    menu: menu,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

// 保存菜单
function saveMenu(menuData, filename) {
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(menuData, null, 2));
  return filepath;
}

// 手动输入菜单（交互式）
async function interactiveInput() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));
  
  console.log('🍽️ 食堂菜单录入系统\n');
  console.log('请按提示输入本周菜单信息\n');
  
  const weekStart = await question('请输入本周开始日期 (YYYY-MM-DD): ');
  const menuData = createMenuTemplate(weekStart);
  
  const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  
  for (const day of weekdays) {
    console.log(`\n📅 ${day}:`);
    
    // 午餐
    console.log('  午餐:');
    menuData.menu[day].lunch.main = await question('    主荤: ');
    const lunchSub = await question('    副荤 (用逗号分隔): ');
    menuData.menu[day].lunch.sub = lunchSub.split('、').map(s => s.trim()).filter(s => s);
    menuData.menu[day].lunch.vegetable = await question('    素菜: ');
    menuData.menu[day].lunch.soup = await question('    汤品: ');
    menuData.menu[day].lunch.staple = await question('    主食: ');
    menuData.menu[day].lunch.noodles = await question('    面食: ');
    
    // 晚餐
    console.log('  晚餐:');
    menuData.menu[day].dinner.main = await question('    主荤: ');
    const dinnerSub = await question('    副荤 (用逗号分隔): ');
    menuData.menu[day].dinner.sub = dinnerSub.split('、').map(s => s.trim()).filter(s => s);
    menuData.menu[day].dinner.vegetable = await question('    素菜: ');
    menuData.menu[day].dinner.soup = await question('    汤品: ');
    menuData.menu[day].dinner.staple = await question('    主食: ');
    menuData.menu[day].dinner.noodles = await question('    面食: ');
  }
  
  rl.close();
  
  // 保存
  const filename = `menu_${weekStart}.json`;
  const filepath = saveMenu(menuData, filename);
  
  console.log(`\n✅ 菜单已保存: ${filepath}`);
  return menuData;
}

// 显示当前菜单
function showCurrentMenu() {
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.startsWith('menu_') && f.endsWith('.json'))
    .sort()
    .reverse();
  
  if (files.length === 0) {
    console.log('没有找到菜单数据');
    return null;
  }
  
  const menuPath = path.join(DATA_DIR, files[0]);
  const menuData = JSON.parse(fs.readFileSync(menuPath, 'utf8'));
  
  console.log(`📅 当前菜单: ${menuData.week}\n`);
  
  for (const [day, data] of Object.entries(menuData.menu)) {
    console.log(`${day} (${data.date}):`);
    console.log(`  午餐: ${data.lunch.main}`);
    console.log(`  晚餐: ${data.dinner.main}`);
    console.log();
  }
  
  return menuData;
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'create':
      await interactiveInput();
      break;
    case 'show':
      showCurrentMenu();
      break;
    default:
      console.log('用法:');
      console.log('  node update.js create  - 交互式录入新菜单');
      console.log('  node update.js show    - 显示当前菜单');
  }
}

// 如果直接运行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { createMenuTemplate, saveMenu };
