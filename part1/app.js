var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const mysql = require('mysql2/promise');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');



var app = express();
const PORT = 3000;
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'DogWalkService',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', indexRouter);
app.use('/users', usersRouter);

app.get('/api/dogs', async (req, res) => {
    try {
        const [rows] = await pool.query(`
      SELECT d.name AS dog_name, d.size, u.username AS owner_username
      FROM Dogs d
      JOIN Users u ON d.owner_id = u.user_id
    `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.get('/api/walkrequests/open', async (req, res) => {
    try {
        const [rows] = await pool.query(`
      SELECT wr.request_id, d.name AS dog_name, wr.requested_time,
             wr.duration_minutes, wr.location, u.username AS owner_username
      FROM WalkRequests wr
      JOIN Dogs d ON wr.dog_id = d.dog_id
      JOIN Users u ON d.owner_id = u.user_id
      WHERE wr.status = 'open'
    `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/walkers/summary', async (req, res) => {
    try {
        const [rows] = await pool.query(`
      SELECT
        u.username AS walker_username,
        COUNT(wr.rating_id) AS total_ratings,
        ROUND(AVG(wr.rating), 1) AS average_rating,
        COUNT(DISTINCT CASE WHEN wr.status = 'completed' THEN wr.request_id END) AS completed_walks
      FROM Users u
      LEFT JOIN WalkRatings wr ON wr.walker_id = u.user_id
      WHERE u.role = 'walker'
      GROUP BY u.user_id
    `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
module.exports = app;