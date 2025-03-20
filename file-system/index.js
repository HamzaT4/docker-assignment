const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const cors = require('cors'); 

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});



const upload = multer({ storage });
const app = express();

app.use(cors({
    origin: 'http://localhost:3002'
  }));

const validateToken = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    console.log(token);
    
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
    try {
      await axios.get(`http://auth:3000/validate`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

app.post('/upload', upload.single('video'), (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded');
    res.json({ path: req.file.path });
});

app.get('/download/:filename', async (req, res) => {
    try {
      const token = decodeURIComponent(req.query.token); // Decode token
      if (!token) return res.status(401).json({ error: 'Token missing' });
  
      // Validate token with Auth Service
      const response = await axios.get(`http://auth:3000/validate`, {
        headers: { Authorization: `Bearer ${token}` }
      });
  
      if (response.status === 200) {
        res.sendFile(path.join(__dirname, 'uploads', req.params.filename));
      } else {
        res.status(401).json({ error: 'Invalid token' });
      }
    } catch (err) {
      console.error('Token validation failed:', err.message);
      res.status(401).json({ error: 'Token validation failed' });
    }
  });
app.listen(3000, () => console.log('File service running on 3000'));