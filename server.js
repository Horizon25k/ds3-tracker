const express = require("express");
const { Pool } = require("pg");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/progress/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      "SELECT gestures, rings, sorceries, pyromancies, miracles FROM user_progress WHERE user_id = $1",
      [userId]
    );
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.json({ gestures: [], rings: [], sorceries: [], pyromancies: [], miracles: [] });
    }
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/progress/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { gestures, rings, sorceries, pyromancies, miracles } = req.body;

    const existing = await pool.query(
      "SELECT gestures, rings, sorceries, pyromancies, miracles FROM user_progress WHERE user_id = $1",
      [userId]
    );

    let current = existing.rows[0] || {};

    const finalGestures = gestures !== undefined ? gestures : (current.gestures || []);
    const finalRings = rings !== undefined ? rings : (current.rings || []);
    const finalSorceries = sorceries !== undefined ? sorceries : (current.sorceries || []);
    const finalPyromancies = pyromancies !== undefined ? pyromancies : (current.pyromancies || []);
    const finalMiracles = miracles !== undefined ? miracles : (current.miracles || []);

    await pool.query(
      `INSERT INTO user_progress (user_id, gestures, rings, sorceries, pyromancies, miracles, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          gestures = EXCLUDED.gestures, 
          rings = EXCLUDED.rings, 
          sorceries = EXCLUDED.sorceries, 
          pyromancies = EXCLUDED.pyromancies, 
          miracles = EXCLUDED.miracles, 
          updated_at = NOW()`,
      [
        userId,
        JSON.stringify(finalGestures),
        JSON.stringify(finalRings),
        JSON.stringify(finalSorceries),
        JSON.stringify(finalPyromancies),
        JSON.stringify(finalMiracles)
      ]
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