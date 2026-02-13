#!/usr/bin/env python3
"""
Feishu Sheets API Client
Reads data from Feishu Spreadsheet (Sheets)
"""

import sys
import json
import os
import re
import urllib.request
import urllib.parse
from urllib.error import HTTPError

FEISHU_API_BASE = "https://open.feishu.cn/open-apis"

def get_token_from_url(url):
    """Extract spreadsheet token from URL"""
    # Pattern: /sheets/TOKEN or /wiki/TOKEN or sheets/TOKEN
    patterns = [
        r'/sheets/([a-zA-Z0-9]+)',
        r'sheets/([a-zA-Z0-9]+)',
        r'/wiki/([a-zA-Z0-9]+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def get_access_token():
    """Get access token from environment or file"""
    # Try environment variable first
    token = os.environ.get('FEISHU_ACCESS_TOKEN')
    if token:
        return token
    
    # Try reading from token file
    token_paths = [
        '/root/.openclaw/workspace/skills/skills/feishu-calendar/.user_token.json',
        '/root/.openclaw/workspace/.user_token.json',
        './.user_token.json',
    ]
    
    for path in token_paths:
        if os.path.exists(path):
            try:
                with open(path, 'r') as f:
                    data = json.load(f)
                    return data.get('access_token') or data.get('token')
            except Exception as e:
                print(f"Warning: Failed to read token from {path}: {e}", file=sys.stderr)
                continue
    
    return None

def make_api_request(url, token):
    """Make API request with authorization"""
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
    }
    
    req = urllib.request.Request(url, headers=headers, method='GET')
    
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))
    except HTTPError as e:
        error_body = e.read().decode('utf-8')
        return {
            'error': True,
            'status': e.code,
            'message': error_body
        }
    except Exception as e:
        return {
            'error': True,
            'message': str(e)
        }

def get_spreadsheet_info(token, spreadsheet_token):
    """Get spreadsheet metadata including sheets list"""
    url = f"{FEISHU_API_BASE}/sheets/v3/spreadsheets/{spreadsheet_token}"
    return make_api_request(url, token)

def get_sheet_data(token, spreadsheet_token, sheet_id_or_title, range_str=None):
    """Read data from a specific sheet/range"""
    # First get spreadsheet info to resolve sheet title to ID
    info = get_spreadsheet_info(token, spreadsheet_token)
    
    if 'error' in info and info['error']:
        return info
    
    sheets = info.get('data', {}).get('sheets', [])
    sheet_id = None
    
    # Try to match by title or ID
    for sheet in sheets:
        if sheet.get('sheet_id') == sheet_id_or_title or sheet.get('title') == sheet_id_or_title:
            sheet_id = sheet.get('sheet_id')
            break
    
    if not sheet_id:
        # If no match, assume it's an ID
        sheet_id = sheet_id_or_title
    
    # Build range string
    if range_str:
        full_range = f"{sheet_id}!{range_str}"
    else:
        # Read all data (limited range)
        full_range = f"{sheet_id}!A1:ZZ1000"
    
    url = f"{FEISHU_API_BASE}/sheets/v3/spreadsheets/{spreadsheet_token}/values/{full_range}"
    
    return make_api_request(url, token)

def main():
    if len(sys.argv) < 2:
        print("Usage: sheets_reader.py <url> [sheet_name_or_id] [range]", file=sys.stderr)
        print("  url: Feishu Sheets URL", file=sys.stderr)
        print("  sheet_name_or_id: Optional sheet name or ID (default: first sheet)", file=sys.stderr)
        print("  range: Optional cell range like A1:D10", file=sys.stderr)
        sys.exit(1)
    
    url = sys.argv[1]
    sheet_name = sys.argv[2] if len(sys.argv) > 2 else None
    range_str = sys.argv[3] if len(sys.argv) > 3 else None
    
    # Extract spreadsheet token
    spreadsheet_token = get_token_from_url(url)
    if not spreadsheet_token:
        print(json.dumps({
            'error': True,
            'message': 'Could not extract spreadsheet token from URL'
        }))
        sys.exit(1)
    
    # Get access token
    token = get_access_token()
    if not token:
        print(json.dumps({
            'error': True,
            'message': 'No access token found. Please ensure FEISHU_ACCESS_TOKEN is set or .user_token.json exists.'
        }))
        sys.exit(1)
    
    # If no sheet specified, get info first
    if not sheet_name:
        info = get_spreadsheet_info(token, spreadsheet_token)
        if 'error' in info and info['error']:
            print(json.dumps(info))
            sys.exit(1)
        
        sheets = info.get('data', {}).get('sheets', [])
        if sheets:
            sheet_name = sheets[0].get('sheet_id')
            print(json.dumps({
                'info': info.get('data'),
                'note': f'Using first sheet: {sheets[0].get("title", sheet_name)}'
            }), file=sys.stderr)
        else:
            print(json.dumps({
                'error': True,
                'message': 'No sheets found in spreadsheet'
            }))
            sys.exit(1)
    
    # Get sheet data
    result = get_sheet_data(token, spreadsheet_token, sheet_name, range_str)
    print(json.dumps(result, indent=2, ensure_ascii=False))

if __name__ == '__main__':
    main()
