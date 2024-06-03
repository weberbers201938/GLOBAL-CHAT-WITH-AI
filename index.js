const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const upload = multer({ dest: 'uploads/' });

let users = [];
let messages = [];

// Load users and messages from JSON files
const loadData = () => {
    if (fs.existsSync('users.json')) {
        users = JSON.parse(fs.readFileSync('users.json', 'utf-8'));
    }
    if (fs.existsSync('messages.json')) {
        messages = JSON.parse(fs.readFileSync('messages.json', 'utf-8'));
    }
};

// Save users and messages to JSON files
const saveData = () => {
    fs.writeFileSync('users.json', JSON.stringify(users));
    fs.writeFileSync('messages.json', JSON.stringify(messages));
};

loadData();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.post('/sendMessage', async (req, res) => {
    const { sender, message } = req.body;

    if (message.toLowerCase().startsWith('help')) {
        const commands = "Available commands:\n/help - Show this help message\n/ai <your_message> - Talk to AI";
        const helpMsg = { sender: 'System', message: commands, type: 'text' };
        messages.push(helpMsg);
        saveData();
        io.emit('message', helpMsg);
        return res.json({ success: true });
    }

    const msg = { sender, message, type: 'text' };
    messages.push(msg);
    saveData();
    io.emit('message', msg);
    res.json({ success: true });

    if (message.toLowerCase().startsWith('ai ')) {
        const aiMessage = message.slice(4);
        const aiResponse = await getAIResponse(aiMessage);
        const aiMsg = { sender: 'AI', message: aiResponse, type: 'text' };
        messages.push(aiMsg);
        saveData();
        io.emit('message', aiMsg);
    }
});

app.post('/uploadImage', upload.single('image'), (req, res) => {
    const sender = req.body.sender;
    const imgUrl = `/uploads/${req.file.filename}`;
    const msg = { sender, message: imgUrl, type: 'image' };
    messages.push(msg);
    saveData();
    io.emit('message', msg);
    res.json({ success: true });
});

app.get('/uploads/:filename', (req, res) => {
    res.sendFile(path.join(__dirname, 'uploads', req.params.filename));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(user => user.username === username);
    if (user && user.password === password) {
        user.status = 'online';
        saveData();
        res.json({ success: true });
    } else {
        res.json({ success: false, message: 'Incorrect username or password' });
    }
});

app.post('/signup', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(user => user.username === username);
    if (user) {
        res.json({ success: false, message: 'Username already exists' });
    } else {
        users.push({ username, password, status: 'offline' });
        saveData();
        res.json({ success: true });
    }
});

app.post('/logout', (req, res) => {
    const { username } = req.body;
    const user = users.find(user => user.username === username);
    if (user) {
        user.status = 'offline';
        saveData();
        res.json({ success: true });
    } else {
        res.json({ success: false, message: 'User not found' });
    }
});

app.get('/loadChatHistory', (req, res) => {
    res.json(messages);
});

app.get('/getUserList', (req, res) => {
    res.json(users);
});

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('userConnected', (username) => {
        const user = users.find(user => user.username === username);
        if (user) {
            user.status = 'online';
        }
        saveData();
        io.emit('message', { sender: 'System', message: `${username} has joined the chat`, type: 'text' });
    });

    socket.on('userDisconnected', (username) => {
        const user = users.find(user => user.username === username);
        if (user) {
            user.status = 'offline';
        }
        saveData();
        io.emit('message', { sender: 'System', message: `${username} has left the chat`, type: 'text' });
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Function to get AI response using new API
const apiKey = 'j86bwkwo-8hako-12C';  // Your API Key

async function getAIResponse(question) {
    try {
        const response = await axios.get('https://liaspark.chatbotcommunity.ltd/@hazeyy01/api/bard', {
            params: {
                key: apiKey,
                query: question,
            }
        });
        return response.data.message;
    } catch (error) {
        console.error('Error with AI response:', error);
        return 'Sorry, I am having trouble understanding you right now.';
    }
}
