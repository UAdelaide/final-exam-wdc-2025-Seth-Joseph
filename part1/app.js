const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
const PORT = 8080;

let db;

// Connect and seed database
async function initDatabase() {
  try {
    db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'DogWalkService',
      multipleStatements: true
    });

    // Seed users
    await db.query(`
      INSERT IGNORE INTO Users (username, email, password_hash, role)
      VALUES
        ('alice123', 'alice@example.com', 'hashed123', 'owner'),
        ('bobwalker', 'bob@example.com', 'hashed456', 'walker'),
        ('carol123', 'carol@example.com', 'hashed789', 'owner'),
        ('soobth', 'soobth@example.com', 'hashed321', 'walker'),
        ('sroob', 'sroob@example.com', 'hashed654', 'owner');
    `);

    // Seed dogs
    await db.query(`
    INSERT IGNORE INTO Dogs (owner_id, name, size)
        SELECT user_id, 'Max', 'medium' FROM Users WHERE username = 'alice123'
        UNION
        SELECT user_id, 'Bella', 'small' FROM Users WHERE username = 'carol123'
        UNION
        SELECT user_id, 'Sagar', 'large' FROM Users WHERE username = 'alice123'
        UNION
        SELECT user_id, 'Ishu', 'medium' FROM Users WHERE username = 'sroob'
        UNION
        SELECT user_id, 'Pathram', 'small' FROM Users WHERE username = 'sroob';
    `);


    // Seed walk requests
    await db.query(`
    INSERT IGNORE INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status)
        SELECT dog_id, '2025-06-10 08:00:00', 30, 'Parklands', 'open'
        FROM Dogs WHERE name = 'Max' AND owner_id = (SELECT user_id FROM Users WHERE username = 'alice123')
        UNION
        SELECT dog_id, '2025-06-10 09:30:00', 45, 'Beachside Ave', 'accepted'
        FROM Dogs WHERE name = 'Bella' AND owner_id = (SELECT user_id FROM Users WHERE username = 'carol123')
        UNION
        SELECT dog_id, '2025-06-11 10:00:00', 60, 'City Square', 'open'
        FROM Dogs WHERE name = 'Sagar' AND owner_id = (SELECT user_id FROM Users WHERE username = 'alice123')
        UNION
        SELECT dog_id, '2025-06-12 14:00:00', 30, 'Kollaithazham', 'open'
        FROM Dogs WHERE name = 'Ishu' AND owner_id = (SELECT user_id FROM Users WHERE username = 'sroob')
        UNION
        SELECT dog_id, '2025-06-13 16:00:00', 20, 'Mundupalam', 'cancelled'
        FROM Dogs WHERE name = 'Pathram' AND owner_id = (SELECT user_id FROM Users WHERE username = 'sroob');
    `);


    console.log("Database seeded successfully.");
  } catch (err) {
    console.error("Database init error:", err);
    process.exit(1);
  }
}

// GET /api/dogs
app.get('/api/dogs', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT d.name AS dog_name, d.size, u.username AS owner_username
      FROM Dogs d
      JOIN Users u ON d.owner_id = u.user_id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch dogs." });
  }
});

// GET /api/walkrequests/open
app.get('/api/walkrequests/open', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT wr.request_id, d.name AS dog_name, wr.requested_time, wr.duration_minutes, wr.location, u.username AS owner_username
      FROM WalkRequests wr
      JOIN Dogs d ON wr.dog_id = d.dog_id
      JOIN Users u ON d.owner_id = u.user_id
      WHERE wr.status = 'open'
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch open walk requests." });
  }
});

// GET /api/walkers/summary
app.get('/api/walkers/summary', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        u.username AS walker_username,
        COUNT(r.rating_id) AS total_ratings,
        ROUND(AVG(r.rating), 1) AS average_rating,
        COUNT(DISTINCT wr.request_id) AS completed_walks
      FROM Users u
      LEFT JOIN WalkRatings r ON u.user_id = r.walker_id
      LEFT JOIN WalkRequests wr ON wr.request_id = r.request_id AND wr.status = 'completed'
      WHERE u.role = 'walker'
      GROUP BY u.user_id
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch walkers summary." });
  }
});

// Start server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
