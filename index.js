const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

let users = [];
let messages = [];

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Middleware to serve static files and parse JSON
app.use(express.static('public'));
app.use(express.json());

// Routes for login and signup
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(user => user.username === username && user.password === password);

    if (user) {
        res.json({ success: true });
    } else {
        res.json({ success: false, message: 'Invalid username or password' });
    }
});

app.post('/signup', (req, res) => {
    const { username, password } = req.body;
    const userExists = users.some(user => user.username === username);

    if (userExists) {
        res.json({ success: false, message: 'Username already taken' });
    } else {
        users.push({ username, password });
        res.json({ success: true });
    }
});

// Route to get online users
app.get('/users', (req, res) => {
    res.json({ users: users.map(user => user.username) });
});

// Route to get chat messages
app.get('/messages', (req, res) => {
    res.json({ messages });
});

// Route to send chat messages
app.post('/messages', (req, res) => {
    const { text, sender } = req.body;
    const message = { text, sender, timestamp: Date.now() };
    messages.push(message);
    res.json({ success: true });
});

// Route to upload files
app.post('/upload', upload.single('file'), (req, res) => {
    const file = req.file;
    const sender = req.body.sender;
    const fileType = file.mimetype;
    const fileUrl = `/uploads/${file.filename}`;

    const message = {
        text: 'Sent an attachment',
        sender,
        fileType,
        fileUrl,
        timestamp: Date.now()
    };

    messages.push(message);
    res.json({ success: true, url: fileUrl });
});

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
