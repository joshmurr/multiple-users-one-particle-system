const express = require('express');
const app = express();
const server = require('http').createServer(app);
const port = process.env.PORT || 8989;

const io = require('socket.io')(server);

let userCount = 0;
let users = {};
const roomSize = 3;
let rooms = {};

app.use(express.static(__dirname + '/dist'));

app.get('/', (req, response) => {
    response.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    userCount = Object.keys(users).length;
    users[socket.id] = {
        intersect : [0,0,0,0],
        room      : null,
        userCount : userCount+1,
    }

    let userAdded = false, roomNumber = 0;
    while(!userAdded){
        if(rooms[roomNumber] && rooms[roomNumber].length < roomSize){
            // If room exists and has space
            rooms[roomNumber].push(socket.id);
            userAdded = true;
        } else if(!rooms[roomNumber]) {
            // If room does not exist
            rooms[roomNumber] = [socket.id];
            userAdded = true;
        } else {
            roomNumber++;
        }
    }
    users[socket.id].room = roomNumber;
    socket.join(roomNumber);

    io.sockets.emit('userCount', userCount);

    socket.emit('init', users[socket.id]);

    socket.on('intersect', (data) => {
        Object.assign(users[socket.id], data);
        const thisUsersRoom = users[socket.id].room;
        socket.broadcast.to(thisUsersRoom).emit("data", {
            userCount   : Object.keys(users).length,
            usersInRoom : rooms[thisUsersRoom].length,
            users       : getRoom(thisUsersRoom),
        });
    });

    socket.on('disconnect', () => {
        removeUser(socket.id);
        delete users[socket.id];
        io.sockets.emit('userCount', Object.keys(users).length);
    });
});

server.listen(port, () => {
    console.log('Running server on 127.0.0.1:' + port);
});

function getRoom(_room){
    let toSend = [];
    for(let i=0; i<rooms[_room].length; i++){
        toSend.push(users[rooms[_room][i]]);
    }
    return toSend;
}

function removeUser(_id){
    const index = rooms[users[_id].room].indexOf(_id);
    if(index > -1) rooms[users[_id].room].splice(index, 1);
    console.log(rooms);
}
