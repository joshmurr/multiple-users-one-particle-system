import socketIOClient from 'socket.io-client';

let socket = socketIOClient('ws://localhost:8989');

let t = document.getElementById('text');

document.addEventListener('mousemove', e => {
    const x = e.clientX;
    const y = e.clientY;
    socket.emit('data', { x, y });
});

socket.on('data', users => {
    render(users);
});

function render(users){
    // Render cards
    for (const [id, position] of Object.entries(users)) {
        console.log(socket.id, id);
        const { x, y } = position;
        t.innerHTML = `User ${id} is at position: ${x}, ${y}`;
    }

}
