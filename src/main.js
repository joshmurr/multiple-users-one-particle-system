import GL_BP from './GL_BP';
import io from 'socket.io-client';
import { mouseRay, getMultiplyVec, initGui, updateNumUsers, updateRoomNumber  } from './ui.js';
import './sass/styles.scss';

let socket = io('ws://localhost:8989');
if(process.env.NODE_ENV === 'production') socket = io();

const updateVert = require('./glsl/particle_update_vert.glsl');
const updateFrag = require('./glsl/passthru_frag.glsl');
const renderVert = require('./glsl/particle_render_vert.glsl');
const renderFrag = require('./glsl/particle_render_frag.glsl');

window.addEventListener("load", function(){
    const GL = new GL_BP();
    GL.initAuto();

    const transformFeedbackVaryings = [
        "v_Position",
        "v_Velocity",
        "v_Age",
        "v_Life",
    ];

    GL.initShaderProgram('update', updateVert, updateFrag, transformFeedbackVaryings, null);
    GL.initShaderProgram('render', renderVert, renderFrag, null, 'POINTS');


    const SIZE = 128;
    // 2D TEXTURE - Grid Spawning Positions
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
        width          : SIZE,
        height         : SIZE,
        internalFormat : 'RGB8',
        format         : 'RGB',
        unit           : 0,
        data           : new Uint8Array(d),
    });

    GL.initProgramUniforms('update', [ 'u_ProjectionMatrix', 'u_ViewMatrix', 'u_TimeDelta', 'u_TotalTime', 'u_Mouse', 'u_Click' ]);
    GL.initProgramUniforms('render', [ 'u_ProjectionMatrix', 'u_ViewMatrix' ]);

    GL.setDrawParams('render', {
        clearColor : [0.0, 0.0, 0.0, 1.0],
        enable     : ['BLEND'],
        blendFunc  : ['SRC_ALPHA', 'ONE_MINUS_SRC_ALPHA'],
    });


    const opts = {
        numParticles : SIZE*SIZE,
        lifeRange    : [1.01, 10.1],
        dimensions : 3,
        birthRate : 2
    };
    const ParticleSystem = GL.ParticleSystem('update', 'render', opts);
    GL.initGeometryUniforms('update', [ 'u_ModelMatrix' ]);

    GL.addProgramUniform('update', {
        name: 'u_NumUsers',
        type: 'uniform1i',
        value: 0,
    });

    GL.addProgramUniform('update', {
        name: 'u_NumParticlesSqRoot',
        type: 'uniform1i',
        value: SIZE,
    });

    GL.addProgramUniform('update', {
        name: 'u_Turbulence',
        type: 'uniform1f',
        value: 0.5,
    });

    GL.addUniformBuffer('update', {
        name : 'u_UserIntersectsBuffer',
        binding: 1,
        drawType: 'DYNAMIC_DRAW',
        data : new Float32Array([
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0,
        ])
    });

    GL.addUniformBuffer('update', {
        name : 'u_UserSettings',
        binding: 2,
        drawType: 'STATIC_DRAW',
        data : new Float32Array([
            0, 0, 0, 0
        ]),
    });

    // Set random camera position, all at radius 2.0
    const theta = Math.random()*Math.PI*2;
    const phi   = Math.random()*Math.PI*2;
    const x = 2.0*Math.sin(theta)*Math.cos(phi);
    const y = 2.0*Math.sin(theta)*Math.sin(phi);
    const z = 2.0*Math.cos(theta);

    GL.cameraPosition = [x, y, z];

    GL.initShiftKey();

    // -- SOCKETS ------------------- //
    let click = false;
    const currentViewMatrix = GL.getViewMatrix('update');
    const currentProjMatrix = GL.getProjectionMatrix('update');
    let userCount = 0;
    let prevUserCount = 0;
    let roomNumber = 0;
    let turbulence = 0;

    GL.canvas.addEventListener('mousedown', e => {
        click = true;
    });

    GL.canvas.addEventListener('mousemove', e => {
        if(click){
            const x = 2.0 * e.clientX/GL.width - 1.0;
            const y = -(2.0 * e.clientY/GL.height - 1.0);

            let intersect = mouseRay([x,y], currentViewMatrix, currentProjMatrix);
            intersect[3] = GL.click;

            socket.emit('mouseMove', { 
                intersect : intersect,
            });
        }
    });

    GL.canvas.addEventListener('mouseup', e => {
        click = false;
        socket.emit('data', { 
            intersect : [ 0, 0, 0, 0 ],
        });
    });

    socket.on('data', users => {
        userCount = Object.keys(users).length;
        GL.updateProgramUniform('update', 'u_NumUsers', userCount-1);
        updateNumUsers(userCount);
        let offset = 0;
        for(const ID in users){
            if(users.hasOwnProperty(ID) && ID !== socket.id){
                const user = users[ID];
                if(user.intersect === -1 || user.intersect === null) {
                    offset+=4;
                    continue;
                } else {
                    GL.updateUniformBuffer('update', 'u_UserIntersectsBuffer', user.intersect, offset);
                    offset+=4;
                }
            }
        }
    });

    socket.on('connectToRoom', info => {
        updateRoomNumber(info);
    });


    initGui();

    const turbulenceSlider = document.getElementById('turbulence');
    turbulenceSlider.addEventListener('mouseup', () => {
        GL.updateUniformBuffer('update', 'u_UserSettings',
            new Float32Array([turbulenceSlider.value]), 0);
    });

    const attractSlider = document.getElementById('attract');
    attractSlider.addEventListener('mouseup', () => {
        GL.updateUniformBuffer('update', 'u_UserSettings',
           new Float32Array([attractSlider.value]), 1);
    });

    const repelSlider = document.getElementById('repel');
    repelSlider.addEventListener('mouseup', () => {
        GL.updateUniformBuffer('update', 'u_UserSettings',
            new Float32Array([repelSlider.value]), 2);
    });

    function draw(now) {
        GL.draw(now);
        window.requestAnimationFrame(draw);
    }
    window.requestAnimationFrame(draw);
});


