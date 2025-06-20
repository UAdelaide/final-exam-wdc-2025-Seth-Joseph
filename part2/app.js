const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');
const session = require('express-session');
require('dotenv').config();

const app = express();

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root', // Replace with your MySQL username
  password: '', // Replace with your MySQL password
  database: 'DogWalkService'
};

// Initialize database and insert sample data
async function initializeDatabase() {
  const connection = await mysql.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password
  });

  try {
    // Create database and tables
    await connection.query('CREATE DATABASE IF NOT EXISTS DogWalkService');
    await connection.query('USE DogWalkService');

    // Users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('owner', 'walker') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Dogs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Dogs (
        dog_id INT AUTO_INCREMENT PRIMARY KEY,
        owner_id INT NOT NULL,
        name VARCHAR(50) NOT NULL,
        size ENUM('small', 'medium', 'large') NOT NULL,
        FOREIGN KEY (owner_id) REFERENCES Users(user_id)
      )
    `);

    // WalkRequests table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS WalkRequests (
        request_id INT AUTO_INCREMENT PRIMARY KEY,
        dog_id INT NOT NULL,
        requested_time DATETIME NOT NULL,
        duration_minutes INT NOT NULL,
        location VARCHAR(255) NOT NULL,
        status ENUM('open', 'accepted', 'completed', 'cancelled') DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dog_id) REFERENCES Dogs(dog_id)
      )
    `);

    // WalkApplications table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS WalkApplications (
        application_id INT AUTO_INCREMENT PRIMARY KEY,
        request_id INT NOT NULL,
        walker_id INT NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
        FOREIGN KEY (request_id) REFERENCES WalkRequests(request_id),
        FOREIGN KEY (walker_id) REFERENCES Users(user_id),
        CONSTRAINT unique_application UNIQUE (request_id, walker_id)
      )
    `);

    // WalkRatings table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS WalkRatings (
        rating_id INT AUTO_INCREMENT PRIMARY KEY,
        request_id INT NOT NULL,
        walker_id INT NOT NULL,
        owner_id INT NOT NULL,
        rating INT CHECK (rating BETWEEN 1 AND 5),
        comments TEXT,
        rated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (request_id) REFERENCES WalkRequests(request_id),
        FOREIGN KEY (walker_id) REFERENCES Users(user_id),
        FOREIGN KEY (owner_id) REFERENCES Users(user_id),
        CONSTRAINT unique_rating_per_walk UNIQUE (request_id)
      )
    `);

    // Posts table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Posts (
        post_id INT AUTO_INCREMENT PRIMARY KEY,
        author_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        tags VARCHAR(255) NOT NULL,
        upvotes INT DEFAULT 0,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (author_id) REFERENCES Users(user_id)
      )
    `);

    // Insert sample users (including provided users)
    await connection.query(`
      INSERT IGNORE INTO Users (user_id, username, email, password_hash, role, created_at) VALUES
        (1, 'ownerJane', 'jane@xample.com', 'hashedpassword123', 'owner', '2025-06-06 01:32:58'),
        (2, 'walkerMike', 'mike@xample.com', 'hashedpassword456', 'walker', '2025-06-06 01:32:58'),
        (3, 'ownerBob', 'bob@xample.com', 'hashedpassword789', 'owner', '2025-06-06 01:32:58'),
        (4, 'alice123', 'alice@example.com', 'hashed123', 'owner', CURRENT_TIMESTAMP),
        (5, 'david789', 'david@example.com', 'hashed101', 'walker', CURRENT_TIMESTAMP)
    `);

    // Insert sample dogs
    await connection.query(`
      INSERT IGNORE INTO Dogs (owner_id, name, size) VALUES
        (1, 'Max', 'medium'),
        (3, 'Bella', 'small'),
        (1, 'Rex', 'large'),
        (3, 'Daisy', 'small'),
        (4, 'Luna', 'large')
    `);

    // Insert sample walk requests
    await connection.query(`
      INSERT IGNORE INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status) VALUES
        ((SELECT dog_id FROM Dogs WHERE name = 'Max'), '2025-06-10 08:00:00', 30, 'Parklands', 'open'),
        ((SELECT dog_id FROM Dogs WHERE name = 'Bella'), '2025-06-10 09:30:00', 45, 'Beachside Ave', 'accepted'),
        ((SELECT dog_id FROM Dogs WHERE name = 'Luna'), '2025-06-11 10:00:00', 60, 'City Park', 'open'),
        ((SELECT dog_id FROM Dogs WHERE name = 'Rex'), '2025-06-12 14:00:00', 30, 'River Walk', 'completed'),
        ((SELECT dog_id FROM Dogs WHERE name = 'Daisy'), '2025-06-13 16:30:00', 45, 'Suburban Lane', 'cancelled')
    `);

    // Insert sample walk applications
    await connection.query(`
      INSERT IGNORE INTO WalkApplications (request_id, walker_id, status) VALUES
        ((SELECT request_id FROM WalkRequests WHERE dog_id = (SELECT dog_id FROM Dogs WHERE name = 'Bella')), 2, 'accepted'),
        ((SELECT request_id FROM WalkRequests WHERE dog_id = (SELECT dog_id FROM Dogs WHERE name = 'Rex')), 2, 'accepted')
    `);

    // Insert sample walk ratings
    await connection.query(`
      INSERT IGNORE INTO WalkRatings (request_id, walker_id, owner_id, rating, comments) VALUES
        ((SELECT request_id FROM WalkRequests WHERE dog_id = (SELECT dog_id FROM Dogs WHERE name = 'Rex')), 2, 1, 4, 'Great walk!'),
        ((SELECT request_id FROM WalkRequests WHERE dog_id = (SELECT dog_id FROM Dogs WHERE name = 'Bella')), 2, 3, 5, 'Excellent service!')
    `);

    // Insert sample posts
    await connection.query(`
      INSERT IGNORE INTO Posts (author_id, title, content, tags, upvotes) VALUES
        (1, 'Best leash for small dogs?', 'Looking for recommendations on leashes for my small dog. Any suggestions?', 'leash small-dog', 3),
        (2, 'Tips for new dog walkers', 'Just started as a walker. Any tips for handling energetic dogs?', 'walking tips', 5),
        (3, 'Local dog parks', 'What are the best dog parks around Parklands?', 'dog-park location', 2)
    `);

    console.log('Database initialized with sample data');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await connection.end();
  }
}

// Initialize database on startup
initializeDatabase();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '/public')));
app.use(session({
  secret: 'dog-walking-secret', // Replace with a secure secret in production
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true in production with HTTPS
}));

// Routes
const walkRoutes = require('./routes/walkRoutes');
const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');

app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);

// Export the app
module.exports = app;