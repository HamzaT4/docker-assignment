const express = require('express');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const app = express();
const cors = require('cors');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: 'videodb'
});

app.use(cors());
app.use(express.json());

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (username === "admin" && password === "admin") {
      const token = jwt.sign({ user: username }, 'secret');
      res.json({ token });
    } else {
      res.status(401).json({ error: 'Invalid credentials' }); 
    }
  });
  app.get('/validate', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    console.log("Token:", token);
    console.log("Secret:", 'secret'); // Confirm secret matches
  
    if (!token) return res.status(401).json({ error: 'No token' });
  
    try {
      // Explicitly use HS256 algorithm
      const decoded = jwt.verify(token, 'secret', { algorithms: ['HS256'] });
      console.log("Decoded token:", decoded); // Log decoded payload
      res.json({ valid: true });
    } catch (err) {
      console.error("JWT Verify Error:", err.message); // Log exact error
      res.status(401).json({ error: 'Invalid token' });
    }
  });

app.listen(3000, () => console.log('Auth service running on 3000'));