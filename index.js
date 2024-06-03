const express = require('express');
const app = express();
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const cors = require('cors');

app.use(express.json());
app.use(express.static('public'));
app.use(cors());

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'public', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// File paths
const usersFilePath = path.join(__dirname, 'users', 'users.json');
const chatHistoryFilePath = path.join(__dirname, 'data', 'chat_history.json');

// Helper functions
const readJsonFile = (filePath) => {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
};

const writeJsonFile = (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// Ensure files exist
if (!fs.existsSync(usersFilePath)) {
    fs.writeFileSync(usersFilePath, JSON.stringify([]));
}

if (!fs.existsSync(chatHistoryFilePath)) {
    fs.writeFileSync(chatHistoryFilePath, JSON.stringify([]));
}

// Routes
app.post('/signup', (req, res) => {
    const { username, password } = req.body;
    const users = readJsonFile(usersFilePath);

    if (users.find(user => user.username === username)) {
        return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    users.push({ username, password, status: 'offline' });
    writeJsonFile(usersFilePath, users);

    res.json({ success: true, username });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const users = readJsonFile(usersFilePath);

    const user = users.find(user => user.username === username && user.password === password);

    if (!user) {
        return res.status(400).json({ success: false, message: 'Invalid username or password' });
    }

    user.status = 'online';
    writeJsonFile(usersFilePath, users);

    res.json({ success: true, username });
});

app.post('/logout', (req, res) => {
    const { username } = req.body;
    const users = readJsonFile(usersFilePath);

    const user = users.find(user => user.username === username);

    if (!user) {
        return res.status(400).json({ success: false, message: 'User not found' });
    }

    user.status = 'offline';
    writeJsonFile(usersFilePath, users);

    res.json({ success: true });
});

app.post('/uploadMedia', upload.single('media'), (req, res) => {
    const { sender } = req.body;
    const message = {
        sender,
        message: `/uploads/${req.file.filename}`,
        type: req.file.mimetype.startsWith('image') ? 'image' : 'video'
    };

    const chatHistory = readJsonFile(chatHistoryFilePath);
    chatHistory.push(message);
    writeJsonFile(chatHistoryFilePath, chatHistory);

    res.json({ success: true });
});

app.get('/loadChatHistory', (req, res) => {
    const chatHistory = readJsonFile(chatHistoryFilePath);
    res.json(chatHistory);
});

app.get('/users', (req, res) => {
    const users = readJsonFile(usersFilePath);
    res.json(users);
});

app.post('/chatMessage', (req, res) => {
    const { sender, message } = req.body;

    const chatMessage = {
        sender,
        message,
        type: 'text'
    };

    const chatHistory = readJsonFile(chatHistoryFilePath);
    chatHistory.push(chatMessage);
    writeJsonFile(chatHistoryFilePath, chatHistory);

    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
