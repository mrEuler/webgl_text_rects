document.addEventListener('DOMContentLoaded', () => {
    new Main();
});

class Main {
    constructor() {
        const canvas = document.getElementById("webgl");
        this.renderer = new Renderer(canvas);

        this.camera = new PerspectiveCamera({
            far: 10,
            near: 1,
            fov: 50,
            aspect: this.renderer.getAspect()
        });

        this.raycaster = new Raycaster(this.camera);

        this.material = new Material(this.renderer.gl);

        this.scene = new Scene();

        this.getProps()
            .forEach(prop => {
                const rect = new Rectangle({
                    ...prop,
                    gl: this.renderer.gl
                });
                rect.setColor(prop.color);
                this.scene.add(rect);
            });

        this.render();

        this.initEvents();
    }

    render() {
        requestAnimationFrame(this.render.bind(this));
        this.renderer.render(this.camera, this.scene, this.material);
    }

    initEvents() {
        // function to raycast objects, during mouse movements
        let lastIntersected = null;
        const onMouseMove = (event) => {
            const intersections = this.raycaster.raycastObjects({
                x: event.clientX,
                y: event.clientY
            }, this.scene.objects);
            const intersection = intersections[0];
            if (intersection) {
                intersection.object.checkTextIntersection(intersection.uv);
            }
            if (intersection && intersection.object !== lastIntersected) {
                lastIntersected?.checkTextIntersection(null)
                lastIntersected = intersection.object;
            } else if (!intersection) {
                lastIntersected?.checkTextIntersection(null)
                lastIntersected = null;
            }
        }

        // add event listener
        this.renderer.canvas.addEventListener('mousemove', onMouseMove);

        // function to change camera props, when window resizes
        const onWindowResize = () => {
            this.camera.aspect = this.renderer.getAspect();
            this.camera.updateProjectionMatrix();
        }

        // sets the event on window, as we work only in 100% H/W for canvas
        window.addEventListener('resize', onWindowResize);
    }

    /**
     * Just function, that stores all properties of rectangles, that needs to be created
     * @returns Array of properties
     */
    getProps() {
        return [
            { text: `WebGL stands for Web Graphics Library.`, color: 0xffffff },
            { text: `It's a JavaScript API for rendering 3D graphics.`, color: 0xf0f000 },
            { text: `WebGL operates in web browsers without plugins.`, color: 0xffffff },
            { text: `It's based on OpenGL ES, a mobile graphics standard.`, color: 0xffffff },
            { text: `WebGL enables GPU-accelerated usage of physics and image processing.`, color: 0xf0f000 },
            { text: `Most modern web browsers support WebGL.`, color: 0xffffff },
            { text: `It allows for interactive 3D and 2D graphics.`, color: 0xfed456 },
            { text: `WebGL content is integrated with HTML webpages.`, color: 0xf0f000 },
            { text: `It's used in games, visualizations, and art projects.`, color: 0xaaaaaa },
            { text: `WebGL applications can run on any platform with a compatible browser.`, color: 0xf0f000 },
            { text: `WebGL stands for Web Graphics Library.`, color: 0xffffff },
            { text: `It's a JavaScript API for rendering 3D graphics.`, color: 0xf0f000 },
            { text: `WebGL operates in web browsers without plugins.`, color: 0xffffff },
            { text: `It's based on OpenGL ES, a mobile graphics standard.`, color: 0xffffff },
            { text: `WebGL enables GPU-accelerated usage of physics and image processing.`, color: 0xf0f000 },
            { text: `Most modern web browsers support WebGL.`, color: 0xffffff },
            { text: `It allows for interactive 3D and 2D graphics.`, color: 0xfed456 },
            { text: `WebGL content is integrated with HTML webpages.`, color: 0xf0f000 },
            { text: `It's used in games, visualizations, and art projects.`, color: 0xaaaaaa },
            { text: `WebGL applications can run on any platform with a compatible browser.`, color: 0xf0f000 },

        ].map(prop => {
            // use same size
            prop.width = 0.5;
            prop.height = 0.25;

            // some random magic for positions
            prop.position = vec3.fromValues(
                5 * Math.random() - 2.5,
                2 * Math.random() - 1,
                -2 * Math.random() - 2
            );
            // some random magic for positions
            prop.quaternion = quat.create();
            quat.fromEuler(prop.quaternion,
                Math.random() * 30, // angle in degrees
                Math.random() * 30, // angle in degrees
                Math.random() * 30 // angle in degrees
            );
            // don't change the align. otherwise the word highlighting won't work correctly
            prop.textProps = {
                lineHeight: 40,
                align: 'left',
                style: {
                    color: '#000',
                },
            }
            // prop.textProps = {
            //     lineHeight: 40,
            //     align: 'left',
            //     margin: {
            //         left: 50, 
            //         right: 25,
            //         top: 40,
            //         bottom: 40
            //     },

            //     style: {
            //         color: '#000',
            //         weight: '500',
            //         family: 'Arial',
            //         style: 'normal'
            //     },
            //     autoWrapping: true, // adjusts the size by height
            //     autoWrappingHorizontal: false // true -> evrything in a single line, false -> multiline 
            // }

            return prop;
        })
    }
}

class Scene {
    constructor() {
        this.objects = [];
    }

    add(obj) {
        if (this.objects.indexOf(obj) === -1) {
            this.objects.push(obj);
        }
    }

    remove(obj) {
        if (this.objects.indexOf(obj) === -1) {
            this.objects.splice(this.objects.indexOf(obj), 1)
        }
    }
}

class Rectangle {
    constructor({ width, height, position, quaternion, gl, text, textProps }) {
        this.width = width;
        this.height = height;
        this.position = position;
        this.quaternion = quaternion;
        this.gl = gl;
        this.text = text;
        this.textProps = textProps;

        this.worldMatrix = mat4.create();
        this.updateWorldMatrix();

        this.createImageText();
        this.map = this.textImage.getTexture(gl);

        this.createGeometry();
    }

    createImageText() {
        const { width, height } = this;
        const textImage = this.textImage = new TextImage(vec2.fromValues(width * 512, height * 512), vec2.fromValues(width, height));
        this.wordsPositions = textImage.updateElement({
            text: {
                ...this.textProps,
                value: this.text,
            }
        });


        this.width = textImage.needsSizeUnits[0];
        this.height = textImage.needsSizeUnits[1];
    }

    createGeometry() {
        const { width, height, gl } = this;
        const vertices = this.vertices = [
            width / 2, height / 2,  // Top right
            -width / 2, height / 2,  // Top left
            width / 2, -height / 2,  // Bottom right
            -width / 2, -height / 2,  // Bottom left
        ];

        const uvs = this.uvs = [
            1.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0,
        ];

        // Create a buffer for the rectangle's positions
        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        this.textureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.textureCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
    }

    updateWorldMatrix() {
        // Move the drawing position a bit to where we want to start drawing the square
        mat4.fromRotationTranslation(this.worldMatrix, this.quaternion, this.position)
    }

    checkTextIntersection(_uv) {
        // clear selection
        if (!_uv) {
            this.textImage.updateElement({
                text: {
                    ...this.textProps,
                    value: this.text,

                }
            });
            this.textImage.updateTexture(this.gl);
            return;
        }

        // get uv as PX value
        const uv = vec3.clone(_uv);
        uv[0] *= this.textImage.canvas.width;
        uv[1] *= this.textImage.canvas.height;

        if (this.wordsPositions) {
            const index = this.wordsPositions.findIndex(el => {
                return el.x < uv[0] && uv[0] < (el.x + el.w) && el.y > uv[1] && uv[1] > (el.y - el.h)
            });
            if (index >= 0) {
                const asArray = this.text.split(' ');
                asArray[index] = `{{color:red}} ${asArray[index]} {{/color}}`;

                this.textImage.updateElement({
                    text: {
                        ...this.textProps,
                        value: asArray.join(' '),
                    }
                });
                this.textImage.updateTexture(this.gl);
            }
        }
    }

    setColor(hex) {
        this.color = { x: 1, y: 1, z: 1 };
        hex = Math.floor(hex);

        this.color.x = (hex >> 16 & 255) / 255;
        this.color.y = (hex >> 8 & 255) / 255;
        this.color.z = (hex & 255) / 255;
    }

    raycast(ray) {
        const triangles = [
            // front side
            [
                vec3.fromValues(this.vertices[0], this.vertices[1], 0),
                vec3.fromValues(this.vertices[2], this.vertices[3], 0),
                vec3.fromValues(this.vertices[6], this.vertices[7], 0)
            ],
            [
                vec3.fromValues(this.vertices[0], this.vertices[1], 0),
                vec3.fromValues(this.vertices[6], this.vertices[7], 0),
                vec3.fromValues(this.vertices[4], this.vertices[5], 0),
            ],
            //back side
            [
                vec3.fromValues(this.vertices[6], this.vertices[7], 0),
                vec3.fromValues(this.vertices[2], this.vertices[3], 0),
                vec3.fromValues(this.vertices[0], this.vertices[1], 0),
            ],
            [
                vec3.fromValues(this.vertices[4], this.vertices[5], 0),
                vec3.fromValues(this.vertices[6], this.vertices[7], 0),
                vec3.fromValues(this.vertices[0], this.vertices[1], 0),
            ]
        ].map(triangle => triangle.map(vertex => vec3.transformMat4(vertex, vertex, this.worldMatrix)));


        const intersection = triangles.map(triangle => {
            const out = vec3.create();
            const EPSILON = 0.0000001;
            const [v0, v1, v2] = triangle;
            const edge1 = vec3.create();
            const edge2 = vec3.create();
            const h = vec3.create();

            vec3.sub(edge1, v1, v0);
            vec3.sub(edge2, v2, v0);
            vec3.cross(h, ray.direction, edge2);
            const a = vec3.dot(edge1, h);

            if (a > -EPSILON && a < EPSILON) {
                return false;
            }

            const s = vec3.create();
            vec3.sub(s, ray.origin, v0);
            const u = vec3.dot(s, h);

            if (u < 0 || u > a) {
                return false;
            }

            const q = vec3.create();
            vec3.cross(q, s, edge1);
            const v = vec3.dot(ray.direction, q);

            if (v < 0 || u + v > a) {
                return false;
            }

            const t = vec3.dot(edge2, q) / a;
            if (t > EPSILON) {
                if (out) {
                    vec3.add(out, ray.origin, [ray.direction[0] * t, ray.direction[1] * t, ray.direction[2] * t]);
                }
                return out;
            }
            return false;
        }).filter(a => a)[0];

        if (intersection) {
            // calculate pseudo-uv.
            const worldMatrixInv = mat4.create();
            mat4.invert(worldMatrixInv, this.worldMatrix);
            const uv = vec3.clone(intersection);
            vec3.transformMat4(uv, uv, worldMatrixInv);

            uv[0] += this.vertices[0];
            uv[0] /= this.vertices[0] * 2;
            uv[1] += this.vertices[1];
            uv[1] /= this.vertices[1] * 2;
            uv[1] = 1 - uv[1];

            return {
                object: this,
                point: intersection,
                distance: vec3.distance(ray.origin, intersection),
                uv: uv
            }
        }
        else return null;
    }
}

class Renderer {
    constructor(canvas) {
        // Get the canvas element and its context
        this.canvas = canvas;
        this.gl = this.canvas.getContext('webgl2');
        if (!this.gl) throw new Error('No webgl context!');
        this.updateViewport();
        this.initDomEvents();
        console.log('Renderer created');
    }

    initDomEvents() {
        window.addEventListener('resize', () => this.updateViewport());
    }

    updateViewport() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    getAspect() {
        return this.canvas.clientWidth / this.canvas.clientHeight;
    }

    render(camera, scene, material) {
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        scene.objects
            .sort((obj1, obj2) => vec3.len(obj1.position) - vec3.len(obj2.position))
            .forEach(object => {
                // Set the shader program
                this.gl.useProgram(material.shaderProgram);

                // Set the vertex positions
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, object.positionBuffer);
                this.gl.vertexAttribPointer(material.attribLocations.vertexPosition, 2, this.gl.FLOAT, false, 0, 0);
                this.gl.enableVertexAttribArray(material.attribLocations.vertexPosition);


                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, object.textureCoordBuffer);
                this.gl.vertexAttribPointer(material.attribLocations.textureCoord, 2, this.gl.FLOAT, false, 0, 0);
                this.gl.enableVertexAttribArray(material.attribLocations.textureCoord);


                // Set the shader uniforms
                this.gl.uniformMatrix4fv(material.uniformLocations.projectionMatrix, false, camera.projectionMatrix);
                this.gl.uniformMatrix4fv(material.uniformLocations.modelViewMatrix, false, object.worldMatrix);
                this.gl.uniform3fv(material.uniformLocations.baseColor, [object.color.x, object.color.y, object.color.z])

                // Tell WebGL we want to affect texture unit 0
                this.gl.activeTexture(this.gl.TEXTURE0);

                // Bind the texture to texture unit 0
                this.gl.bindTexture(this.gl.TEXTURE_2D, object.map);

                // Tell the shader we bound the texture to texture unit 0
                this.gl.uniform1i(material.uniformLocations.map, 0);

                // Draw the rectangle
                this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
            });
    }
}

class Material {
    constructor(gl) {
        this.gl = gl;

        this.setVertexShader();
        this.setFragmentShader();
        this.initShader();
    }

    setVertexShader() {
        this.vertexShader = `
            precision highp float;

            attribute vec4 aVertexPosition;
            attribute vec2 aTextureCoord;

            uniform mat4 uModelViewMatrix;
            uniform mat4 uProjectionMatrix;

            varying highp vec2 vTextureCoord;

            void main() {
                gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
                vTextureCoord = aTextureCoord;
            }
        `;
    }

    setFragmentShader() {
        this.fragmentShader = `
            precision mediump float;

            varying highp vec2 vTextureCoord;

            uniform vec3 uBaseColor;
            uniform sampler2D uMap;

            void main() {
                gl_FragColor = vec4(uBaseColor, 1.0) * texture2D(uMap, vTextureCoord);
            }
        `;
    }

    initShader() {
        const vertexShader = Material.loadShader(this.gl, this.gl.VERTEX_SHADER, this.vertexShader);
        const fragmentShader = Material.loadShader(this.gl, this.gl.FRAGMENT_SHADER, this.fragmentShader);

        // Create the shader program
        this.shaderProgram = this.gl.createProgram();
        this.gl.attachShader(this.shaderProgram, vertexShader);
        this.gl.attachShader(this.shaderProgram, fragmentShader);
        this.gl.linkProgram(this.shaderProgram);

        // If creating the shader program failed, alert
        if (!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)) {
            throw new Error('Unable to init shader program: ' + this.gl.getProgramInfoLog(this.shaderProgram));
        }
        this.attribLocations = {
            vertexPosition: this.gl.getAttribLocation(this.shaderProgram, 'aVertexPosition'),
            textureCoord: this.gl.getAttribLocation(this.shaderProgram, "aTextureCoord"),
        };
        this.uniformLocations = {
            projectionMatrix: this.gl.getUniformLocation(this.shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: this.gl.getUniformLocation(this.shaderProgram, 'uModelViewMatrix'),
            baseColor: this.gl.getUniformLocation(this.shaderProgram, 'uBaseColor'),
            map: this.gl.getUniformLocation(this.shaderProgram, "uMap"),
        };
    }

    static loadShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        // See if it compiled successfully
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }
}

class PerspectiveCamera {
    constructor({ fov, aspect, near, far }) {
        // Create a perspective matrix
        this.fov = (fov || 45) * Math.PI / 180;   // in radians
        this.aspect = aspect || 1;
        this.near = near || 0.01;
        this.far = far || 10;
        this.projectionMatrix = mat4.create();
        this.updateProjectionMatrix();
    }

    updateProjectionMatrix() {
        mat4.perspective(this.projectionMatrix, this.fov, this.aspect, this.near, this.far);
    }
}

class Raycaster {
    constructor(camera) {
        this.camera = camera;
    }

    raycastObjects(mouseVec2, objects) {
        const out = vec4.fromValues(
            (2 * mouseVec2.x) / window.innerWidth - 1 - 0,
            (2 * (window.innerHeight - mouseVec2.y - 1)) / window.innerHeight - 1,
            1, 1
        );

        const invProjectionMatrix = mat4.create();
        mat4.invert(invProjectionMatrix, this.camera.projectionMatrix);

        vec4.transformMat4(out, out, invProjectionMatrix);
        out[3] = 0;

        const ray = {
            direction: vec3.normalize(vec3.create(), out),
            origin: vec3.fromValues(0, 0, 0)
        };

        return objects
            .map((obj) => {
                return obj.raycast(ray)
            })
            .filter(a => a)
            .sort((a, b) => b.distance - a.distance);
    }
}

class TextImage {
    constructor(sizePX, sizeUnits) {
        let canvas = this.canvas = document.createElement('canvas');
        canvas.width = sizePX[0];
        canvas.height = sizePX[1];
        this.context = this.canvas.getContext('2d')

        this.sizePX = sizePX;
        this.sizeUnits = sizeUnits;

        // this.debugImage();
    }

    debugImage() {
        const ctx = this.canvas.getContext('2d');
        let x = 0, y = 0, delta = 32;
        for (let i = 1; i <= 16; i++) {
            for (let j = 1; j <= 16; j++) {
                ctx.fillStyle = (i + j) % 2 == 0 ? ['pink', 'red', 'green', 'yellow'][Math.floor(Math.random() * 4)] : 'brown';
                ctx.fillRect(
                    x + delta * (i - 1),
                    y + delta * (j - 1),
                    delta,
                    delta
                );
            }
        }
    }

    getTexture(gl) {
        const canvasTexture = this.texture = gl.createTexture();

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, canvasTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.canvas);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
        gl.generateMipmap(gl.TEXTURE_2D);

        gl.bindTexture(gl.TEXTURE_2D, null)

        return canvasTexture;
    }

    updateTexture(gl) {
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.canvas);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
        gl.generateMipmap(gl.TEXTURE_2D);

        gl.bindTexture(gl.TEXTURE_2D, null)
    }

    static generateFontProperty(font) {
        return `${font.style || ''} ${font.weight || ''} ${font.size || ''} ${font.family || ''}`;
    }

    static getTextStyleSeparated(context) {
        const fontValues = (context['fontSaved'] || context.font).split(' ');
        const color = context.fillStyle;
        return {
            color: color,
            family: fontValues[3],
            size: fontValues[2],
            weight: fontValues[1],
            style: fontValues[0]
        };
    }


    /**
     * Function to wrap text on lines
     * @param {CanvasRenderingContext2D} ctx Context of the canvas
     * @param {string} text Text to write
     * @param {number} x Left coordinate of first letter
     * @param {number} y Top coordinate of first letter
     * @param {number} maxWidth Max width in px of each line
     * @param {number} lineHeight Line height in px
     * @param {boolean} wrapOnLines Text should be wrapped on lines
     */
    static wrapText(ctx, text, x, y, maxWidth, lineHeight, wrapOnLines) {
        const wordsPositions = [];
        const spaceSymbol = ' ';
        const stylesStack = {
            'color': [],
            'style': [],
            'weight': [],
            'family': [],
            'size': []
        };
        const styleTypeStack = [];
        const words = text.split(' ');
        let line = '';
        y += lineHeight;
        const fillTextColored = (line, _x, y) => {
            let x;
            if (ctx.textAlign === 'left') x = _x;
            if (ctx.textAlign === 'center') x = _x - ctx.measureText(line.split(' ').filter(word => word.indexOf('{{') === -1 && word.indexOf('}}') === -1).join(spaceSymbol)).width / 2;
            if (ctx.textAlign === 'right') x = _x;
            line.split(' ').forEach((word, i, arr) => {
                if (word.indexOf('{{') > -1) {
                    if (word.indexOf('{{/') > -1) {
                        const type = word.replace('{{/', '').replace('}}', '');
                        if (type === 'color') {
                            ctx.fillStyle = stylesStack[type].pop();
                        } else {
                            const currentFont = TextImage.getTextStyleSeparated(ctx);
                            currentFont[type] = stylesStack[type].pop();
                            ctx.font = ctx['fontSaved'] = TextImage.generateFontProperty(currentFont);
                        }
                    } else {
                        const type = word.replace('{{', '').replace('}}', '').split(':')[0];
                        const value = word.replace('{{', '').replace('}}', '').split(':')[1];
                        const currentFont = TextImage.getTextStyleSeparated(ctx);
                        stylesStack[type].push(currentFont[type]);

                        if (type === 'color') {
                            ctx.fillStyle = value;
                        } else {
                            currentFont[type] = value;
                            ctx.font = ctx['fontSaved'] = TextImage.generateFontProperty(currentFont);
                        }
                    }
                    return;
                }
                let len = ctx.measureText(word + (i !== arr.length - 1 ? spaceSymbol : '')).width;
                let pos;
                if (ctx.textAlign === 'left') pos = x;
                if (ctx.textAlign === 'center') pos = x + len / 2;
                if (ctx.textAlign === 'right') pos = _x;
                ctx.shadowColor = '' + ctx.fillStyle;
                ctx.shadowBlur = 0.01;

                ctx.fillText(word + (i !== arr.length - 1 ? spaceSymbol : ''), pos, y);
                x += len;
            });
        };
        let previousTestWidth = 0;
        for (let n = 0; n < words.length; n++) {

            const testLine = line + words[n] + (n !== words.length - 1 && words[n + 1] !== '\n' ? spaceSymbol : '');
            const metrics = ctx.measureText(testLine.split(' ').filter(word => word.indexOf('{{') === -1 && word.indexOf('}}') === -1).join(spaceSymbol));
            const testWidth = metrics.width;

            if (((testWidth > maxWidth && n > 0) || words[n] === '\n') && wrapOnLines) {
                fillTextColored(line, x, y);
                if (words[n] !== '\n') {
                    line = words[n] + (n !== words.length - 1 && words[n + 1] !== '\n' ? spaceSymbol : '');

                    (wordsPositions).push({
                        x: x,
                        y: y + lineHeight,
                        h: lineHeight,
                        w: testWidth - previousTestWidth,
                        word: words[n]
                    });
                    previousTestWidth = testWidth - previousTestWidth
                } else {
                    line = '';
                    previousTestWidth = 0;
                }
                y += lineHeight;

            } else {
                line = testLine;

                (wordsPositions).push({
                    x: x + previousTestWidth,
                    y: y,
                    h: lineHeight,
                    w: testWidth - previousTestWidth,
                    word: words[n]
                });
                previousTestWidth = testWidth

            }
        }

        fillTextColored(line, x, y);
        if (ctx.textAlign === 'center') {
            let widthSumm = 0, previousY = -1;
        }
        return wordsPositions;
    }

    /**
    * Function to calculate wrapping text and scale canvas in Y dimension
    * @param {string} text Text to write
    * @param {number} x Left coordinate of first letter
    * @param {number} y Top coordinate of first letter
    * @param {number} maxWidth Max width in px of each line
    * @param {number} lineHeight Line height in px
    * @param {number} marginBottom Margin bottom in px
    * @param {boolean} wrapOnLines Text should be wrapped on lines
    */
    calculateWrapping(text, x, y, maxWidth, lineHeight, marginBottom, wrapOnLines) {
        let lines = 0,
            line = '';
        const words = text.split(' ');
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + (n !== words.length - 1 && words[n + 1] !== '\n' ? ' ' : '');
            const metrics = this.context.measureText(testLine.split(' ').filter(word => word.indexOf('{{') === -1 && word.indexOf('}}') === -1).join(' '));
            const testWidth = metrics.width;
            if (((testWidth > maxWidth && n > 0) || words[n] === '\n') && wrapOnLines) {
                lines++;
                line = words[n] + ' ';
            } else {
                line = testLine;
            }
        }
        lines++;
        let neededSize = (lines * lineHeight) + y + marginBottom;
        if (neededSize === 0) neededSize = 1;
        this.sizeUnits[1] *= neededSize / this.sizePX[1];
        this.canvas.height = neededSize;
        this.sizePX[1] = neededSize;
        this.neededSize[1] = neededSize;
    }

    /**
     * Function to draw text, background on canvas and get Mesh with CanvasTexture on it
     * @param {Object} options Options to draw
     * @param {Object} options.text Options to draw text
     *
     * @param {Object|Number} [options.text.margin = 5] Margin of the text
     * @param {Number} [options.text.margin.left = 5] Left margin of the text
     * @param {Number} [options.text.margin.right = 5] Right margin of the text
     * @param {Number} [options.text.margin.top = 5] Top margin of the text
     * @param {Number} [options.text.margin.bottom = 5] Bottom margin of the text
     *
     * @param {String} [options.text.color = '#000'] Color of the text '#000'
     * @param {String} [options.text.font = '32pt Roboto'] Font of the text
     * @param {String} [options.text.align = 'left'] Horizontal of the text. Possible values 'left', 'center' and 'right'
     * @param {Number} [options.text.lineHeight = 40] Line height of the text in pixels
     * @param {Boolean} [options.text.autoWrapping = false] Auto wrapping of the text
     * @param {Boolean} [options.text.autoWrappingHorizontal = false] Auto wrapping of the text in horizontal. Changes width of the plane.
     * @param {String} [options.text.value = 'Default text'] Text
     * @returns {Mesh}
     */
    updateElement(options) {
        // Set arguments to defaults
        options = options || {};
        options.text = options.text || {};
        options.text.margin = options.text.margin || 5;
        const margin = options.text.margin;
        options.text.margin = options.text.margin instanceof Object ? options.text.margin : {};
        options.text.margin.left = options.text.margin.left || (margin instanceof Object ? 0 : margin);
        options.text.margin.right = options.text.margin.right || (margin instanceof Object ? 0 : margin);
        options.text.margin.top = options.text.margin.top || (margin instanceof Object ? 0 : margin);
        options.text.margin.bottom = options.text.margin.bottom || (margin instanceof Object ? 0 : margin);

        options.text.style = options.text.style || {};
        options.text.style.style = options.text.style.style || 'normal';
        options.text.style.weight = options.text.style.weight || '400';
        options.text.style.size = options.text.style.size || '32px';
        options.text.style.family = options.text.style.family || 'Arial';
        options.text.style.color = options.text.style.color || '#000';
        options.text.align = options.text.align || 'left';
        options.text.lineHeight = options.text.lineHeight || 40;
        options.text.autoWrapping = options.text.autoWrapping === undefined ? true : options.text.autoWrapping;
        options.text.autoWrappingHorizontal = options.text.autoWrappingHorizontal === undefined ? false : options.text.autoWrappingHorizontal;
        options.text.value = options.text.value === undefined ? 'Default text' : options.text.value;

        this.neededSize = vec2.clone(this.sizePX);

        //// IMPORTANT LIMITATION
        if (options.text.align !== 'left')
            console.warn('Feature of highlighting the words won\'t work correctly');

        if (options.text.autoWrapping) {
            this.context.font = this.context['fontSaved'] = TextImage.generateFontProperty(options.text.style);
            this.context.textAlign = options.text.align;
            this.context.fillStyle = options.text.style.color;
            this.calculateWrapping(
                options.text.value.split(' ').filter(word => word.indexOf('{{') === -1 && word.indexOf('}}') === -1).join(' '),
                options.text.align === 'left' ?
                    options.text.margin.left : options.text.align === 'center' ?
                        this.sizePX[0] / 2 :
                        this.sizePX[0] - options.text.margin.left - options.text.margin.right,
                options.text.margin.top,
                this.sizePX[0] - options.text.margin.left - options.text.margin.right,
                options.text.lineHeight,
                options.text.margin.bottom,
                !options.text.autoWrappingHorizontal
            );
        }

        if (options.text.autoWrappingHorizontal) {
            this.context.font = this.context['fontSaved'] = TextImage.generateFontProperty(options.text.style);
            this.context.textAlign = options.text.align;
            this.context.fillStyle = options.text.style.color;
            const metrics = this.context.measureText(options.text.value.split(' ').filter(word => word.indexOf('{{') === -1 && word.indexOf('}}') === -1).join(' '));
            let needSizeX = metrics.width + options.text.margin.left + options.text.margin.right;
            if (needSizeX === 0) needSizeX = 1;
            this.sizeUnits[0] *= needSizeX / this.sizePX[0];
            this.neededSize[0] = needSizeX;
            this.canvas.width = this.neededSize[0];
            this.sizePX[0] = this.neededSize[0];
        } else {
            this.neededSize[0] = this.sizePX[0];
            this.canvas.width = this.sizePX[0];
        }


        this.context.fillStyle = 'white';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);


        this.context.font = this.context['fontSaved'] = TextImage.generateFontProperty(options.text.style);
        this.context.textAlign = options.text.align;
        this.context.fillStyle = options.text.style.color;
        const wordsPositions = TextImage.wrapText(
            this.context,
            options.text.value,
            options.text.align === 'left' ?
                options.text.margin.left : options.text.align === 'center' ?
                    (this.neededSize[0] || this.sizePX[0]) / 2 :
                    (this.neededSize[0] || this.sizePX[0]) - options.text.margin.right,
            options.text.margin.top,
            (this.neededSize[0] || this.sizePX[0]) - options.text.margin.left - options.text.margin.right,
            options.text.lineHeight,
            !options.text.autoWrappingHorizontal
        );

        this.needsSizeUnits = vec2.fromValues(this.sizeUnits[0] * (this.neededSize[0] / this.sizePX[0]), this.sizeUnits[1] * (this.neededSize[1] / this.sizePX[1]));


        return wordsPositions;
    }

}
