const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ip = require('ip');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 3000;
const localIp = ip.address();
const shareUrl = `http://${localIp}:${port}`;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
const metadataPath = path.join(uploadsDir, 'metadata.json');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Load or initialize metadata
const getMetadata = () => {
    if (fs.existsSync(metadataPath)) {
        try {
            return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        } catch (e) { return {}; }
    }
    return {};
};

const saveMetadata = (data) => {
    fs.writeFileSync(metadataPath, JSON.stringify(data, null, 2));
};

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Keep original filename but ensure it's unique
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// API: Get initial info (URL and QR Code)
app.get('/api/info', async (req, res) => {
  try {
    const qrDataUrl = await QRCode.toDataURL(shareUrl);
    res.json({ url: shareUrl, ip: localIp, port: port, qrCode: qrDataUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// API: Generate QR code from text
app.get('/api/qr', async (req, res) => {
  const text = req.query.text;
  if (!text) return res.status(400).send('No text provided');
  try {
    const qrDataUrl = await QRCode.toDataURL(text);
    const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, "");
    const img = Buffer.from(base64Data, 'base64');
    res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': img.length });
    res.end(img);
  } catch (err) {
    res.status(500).send('Failed');
  }
});

// API: List files with protection info
app.get('/api/files', async (req, res) => {
  try {
    const metadata = getMetadata();
    const files = await fs.promises.readdir(uploadsDir);
    const fileInfos = files
        .filter(file => file !== '.gitkeep' && file !== 'metadata.json')
        .map(file => {
          const stats = fs.statSync(path.join(uploadsDir, file));
          const info = metadata[file] || {};
          const downloadUrl = `${shareUrl}/download/${encodeURIComponent(file)}`;
          
          return {
            name: file,
            originalName: file.split('-').slice(2).join('-') || file,
            size: stats.size,
            uploadDate: stats.mtime,
            isProtected: !!info.password,
            url: downloadUrl,
            id: uuidv4()
          };
        });
    res.json(fileInfos);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// API: Upload file with password
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const password = req.body.password;
  if (password) {
    const metadata = getMetadata();
    metadata[req.file.filename] = { password: password };
    saveMetadata(metadata);
  }
  res.json({ message: 'Success', file: req.file.filename });
});

// Endpoint: Download file (Checks password)
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);
    const providedPassword = req.query.p;

    if (!fs.existsSync(filePath)) return res.status(404).send('Not found');

    const metadata = getMetadata();
    const fileInfo = metadata[filename];

    if (fileInfo && fileInfo.password) {
        if (providedPassword === fileInfo.password) {
            return res.download(filePath, filename.split('-').slice(2).join('-'));
        } else {
            return res.send(`
                <html>
                <head>
                    <title>Secure Access | QuickShare</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body { background: #0b0e14; color: #ecedf6; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                        .card { background: #1c2028; padding: 3rem; border-radius: 24px; text-align: center; max-width: 400px; width: 90%; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
                        h3 { margin-top: 0; font-size: 1.5rem; }
                        input { width: 100%; padding: 14px; margin: 20px 0; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; background: #0b0e14; color: white; font-size: 1rem; }
                        button { background: #ba9eff; border: none; padding: 14px 28px; border-radius: 12px; font-weight: bold; cursor: pointer; width: 100%; font-size: 1rem; }
                        .error { color: #ff6e84; font-size: 0.85rem; margin-top: 15px; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <h3>🔒 Protected File</h3>
                        <p>This file is secured. Enter the password to unlock.</p>
                        <form method="get">
                            <input type="password" name="p" placeholder="Enter password" required autofocus>
                            <button type="submit">Unlock & Download</button>
                        </form>
                        ${providedPassword ? '<div class="error">Incorrect password. Please try again.</div>' : ''}
                    </div>
                </body>
                </html>
            `);
        }
    }
    res.download(filePath, filename.split('-').slice(2).join('-'));
});

// API: Delete file
app.delete('/api/files/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsDir, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    const metadata = getMetadata();
    delete metadata[filename];
    saveMetadata(metadata);
    res.json({ message: 'Deleted' });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

app.listen(port, () => {
  console.log(`-------------------------------------------`);
  console.log(`Local Share Server Running!`);
  console.log(`Access it at: ${shareUrl}`);
  console.log(`Access from mobile via QR on the home page`);
  console.log(`-------------------------------------------`);
});
