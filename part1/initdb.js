// Utility to initialize the DogWalkService database and insert test data
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

async function initializeDatabase() {
  // Connect to MySQL without specifying a database
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    multipleStatements: true
  });

  // Run the schema SQL
  const schemaSql = fs.readFileSync(path.join(__dirname, 'dogwalks.sql'), 'utf8');
  await connection.query(schemaSql);
  await connection.end();

  // Now connect to the DogWalkService database
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'DogWalkService'
  });

  // Insert test users (owners and walkers)
  await db.query(`INSERT IGNORE INTO Users (username, email, password_hash, role) VALUES
    ('alice123', 'alice@example.com', 'hash1', 'owner'),
    ('carol123', 'carol@example.com', 'hash2', 'owner'),
    ('bobwalker', 'bob@example.com', 'hash3', 'walker'),
    ('newwalker', 'new@example.com', 'hash4', 'walker')
  `);

  // Insert test dogs
  await db.query(`INSERT IGNORE INTO Dogs (owner_id, name, size) VALUES
    (1, 'Max', 'medium'),
    (2, 'Bella', 'small')
  `);

  // Insert test walk requests
  await db.query(`INSERT IGNORE INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status) VALUES
    (1, '2025-06-10 08:00:00', 30, 'Parklands', 'open'),
    (2, '2025-06-11 09:00:00', 45, 'Greenfield', 'completed')
  `);

  // Insert test walk ratings (for completed walks)
  await db.query(`INSERT IGNORE INTO WalkRatings (request_id, walker_id, owner_id, rating, comments) VALUES
    (2, 3, 2, 5, 'Great walk!')
  `);

  await db.end();
}

module.exports = initializeDatabase;
