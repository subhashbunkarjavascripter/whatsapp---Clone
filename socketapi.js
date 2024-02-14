 // socketapi.js

const io = require("socket.io")();
const users = require('./routes/users.js');
const msgModel = require('./routes/msg.js');

const socketapi = {
    io: io
};

// User tracking object
const connectedUsers = {};

// Add your socket.io logic here!
io.on("connection", function (socket) {
    console.log("A user connected");

    socket.on('userConnected', async msg => {
        connectedUsers[msg.username] = socket.id;
        console.log(`User connected: ${msg.username}`);
        io.emit('updateUserStatus', getUsersStatus());
    });

    socket.on('newmsg', async msg => {
        try {
            const toUser = await users.findOne({ username: msg.toUser });
            const fromUser = await users.findOne({ username: msg.fromUser });

            if (!toUser || !fromUser) {
                console.error('To user or from user not found.');
                return;
            }

            const indexOfFromUser = toUser.chats.indexOf(fromUser._id);
            if (indexOfFromUser === -1) {
                toUser.chats.push(fromUser._id);
                fromUser.chats.push(toUser._id);
                await toUser.save();
                await fromUser.save();
                msg.newChat = true;
            }

            msg.fromUserPic = fromUser.pic;

            // Add these lines to handle attachments
            const { messageType, content, fileName } = msg;
            const isAttachment = messageType !== 'text' && content;

            if (isAttachment) {
                msg.messageType = messageType;
                msg.content = content;
                msg.fileName = fileName;
            }

            const newmsg = await msgModel.create({
                data: msg.msg,
                toUser: toUser.username,
                fromUser: fromUser.username,
                ...isAttachment && { messageType, content, fileName }, // Save attachment details
            });

            // Emit the message to the sender with 'done' status
            io.to(socket.id).emit('msg', {
                msg: msg.msg,
                fromUser: msg.fromUser,
                status: 'done', // Add status field
            });

            // Emit the message to the receiver with 'done' status
            io.to(connectedUsers[msg.toUser]).emit('msg', {
                msg: msg.msg,
                fromUser: msg.fromUser,
                status: 'done', // Add status field
            });

        } catch (error) {
            console.error('Error handling new message:', error);
        }
    });

    socket.on('disconnect', async () => {
        const disconnectedUsername = findUsernameBySocketId(socket.id);
        if (disconnectedUsername) {
            delete connectedUsers[disconnectedUsername];
            console.log(`User disconnected: ${disconnectedUsername}`);
            io.emit('updateUserStatus', getUsersStatus());
        }
    });
});

function getUsersStatus() {
    const status = {};
    const currentTime = new Date();
    for (const username in connectedUsers) {
        const lastSeen = currentTime; // Replace with actual last seen time if available
        status[username] = {
            online: true, // Assuming online when socket is connected
            lastSeen: lastSeen,
        };
    }
    return status;
}

function findUsernameBySocketId(socketId) {
    for (const username in connectedUsers) {
        if (connectedUsers[username] === socketId) {
            return username;
        }
    }
    return null;
}

module.exports = socketapi;
