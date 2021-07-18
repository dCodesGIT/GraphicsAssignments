// 3D Shapes animation in WebGL
// By : Darshan Vikam
// Date : 05 July 2021

// Global variables
var canvas = null;
var gl = null;
var canvas_original_width = 0;
var canvas_original_height = 0;
var bFullscreen = false;
var angle = 0.0;

var requestAnimationFrame = window.requestAnimationFrame ||	// For Google Chrome
	window.webkitRequestAnimationFrame ||			// For Apple's Safari
	window.mozRequestAnimationFrame ||			// For Mozilla FireFox
	window.oRequestAnimationFrame ||			// For Opera
	window.msRequestAnimationFrame;				// For MicroSoft's Edge

const WebGLMacros = {
	DV_ATTRIB_VERTEX	:0,
	DV_ATTRIB_COLOR		:1,
	DV_ATTRIB_NORMAL	:2,
	DV_ATTRIB_TEXTURE	:3
};

var VSObj, FSObj, SPObj;
var VAObj_shapes = new Array(2);
var VBObj_pyramid = new Array(2);
var VBObj_cube = new Array(2);
var MVPUniform;

var perspProjMatrix;

// Main function - entry point function 
function main() {
	// Get Canvas from DOM
	canvas = document.getElementById("DV");
	if(!canvas)
		console.log("Canvas not found \n");
	else
		console.log("Canvas obtained successfully.. \n");

	// Get canvas width and height
	canvas_original_width = canvas.width;
	canvas_original_height = canvas.height;

	// Setting Event listeners (for event handling)
	window.addEventListener("keydown", keyDown, false);	// window is an in-built variable
	window.addEventListener("click", mouseDown, false);
	window.addEventListener("resize", resize, false);

	initialize();

	resize();	// warm up call to resize()
	display();	// warm up call to display() - explicitly
}

// Function to toggle fullscreen - multi browser complient
function toggleFullscreen() {
	// Variable declaration
	var fullscreen_element = document.fullscreenElement ||			// For Google Chrome, Opera
				 document.webkitFullscreenElement ||		// For Apple's - Safari
				 document.mozFullScreenElement ||		// For Mozilla firefox
				 document.msFullscreenElement ||		// For MicroSoft's - Edge
				 null;						// For any browser other that defined above OR if fullscreen is not set

	// Code
	// Need to specify fullscreen settings for other browsers
	if(fullscreen_element == null) { 		// If fullscreen not set
		// Check if function pointer is not null and then call that function
		if(canvas.requestFullscreen)
			canvas.requestFullscreen();
		else if(canvas.webkitRequestFullscreen)
			canvas.webkitRequestFullscreen();
		else if(canvas.mozRequestFullScreen)
			canvas.mozRequestFullScreen();
		else if(canvas.msFullscreen)
			canvas.msFullscreen();
		else
			alert("Fullscreen unavailable for this browser...");
		bFullscreen = true;
	}
	else {			// If fullscreen is set
		// Check if function pointer is not null and then call that function
		if(document.exitFullscreen)
			document.exitFullscreen();
		else if(document.webkitExitFullscreen)
			document.webkitExitFullscreen();
		else if(document.mozCancelFullScreen)
			document.mozCancelFullScreen();
		else if(document.msExitFullscreen)
			document.msExitFullscreen();
		bFullscreen = false;
	}
	resize();
}

// Event listener / handler - for Keyboard event
function keyDown(event) {
	// message box in web
	switch(event.keyCode) {
		case 27 :	// Escape
			uninitialize();
			break;
		case 70 :	// f or F
			toggleFullscreen();
			break;
		default :
			break;
	}
}

// Event handling - for mouse button events
function mouseDown() {
	// message box in web
}

// Function to initialize WebGL
function initialize() {
	// Code
	// Get drawing context from the canvas
	var webGLContext = canvas.getContext("webgl2");
	if(!webGLContext)
		console.log("WebGL2.0(latest version) context not found \n");
	else
		console.log("WebGL2.0(latest version) context obtained successfully.. \n");
	gl = webGLContext;

	gl.viewportWidth = canvas.width;
	gl.viewportHeight = canvas.height;

	// Vertex Shader
	var VSSrcCode =
		"#version 300 es \n" +
		"in vec4 vPosition;" +
		"in vec3 vColor;" +
		"uniform mat4 u_mvp_matrix;" +
		"out vec3 out_color;" +
		"void main(void) {" +
			"gl_Position = u_mvp_matrix * vPosition;" +
			"out_color = vColor;" +
		"}";
	VSObj = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(VSObj, VSSrcCode);
	gl.compileShader(VSObj);
	ShaderErrorCheck(VSObj, "COMPILE");

	// Fragment Shader
	var FSSrcCode =
		"#version 300 es \n" +
		"precision highp float;" +
		"in vec3 out_color;" +
		"out vec4 FragColor;" +
		"void main(void) {" +
			"FragColor = vec4(out_color, 1.0);" +
		"}";
	FSObj = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(FSObj, FSSrcCode);
	gl.compileShader(FSObj);
	ShaderErrorCheck(FSObj, "COMPILE");

	// Shader Program
	SPObj = gl.createProgram();
	gl.attachShader(SPObj, VSObj);
	gl.attachShader(SPObj, FSObj);
	gl.bindAttribLocation(SPObj, WebGLMacros.DV_ATTRIB_VERTEX, "vPosition");
	gl.bindAttribLocation(SPObj, WebGLMacros.DV_ATTRIB_COLOR, "vColor");
	gl.linkProgram(SPObj);
	ShaderErrorCheck(SPObj, "LINK");

	// Get uniform locations
	MVPUniform = gl.getUniformLocation(SPObj, "u_mvp_matrix");

	// Initializing vertices, color, shader attibs, VAO, VBO
	const pyramidVertices= new Float32Array([
		// Front face - Apex, left bottom, right bottom
		0.0, 2.0, 0.0,		-1.0, -1.0, 1.0,	1.0, -1.0, 1.0,
		
		// Right face - Apex, left bottom, right bottom
		0.0, 2.0, 0.0,		1.0, -1.0, 1.0,		1.0, -1.0, -1.0,
		
		// Back face - Apex, left bottom, right bottom
		0.0, 2.0, 0.0,		1.0, -1.0, -1.0,	-1.0, -1.0, -1.0,
		
		// Left face - Apex, left bottom, right bottom
		0.0, 2.0, 0.0,		-1.0, -1.0, -1.0,	-1.0, -1.0, 1.0
	]);
	const pyramidColor = new Float32Array([
		// Front face - Red, Green, Blue
		1.0, 0.0, 0.0,		0.0, 1.0, 0.0,		0.0, 0.0, 1.0,
		
		// Right face - Red, Green, Blue
		1.0, 0.0, 0.0,		0.0, 0.0, 1.0,		0.0, 1.0, 0.0,
		
		// Back face - Red, Green, Blue
		1.0, 0.0, 0.0,		0.0, 1.0, 0.0,		0.0, 0.0, 1.0,
		
		// Left face - Red, Green, Blue
		1.0, 0.0, 0.0,		0.0, 0.0, 1.0,		0.0, 1.0, 0.0
	]);
	const cubeVertices = new Float32Array([
		// Front face - top left, bottom left, bottom right, top right
		-1.0, 1.0, 1.0,		-1.0, -1.0, 1.0,	1.0, -1.0, 1.0,		1.0, 1.0, 1.0,
		
		// Right face - top left, bottom left, bottom right, top right
		1.0, 1.0, 1.0,		1.0, -1.0, 1.0,		1.0, -1.0, -1.0,	1.0, 1.0, -1.0,
		
		// Bottom face - top left, bottom left, bottom right, top right
		1.0, -1.0, 1.0,		-1.0, -1.0, 1.0,	-1.0, -1.0, -1.0,	1.0, -1.0, -1.0,
		
		// Left face - top left, bottom left, bottom right, top right
		-1.0, 1.0, -1.0,	-1.0, -1.0, -1.0,	-1.0, -1.0, 1.0,	-1.0, 1.0, 1.0,
		
		// Back face - top left, bottom left, bottom right, top right
		1.0, 1.0, -1.0,		1.0, -1.0, -1.0,	-1.0, -1.0, -1.0,	-1.0, 1.0, -1.0,
		
		// Top face - top left, bottom left, bottom right, top right
		1.0, 1.0, 1.0,		1.0, 1.0, -1.0,		-1.0, 1.0, -1.0,	-1.0, 1.0, 1.0
	]);
	const cubeColor = new Float32Array([
		// Front face - Red
		1.0, 0.0, 0.0,		1.0, 0.0, 0.0,		1.0, 0.0, 0.0,		1.0, 0.0, 0.0,
		
		// Right face - Green
		0.0, 1.0, 0.0,		0.0, 1.0, 0.0,		0.0, 1.0, 0.0,		0.0, 1.0, 0.0,
		
		// Bottom face - Blue
		0.0, 0.0, 1.0,		0.0, 0.0, 1.0,		0.0, 0.0, 1.0,		0.0, 0.0, 1.0,
		
		// Left face - Green
		0.0, 1.0, 0.0,		0.0, 1.0, 0.0,		0.0, 1.0, 0.0,		0.0, 1.0, 0.0,

		// Back face - Red
		1.0, 0.0, 0.0,		1.0, 0.0, 0.0,		1.0, 0.0, 0.0,		1.0, 0.0, 0.0,

		// Top face - Blue
		0.0, 0.0, 1.0,		0.0, 0.0, 1.0,		0.0, 0.0, 1.0,		0.0, 0.0, 1.0
	]);

	VAObj_shapes[0] = gl.createVertexArray();		// Pyramid
	gl.bindVertexArray(VAObj_shapes[0]);
		VBObj_pyramid[0] = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, VBObj_pyramid[0]);
		gl.bufferData(gl.ARRAY_BUFFER, pyramidVertices, gl.STATIC_DRAW);
		gl.vertexAttribPointer(WebGLMacros.DV_ATTRIB_VERTEX, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(WebGLMacros.DV_ATTRIB_VERTEX);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);

		VBObj_pyramid[1] = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, VBObj_pyramid[1]);
		gl.bufferData(gl.ARRAY_BUFFER, pyramidColor, gl.STATIC_DRAW);
		gl.vertexAttribPointer(WebGLMacros.DV_ATTRIB_COLOR, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(WebGLMacros.DV_ATTRIB_COLOR);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	gl.bindVertexArray(null);

	VAObj_shapes[1] = gl.createVertexArray();		// Cube
	gl.bindVertexArray(VAObj_shapes[1]);
		VBObj_cube[0] = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, VBObj_cube[0]);
		gl.bufferData(gl.ARRAY_BUFFER, cubeVertices, gl.STATIC_DRAW);
		gl.vertexAttribPointer(WebGLMacros.DV_ATTRIB_VERTEX, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(WebGLMacros.DV_ATTRIB_VERTEX);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);

		VBObj_cube[1] = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, VBObj_cube[1]);
		gl.bufferData(gl.ARRAY_BUFFER, cubeColor, gl.STATIC_DRAW);
		gl.vertexAttribPointer(WebGLMacros.DV_ATTRIB_COLOR, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(WebGLMacros.DV_ATTRIB_COLOR);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	gl.bindVertexArray(null);

	gl.enable(gl.DEPTH_TEST);
	gl.clearDepth(1.0);
	gl.depthFunc(gl.LEQUAL);

	// Clear canvas color to black
	gl.clearColor(0.0, 0.0, 0.0, 1.0);

	perspProjMatrix = mat4.create();
}

// Function to check errors in shaders after compiling/linking
function ShaderErrorCheck(shaderObject, status) {
	// Code
	if(status == "COMPILE") {
		if(gl.getShaderParameter(shaderObject, gl.COMPILE_STATUS) == false) {
			var error = gl.getShaderInfoLog(shaderObject);
			if(error.length > 0) {
				alert(error);
				uninitialize();
			}
		}
	}
	else if(status == "LINK") {
	if(gl.getProgramParameter(shaderObject, gl.LINK_STATUS) == false) {
			var error = gl.getProgramInfoLog(shaderObject);
			if(error.length > 0) {
				alert(error);
				uninitialize();
			}
		}
	}
	else
		alert("Invalid 2nd parameter of function ShaderErrorCheck().");
}

// Function to set 
function resize() {
	// Code
	if(bFullscreen) {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
	}
	else {
		canvas.width = canvas_original_width;
		canvas.height = canvas_original_height;
	}
	gl.viewport(0, 0, canvas.width, canvas.height);

	mat4.perspective(perspProjMatrix, 45.0, parseFloat(canvas.width) / parseFloat(canvas.height), 0.1, 100.0);
}

// Function draw
function display() {
	// Code
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	gl.useProgram(SPObj);

	var ModelViewMatrix = mat4.create();
	var ModelViewProjectionMatrix = mat4.create();
	var TranslationMatrix;

	TranslationMatrix = mat4.create();
	mat4.translate(TranslationMatrix, TranslationMatrix, [-2.0, 0.0, -5.0]);
	mat4.multiply(ModelViewMatrix, ModelViewMatrix, TranslationMatrix);
	RotationMatrix = mat4.create();
	mat4.rotate(RotationMatrix, RotationMatrix, angle, [0.0, 1.0, 0.0]);
	mat4.multiply(ModelViewMatrix, ModelViewMatrix, RotationMatrix);
	mat4.multiply(ModelViewProjectionMatrix, perspProjMatrix, ModelViewMatrix);
	gl.uniformMatrix4fv(MVPUniform, false, ModelViewProjectionMatrix);
	gl.bindVertexArray(VAObj_shapes[0]);
		gl.drawArrays(gl.TRIANGLES, 0, 12);
	gl.bindVertexArray(null);

	ModelViewMatrix = mat4.create();
	ModelViewProjectionMatrix = mat4.create();
	TranslationMatrix = mat4.create();
	mat4.translate(TranslationMatrix, TranslationMatrix, [2.0, 0.0, -5.0]);
	mat4.multiply(ModelViewMatrix, ModelViewMatrix, TranslationMatrix);
	RotationMatrix = mat4.create();
	mat4.rotate(RotationMatrix, RotationMatrix, angle, [1.0, 0.0, 0.0]);
	mat4.multiply(ModelViewMatrix, ModelViewMatrix, RotationMatrix);
	RotationMatrix = mat4.create();
	mat4.rotate(RotationMatrix, RotationMatrix, angle, [0.0, 2.0, 0.0]);
	mat4.multiply(ModelViewMatrix, ModelViewMatrix, RotationMatrix);
	RotationMatrix = mat4.create();
	mat4.rotate(RotationMatrix, RotationMatrix, angle, [0.0, 0.0, 3.0]);
	mat4.multiply(ModelViewMatrix, ModelViewMatrix, RotationMatrix);
	mat4.multiply(ModelViewProjectionMatrix, perspProjMatrix, ModelViewMatrix);
	gl.uniformMatrix4fv(MVPUniform, false, ModelViewProjectionMatrix);
	gl.bindVertexArray(VAObj_shapes[1]);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
		gl.drawArrays(gl.TRIANGLE_FAN, 4, 4);
		gl.drawArrays(gl.TRIANGLE_FAN, 8, 4);
		gl.drawArrays(gl.TRIANGLE_FAN, 12, 4);
		gl.drawArrays(gl.TRIANGLE_FAN, 16, 4);
		gl.drawArrays(gl.TRIANGLE_FAN, 20, 4);
	gl.bindVertexArray(null);

	gl.useProgram(null);

	angle += 0.01;
	if(angle >= 360.0)
		angle = 0.0;

	// Similar to glFlush / swapBuffers / glXSwapBuffers / Game loop
	requestAnimationFrame(display, canvas);
}

// Function uninitialize
function uninitialize() {
	// Code
	// Delete Vertex Array Object
	if(VAObj_shapes) {
		gl.deleteVertexArray(VAObj_shapes);
		VAObj_shapes = null;
	}

	// Delete Vertex Buffer Object
	if(VBObj_pyramid) {
		gl.deleteBuffer(VBObj_pyramid);
		VBObj_pyramid = null;
	}
	if(VBObj_cube) {
		gl.deleteBuffer(VBObj_cube);
		VBObj_cube = null;
	}

	// Delete shader programs and shaders
	if(SPObj) {
		if(FSObj) {
			gl.detachShader(SPObj, FSObj);
			gl.deleteShader(FSObj);
			FSObj = null;
		}
		if(VSObj) {
			gl.detachShader(SPObj, VSObj);
			gl.deleteShader(VSObj);
			VSObj = null;
		}
		gl.deleteProgram(SPObj);
		SPObj = null;
	}
	window.close();
}
