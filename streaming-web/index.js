const express = require('express');
const axios = require('axios');
const mysql = require('mysql2/promise');
const app = express();

// Connect to MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: 'root',
  password: 'root',
  database: 'videodb'
});

// Middleware to validate JWT
const validateToken = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' }); // Return JSON
  
    try {
      await axios.get(`http://auth:3000/validate`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' }); // Return JSON
    }
  };

// List videos
app.get('/videos', validateToken, async (req, res) => {
  try {
    const [videos] = await pool.query('SELECT * FROM videos');
    res.json(videos);
  } catch (err) {
    res.status(500).send('Failed to fetch videos');
  }
});

app.get('/stream/:id', validateToken, async (req, res) => {
    try {
      const [video] = await pool.query('SELECT path FROM videos WHERE id = ?', [req.params.id]);
      const filePath = video[0].path;
      const filename = filePath.split('/').pop();
      const token = encodeURIComponent(req.headers.authorization.split(' ')[1]); // Encode token
      
      res.send(`http://localhost:3003/download/${filename}?token=${token}`); // Include encoded token
    } catch (err) {
      res.status(404).json({ error: 'Video not found' });
    }
  });

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
    <html>
      <body>
      <h1>Atypon Tube<h1>
        <!-- Login Form -->
        <div id="login">
          <h2>Login</h2>
          <input type="text" id="username" placeholder="Username" />
          <input type="password" id="password" placeholder="Password" />
          <button onclick="login()">Login</button>
        </div>

        <!-- Video List and Player Container -->
        <div id="videoList" style="display: none;">
          <h1>Video List</h1>
          <div style="display: flex; gap: 20px;">
            <!-- Video List (Left Side) -->
            <div id="videos" style="width: 30%;"></div>
            
            <!-- Video Player (Right Side) -->
            <div style="width: 60%;">
              <video id="videoPlayer" controls 
                style="width: 100%; height: 680px; object-fit: cover; border-radius: 8px;">
              </video>
            </div>
          </div>
        </div>
          <script>
            let token = null;
  
            async function login() {
              const username = document.getElementById('username').value;
              const password = document.getElementById('password').value;
              
              const response = await fetch('http://localhost:3000/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
              });
  
              if (response.ok) {
                const data = await response.json();
                token = data.token;
                document.getElementById('login').style.display = 'none';
                document.getElementById('videoList').style.display = 'block';
                loadVideos();
              } else {
                alert('Login failed!');
              }
            }
  
            async function loadVideos() {   
              try {
                const response = await fetch('/videos', {
                  headers: { Authorization: 'Bearer ' + token }
                });
                const videos = await response.json();
  
                // String concatenation instead of template literals
                const html = videos.map(video => 
                  '<p>' +
                    '<a href="#" onclick="streamVideo(\\'' + video.id + '\\')">' + 
                      video.name +
                    '</a>' +
                  '</p>'
                ).join('');
                
                document.getElementById('videos').innerHTML = html;
              } catch (err) {
                alert('Failed to load videos');
              }
            }
  
             async function streamVideo(videoId) {
            try {
              const response = await fetch(\`/stream/\${videoId}\`, {
                headers: { Authorization: 'Bearer ' + token }
              });
              
              if (response.ok) {
                const videoUrl = await response.text();
                const videoPlayer = document.getElementById('videoPlayer');
                videoPlayer.src = videoUrl;
                videoPlayer.style.display = 'block';
              }
            } catch (err) {
              alert('Streaming error');
            }
          }
          </script>
        </body>
      </html>
    `);
  });
  

app.listen(3000, () => console.log('Streaming service running on 3000'));