// Minimal "Clean Router" for OBS
// deps:  npm i express node-fetch
const express = require("express");
const fetch = require("node-fetch");
const path = require("path");

const app = express();

// Add CORS headers to fix bookmarklet connection issues
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Store both URL and parsed video ID + state
let current = {
  id: "",
  url: "",
  state: { playing: true, time: 0, lastUpdate: Date.now() },
};

// Extract YouTube video ID from URL
function extractId(u) {
  try {
    const url = new URL(u);
    const p = url.pathname.split("/").filter(Boolean);
    if (url.hostname.includes("youtu.be")) return p[0];
    if (p.includes("live")) return p[p.indexOf("live") + 1];
    if (p.includes("shorts")) return p[p.indexOf("shorts") + 1];
    return url.searchParams.get("v") || p.pop();
  } catch (e) {
    return "";
  }
}

// Push the current tab URL to the router (via bookmarklet)
app.get("/push", (req, res) => {
  const u = req.query.u || "";
  const id = u ? extractId(u) : "";

  if (id) {
    current.id = id;
    current.url = u;
    console.log("📺 New video pushed:", id, "from", u);
  }

  // Return a 1x1 transparent PNG to avoid CORS issues with bookmarklet
  const pixel = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64"
  );
  res.type("png").send(pixel);
});

// Overlay polls this to know what to show
app.get("/current", (req, res) => {
  res.json(current);
});

// Sync video state from browser
app.get("/sync", (req, res) => {
  const { time, playing } = req.query;
  if (time !== undefined) current.state.time = parseFloat(time);
  if (playing !== undefined) current.state.playing = playing === "true";
  current.state.lastUpdate = Date.now();
  console.log(
    "🔄 Video sync:",
    playing === "true" ? "PLAYING" : "PAUSED",
    "at",
    time + "s"
  );

  // Return 1x1 pixel to avoid CORS
  const pixel = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64"
  );
  res.type("png").send(pixel);
});

// Server-side metadata helper (avoids CORS/login leakage)
app.get("/meta", async (req, res) => {
  const u = req.query.u || current.url;
  console.log("🔍 Fetching metadata for:", u);

  try {
    // YouTube: use oEmbed for accurate title/channel
    if (/youtu\.be|youtube\.com/.test(u)) {
      const r = await fetch(
        "https://www.youtube.com/oembed?url=" +
          encodeURIComponent(u) +
          "&format=json"
      );
      const j = await r.json();
      console.log("✅ YouTube metadata:", j.title, "by", j.author_name);
      return res.json({
        provider: "youtube",
        title: j.title,
        author: j.author_name,
        author_url: j.author_url,
      });
    }

    // Fallback: try to read OpenGraph <meta> (best-effort)
    const r = await fetch(u, { headers: { "User-Agent": "CleanRouter/1.0" } });
    const html = await r.text();
    const og = (name) =>
      (html.match(
        new RegExp(
          `<meta[^>]+property=["']og:${name}["'][^>]+content=["']([^"']+)`,
          "i"
        )
      ) || [])[1];
    const title =
      og("title") ||
      (html.match(/<title[^>]*>([^<]+)/i) || [])[1] ||
      "Untitled";
    const author = og("site_name") || new URL(u).hostname;

    console.log("✅ Generic metadata:", title, "from", author);
    res.json({
      provider: "generic",
      title: title,
      author: author,
      author_url: u,
    });
  } catch (e) {
    console.log("❌ Metadata fetch failed:", e.message);
    res.json({
      provider: "error",
      title: "Unknown",
      author: "",
      author_url: "",
    });
  }
});

// Serve the overlay UI
app.get("/overlay", (req, res) => {
  res.sendFile(path.join(process.cwd(), "overlay.html"));
});

// Serve clean overlay (no debug HUD)
app.get("/clean", (req, res) => {
  res.sendFile(path.join(process.cwd(), "overlay-clean.html"));
});

// Serve fallback overlay (stateless control - works in any CEF)
app.get("/fallback", (req, res) => {
  res.sendFile(path.join(process.cwd(), "overlay-fallback.html"));
});

// Serve simple test overlay
app.get("/test", (req, res) => {
  res.sendFile(path.join(process.cwd(), "test-simple.html"));
});

// Health check
app.get("/", (req, res) => {
  res.send(`
    <h1>🎬 CleanRouter for OBS</h1>
    <p>Server is running! Add this to OBS Browser Source:</p>
    <code>http://localhost:4765/overlay</code> (debug version)<br>
    <code>http://localhost:4765/fallback</code> (bulletproof version)<br>
    <code>http://localhost:4765/clean</code> (clean version)
    <br><br>
    <p>Bookmarklet (drag to bookmarks bar):</p>
    <a href="javascript:(()=>{const u=location.href;const img=new Image();img.onload=()=>{console.log('✅ Sent to OBS');if(/youtube\\.com|youtu\\.be/.test(u)){let lastTime=0,lastPlaying=false;const sync=()=>{try{const v=document.querySelector('video');if(v&&(Math.abs(v.currentTime-lastTime)>1||v.paused!==lastPlaying)){lastTime=v.currentTime;lastPlaying=!v.paused;const i=new Image();i.src='http://localhost:4765/sync?time='+v.currentTime+'&playing='+(!v.paused)+'&_='+Date.now()}}catch(e){}};setInterval(sync,1000)}};img.onerror=()=>alert('❌ Could not reach CleanRouter - is server running?');img.src='http://localhost:4765/push?u='+encodeURIComponent(u)+'&_='+Date.now();})();">📺 Send to OBS</a>
    
    <h3>Features:</h3>
    <ul>
      <li>✅ Clean video embeds without personal info</li>
      <li>✅ Title moved to bottom-left</li>
      <li>✅ Video controls sync from your browser to OBS</li>
      <li>✅ Works with YouTube, and other sites</li>
    </ul>
  `);
});

const PORT = 4765;
app.listen(PORT, () => {
  console.log("🚀 CleanRouter running on http://localhost:" + PORT);
  console.log(
    "📺 Add to OBS Browser Source: http://localhost:" + PORT + "/overlay"
  );
  console.log("🔖 Visit http://localhost:" + PORT + " for bookmarklet");
});
