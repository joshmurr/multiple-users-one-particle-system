import GL_BP from './GL_BP';
import { mat4 } from 'gl-matrix';
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
    GL.initGeometryUniforms('render', [ 'u_ModelMatrix' ]);

    GL.addProgramUniform('update', {
        name: 'u_Mouse2',
        type: 'uniform2fv',
        value: mouse2,
    });

    GL.addProgramUniform('update', {
        name: 'u_ViewMatrix2',
        type: 'uniformMatrix4fv',
        value: mat4.create(),
    });

    const theta = Math.random()*Math.PI*2;
    const phi   = Math.random()*Math.PI*2;
    const x = 2.0*Math.sin(theta)*Math.cos(phi);
    const y = 2.0*Math.sin(theta)*Math.sin(phi);
    const z = 2.0*Math.cos(theta);

    GL.cameraPosition = [x, y, z];

    // -- SOCKETS ------------------- //
    let click = false;
    const currentViewMatrix = GL.getViewMatrix('update');
    socket.emit('data', { viewMatrix : currentViewMatrix });

    GL.canvas.addEventListener('mousedown', e => {
        click = true;
    });

    GL.canvas.addEventListener('mousemove', e => {
        if(click){
            const x = e.clientX;
            const y = e.clientY;

            socket.emit('mouseMove', { 
                mousePos : [ x, y ],
            });
        }
    });

    GL.canvas.addEventListener('mouseup', e => {
        click = false;
        socket.emit('data', { 
            mousePos : [ 0, 0 ],
        });
    });

    socket.on('data', users => {
        for(const ID in users){
            if(users.hasOwnProperty(ID) && ID !== socket.id){
                const user = users[ID];
                console.log(user);
                if(user.mousePos){
                    mouse2[0] = 2.0 * (user.mousePos[0])/GL.width - 1.0;
                    mouse2[1] = -(2.0 * (user.mousePos[1])/GL.height - 1.0);
                } else {
                    mouse2 = [0,0];
                }
                GL.updateProgramUniform('update', 'u_Mouse2', mouse2);
                GL.updateProgramUniform('update', 'u_ViewMatrix2', user.viewMatrix || mat4.create());
            }
        }
    });

    function draw(now) {
        GL.draw(now);
        window.requestAnimationFrame(draw);
    }
    window.requestAnimationFrame(draw);
});


