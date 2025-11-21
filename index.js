import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch"; // ← tambahkan ini

dotenv.config();


const app = express();

// Pakai CORS sesuai FRONTEND_URL
app.use(cors({
  origin: process.env.FRONTEND_URL
}));

// Route test di root
app.get("/", (req, res) => {
  res.send("Backend is running!"); // <- ini harus muncul di browser
});

// Contoh endpoint keyword YouTube
app.get("/api/keywords", async (req, res) => {
  const query = req.query.query;
  if (!query) return res.status(400).json({ error: "Query is required" });

  try {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&key=${process.env.YOUTUBE_API_KEY}&maxResults=5`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
