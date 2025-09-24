# OBS CleanRouter

A clean way to show web content in OBS without exposing personal browser info, login state, or UI elements.

## Quick Start

1. **Install and run:**
   ```bash
   cd obs-cleanrouter
   npm install
   npm start
   ```

2. **Add to OBS:**
   - Add a Browser Source in OBS/Streamlabs
   - URL: `http://localhost:4765/overlay`
   - Size: Match your canvas (e.g., 1920×1080)

3. **Get the bookmarklet:**
   - Visit `http://localhost:4765` in your browser
   - Drag the "Send to OBS" link to your bookmarks bar

## How to Use

1. Browse normally in your regular browser (stay logged in, keep your privacy)
2. When you find content to show on stream, click the "Send to OBS" bookmark
3. Your OBS overlay instantly updates with clean content + title bar
4. No personal info, notifications, or account UI shows on stream

## What It Shows

- **YouTube videos**: Clean embed via youtube-nocookie.com with title/channel
- **Other sites**: Title bar only (from OpenGraph metadata)
- **Always**: Professional overlay with no personal browser state

## Features

- ✅ No login info leakage
- ✅ Clean YouTube embeds with controls
- ✅ Auto-fetches titles and channel names
- ✅ One-click bookmarklet workflow
- ✅ Works with any website
- ✅ Responsive title overlay

Perfect for streamers who want to share content without screen capturing their actual browser tabs.