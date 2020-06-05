import GL_BP from './GL_BP';
import { mat4, vec4, vec3 } from 'gl-matrix';
import socketIOClient from 'socket.io-client';
let socket = socketIOClient('ws://localhost:8989');

const updateVert = require('./glsl/particle_update_vert.glsl');
const updateFrag = require('./glsl/passthru_frag.glsl');
const renderVert = require('./glsl/particle_render_vert.glsl');
const renderFrag = require('./glsl/particle_render_frag.glsl');

let mouse2 = [ 0, 0 ];

window.addEventListener("load", function(){
    const GL = new GL_BP();
    GL.init(512,512);

    const transformFeedbackVaryings = [
        "v_Position",
        "v_Velocity",
        "v_Age",
        "v_Life",
    ];

    GL.initShaderProgram('update', updateVert, updateFrag, transformFeedbackVaryings, null);
    GL.initShaderProgram('render', renderVert, renderFrag, null, 'POINTS');


    const SIZE = 32;
    // 1D TEXTURE - Grid Spawning Positions
    let d = [];
    for(let i=0; i<SIZE; ++i){
        let u = (i/SIZE) * (Math.PI);
        for(let j=0; j<SIZE; ++j){
            let v = (j/SIZE) * (Math.PI*2);
            let rand = Math.random()-0.5;
            let r = 127;
            let x = Math.sin(u)*Math.cos(v);
            let y = Math.sin(u)*Math.sin(v);
            let z = Math.cos(u);
            x *= rand; y *= rand; z *= rand;
            x += 1; y += 1; z += 1;
            x *= r; y *= r; z *= r;
            d.push(
                Math.floor(x),
                Math.floor(y),
                Math.floor(z)
            );
        }
    }
    GL.dataTexture('update', {
        name           :'u_InitialPosition',
        width          : SIZE*SIZE,
        height         : 1,
        internalFormat : 'RGB8',
        format         : 'RGB',
        unit           : 0,
        data           : new Uint8Array(d),
    });

    GL.initProgramUniforms('update', [ 'u_ProjectionMatrix', 'u_ViewMatrix', 'u_TimeDelta', 'u_TotalTime', 'u_Mouse', 'u_Click' ]);
    GL.initProgramUniforms('render', [ 'u_ProjectionMatrix', 'u_ViewMatrix' ]);

    GL.setDrawParams('render', {
        clearColor : [0.0, 0.0, 0.0, 1.0],
        enable     : ['BLEND', 'CULL_FACE', 'DEPTH_TEST'], // if enable is changed, it will override defaults
        blendFunc  : ['SRC_ALPHA', 'ONE_MINUS_SRC_ALPHA'],
        depthFunc  : ['LEQUAL']
    });


    const opts = {
        numParticles : SIZE*SIZE,
        lifeRange    : [1.01, 10.1],
        dimensions : 3,
        birthRate : 0.99
    };
    const ParticleSystem = GL.ParticleSystem('update', 'render', opts);
    GL.initGeometryUniforms('update', [ 'u_ModelMatrix' ]);

    GL.addProgramUniform('update', {
        name: 'u_NumUsers',
        type: 'uniform1i',
        value: 0,
    });

    GL.addProgramUniform('update', {
        name: 'u_Intersect',
        type: 'uniform3fv',
        value: new Float32Array([0, 0, 0]),
    });

    GL.addUniformBuffer('update', {
        name : 'u_UserIntersects',
        binding: 1,
        // drawType: 'DYNAMIC_DRAW',
        data : new Float32Array([0, 0, 0, 0])
    });

    GL.updateUniformBuffer('update', 'u_UserIntersects', [0, 0, 0, 0]);

    const theta = Math.random()*Math.PI*2;
    const phi   = Math.random()*Math.PI*2;
    const x = 2.0*Math.sin(theta)*Math.cos(phi);
    const y = 2.0*Math.sin(theta)*Math.sin(phi);
    const z = 2.0*Math.cos(theta);

    GL.cameraPosition = [x, y, z];

    // -- SOCKETS ------------------- //
    let click = false;
    const currentViewMatrix = GL.getViewMatrix('update');
    const currentProjMatrix = GL.getProjectionMatrix('update');

    GL.canvas.addEventListener('mousedown', e => {
        click = true;
    });

    GL.canvas.addEventListener('mousemove', e => {
        if(click){
            const x = 2.0 * e.clientX/GL.width - 1.0;
            const y = -(2.0 * e.clientY/GL.height - 1.0);

            socket.emit('mouseMove', { 
                intersect : mouseRay([x,y], currentViewMatrix, currentProjMatrix)
            });
        }
    });

    GL.canvas.addEventListener('mouseup', e => {
        click = false;
        socket.emit('data', { 
            intersect : [ 0, 0, 0 ],
        });
    });

    socket.on('data', users => {
        GL.updateProgramUniform('update', 'u_NumUsers', Object.keys(users).length-1);
        for(const ID in users){
            if(users.hasOwnProperty(ID) && ID !== socket.id){
                const user = users[ID];
                if(user.intersect === -1 || user.intersect === null) GL.updateProgramUniform('update', 'u_Intersect', new Float32Array([0,0,0])); 
                else GL.updateProgramUniform('update', 'u_Intersect', new Float32Array(user.intersect));
            }
        }
    });

    function draw(now) {
        GL.draw(now);
        window.requestAnimationFrame(draw);
    }
    window.requestAnimationFrame(draw);
});


function mouseRay(_mousePos, _viewMat, _projMat){
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
        return -1.0;
    }

    const distToIntersect = (-b - Math.sqrt((b*b) - 4.0*a*c))/(2.0*a);
    const intersect = vec3.create();

    vec3.scaleAndAdd(intersect, rayOrigin, rayDirection, distToIntersect);
    // Spread to convert from Float32Array to normal array
    // because socket.io struggles with F32 arrays.
    return [...intersect];
}

function getMultiplyVec(mat, vec){
    let ret = new Float32Array(4);
    ret[0] = mat[0]*vec[0] + mat[4]*vec[1] + mat[8]*vec[2] + mat[12];
    ret[1] = mat[1]*vec[0] + mat[5]*vec[1] + mat[9]*vec[2] + mat[13];
    ret[2] = mat[2]*vec[0] + mat[6]*vec[1] + mat[10]*vec[2] + mat[14];
    ret[3] = mat[3]*vec[0] + mat[7]*vec[1] + mat[11]*vec[2] + mat[15];
    return ret;
}
