const express = require('express');
const axios = require('axios'); 
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const app = express();
const fs = require('fs');
const FormData = require('form-data');

// Connect to MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: 'root',
  password: 'root',
  database: 'videodb'
});



const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, 'temp-uploads');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + path.extname(file.originalname));
    }
  });

  const upload = multer({ storage });
// Middleware to validate JWT
const validateToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  console.log(token);

  if (!token) return res.status(401).send('Unauthorized');

  try {
    await axios.get(`http://auth:3000/validate`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    next();
  } catch (err) {
    res.status(401).send('Invalid token');
  }
};

app.post('/upload', validateToken, upload.single('video'), async (req, res) => {
    try {
      // 1. Read the file from the temporary path
      const fileStream = fs.createReadStream(req.file.path);
  
      // 2. Forward to File Service
      const form = new FormData();
      form.append('video', fileStream, {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });
  
      const fileResponse = await axios.post(
        `${process.env.FILE_SERVICE}/upload`,
        form,
        { headers: form.getHeaders() }
      );
  
      // 3. Cleanup: Delete the temporary file
      fs.unlinkSync(req.file.path);
  
      // 4. Save metadata to MySQL
      await pool.query(
        'INSERT INTO videos (name, path) VALUES (?, ?)',
        [req.file.originalname, fileResponse.data.path]
      );
  
      res.send('Video uploaded!');
    } catch (err) {
      console.error(err);
      res.status(500).send('Upload failed');
    }
  });
  
app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <body>
         
          <div id="login">
            <h2>Login</h2>
            <input type="text" id="username" placeholder="Username" />
            <input type="password" id="password" placeholder="Password" />
            <button onclick="login()">Login</button>
          </div>
  
          
          <div id="uploadForm" style="display: none;">
            <h2>Upload Video</h2>
            <input type="file" id="videoFile" />
            <button onclick="uploadVideo()">Upload</button>
          </div>
  
          <script>
            let token = null;
  
            async function login() {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('http://localhost:3000/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
                });

                const data = await response.json(); 

                if (response.ok) {
                token = data.token;
                document.getElementById('login').style.display = 'none';
                document.getElementById('uploadForm').style.display = 'block';
                } else {
                alert(data.error || 'Login failed!'); 
                }
            } catch (err) {
                alert('Network error. Check the auth service!'); 
            }
            }
  
            
            async function uploadVideo() {
              const fileInput = document.getElementById('videoFile');
              const file = fileInput.files[0];
              
              const formData = new FormData();
              formData.append('video', file);
  
              const response = await fetch('/upload', {
                method: 'POST',
                headers: {
                  Authorization: 'Bearer ' + token 
                },
                body: formData
              });
  
              if (response.ok) {
                alert('Video uploaded!');
              } else {
                alert('Upload failed!');
              }
            }
          </script>
        </body>
      </html>
    `);
  });

app.listen(3000, () => console.log('Upload service running on 3000'));