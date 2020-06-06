import { mat4, vec3 } from 'gl-matrix';
// import Icosahedron from './geometry/icosahedron.js';
// import RandomPointSphere from './geometry/randomPointSphere.js';
// import PointCloud from './geometry/pointCloud.js';
import ParticleSystem from './geometry/particleSystem.js';
// import Cube from './geometry/cube.js';
// import Quad from './geometry/quad.js';

export default class GL_BP {
    constructor(){

        this._canvas = null;
        this._WIDTH = this._HEIGHT = 0;

        this._programs = {};
        this._textures = {};
        this._framebuffers = {};
        this._time = 0.0;
        this._oldTimestamp = 0.0;
        this._deltaTime = 0.0;
        this._mouse = [0, 0];
        this._click = 0;

        // Projection
        this._fieldOfView = 45 * Math.PI / 180;
        this._aspect = 1; // Default, to be changed on init
        this._zNear = 0.1;
        this._zFar = 100.0;
        this._projectionMat = mat4.create();
        // View
        this._viewMat = mat4.create();
        this._position = vec3.fromValues(0, 0, 2);
        this._target = vec3.fromValues(0, 0, 0);
        this._up = vec3.fromValues(0, 1, 0);
    }

    init(width, height){
        this._canvas = document.createElement("canvas");
        this._canvas.width = this._WIDTH = width;
        this._canvas.height = this._HEIGHT = height;
        const body = document.getElementsByTagName("body")[0];
        body.appendChild(this._canvas);
        this.gl = this._canvas.getContext('webgl2');
        this._aspect = this.gl.canvas.clientWidth / this.gl.canvas.clientHeight;
        if (!this.gl) {
            console.warn("You're browser does not support WebGL 2.0. Soz.");
            return;
        }
    }

    initTarget(width, height, canvasID){
        this._canvas = document.getElementById(canvasID);
        this._canvas.width = this._WIDTH = width;
        this._canvas.height = this._HEIGHT = height;
        this.gl = this._canvas.getContext('webgl2');
        this._aspect = this.gl.canvas.clientWidth / this.gl.canvas.clientHeight;
        if (!this.gl) {
            console.warn("You're browser does not support WebGL 2.0. Soz.");
            return;
        }
    }

    initShaderProgram(name, vsSource, fsSource, _transformFeedbackVaryings=null, _mode) {
        const shaderProgram = this.gl.createProgram();
        const vertexShader = this.loadShader(this.gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this.loadShader(this.gl.FRAGMENT_SHADER, fsSource);
        this.gl.attachShader(shaderProgram, vertexShader);
        this.gl.attachShader(shaderProgram, fragmentShader);

        if(_transformFeedbackVaryings != null){
            this.gl.transformFeedbackVaryings(
                shaderProgram,
                _transformFeedbackVaryings,
                this.gl.INTERLEAVED_ATTRIBS
            );
        }

        this.gl.linkProgram(shaderProgram);

        if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
            alert('Unable to initialize the shader program: ' + this.gl.getProgramInfoLog(shaderProgram));
            return null;
        }

        this._programs[name] = {
            shader   : shaderProgram,
            mode     : _mode,
            transformFeedback : _transformFeedbackVaryings ? true : false,
            transformFeedbackVaryings : _transformFeedbackVaryings,
            geometry : [],
            uniformNeedsUpdate : false,
            globalUniforms : {},
            geometryUniforms: {},
            uniformBuffers : {},
            drawParams : {
                clearColor : [0.95, 0.95, 0.95, 1.0],
                clearDepth : [1.0],
                clear      : ['COLOR_BUFFER_BIT', 'DEPTH_BUFFER_BIT'],
                viewport   : [0, 0, this.gl.canvas.width, this.gl.canvas.height],
                enable     : ['CULL_FACE', 'DEPTH_TEST'],
            },
            customFramebufferRoutine : false,
            framebufferRoutine : {}
        }

    }

    initProgramUniforms(_program, _uniforms){
        const program = this.getProgram(_program);
        let globalUniforms = program.globalUniforms;
        const shaderProgram = program.shader;
        for(const uniform of _uniforms){
            switch(uniform){
                case 'u_TimeDelta' : {
                    this._programs[_program].uniformNeedsUpdate = true;
                    globalUniforms['u_TimeDelta'] = {
                        type : 'uniform1fv',
                        value       : [this._deltaTime / 1000.0],
                        location    : this.gl.getUniformLocation(shaderProgram, 'u_TimeDelta')
                    };
                    break;
                }
                case 'u_TotalTime' : {
                    this._programs[_program].uniformNeedsUpdate = true;
                    globalUniforms['u_TotalTime'] = {
                        type : 'uniform1fv',
                        value       : [this._time / 1000.0],
                        location    : this.gl.getUniformLocation(shaderProgram, 'u_TotalTime')
                    };
                    break;
                }
                case 'u_Resolution' : {
                    globalUniforms['u_Resolution'] = {
                        type : 'uniform2fv',
                        value       : [this.gl.canvas.width, this.gl.canvas.height],
                        location    : this.gl.getUniformLocation(shaderProgram, 'u_Resolution')
                    };
                    break;
                }
                case 'u_Mouse' : {
                    this._programs[_program].uniformNeedsUpdate = true;
                    globalUniforms['u_Mouse'] = {
                        type : 'uniform2fv',
                        value       : this._mouse,
                        location    : this.gl.getUniformLocation(shaderProgram, 'u_Mouse')
                    };
                    this.initMouseMove();
                    break;
                }
                case 'u_Click' : {
                    this._programs[_program].uniformNeedsUpdate = true;
                    globalUniforms['u_Click'] = {
                        type : 'uniform1i',
                        value       : this._click,
                        location    : this.gl.getUniformLocation(shaderProgram, 'u_Click')
                    };
                    this.initMouseClick();
                    break;
                }
                case 'u_ProjectionMatrix' : {
                    globalUniforms['u_ProjectionMatrix'] = {
                        type : 'uniformMatrix4fv',
                        value       : this._projectionMat,
                        location    : this.gl.getUniformLocation(shaderProgram, 'u_ProjectionMatrix')
                    };
                    break;
                }
                case 'u_ViewMatrix' : {
                    globalUniforms['u_ViewMatrix'] = {
                        type : 'uniformMatrix4fv',
                        value       : this._viewMat,
                        location    : this.gl.getUniformLocation(shaderProgram, 'u_ViewMatrix')
                    };
                    break;
                }
            }
        }
        this.updateGlobalUniforms(globalUniforms);
    }

    addUniformBuffer(_programName, _options){
        const program = this.getProgram(_programName);
        const shaderProgram = program.shader;

        let options = {
            name     : 'u_BufferObject',
            binding  : 0,
            drawType : 'STATIC_DRAW',
            data     : null,
        }

        Object.assign(options, _options);

        const index = this.gl.getUniformBlockIndex(shaderProgram, options.name);
        this.gl.uniformBlockBinding(shaderProgram, index, options.binding);

        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, buffer);
        this.gl.bufferData(this.gl.UNIFORM_BUFFER, options.data, this.gl[options.drawType]);
        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, null);
        this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, options.binding, buffer);

        // console.log(
            // this.gl.getActiveUniformBlockParameter(shaderProgram, index, this.gl.UNIFORM_BLOCK_BINDING),
            // this.gl.getActiveUniformBlockParameter(shaderProgram, index, this.gl.UNIFORM_BLOCK_DATA_SIZE),
            // this.gl.getActiveUniformBlockParameter(shaderProgram, index, this.gl.UNIFORM_BLOCK_ACTIVE_UNIFORMS),
            // this.gl.getActiveUniformBlockParameter(shaderProgram, index, this.gl.UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES),
        // );

        program.uniformBuffers[options.name] = {
            buffer  : buffer,
            value   : options.data,
            binding : options.binding,
        };
    }

    updateUniformBuffer(_program, _uniform, _value, _offset){
        const uniformBuffer = this._programs[_program].uniformBuffers[_uniform];
        uniformBuffer.value.set(_value, _offset);
        console.log(uniformBuffer.value);

        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, uniformBuffer.buffer);
        this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, 0, uniformBuffer.value, 0, null);
        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, null);
        this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, uniformBuffer.binding, uniformBuffer.buffer);
    }


    addProgramUniform(_program, _options){
        const program = this.getProgram(_program);
        program.globalUniforms[_options.name] = {
            type : _options.type,
            value : _options.value,
            location : this.gl.getUniformLocation(program.shader, _options.name)
        }
    }

    initGeometryUniforms(_program, _uniforms){
        const program = this.getProgram(_program);
        const shaderProgram = program.shader;
        let geometryUniforms = program.geometryUniforms;

        for(const uniform of _uniforms){
            switch(uniform){
                case 'u_ModelMatrix' : {
                    geometryUniforms['u_ModelMatrix'] = {
                        type        : 'uniformMatrix4fv',
                        value       : mat4.create(),
                        location    : this.gl.getUniformLocation(shaderProgram, 'u_ModelMatrix')
                    };
                    break;
                }
            }
        }
    }

    addGeometryUniform(_program, _options){
        const program = this.getProgram(_program);
        program.geometryUniforms[_options.name] = {
            type : _options.type,
            value : _options.value,
            location : this.gl.getUniformLocation(program.shader, _options.name)
        }
    }

    updateProgramUniform(_program, _uniform, _value){
        this._programs[_program].globalUniforms[_uniform].value = _value;
    }

    updateGeometryUniform(_program, _uniform, _value){
        this._programs[_program].geometryUniforms[_uniform].value = _value;
    }

    updateAllGlobalUniforms(){
        for(const program in this._programs){
            if(this._programs.hasOwnProperty(program)){
                this.updateGlobalUniforms(this._programs[program].globalUniforms);
            }
        }
    }

    updateGlobalUniforms(_uniforms){
        for(const uniform in _uniforms){
            if(_uniforms.hasOwnProperty(uniform)){
                switch(uniform) {
                    case 'u_TimeDelta' : {
                        _uniforms[uniform].value = [this._deltaTime / 1000.0];
                        break;
                    }
                    case 'u_TotalTime' : {
                        _uniforms[uniform].value = [this._time / 1000.0];
                        break;
                    }
                    case 'u_Resolution' : {
                        _uniforms[uniform].value = [this.gl.canvas.width, this.gl.canvas.height];
                        break;
                    }
                    case 'u_Mouse' : {
                        _uniforms[uniform].value = this._mouse;
                        break;
                    }
                    case 'u_Click' : {
                        _uniforms[uniform].value = this._click;
                        break;
                    }
                    case 'u_ProjectionMatrix' : {
                        mat4.perspective(_uniforms[uniform].value, this._fieldOfView, this._aspect, this._zNear, this._zFar);
                        break;
                    }
                    case 'u_ViewMatrix' : {
                        mat4.lookAt(_uniforms[uniform].value, this._position, this._target, this._up);
                        break;
                    }
                }
            }
        }
    }

    updateGeometryUniforms(_geometry, _uniforms){
        for(const uniform in _uniforms){
            if(_uniforms.hasOwnProperty(uniform)){
                switch(uniform) {
                    case 'u_ModelMatrix' : {
                        _uniforms[uniform].value = _geometry.updateModelMatrix(this._time);
                        break;
                    }
                }
            }
        }
    }


    setUniforms(_uniforms){
        for(const uniform in _uniforms){
            if(_uniforms.hasOwnProperty(uniform)){
                const uniform_desc = _uniforms[uniform];
                switch(uniform_desc.type){
                    case 'uniformMatrix4fv' : {
                        // MATRIX
                        this.gl[uniform_desc.type](
                            uniform_desc.location,
                            false,
                            uniform_desc.value,
                        );
                        break;
                    }
                    case 'uniform1i' : {
                        if(uniform_desc.isTexture){
                            // TEXTURE
                            this.gl.uniform1i(uniform_desc.location, uniform_desc.unit);
                            this.gl.activeTexture(this.gl.TEXTURE0 + uniform_desc.unit);
                            this.gl.bindTexture(this.gl[uniform_desc.dimension], uniform_desc.value);
                            break;
                        }
                    }
                    default : {
                        this.gl[uniform_desc.type](
                            uniform_desc.location,
                            uniform_desc.value,
                        );
                    }
                }
            }
        }
    }

    updateProjectionMatrix(_program){
        mat4.perspective(
            this._programs[_program].globalUniforms.u_ProjectionMatrix.value,
            this._fieldOfView, this._aspect, this._zNear, this._zFar);
    }

    updateViewMatrix(_program){
        mat4.lookAt(
            this._programs[_program].globaluniforms.u_viewmatrix.value,
            this._position, this._target, this._up);
    }

    setDrawParams(_program, _options){
        const program = this.getProgram(_program);
        Object.assign(program.drawParams, _options);
    }

    setFramebufferRoutine(_program, _options){
        const program = this.getProgram(_program);
        Object.assign(program.framebufferRoutine, _options);
        program.customFramebufferRoutine = true;
    }

    loadShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            alert('An error occurred compiling the shaders: ' + this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        return shader;
    }


    linkProgram(_program, _geometry){
        this._programs[_program].geometry.push(_geometry);
        _geometry.linkProgram(this._programs[_program].shader, [geometryTex]);
    }


    framebuffer(_name){
        // Create empty framebuffer
        this._framebuffers[_name] = this.gl.createFramebuffer();
    }

    get framebuffers(){
        return this._framebuffers;
    }

    framebufferTexture2D(_framebuffer, _texture){
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this._framebuffers[_framebuffer]);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0,
            this.gl.TEXTURE_2D, _texture, 0);
    }

    get canvas(){
        return this._canvas;
    }

    get textures(){
        return this._textures;
    }

    bindTexture(_texture){
        this.gl.bindTexture(this.gl.TEXTURE_2D, _texture);
    }

    get programs(){
        return this._programs;
    }

    set cameraPosition(loc){
        this._position = vec3.fromValues(...loc);
        this.updateAllGlobalUniforms();
    }

    get cameraPosition(){
        return [...this._position];
    }

    set cameraTarget(loc){
        this._target = vec3.fromValues(...loc);
    }

    set FOV(val){
        this._fieldOfView = val * Math.PI/180;
    }

    // Can't pass an argument to a regular get ___(){}
    getViewMatrix(_programName){
        return this._programs[_programName].globalUniforms['u_ViewMatrix'].value;
    }
    getProjectionMatrix(_programName){
        return this._programs[_programName].globalUniforms['u_ProjectionMatrix'].value;
    }

    bindMainViewport(){
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }

    getProgram(_program){
        try{
            const program = this._programs[_program];
            if(!program) throw new TypeError;
            else return program;
        }catch (err) {
            if (err instanceof TypeError) {
                console.error(`Shader Program '${_program}' is not found, did you mean: '${Object.keys(this._programs)}'?`);
            }
        }
    }

    draw(now){
        // TIME ---------------------------------
        if (this._oldTimestamp != 0) {
            this._deltaTime = now - this._oldTimestamp;
            if (this._deltaTime > 500.0) {
                this._deltaTime = 0.0;
            }
        }
        this._oldTimestamp = now;
        this._time += this._deltaTime;
        // --------------------------------------
        

        for(const program in this._programs){
            if(this._programs.hasOwnProperty(program)){
                const program_desc = this._programs[program];

                /* SET FRAMEBUFFER PARAMETERS */
                if(program_desc.customFramebufferRoutine){
                    for(const param in program_desc.framebufferRoutine){
                        if(program_desc.framebufferRoutine.hasOwnProperty(param)){
                            const values = program_desc.framebufferRoutine[param];
                            switch(param) {
                                case 'pre' : {
                                    // Run the pre-function:
                                    this[values.func](...values.args);
                                    break;
                                }
                                case 'bindFramebuffer' : {
                                    this.gl[param](this.gl.FRAMEBUFFER, this._framebuffers[values]);
                                    break;
                                }
                                case 'framebufferTexture2D' : {
                                    let [p, t] = values;
                                    this.gl[param](
                                        this.gl.FRAMEBUFFER,
                                        this.gl.COLOR_ATTACHMENT0,
                                        this.gl.TEXTURE_2D,
                                        this._programs[p].globalUniforms[t].value,// Select the texture
                                        0
                                    );
                                    break;
                                }
                                case 'bindTexture' : {
                                    let [p, t] = values;
                                    this.gl[param](
                                        this.gl.TEXTURE_2D,
                                        this._programs[p].globalUniforms[t].value // Select the texture
                                    );
                                    break;
                                }
                            }
                        }
                    }
                }

                /* SET DRAW PARAMETERS */
                for(const param in program_desc.drawParams){
                    if(program_desc.drawParams.hasOwnProperty(param)){
                        const values = program_desc.drawParams[param];
                        if(param === 'enable'){
                            /* ENABLE CAPS */
                            for(const val of values) this.gl[param](this.gl[val]);
                        } else if(param === 'blendFunc'){
                            this.gl[param](this.gl[values[0]], this.gl[values[1]]);
                        } else if(param === 'depthFunc'){
                            this.gl[param](this.gl[values[0]]);
                        } else if(param === 'clear'){
                            if(!values) continue;
                            /* COLOR_BUFFER_BIT | DEPTH_BUFFER_BIT */
                            let clear = 0;
                            for(const val of values) clear |= this.gl[val];
                            this.gl[param](clear);
                        } else {
                            this.gl[param](...values);
                        }
                    }
                }

                // console.log(this.gl.getFramebufferAttachmentParameter(
                    // this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0,
                    // this.gl.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE));


                if(program_desc.geometry.length < 1) continue;

                /* USE PROGRAM */
                this.gl.useProgram(program_desc.shader);

                /* UPDATE AND SET GLOBAL UNIFORMS */
                if(Object.keys(program_desc.globalUniforms).length > 0){
                    if(program_desc.uniformNeedsUpdate) {
                        this.updateGlobalUniforms(program_desc.globalUniforms);
                    }
                    this.setUniforms(program_desc.globalUniforms);
                }

                for(const geom of program_desc.geometry){
                    /* TRANSFORM FEEDBACK */
                    if(program_desc.transformFeedback) {
                        geom.step(this.gl, this._deltaTime);
                        continue;
                    }

                    /* BIND VAO */
                    this.gl.bindVertexArray(geom.VAO);

                    /* UPDATE AND SET GEOM UNIFORMS */
                    if(geom.needsUpdate) {
                        this.updateGeometryUniforms(geom, program_desc.geometryUniforms);
                    }

                    this.setUniforms(program_desc.geometryUniforms);

                    // console.log(this.gl.getActiveUniformBlockParameter(program_desc.shader, 0, this.gl.UNIFORM_BLOCK_BINDING));
                    // geom.setUniforms();

                    // const numUniforms = this.gl.getProgramParameter(program_desc.shader, this.gl.ACTIVE_UNIFORMS);
                    // for (let i = 0; i < numUniforms; ++i) {
                          // const info = this.gl.getActiveUniform(program_desc.shader, i);
                          // console.log('name:', info.name, 'type:', info.type, 'size:', info.size);
                    // }

        // console.log(this.gl.getVertexAttrib(0, this.gl.VERTEX_ATTRIB_ARRAY_TYPE));
                    /* DRAW */
                    switch(program_desc.mode){
                        case 'POINTS' : {
                            this.gl.drawArrays(this.gl[program_desc.mode], 0, geom.numVertices);
                            break;
                        }
                        default : {
                            this.gl.drawElements(this.gl[program_desc.mode], geom.numIndices, this.gl.UNSIGNED_SHORT, 0);
                        }
                    }

                }

                /* EMPTY BUFFERS */
                this.gl.bindVertexArray(null);
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
                this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);
            }
            // If a _selectedProgram is passed, skip the rest
            // if(_selectedProgram) continue;
        }
    }

    loadTexture(_programName, _name, _url) {
        const texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

        // Set texture to one blue dot while it loads below
        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0, this.gl.RGBA,
            1,
            1,
            0,
            this.gl.RGBA,
            this.gl.UNSIGNED_BYTE,
            new Uint8Array([0, 0, 255, 255])
        );

        // Asynchronously load an image
        var image = new Image();
        console.log(_url);
        image.src = _url;
        image.addEventListener('load', function() {
            // Now that the image has loaded make copy it to the texture.
            this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
            this.gl.texImage2D(
                this.gl.TEXTURE_2D,
                0,
                this.gl.RGBA,
                this.gl.RGBA,
                this.gl.UNSIGNED_BYTE,
                image
            );
            this.gl.generateMipmap(this.gl.TEXTURE_2D);
        });

        this._programs[_programName].globalUniforms[_name] = {
            type : 'uniform1i',
            value       : texture,
            location    : this.gl.getUniformLocation(
                this._programs[_programName].shader, // Not yet assigned
                _name
            ),
            unit : 0,
            isTexture   : true,
        }
    }

    dataTexture(_programName, _options){
        // Default options, to be overwritten by _options passed in
        let options = {
            name: 'u_Texture', // default
            level : 0,
            unit : 0,
            width : 1,
            height : 1,
            depth: null,
            data : new Uint8Array([0, 0, 255, 255]),
            border : 0,
            internalFormat : 'RGBA8',
            format : 'RGBA',
            wrap : 'CLAMP_TO_EDGE',
            filter : 'NEAREST',
            type : 'UNSIGNED_BYTE'
        }

        Object.assign(options, _options);

        const TYPE = options.depth ? 'TEXTURE_3D' : 'TEXTURE_2D';

        const texture = this.gl.createTexture();
        this.gl.activeTexture(this.gl.TEXTURE0 + options.unit);
        this.gl.bindTexture(this.gl[TYPE], texture);

        if(TYPE === 'TEXTURE_2D'){
            this.gl.texImage2D(
                this.gl.TEXTURE_2D,
                0, // Level
                this.gl[options.internalFormat],
                options.width,
                options.height,
                options.border,
                this.gl[options.format],
                this.gl[options.type],
                options.data
            );
        } else {
            this.gl.texImage3D(
                this.gl.TEXTURE_3D,
                0, // Level
                this.gl[options.internalFormat],
                options.width,
                options.height,
                options.depth,
                options.border,
                this.gl[options.format],
                this.gl[options.type],
                options.data
            );
        }

        // In case of width/height errors use this:
        // this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1);
        this.gl.texParameteri(this.gl[TYPE], this.gl.TEXTURE_BASE_LEVEL, 0);
        this.gl.texParameteri(this.gl[TYPE], this.gl.TEXTURE_MAX_LEVEL, Math.log2(options.width));
        this.gl.texParameteri(this.gl[TYPE], this.gl.TEXTURE_WRAP_S, this.gl[options.wrap]);
        this.gl.texParameteri(this.gl[TYPE], this.gl.TEXTURE_WRAP_T, this.gl[options.wrap]);
        this.gl.texParameteri(this.gl[TYPE], this.gl.TEXTURE_MIN_FILTER, this.gl[options.filter]);
        this.gl.texParameteri(this.gl[TYPE], this.gl.TEXTURE_MAG_FILTER, this.gl[options.filter]);
        // this.gl.generateMipmap(this.gl[TYPE]);

        this._programs[_programName].globalUniforms[options.name] = {
            type        : 'uniform1i',
            value       : texture,
            location    : this.gl.getUniformLocation(
                this._programs[_programName].shader,
                options.name
            ),
            unit        : options.unit,
            dimension   : TYPE,
            isTexture   : true,
        }
    }

    swapTextures(_programTex1, _programTex2){
        const [p1, t1] = _programTex1;
        const [p2, t2] = _programTex2;
        const tmp = this._programs[p2].globalUniforms[t2].value;
        this._programs[p2].globalUniforms[t2].value = this._programs[p1].globalUniforms[t1].value;
        this._programs[p1].globalUniforms[t1].value = tmp;
    }

    initMouseMove(){
        // Arrow functions have no 'this' binding
        this._canvas.addEventListener('mousemove', (e) => {
            this._mouse[0] = 2.0 * (e.clientX)/this._WIDTH - 1.0;
            this._mouse[1] = -(2.0 * (e.clientY)/this._HEIGHT - 1.0);
        });
    }

    initMouseClick(){
        this._canvas.addEventListener('mousedown', (e) => {
            this._click = 1; 
        });
        this._canvas.addEventListener('mouseup', (e) => {
            this._click = 0; 
        });
    }

    get width(){
        return this._WIDTH;
    }
    get height(){
        return this._HEIGHT;
    }

    Quad(_programs=null){
        const quad = new Quad(this.gl);
        if(_programs){
            for(const p of _programs){
                this._programs[p].geometry.push(quad);
                quad.linkProgram(this._programs[p].shader);
            }
        }
        return quad;
    }

    Cube(_programs, _type){
        const cube = new Cube(this.gl, _type);
        if(_programs){
            for(const p of _programs){
                this._programs[p].geometry.push(cube);
                cube.linkProgram(this._programs[p].shader);
            }
        }
        return cube;
    }

    RandomPointSphere(_programs, _numPoints){
        const Points = new RandomPointSphere(this.gl, _numPoints);
        if(_programs){
            for(const p of _programs){
                this._programs[p].geometry.push(Points);
                Points.linkProgram(this._programs[p].shader);
            }
        }
        return Points;
    }

    PointCloud(_programs, _numPoints){
        const Points = new PointCloud(this.gl, _numPoints);
        if(_programs){
            for(const p of _programs){
                this._programs[p].geometry.push(Points);
                Points.linkProgram(this._programs[p].shader);
            }
        }
        return Points;
    }

    Icosahedron(_program){
        const Icos = new Icosahedron(this.gl);
        this._programs[_program].geometry.push(Icos);
        Icos.linkProgram(this._programs[_program].shader);
        return Icos;
    }

    ParticleSystem(_updateProgram, _renderProgram, _options=null){
        const PS = new ParticleSystem(this.gl, _options);

        this._programs[_updateProgram].geometry.push(PS);
        this._programs[_renderProgram].geometry.push(PS);
        PS.linkProgram(
            this._programs[_updateProgram].shader,
            this._programs[_renderProgram].shader,
        );
        return PS;
    }

    GameOfLifeTexture2D(_updateProgram, _renderProgram){
        if(Object.keys(arguments).length < 2){
            console.error("GameOfLife requires an 'update' and a 'render' program");
        }
        const GOL = new GameOfLifeTexture2D(this.gl);
        this._programs[_updateProgram].geometry.push(GOL);
        this._programs[_renderProgram].geometry.push(GOL);
        GOL.linkProgram(
            this._programs[_updateProgram].shader,
            this._programs[_renderProgram].shader,
        );
        return GOL;
    }
}
