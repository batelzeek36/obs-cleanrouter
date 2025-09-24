// Minimal "Clean Router" for OBS
// deps:  npm i express node-fetch
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
let currentURL = ''; // last pushed URL (from your normal browser)

// Push the current tab URL to the router (via bookmarklet)
app.get('/push', (req, res) => {
  currentURL = req.query.u || '';
  console.log('📺 New URL pushed:', currentURL);
  res.type('text').send('ok');
});

// Overlay polls this to know what to show
app.get('/current', (req, res) => {
  res.json({ url: currentURL });
});

// Server-side metadata helper (avoids CORS/login leakage)
app.get('/meta', async (req, res) => {
  const u = req.query.u || '';
  console.log('🔍 Fetching metadata for:', u);
  
  try {
    // YouTube: use oEmbed for accurate title/channel
    if (/youtu\.be|youtube\.com/.test(u)) {
      const r = await fetch('https://www.youtube.com/oembed?url=' + encodeURIComponent(u) + '&format=json');
      const j = await r.json();
      console.log('✅ YouTube metadata:', j.title, 'by', j.author_name);
      return res.json({
        provider: 'youtube',
        title: j.title,
        author: j.author_name,
        author_url: j.author_url
      });
    }
    
    // Fallback: try to read OpenGraph <meta> (best-effort)
    const r = await fetch(u, { headers: { 'User-Agent': 'CleanRouter/1.0' } });
    const html = await r.text();
    const og = (name) => (html.match(new RegExp(`<meta[^>]+property=["']og:${name}["'][^>]+content=["']([^"']+)`, 'i')) || [])[1];
    const title = og('title') || (html.match(/<title[^>]*>([^<]+)/i) || [])[1] || 'Untitled';
    const author = og('site_name') || new URL(u).hostname;
    
    console.log('✅ Generic metadata:', title, 'from', author);
    res.json({
      provider: 'generic',
      title: title,
      author: author,
      author_url: u
    });
  } catch (e) {
    console.log('❌ Metadata fetch failed:', e.message);
    res.json({ provider: 'error', title: 'Unknown', author: '', author_url: '' });
  }
});

// Serve the overlay UI
app.get('/overlay', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'overlay.html'));
});

// Health check
app.get('/', (req, res) => {
  res.send(`
    <h1>🎬 CleanRouter for OBS</h1>
    <p>Server is running! Add this to OBS Browser Source:</p>
    <code>http://localhost:4765/overlay</code>
    <br><br>
    <p>Bookmarklet (drag to bookmarks bar):</p>
    <a href="javascript:(()=>{fetch('http://localhost:4765/push?u='+encodeURIComponent(location.href)).then(()=>console.log('Sent to OBS')).catch(()=>alert('Could not reach CleanRouter'));})();">📺 Send to OBS</a>
  `);
});

const PORT = 4765;
app.listen(PORT, () => {
  console.log('🚀 CleanRouter running on http://localhost:' + PORT);
  console.log('📺 Add to OBS Browser Source: http://localhost:' + PORT + '/overlay');
  console.log('🔖 Visit http://localhost:' + PORT + ' for bookmarklet');
});