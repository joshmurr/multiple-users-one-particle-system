const express = require('express');
const app = express();
const server = require('http').createServer(app);
const port = process.env.PORT || 8989;

const io = require('socket.io')(server);

let users = {};

app.use('/public', express.static(__dirname + '/dist'));

app.get('/', (req, response) => {
    response.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    socket.emit('data', users);

    users[socket.id] = {
        mousePos : null,
        viewMatrix : null,
    };

    socket.on('data', (data) => {
        Object.assign(users[socket.id], data);
        socket.broadcast.emit("data", users);
    });

    socket.on('mouseMove', (data) => {
        users[socket.id].mousePos = data.mousePos;
        socket.broadcast.emit("data", users);
    });

    socket.on('disconnect', () => {
        delete users[socket.id];
        socket.broadcast.emit('data', users);
    });
});

server.listen(port, () => {
    console.log('Running server on 127.0.0.1:' + port);
});

