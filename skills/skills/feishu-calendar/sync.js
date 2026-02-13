const Lark = require('@larksuiteoapi/node-sdk');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const client = new Lark.Client({ appId: APP_ID, appSecret: APP_SECRET });

(async () => {
    console.log("🔄 Syncing Calendar Events...");
    
    // 1. Get Bot Calendar
    let botCalendarId;
    const calList = await client.calendar.calendar.list();
    if (calList.code === 0 && calList.data.calendar_list) {
        const botCal = calList.data.calendar_list.find(c => c.summary === 'OpenClaw Assistant');
        if (botCal) botCalendarId = botCal.calendar_id;
    }

    if (!botCalendarId) return console.error("Bot calendar not found.");

    // 2. Fetch Events (Future 7 days)
    const now = Math.floor(Date.now() / 1000);
    const endTime = now + 7 * 24 * 3600; 
    
    // Use SDK method if available, else raw request.
    // Try SDK list method first with fallback.
    let events = [];
    try {
        // First try finding a specific calendar ID if we have a target name, OR use 'primary' as default
        // The check above (1. Get Bot Calendar) might return a specific ID that requires permissions we don't have.
        // It's safer to always try 'primary' if the specific ID fails, or just default to 'primary' if appropriate.
        // However, 'OpenClaw Assistant' might be a secondary calendar.
        
        let targetId = botCalendarId;
        
        let listRes = await client.calendar.calendarEvent.list({
            path: { calendar_id: targetId },
            params: {
                start_time: String(now),
                end_time: String(endTime),
                page_size: 50
            }
        });
        
        // Fallback for permission errors on specific ID
        if (listRes.code !== 0 && targetId !== 'primary') {
             console.log(`Access failed for calendar ${targetId} (${listRes.code}: ${listRes.msg}). Retrying with 'primary'...`);
             listRes = await client.calendar.calendarEvent.list({
                path: { calendar_id: 'primary' },
                params: {
                    start_time: String(now),
                    end_time: String(endTime),
                    page_size: 50
                }
            });
        }

        if (listRes.code === 0) {
            events = listRes.data.items || [];
        } else {
            console.error("SDK List failed:", listRes.msg);
        }
    } catch(e) {
        console.error("SDK Error:", e.message);
    }

    if (events.length > 0) {
        console.log(`✅ Found ${events.length} active events.`);
        
        // Format for reporting
        let report = "📅 **OpenClaw Schedule (Next 7 Days):**\n\n";
        events.forEach(e => {
            const start = new Date(parseInt(e.start_time.timestamp) * 1000).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
            report += `- **${start}**: ${e.summary || '(No Title)'} (ID: ${e.event_id.slice(-4)})\n`;
        });
        
        console.log(report);
        
        // Save state
        const fs = require('fs');
        const path = require('path');
        fs.writeFileSync(path.resolve(__dirname, '../../memory/calendar_events.json'), JSON.stringify(events, null, 2));

        // Sync to HEARTBEAT.md
        // We only want to sync specific recurring tasks or important events to HEARTBEAT.md
        // But for now, let's just make sure HEARTBEAT.md reflects that the calendar is active.
        // Actually, the request was "syncs Feishu calendar events to HEARTBEAT.md".
        // Let's read HEARTBEAT.md, find a "## Calendar" section or create one, and update it.

        const heartbeatPath = path.resolve(__dirname, '../../HEARTBEAT.md');
        if (fs.existsSync(heartbeatPath)) {
            let heartbeatContent = fs.readFileSync(heartbeatPath, 'utf8');
            
            // Generate calendar section content
            let calendarSection = "## 📅 Calendar (Next 24h)\n\n";
            const next24h = events.filter(e => {
                 const t = parseInt(e.start_time.timestamp);
                 return t < (Date.now()/1000 + 86400);
            });

            if (next24h.length === 0) {
                calendarSection += "- No upcoming events in the next 24 hours.\n";
            } else {
                next24h.forEach(e => {
                    const start = new Date(parseInt(e.start_time.timestamp) * 1000).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute:'2-digit' });
                    calendarSection += `- [ ] ${start} - ${e.summary}\n`;
                });
            }
            
            // Regex to find existing Calendar section or append
            // We look for "## Calendar" until the next "## " or end of file
            const calendarRegex = /## (?:📅 )?Calendar.*?(?=\n## |$)/s;
            
            if (calendarRegex.test(heartbeatContent)) {
                heartbeatContent = heartbeatContent.replace(calendarRegex, calendarSection.trim());
            } else {
                // Append before "## Morning" or at end if not found
                const insertPos = heartbeatContent.indexOf('## Morning');
                if (insertPos !== -1) {
                    heartbeatContent = heartbeatContent.slice(0, insertPos) + calendarSection + "\n" + heartbeatContent.slice(insertPos);
                } else {
                    heartbeatContent += "\n" + calendarSection;
                }
            }
            
            fs.writeFileSync(heartbeatPath, heartbeatContent, 'utf8');
            console.log("✅ Synced to HEARTBEAT.md");
        }

    } else {
        console.log("No active events found.");
    }
})();
