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
        overlay.classList.toggle('invisible');
    });

    overlay.addEventListener('click', () => {
        overlay.classList.toggle('invisible');
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

export function mouseRay(_mousePos, _viewMat, _projMat){
    // -- MOUSE CLICK TO RAY PROJECTION: -----------------------
    const rayStart = vec4.fromValues(_mousePos[0], _mousePos[1], -1.0, 1.0);
    const rayEnd   = vec4.fromValues(_mousePos[0], _mousePos[1],  0.0, 1.0);

    const inverseMat = mat4.create();
    mat4.mul(inverseMat, _projMat, _viewMat);
    mat4.invert(inverseMat, inverseMat);

    const rayStart_world = getMultiplyVec(inverseMat, rayStart);
    vec4.scale(rayStart_world, rayStart_world, 1/rayStart_world[3]);
    const rayEnd_world =  getMultiplyVec(inverseMat, rayEnd);
    vec4.scale(rayEnd_world, rayEnd_world, 1/rayEnd_world[3]);

    const rayDir_world = vec4.create();
    vec4.subtract(rayDir_world, rayEnd_world, rayStart_world);

    // -- RAY INTERSECTION WITH UNIT SPHERE: -------------------
    const rayOrigin = vec3.fromValues(rayStart_world[0], rayStart_world[1], rayStart_world[2]);
    const rayDirection = vec3.fromValues(rayDir_world[0], rayDir_world[1], rayDir_world[2]);
    vec3.normalize(rayDirection, rayDirection);

    let a, b, c; // Floats
    let rayOrigin_sub_sphereOrigin = vec3.create();
    const sphereRadius = 0.5;

    a = vec3.dot(rayDirection, rayDirection);
    vec3.subtract(rayOrigin_sub_sphereOrigin, rayOrigin, vec3.fromValues(0,0,0));
    b = 2.0 * vec3.dot(rayDirection, rayOrigin_sub_sphereOrigin);
    c = vec3.dot(rayOrigin_sub_sphereOrigin, rayOrigin_sub_sphereOrigin);
    c -= (sphereRadius * sphereRadius);
    if (b*b - 4.0*a*c < 0.0) {
        // return -1.0;
        return [0, 0, 0, 0];
    }

    const distToIntersect = (-b - Math.sqrt((b*b) - 4.0*a*c))/(2.0*a);
    const intersect = vec3.create();

    vec3.scaleAndAdd(intersect, rayOrigin, rayDirection, distToIntersect);
    // Spread to convert from Float32Array to normal array
    // because socket.io struggles with F32 arrays.
    return [...intersect];
}

export function getMultiplyVec(mat, vec){
    let ret = new Float32Array(4);
    ret[0] = mat[0]*vec[0] + mat[4]*vec[1] + mat[8]*vec[2] + mat[12];
    ret[1] = mat[1]*vec[0] + mat[5]*vec[1] + mat[9]*vec[2] + mat[13];
    ret[2] = mat[2]*vec[0] + mat[6]*vec[1] + mat[10]*vec[2] + mat[14];
    ret[3] = mat[3]*vec[0] + mat[7]*vec[1] + mat[11]*vec[2] + mat[15];
    return ret;
}

