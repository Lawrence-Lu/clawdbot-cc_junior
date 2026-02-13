---
name: feishu-sheets
description: Read and extract data from Feishu Spreadsheets (Sheets). Use when the user needs to access data from Feishu Sheets URLs (la7bax2jx4y.feishu.cn/sheets/XXX), read spreadsheet contents, extract table data, or work with Feishu Spreadsheet documents. Supports reading specific sheets and cell ranges.
---

# Feishu Sheets

## Overview

This skill enables reading data from Feishu Spreadsheets (Sheets), the electronic spreadsheet product separate from Bitable (multidimensional tables). Use this for traditional spreadsheet documents with cell-based data.

## When to Use

- User provides a URL containing `/sheets/` (e.g., `https://la7bax2jx4y.feishu.cn/sheets/AtLesQpRmhcN0rtaOOCcqNFpnCh`)
- Need to read table data from Feishu Sheets
- Extract specific sheet contents or cell ranges
- Work with traditional spreadsheet (Excel-like) documents in Feishu

## Quick Start

### Reading a Spreadsheet

Use the `scripts/sheets_reader.py` script:

```bash
python3 scripts/sheets_reader.py <url> [sheet_name_or_id] [range]
```

**Parameters:**
- `url`: Feishu Sheets URL (required)
- `sheet_name_or_id`: Optional - sheet name or ID (defaults to first sheet)
- `range`: Optional - cell range like `A1:D10`

**Examples:**

```bash
# Read first sheet
python3 scripts/sheets_reader.py "https://la7bax2jx4y.feishu.cn/sheets/AtLesQpRmhcN0rtaOOCcqNFpnCh"

# Read specific sheet by name
python3 scripts/sheets_reader.py "https://la7bax2jx4y.feishu.cn/sheets/AtLesQpRmhcN0rtaOOCcqNFpnCh" "Sheet1"

# Read specific range
python3 scripts/sheets_reader.py "https://la7bax2jx4y.feishu.cn/sheets/AtLesQpRmhcN0rtaOOCcqNFpnCh" "Sheet1" "A1:D10"
```

## Authentication

The script automatically looks for access tokens in:
1. `FEISHU_ACCESS_TOKEN` environment variable
2. `/root/.openclaw/workspace/skills/skills/feishu-calendar/.user_token.json`
3. `/root/.openclaw/workspace/.user_token.json`
4. `./.user_token.json`

Token file format:
```json
{
  "access_token": "your-token-here"
}
```

## Output Format

The script outputs JSON with the following structure:

```json
{
  "data": {
    "valueRange": {
      "sheetId": "sheet-id",
      "range": "A1:D10",
      "values": [
        ["Header1", "Header2", "Header3", "Header4"],
        ["Row1Col1", "Row1Col2", "Row1Col3", "Row1Col4"],
        ...
      ]
    }
  }
}
```

## Error Handling

If authentication fails:
```json
{
  "error": true,
  "message": "No access token found. Please ensure FEISHU_ACCESS_TOKEN is set or .user_token.json exists."
}
```

If URL parsing fails:
```json
{
  "error": true,
  "message": "Could not extract spreadsheet token from URL"
}
```

## Limitations

- Read-only operations (no write support)
- Maximum 1000 rows read per request (adjust range for more)
- Requires User Access Token with `sheets:spreadsheet:readonly` scope

## Resources

### scripts/

- `sheets_reader.py` - Main script for reading spreadsheet data
  - Extracts spreadsheet token from URL
  - Handles authentication
  - Reads sheet metadata and cell values
  - Outputs structured JSON
