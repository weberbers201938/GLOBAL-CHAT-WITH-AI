const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = process.env.PORT || 3000;

let database = { users: [], messages: [] };

const loadDatabase = () => {
    if (fs.existsSync('database.json')) {
        const data = fs.readFileSync('database.json');
        database = JSON.parse(data);
    }
};

const saveDatabase = () => {
    fs.writeFileSync('database.json', JSON.stringify(database, null, 2));
};

loadDatabase();

app.use(bodyParser.json());
app.use(express.static('public'));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.post('/signup', (req, res) => {
    const { username, password } = req.body;
    if (database.users.find(user => user.username === username)) {
        res.json({ success: false, message: 'Username already taken' });
    } else {
        database.users.push({ username, password, status: 'offline' });
        saveDatabase();
        res.json({ success: true });
    }
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = database.users.find(user => user.username === username && user.password === password);
    if (user) {
        // Update user status to 'online'
        database.users = database.users.map(u => u.username === username ? { ...u, status: 'online' } : u);
        saveDatabase();
        // Notify all clients about the updated user list
        io.emit('userListUpdate', database.users);
        res.json({ success: true });
    } else {
        res.json({ success: false, message: 'Invalid username or password' });
    }
});

app.post('/logout', (req, res) => {
    const { username } = req.body;
    database.users = database.users.map(user => user.username === username ? { ...user, status: 'offline' } : user);
    saveDatabase();
    io.emit('userListUpdate', database.users); // Notify all clients about the updated user list
    res.json({ success: true });
});

app.get('/getUserList', (req, res) => {
    res.json(database.users);
});

app.get('/loadChatHistory', (req, res) => {
    res.json(database.messages);
});

app.post('/sendMessage', (req, res) => {
    const { sender, message } = req.body;

    const newMessage = { sender, message, type: 'text' };
    database.messages.push(newMessage);
    saveDatabase();

    io.emit('message', newMessage);

    // Check for custom command
    if (message.toLowerCase().startsWith('help')) {
        const helpMessage = {
            sender: 'AI',
            message: 'Available commands:\n1. help - Show this help message\n2. other commands...',
            type: 'text'
        };
        database.messages.push(helpMessage);
        saveDatabase();
        io.emit('message', helpMessage);
    }

    res.json({ success: true });
});

app.post('/uploadMedia', upload.single('media'), (req, res) => {
    if (req.file) {
        const fileType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
        const newMessage = { sender: req.body.sender, message: '/uploads/' + req.file.filename, type: fileType };
        database.messages.push(newMessage);
        saveDatabase();
        io.emit('message', newMessage);
        res.json({ success: true });
    } else {
        res.json({ success: false, message: 'Failed to upload file' });
    }
});

io.on('connection', (socket) => {
    socket.on('userConnected', (username) => {
        database.users = database.users.map(user => user.username === username ? { ...user, status: 'online' } : user);
        saveDatabase();
        io.emit('userListUpdate', database.users);
    });

    socket.on('userDisconnected', (username) => {
        database.users = database.users.map(user => user.username === username ? { ...user, status: 'offline' } : user);
        saveDatabase();
        io.emit('userListUpdate', database.users);
    });
});

server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
                        
