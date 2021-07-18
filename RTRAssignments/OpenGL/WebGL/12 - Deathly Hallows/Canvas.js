// Deathly Hallows in WebGL
// By : Darshan Vikam
// Date : 04 July 2021

// Global variables
var canvas = null;
var gl = null;
var canvas_original_width = 0;
var canvas_original_height = 0;
var bFullscreen = false;

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
var VAObj_CloakOfInvisibility, VBObj_CloakOfInvisibility;
var VAObj_ResurrectionStone, VBObj_ResurrectionStone;
var VAObj_ElderWand, VBObj_ElderWand;
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
		"uniform mat4 u_mvp_matrix;" +
		"void main(void) {" +
			"gl_Position = u_mvp_matrix * vPosition;" +
		"}";
	VSObj = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(VSObj, VSSrcCode);
	gl.compileShader(VSObj);
	ShaderErrorCheck(VSObj, "COMPILE");

	// Fragment Shader
	var FSSrcCode =
		"#version 300 es \n" +
		"precision highp float;" +
		"out vec4 FragColor;" +
		"void main(void) {" +
			"FragColor = vec4(1.0);" +
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
	gl.linkProgram(SPObj);
	ShaderErrorCheck(SPObj, "LINK");

	// Get uniform locations
	MVPUniform = gl.getUniformLocation(SPObj, "u_mvp_matrix");

	// Initializing vertices, color, shader attibs, VAO, VBO
	const radian = Math.PI / 180.0;
	const TriangleSide = 1.5;
	const Triangle_radius = (2.0 / Math.sqrt(TriangleSide * 2.0)) * TriangleSide;
	const inCircle_radius = TriangleSide / Math.sqrt(TriangleSide * 2.0);

	const CloakOfInvisibilityVertices = new Float32Array([
		(Triangle_radius * Math.cos(90.0 * radian)), (Triangle_radius * Math.sin(90.0 * radian)), 0.0,		// Apex
		(Triangle_radius * Math.cos(210.0 * radian)), (Triangle_radius * Math.sin(210.0 * radian)), 0.0,	// left bottom
		(Triangle_radius * Math.cos(330.0 * radian)), (Triangle_radius * Math.sin(330.0 * radian)), 0.0		// right bottom
	]);

	var ResurrectionStoneVertices = new Array();
	var x, y;
	for(var i = 0; i < 3600*2; i += 2) {
		x = (inCircle_radius * Math.cos(i * radian / 20.0));
		y = (inCircle_radius * Math.sin(i * radian / 20.0));
		ResurrectionStoneVertices.push(x, y, 0.0);
	}
	ResurrectionStoneVertices = Float32Array.from(ResurrectionStoneVertices);

	const ElderWandVertices = new Float32Array([
		0.0, inCircle_radius * 2, 0.0,
		0.0, -inCircle_radius, 0.0
	]);

	VAObj_CloakOfInvisibility = gl.createVertexArray();		// Cloak Of Invisibility
	gl.bindVertexArray(VAObj_CloakOfInvisibility);
		VBObj_CloakOfInvisibility = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, VBObj_CloakOfInvisibility);
		gl.bufferData(gl.ARRAY_BUFFER, CloakOfInvisibilityVertices, gl.STATIC_DRAW);
		gl.vertexAttribPointer(WebGLMacros.DV_ATTRIB_VERTEX, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(WebGLMacros.DV_ATTRIB_VERTEX);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	gl.bindVertexArray(null);

	VAObj_ResurrectionStone = gl.createVertexArray();		// Resurrection Stone
	gl.bindVertexArray(VAObj_ResurrectionStone);
		VBObj_ResurrectionStone = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, VBObj_ResurrectionStone);
		gl.bufferData(gl.ARRAY_BUFFER, ResurrectionStoneVertices, gl.STATIC_DRAW);
		gl.vertexAttribPointer(WebGLMacros.DV_ATTRIB_VERTEX, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(WebGLMacros.DV_ATTRIB_VERTEX);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	gl.bindVertexArray(null);

	VAObj_ElderWand = gl.createVertexArray();		// Elder Wand
	gl.bindVertexArray(VAObj_ElderWand);
		VBObj_ElderWand = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, VBObj_ElderWand);
		gl.bufferData(gl.ARRAY_BUFFER, ElderWandVertices, gl.STATIC_DRAW);
		gl.vertexAttribPointer(WebGLMacros.DV_ATTRIB_VERTEX, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(WebGLMacros.DV_ATTRIB_VERTEX);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	gl.bindVertexArray(null);

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
var trans = 5.0;
var angle = 0.0;
function display() {
	// Code
	gl.clear(gl.COLOR_BUFFER_BIT);

	gl.useProgram(SPObj);

	var ModelViewMatrix = mat4.create();
	var ModelViewProjectionMatrix = mat4.create();
	var TranslationMatrix, RotationMatrix;

	ModelViewMatrix = mat4.create();
	ModelViewProjectionMatrix = mat4.create();
	TranslationMatrix = mat4.create();
	mat4.translate(TranslationMatrix, TranslationMatrix, [-trans, -trans, -5.0]);
	mat4.multiply(ModelViewMatrix, ModelViewMatrix, TranslationMatrix);
	RotationMatrix = mat4.create();
	mat4.rotate(RotationMatrix, RotationMatrix, angle * Math.PI / 180.0, [0.0, 1.0, 0.0]);
	mat4.multiply(ModelViewMatrix, ModelViewMatrix, RotationMatrix);
	mat4.multiply(ModelViewProjectionMatrix, perspProjMatrix, ModelViewMatrix);
	gl.uniformMatrix4fv(MVPUniform, false, ModelViewProjectionMatrix);
	gl.bindVertexArray(VAObj_CloakOfInvisibility);
		gl.drawArrays(gl.LINE_LOOP, 0, 3);
	gl.bindVertexArray(null);

	ModelViewMatrix = mat4.create();
	ModelViewProjectionMatrix = mat4.create();
	TranslationMatrix = mat4.create();
	mat4.translate(TranslationMatrix, TranslationMatrix, [trans, -trans, -5.0]);
	mat4.multiply(ModelViewMatrix, ModelViewMatrix, TranslationMatrix);
	RotationMatrix = mat4.create();
	mat4.rotate(RotationMatrix, RotationMatrix, angle * Math.PI / 180.0, [0.0, 1.0, 0.0]);
	mat4.multiply(ModelViewMatrix, ModelViewMatrix, RotationMatrix);
	mat4.multiply(ModelViewProjectionMatrix, perspProjMatrix, ModelViewMatrix);
	gl.uniformMatrix4fv(MVPUniform, false, ModelViewProjectionMatrix);
	gl.bindVertexArray(VAObj_ResurrectionStone);
		gl.drawArrays(gl.LINES, 0, 3600);
	gl.bindVertexArray(null);

	ModelViewMatrix = mat4.create();
	ModelViewProjectionMatrix = mat4.create();
	TranslationMatrix = mat4.create();
	mat4.translate(TranslationMatrix, TranslationMatrix, [0.0, trans, -5.0]);
	mat4.multiply(ModelViewMatrix, ModelViewMatrix, TranslationMatrix);
	RotationMatrix = mat4.create();
	mat4.rotate(RotationMatrix, RotationMatrix, angle * Math.PI / 180.0, [0.0, 1.0, 0.0]);
	mat4.multiply(ModelViewMatrix, ModelViewMatrix, RotationMatrix);
	mat4.multiply(ModelViewProjectionMatrix, perspProjMatrix, ModelViewMatrix);
	gl.uniformMatrix4fv(MVPUniform, false, ModelViewProjectionMatrix);
	gl.bindVertexArray(VAObj_ElderWand);
		gl.drawArrays(gl.LINES, 0, 2);
	gl.bindVertexArray(null);

	gl.useProgram(null);


	if(trans > 0.01)
		trans -= 0.01;
	if(angle < 360.0)
		angle += 0.5;

	// Similar to glFlush / swapBuffers / glXSwapBuffers / Game loop
	requestAnimationFrame(display, canvas);
}

// Function uninitialize
function uninitialize() {
	// Code
	// Delete Vertex Array Object
	if(VAObj_CloakOfInvisibility) {
		gl.deleteVertexArray(VAObj_CloakOfInvisibility);
		VAObj_CloakOfInvisibility = null;
	}
	if(VAObj_ResurrectionStone) {
		gl.deleteVertexArray(VAObj_ResurrectionStone);
		VAObj_ResurrectionStone = null;
	}
	if(VAObj_ElderWand) {
		gl.deleteVertexArray(VAObj_ElderWand);
		VAObj_ElderWand = null;
	}

	// Delete Vertex Buffer Object
	if(VBObj_CloakOfInvisibility) {
		gl.deleteBuffer(VBObj_CloakOfInvisibility);
		VBObj_CloakOfInvisibility = null;
	}
	if(VBObj_ResurrectionStone) {
		gl.deleteBuffer(VBObj_ResurrectionStone);
		VBObj_ResurrectionStone = null;
	}
	if(VBObj_ElderWand) {
		gl.deleteBuffer(VBObj_ElderWand);
		VBObj_ElderWand = null;
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
