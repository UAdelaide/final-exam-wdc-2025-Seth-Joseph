// This script will initialize the DogWalkService database with test data for development.
const mysql = require('mysql2/promise');

(async () => {
  const pool = await mysql.createPool({
    host: 'localhost',
    user: 'root',
    database: 'DogWalkService',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  const conn = await pool.getConnection();
  try {
    // Clear tables for repeatable runs
    await conn.query('DELETE FROM WalkRatings');
    await conn.query('DELETE FROM WalkApplications');
    await conn.query('DELETE FROM WalkRequests');
    await conn.query('DELETE FROM Dogs');
    await conn.query('DELETE FROM Users');

    // Insert users
    await conn.query(`INSERT INTO Users (username, email, password_hash, role) VALUES
      ('alice123', 'alice@example.com', 'hash1', 'owner'),
      ('carol123', 'carol@example.com', 'hash2', 'owner'),
      ('bobwalker', 'bob@example.com', 'hash3', 'walker'),
      ('newwalker', 'newwalker@example.com', 'hash4', 'walker')
    `);

    // Get user ids
    const [users] = await conn.query('SELECT * FROM Users');
    const alice = users.find(u => u.username === 'alice123');
    const carol = users.find(u => u.username === 'carol123');
    const bob = users.find(u => u.username === 'bobwalker');
    const newwalker = users.find(u => u.username === 'newwalker');

    // Insert dogs
    await conn.query(`INSERT INTO Dogs (owner_id, name, size) VALUES
      (${alice.user_id}, 'Max', 'medium'),
      (${carol.user_id}, 'Bella', 'small')
    `);
    const [dogs] = await conn.query('SELECT * FROM Dogs');
    const max = dogs.find(d => d.name === 'Max');
    // Insert walk requests
    await conn.query(`INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status) VALUES
      (${max.dog_id}, '2025-06-10T08:00:00.000Z', 30, 'Parklands', 'open'),
      (${max.dog_id}, '2025-06-11T09:00:00.000Z', 45, 'Greenfield', 'completed')
    `);
    const [walks] = await conn.query('SELECT * FROM WalkRequests');
    const openWalk = walks.find(w => w.status === 'open');
    const completedWalk = walks.find(w => w.status === 'completed');
    // Insert walk applications
    await conn.query(`INSERT INTO WalkApplications (request_id, walker_id, status) VALUES
      (${completedWalk.request_id}, ${bob.user_id}, 'accepted')
    `);
    // Insert walk ratings
    await conn.query(`INSERT INTO WalkRatings (request_id, walker_id, owner_id, rating, comments) VALUES
      (${completedWalk.request_id}, ${bob.user_id}, ${alice.user_id}, 5, 'Great walk!'),
      (${completedWalk.request_id}, ${bob.user_id}, ${alice.user_id}, 4, 'Very good!')
    `);
    console.log('Database initialized with test data.');
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    conn.release();
    pool.end();
  }
})();
