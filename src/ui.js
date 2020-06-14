import { mat4, vec4, vec3 } from 'gl-matrix';

export function initGui(){
    const menuToggle = document.getElementById('menuToggle');
    const menu = document.getElementsByTagName('nav')[0];
    const arrow = document.getElementById('arrow');
    const aboutBtn = document.getElementById('aboutBtn');
    const overlay = document.getElementById('overlay');
    const about = document.getElementById('about');

    menuToggle.addEventListener('click', () => {
        menu.classList.toggle('show');
        menuToggle.classList.toggle('slide');
        arrow.classList.toggle('rotate');
    });

    aboutBtn.addEventListener('click', () => {
        overlay.classList.toggle('invisible', false);
        about.classList.toggle('seeThrough', false);
    });

    overlay.addEventListener('click', () => {
        about.classList.toggle('seeThrough', true);
        overlay.classList.toggle('invisible', true);
    });

    // Prevents flashing up on window load
    overlay.style.display = "block";
}

export function updateNumUsers(_numUsers){
    const activeUsers = document.getElementById('activeUsers');
    activeUsers.innerHTML = _numUsers;
}

export function updateRoomNumber(_num){
    const roomNumber = document.getElementById('roomNumber');
    roomNumber.innerHTML = _num;
}

