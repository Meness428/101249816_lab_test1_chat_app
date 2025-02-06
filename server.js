const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const db = "mongodb+srv://menessp:U9remAxPIGSFuRWr@cluster0.ucylq.mongodb.net/${labtest1}?retryWrites=true&w=majority&appName=Cluster0";

// Connect to MongoDB
mongoose.connect(db, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log("MongoDB connected..."))
    .catch(err => console.log(err))

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    firstname: String,
    lastname: String,
    password: String,
    createdOn: { type: Date, default: Date.now }
});

const groupMessageSchema = new mongoose.Schema({
    from_user: String,
    room: String,
    message: String,
    data_sent: { type: Date, default: Date.now }
});

const privateMessageSchema = new mongoose.Schema({
    from_user: String,
    to_user: String,
    message: String,
    date_sent: { type: Date, default: Date.now }
})

const User = mongoose.model("User", userSchema);
const GroupMessage = mongoose.model("GroupMessage", groupMessageSchema);
const PrivateMessage = mongoose.model("PrivateMessage", privateMessageSchema);

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/signup', async (req, res) => {
    const { username, firstname, lastname, password } = req.body;
    try {
        const newUser = new User({ username, firstname, lastname, password });
        await newUser.save();
        res.status(201).send("User created");
    } catch(err) {
        res.status(400).send("Error creating user");
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username, password });
        if (user) {
            res.status(200).send("Login successful");
        } else {
            res.status(400).send("Invalid credentials");
        }
    } catch (err) {
        res.status(500).send("Server error");
    }
});

io.on('connection', (socket) => {
    console.log("a user connected");

    socket.on("join room", (room) => {
        socket.join(room);
        console.log(`User joined room: ${room}`);
    });

    socket.on("leave room", (room) => {
        socket.leave(room);
        console.log(`User left room: ${room}`);
    });

    socket.on("chat message", (msg) => {
        const { room, message, from_user } = msg;
        const newMessage = new GroupMessage({ from_user, room, message });
        newMessage.save();
        io.to(room).emit("chat message", msg);
    });

    socket.on("typing", (data) => {
        socket.to(data.room).emit("typing", data);
    });
});

server.listen(3000, () => {
    console.log("Server is running on port 3000");
})