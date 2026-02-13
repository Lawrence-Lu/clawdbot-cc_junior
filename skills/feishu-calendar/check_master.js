const Lark = require('@larksuiteoapi/node-sdk');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const MASTER_ID = process.env.OPENCLAW_MASTER_ID;
const client = new Lark.Client({ appId: APP_ID, appSecret: APP_SECRET });

(async () => {
    // console.log(`Trying to access calendar for Master: ${MASTER_ID}`);
    
    try {
        // 1. List all calendars
        const listRes = await client.calendar.calendar.list();
        if (listRes.code !== 0) throw new Error(`List failed: ${listRes.msg}`);
        
        const calendars = listRes.data.calendar_list || [];
        
        // 2. Find one that looks like Master's
        // Strategy: Look for "Master", "Admin", "OpenClaw", or specific ID if known
        let targetCal = calendars.find(c => c.summary.includes("Master") || c.summary.includes("OpenClaw"));
        
        if (!targetCal && calendars.length > 0) targetCal = calendars[0]; // Fallback to primary

        if (targetCal) {
            console.log(`Using Calendar: ${targetCal.summary} (ID: ${targetCal.calendar_id})`);
            
            // 3. List upcoming events
            const now = Math.floor(Date.now() / 1000);
            
            // Note: Lark SDK Client already handles authentication via appId/appSecret.
            // Explicit tenant token passing is usually not needed unless overriding.
            
            let res = await client.calendar.calendarEvent.list({
                path: { calendar_id: targetCal.calendar_id },
                params: {
                    start_time: String(now),
                    end_time: String(now + 86400 * 3), // 3 days
                    page_size: 10
                }
            });
            
            // If the specific ID failed (e.g. 400 or permission denied), try primary
            if (res.code !== 0 && targetCal.calendar_id !== 'primary') {
                 console.log(`Access failed with specific ID (${res.code}: ${res.msg}). Retrying with 'primary'...`);
                 res = await client.calendar.calendarEvent.list({
                    path: { calendar_id: 'primary' },
                    params: {
                        start_time: String(now),
                        end_time: String(now + 86400 * 3),
                        page_size: 10
                    }
                });
            }
            
            if (res.code === 0) {
                console.log(`Found ${res.data.items.length} events.`);
                res.data.items.forEach(e => console.log(`- [${new Date(e.start_time.timestamp * 1000).toLocaleString()}] ${e.summary}`));
            } else {
                console.log(`No events found or error: ${res.msg}`);
            }
        } else {
            console.log("No accessible calendars found.");
        }

    } catch(e) { console.log("Error:", e.message); }
})();
