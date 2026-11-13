const express = require("express");
const { Pool } = require("pg");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/progress/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      "SELECT gestures, rings FROM user_progress WHERE user_id = $1",
      [userId]
    );
    if (result.rows.length > 0) res.json(result.rows[0]);
    else res.json({ gestures: [], rings: [] });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/progress/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { gestures, rings } = req.body;
    await pool.query(
      `INSERT INTO user_progress (user_id, gestures, rings, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id) 
       DO UPDATE SET gestures = COALESCE($2, user_progress.gestures), rings = COALESCE($3, user_progress.rings), updated_at = NOW()`,
      [userId, JSON.stringify(gestures || []), JSON.stringify(rings || [])]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Save failed" });
  }
});

app.get("/api/config", (req, res) => {
  res.json({
    apiKey: process.env.apiKey,
    authDomain: process.env.authDomain,
    projectId: process.env.projectId,
    storageBucket: process.env.storageBucket,
    messagingSenderId: process.env.messagingSenderId,
    appId: process.env.appId,
  });
});

app.listen(port, () => console.log(`Server running on port ${port}`));