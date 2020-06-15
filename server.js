const express = require('express');
const app = express();
const server = require('http').createServer(app);
const port = process.env.PORT || 8989;

const io = require('socket.io')(server);

let userCount = 0;
let users = {};
let roomNumber = 1;
const roomSize = 3;

app.use(express.static(__dirname + '/dist'));

app.get('/', (req, response) => {
    response.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    let userCount = Object.keys(users).length;
    roomNumber = (userCount - (userCount%roomSize))/roomSize;
    // const currentRoom = `room-${roomNumber}`;

    socket.join(roomNumber);

    users[socket.id] = {
        intersect : [0,0,0,0],
        room      : roomNumber,
        userCount : userCount+1,
    }

    io.sockets.emit('userCount', userCount);

    socket.on('intersect', (data) => {
        Object.assign(users[socket.id], data);
        socket.broadcast.to(users[socket.id].room).emit("data", {
            userCount : Object.keys(users).length,
            users     : getRoom(socket.id),
        });
    });

    socket.on('disconnect', () => {
        delete users[socket.id];
        io.sockets.emit('userCount', Object.keys(users).length);
    });
});

server.listen(port, () => {
    console.log('Running server on 127.0.0.1:' + port);
});

function getRoom(_socketID){
    let toSend = [];
    for(const id in users){
        if(users.hasOwnProperty(id) && id === _socketID){
            let user = users[id];
            if(user.room === users[_socketID].room){
                toSend.push(user);
            }
        }
    }
    return toSend;
}

