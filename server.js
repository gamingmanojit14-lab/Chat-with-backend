import express from "express";
import http from "http";
import { Server } from "socket.io";
import crypto from "crypto";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.json());

const rooms = new Map();

function generateRoomId() {
    return crypto.randomBytes(8).toString("hex");
}

app.get("/", (req, res) => {
    res.send("Secure Chat Backend Running");
});

app.post("/create-room", (req, res) => {

    const { roomName, password } = req.body;

    if (!roomName || !password) {
        return res.status(400).json({
            error: "Room name and password required"
        });
    }

    const roomId = generateRoomId();

    rooms.set(roomId, {
        roomName,
        password,
        createdAt: Date.now()
    });

    res.json({
        roomId,
        joinLink: `/room/${roomId}`
    });
});

io.on("connection", (socket) => {

    socket.on("join-room", ({ roomId, password }) => {

        const room = rooms.get(roomId);

        if (!room) {
            return socket.emit("error-message", "Room not found");
        }

        if (room.password !== password) {
            return socket.emit("error-message", "Wrong password");
        }

        socket.join(roomId);

        socket.emit("joined", {
            roomId,
            roomName: room.roomName
        });

        socket.to(roomId).emit("system-message", "A user joined");
    });

    socket.on("chat-message", ({ roomId, encryptedMessage }) => {

        io.to(roomId).emit("new-message", {
            encryptedMessage
        });

    });

    socket.on("disconnect", () => {
        console.log("User disconnected");
    });

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
});
