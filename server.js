const express = require('express');
const app = express();
const server = require('http').createServer(app);
const port = process.env.PORT || 8989;

const io = require('socket.io')(server);

let users = {};
let roomNumber = 1;

app.use(express.static(__dirname + '/dist'));

app.get('/', (req, response) => {
    response.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    if(io.nsps['/'].adapter.rooms[`room-${roomNumber}`] &&
       io.nsps['/'].adapter.rooms[`room-${roomNumber}`].length > 6){
        roomNumber++;
    }

    const currentRoom = `room-${roomNumber}`;

    socket.join(currentRoom);

    socket.emit('data', users);
    // io.sockets.in(`room-${roomNumber}`).emit('connectToRoom', `You are in room number ${roomNumber}`);
    socket.emit('connectToRoom', `You are in room number ${roomNumber}`);

    users[socket.id] = {
        intersect : [0, 0, 0, 0],
    };

    socket.on('data', (data) => {
        Object.assign(users[socket.id], data);
        socket.broadcast.to(currentRoom).emit("data", users);
    });

    socket.on('mouseMove', (data) => {
        users[socket.id].intersect = data.intersect;
        // console.log(Object.values(users));
        socket.broadcast.to(currentRoom).emit("data", users);
    });

    socket.on('disconnect', () => {
        delete users[socket.id];
        socket.broadcast.to(currentRoom).emit('data', users);
    });
});

server.listen(port, () => {
    console.log('Running server on 127.0.0.1:' + port);
});

