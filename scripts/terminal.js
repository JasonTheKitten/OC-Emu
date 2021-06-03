// I may have made the mistake of using WebGL

let Terminal = (function() {
    function createRect(x, y, l, h, width, height, off, scale) {
        let rectVertices = [
            x, y,
            x, y+h,
            x+l, y,
            x, y+h,
            x+l, y,
            x+l, y+h
        ];

        let fin = [];

        for (i=0; i<rectVertices.length; i+=2) {
            fin[i] = (rectVertices[i]/width+off)*scale;
            fin[i+1] = (1-rectVertices[i+1]/height+off)*scale;
        }

        return fin;
    }

    function createShader(webgl, type, source) {
        let shader = webgl.createShader(type);
        webgl.shaderSource(shader, source);
        webgl.compileShader(shader);
        if (!webgl.getShaderParameter(shader, webgl.COMPILE_STATUS)) {
            let log = webgl.getShaderInfoLog(shader);
            webgl.deleteShader(shader);
            throw log;
        }

        return shader;
    }

    function linkProgram(webgl, vertexShader, fragmentShader) {
        var program = webgl.createProgram();
        webgl.attachShader(program, vertexShader);
        webgl.attachShader(program, fragmentShader);
        webgl.linkProgram(program);
        if (!webgl.getProgramParameter(program, webgl.LINK_STATUS)) {
            let log = webgl.getProgramInfoLog(program);
            webgl.deleteProgram(program);
            throw log;
        }

        return program;
    }

    function Texture(webgl, image) {
        this.width = image.width;
        this.height = image.height;

        this.texture = webgl.createTexture();
        webgl.pixelStorei(webgl.UNPACK_FLIP_Y_WEBGL, true);
        webgl.bindTexture(webgl.TEXTURE_2D, this.texture);
        webgl.texImage2D(webgl.TEXTURE_2D, 0, webgl.RGBA, webgl.RGBA, webgl.UNSIGNED_BYTE, image);

        webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_WRAP_S, webgl.CLAMP_TO_EDGE);
        webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_WRAP_T, webgl.CLAMP_TO_EDGE);
        webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_MIN_FILTER, webgl.LINEAR);
    }

    function Terminal(canvas, cols, rows) {
        let image = document.getElementById("font");
        this.canvas = canvas;
        canvas.width = cols*10;
        canvas.height = rows*18;
        let webgl = canvas.getContext("webgl", {antialias: false});
        if (!webgl) {
            throw "WebGL Initialization Failed!";
        }
        this.webgl = webgl;

        webgl.viewport(0, 0, canvas.width, canvas.height);

        webgl.clearColor(0, 0, 0, 1);
        webgl.clear(webgl.COLOR_BUFFER_BIT);

        let vertexShader = createShader(webgl, webgl.VERTEX_SHADER, code.vertexShader);
        let fragmentShader = createShader(webgl, webgl.FRAGMENT_SHADER, code.fragmentShader);
        let shaderProgram = linkProgram(webgl, vertexShader, fragmentShader);

        webgl.useProgram(shaderProgram);
        this.program = shaderProgram;

        let texture = new Texture(webgl, image);
        this.texture = texture;
        let textAttr = webgl.getUniformLocation(this.program, "texture");
        webgl.bindTexture(webgl.TEXTURE_2D, texture.texture);
        webgl.uniform1i(textAttr, 0);
    }

    let chars = [9786,9787,9829,9830,9827,9824,8226,9688,9675,9689,9794,9792,9834,9835,9788,9658,9668,8597,8252,182,167,9644,8616,8593,8595,8594,8592,8735,8596,9650,9660,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,8962,199,252,233,226,228,224,229,231,234,235,232,239,238,236,196,197,201,230,198,244,246,242,251,249,255,214,220,162,163,165,8359,402,225,237,243,250,241,209,170,186,191,8976,172,189,188,161,171,187,9617,9618,9619,9474,9508,9569,9570,9558,9557,9571,9553,9559,9565,9564,9563,9488,9492,9524,9516,9500,9472,9532,9566,9567,9562,9556,9577,9574,9568,9552,9580,9575,9576,9572,9573,9561,9560,9554,9555,9579,9578,9496,9484,9608,9604,9612,9616,9600,945,223,915,960,931,963,181,964,934,920,937,948,8734,966,949,8745,8801,177,8805,8804,8992,8993,247,8776,176,8729,183,8730,8319,178,9632];
    //TODO: Way too much code per pixel
    Terminal.prototype.setPixel = function(x, y, bg, fg, ch) {
        let webgl = this.webgl;
        let program = this.program;

        let scale = 1;

        let chwidth = 10;
        let chheight = 18;

        let paddingY = 4;

        let char = chars.indexOf(ch.codePointAt(0));

        if (char==-1) char = chars.indexOf(" ");
        let dx = char%Math.floor(256/chwidth);
        let dy = Math.floor(char/Math.floor(256/chwidth));

        let dest = createRect(chwidth*(x-1)*scale, chheight*(y-1)*scale, chwidth*scale, (chheight+paddingY)*scale, this.canvas.width, this.canvas.height, -.5, 2);

        this.vertexBuffer = webgl.createBuffer();
        webgl.bindBuffer(webgl.ARRAY_BUFFER, this.vertexBuffer);
        webgl.bufferData(webgl.ARRAY_BUFFER, new Float32Array(dest), webgl.STATIC_DRAW);

        let shape = webgl.getAttribLocation(this.program, "shape");
        webgl.vertexAttribPointer(shape, 2, webgl.FLOAT, false, 0, 0);
        webgl.enableVertexAttribArray(shape);

        let src = createRect(dx*chwidth, dy*chheight, chwidth, chheight+paddingY, this.texture.width, this.texture.height, 0, 1);

        this.vertexBuffer = webgl.createBuffer();
        webgl.bindBuffer(webgl.ARRAY_BUFFER, this.vertexBuffer);
        webgl.bufferData(webgl.ARRAY_BUFFER, new Float32Array(src), webgl.STATIC_DRAW);

        let shape2 = webgl.getAttribLocation(this.program, "shape2");
        webgl.vertexAttribPointer(shape2, 2, webgl.FLOAT, false, 0, 0);
        webgl.enableVertexAttribArray(shape2);

        webgl.drawArrays(webgl.TRIANGLES, 0, 6); 
    };

    return Terminal;
})();