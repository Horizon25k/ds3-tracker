const express = require("express");
const { Pool } = require("pg");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

// เชื่อมต่อ Neon DB ผ่าน Environment Variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// API สำหรับโหลดข้อมูลความคืบหน้า
app.get("/api/progress/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      "SELECT gestures, rings FROM user_progress WHERE user_id = $1",
      [userId],
    );
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.json({ gestures: [], rings: [] });
    }
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: "Database connection failed" });
  }
});

// API สำหรับบันทึกข้อมูลความคืบหน้า
app.post("/api/progress/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { gestures, rings } = req.body;

    await pool.query(
      `INSERT INTO user_progress (user_id, gestures, rings, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id) 
       DO UPDATE SET gestures = $2, rings = $3, updated_at = NOW()`,
      [userId, JSON.stringify(gestures), JSON.stringify(rings)],
    );

    res.json({ success: true, message: "Saved to Neon DB" });
  } catch (err) {
    console.error("Save error:", err);
    res.status(500).json({ error: "Save failed" });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
