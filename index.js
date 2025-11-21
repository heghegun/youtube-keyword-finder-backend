import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();

// Pakai CORS sesuai FRONTEND_URL
app.use(cors({
  origin: process.env.FRONTEND_URL
}));

// Cache sementara di memory dengan batas maksimal
const cache = {};
const CACHE_LIMIT = 100;
const cacheKeys = []; // urutan keyword untuk hapus cache tertua

// Route test
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// Endpoint keyword YouTube dengan data lengkap & cache terbatas
app.get("/api/keywords", async (req, res) => {
  const query = req.query.query;
  if (!query) return res.status(400).json({ error: "Query is required" });

  // Cek cache dulu
  if (cache[query]) {
    return res.json(cache[query]);
  }

  try {
    // 1️⃣ search.list (ambil 5 video)
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
        query
      )}&type=video&maxResults=5&key=${process.env.YOUTUBE_API_KEY}`
    );
    const searchData = await searchRes.json();
    const videoIds = searchData.items.map(item => item.id.videoId);
    const channelIds = searchData.items.map(item => item.snippet.channelId);

    // 2️⃣ videos.list (ambil statistik video)
    const videosRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds.join(
        ","
      )}&key=${process.env.YOUTUBE_API_KEY}`
    );
    const videosData = await videosRes.json();

    // 3️⃣ channels.list (ambil info channel)
    const channelsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${[
        ...new Set(channelIds),
      ].join(",")}&key=${process.env.YOUTUBE_API_KEY}`
    );
    const channelsData = await channelsRes.json();

    // Map channelId → info
    const channelsMap = {};
    channelsData.items.forEach(c => {
      channelsMap[c.id] = {
        title: c.snippet.title,
        subscribers: c.statistics.subscriberCount,
        totalViews: c.statistics.viewCount,
        videoCount: c.statistics.videoCount,
      };
    });

    // Gabungkan data
    const results = videosData.items.map(v => ({
      videoId: v.id,
      title: v.snippet.title,
      description: v.snippet.description,
      thumbnail: v.snippet.thumbnails.high?.url || null,
      channelId: v.snippet.channelId,
      channelTitle: v.snippet.channelTitle,
      views: v.statistics.viewCount,
      likes: v.statistics.likeCount,
      comments: v.statistics.commentCount,
      duration: v.contentDetails.duration,
      channelInfo: channelsMap[v.snippet.channelId] || null,
      publishedAt: v.snippet.publishedAt,
    }));

    const finalData = {
      keyword: query,
      totalResults: searchData.pageInfo.totalResults,
      videos: results,
    };

    // Simpan ke cache dengan batas maksimal
    if (!cache[query]) {
      cacheKeys.push(query);
      cache[query] = finalData;

      // Hapus cache tertua jika melebihi limit
      if (cacheKeys.length > CACHE_LIMIT) {
        const oldestKey = cacheKeys.shift();
        delete cache[oldestKey];
      }
    }

    res.json(finalData);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
