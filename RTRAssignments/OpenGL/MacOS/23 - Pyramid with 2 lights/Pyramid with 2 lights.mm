//
//  Pyramid with 2 lights.mm
//  
//  Created by Darshan Vikam on 05/08/21.
//

// Importing required headers
#import <Foundation/Foundation.h>
#import <Cocoa/Cocoa.h>
#import <QuartzCore/CVDisplayLink.h>
#import <OpenGL/gl3.h>			// gl.h - for legacy OpenGL (FFP)
#import "../Include/vmath.h"

// Call back function
CVReturn myDisplayLinkCallback(CVDisplayLinkRef, const CVTimeStamp *, const CVTimeStamp *, CVOptionFlags, CVOptionFlags *, void *);

// Global variables
FILE *gfp_log = NULL;

using namespace vmath;

// Declaring interfaces
@interface AppDelegate : NSObject <NSApplicationDelegate, NSWindowDelegate>
@end

@interface OpenGLView : NSOpenGLView
@end

// Entry point function - main()
int main(int argc, char* argv[]) {
	// Code
	NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];
	
	NSApp = [NSApplication sharedApplication];		// NSApp is global variable given by MacOS
	[NSApp setDelegate : [[AppDelegate alloc] init]];
	
	[NSApp run];            // Run loop - similar to message loop or game loop
	
	[pool release];
	
	return 0;
}

// Implementation of AppDelegate interface
@implementation AppDelegate {
	@private
	NSWindow *window;
	OpenGLView *glView;
}
-(void)applicationDidFinishLaunching : (NSNotification *)aNotification {
	// Code
	NSBundle *appBundle = [NSBundle mainBundle];
	NSString *appLocn = [appBundle bundlePath];
	const char *logFileName = [[NSString stringWithFormat : @"%@/log.txt", [appLocn stringByDeletingLastPathComponent]] cStringUsingEncoding : NSASCIIStringEncoding];
	gfp_log = fopen(logFileName, "w");
	if(gfp_log == NULL) {
		[self release];
		[NSApp terminate : self];
	}
	fprintf(gfp_log, "Log file created successfully...\n");
	fprintf(gfp_log, "Program started successfully..\n");
	
	NSRect win_rect = NSMakeRect(0.0, 0.0, 800.0, 600.0);
	window = [[NSWindow alloc] initWithContentRect : win_rect
			styleMask : NSWindowStyleMaskTitled | NSWindowStyleMaskClosable | NSWindowStyleMaskMiniaturizable | NSWindowStyleMaskResizable
			backing : NSBackingStoreBuffered
			defer : NO];
	[window setTitle : @"Pyramid with 2 lights"];
	[window center];
	
	glView = [[OpenGLView alloc] initWithFrame : win_rect];
	
	[window setContentView : glView];
	[window setDelegate : self];
	[window makeKeyAndOrderFront : self];
}
-(void)applicationWillTerminate : (NSNotification *)aNotification {
	// Code
	if(gfp_log) {
		fprintf(gfp_log, "Program terminated successfully...\n");
		fprintf(gfp_log, "Log file closing successfully...");
		fclose(gfp_log);
		gfp_log = NULL;
	}
}
-(void)windowWillClose : (NSNotification *)aNotification {
	// Code
	[NSApp terminate : self];
}
-(void)dealloc {
	// Code
	[glView release];
	[window release];
	[super dealloc];
}
@end

// Implementation of OpenGLView interface
@implementation OpenGLView {
	@private
	CVDisplayLinkRef displayLink;
	
	// enum declaration
	enum {
		DV_ATTRIB_POS = 0,
		DV_ATTRIB_COL,
		DV_ATTRIB_NORM,
		DV_ATTRIB_TEX,
	};
	
	GLuint gVSObj;		// Vertex Shader Object
	GLuint gFSObj;		// Fragment Shader Object
	GLuint gSPObj;		// Shader Program Object
	GLuint gVAObj;		// Vertex Array Object
	GLuint gVBObj_pyramid[2];		// Vertex Buffer Object
	
	GLuint gMMatrixUniform, gVMatrixUniform, gPMatrixUniform;	// Model, View, Projection Matrix Uniform
	GLuint gLAmbUniform, gLDiffUniform, gLSpecUniform, gLPosUniform;
	GLuint gKAmbUniform, gKDiffUniform, gKSpecUniform, gKShineUniform;
	GLuint gLightEnabledUniform;
	
	bool lightEnabled;
	bool animationEnabled;
	
	float angle;
	
	mat4 gPerspProjMatrix;
}
-(id)initWithFrame : (NSRect)frame {
	// Code
	self = [super initWithFrame : frame];
	if(self) {
		NSOpenGLPixelFormatAttribute pfa[] = { NSOpenGLPFAOpenGLProfile, NSOpenGLProfileVersion4_1Core,
				NSOpenGLPFAScreenMask, CGDisplayIDToOpenGLDisplayMask(kCGDirectMainDisplay),
				NSOpenGLPFANoRecovery,
				NSOpenGLPFAAccelerated,
				NSOpenGLPFAColorSize, 24,
				NSOpenGLPFADepthSize, 24,
				NSOpenGLPFAAlphaSize, 8,
				NSOpenGLPFADoubleBuffer, 0 };
		
		NSOpenGLPixelFormat *pixelFormat = [[[NSOpenGLPixelFormat alloc] initWithAttributes : pfa] autorelease];
		if(pixelFormat == nil) {
			fprintf(gfp_log, "Unable to get Pixel Format.\n");
			[self release];
			[NSApp terminate : self];
		}
		
		NSOpenGLContext *glContext = [[[NSOpenGLContext alloc] initWithFormat : pixelFormat shareContext : nil] autorelease];
		if(glContext == nil) {
			fprintf(gfp_log, "Unable to get OpenGL Context.\n");
			[self release];
			[NSApp terminate : self];
		}
		
		[self setPixelFormat : pixelFormat];
		[self setOpenGLContext : glContext];
	}
	return self;
}
-(CVReturn)getFrameForTime : (const CVTimeStamp *)outputTime {
	// Code
	NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];
	[self drawView];
	[pool release];
	return (kCVReturnSuccess);
}
-(void)prepareOpenGL {
	// Code
	[super prepareOpenGL];
	[[self openGLContext] makeCurrentContext];
	
	// Swap interval
	GLint swapInterval = 1;
	[[self openGLContext] setValues : &swapInterval forParameter : NSOpenGLCPSwapInterval];
	
	// Vertex Shader
	gVSObj = glCreateShader(GL_VERTEX_SHADER);		// Create shader
	const GLchar *VSSrcCode = 				// Source code of shader
		"#version 410 core\n" \
		"in vec4 vPosition;" \
		"in vec3 vNormal;" \
		"uniform mat4 u_MMatrix, u_VMatrix, u_PMatrix;" \
		"uniform vec3 u_LAmb[2], u_LDiff[2], u_LSpec[2];" \
		"uniform vec4 u_LPos[2];" \
		"uniform vec3 u_KAmb, u_KDiff, u_KSpec;" \
		"uniform float u_KShine;" \
		"uniform bool u_LightEnabled;" \
		"out vec3 out_light;"\
		"void main(void) {" \
			"out_light = vec3(0.0);" \
			"if(u_LightEnabled) {" \
				"vec4 eyeCoords = u_VMatrix * u_MMatrix * vPosition;" \
				"vec3 transformedNormal = normalize(mat3(u_VMatrix * u_MMatrix) * vNormal);" \
				"vec3 viewVector = normalize(-eyeCoords.xyz);" \
				"vec3 lightSource, reflectionVector;" \
				"vec3 ambient, diffuse, specular;" \
				"for(int i = 0; i < 2; i++) {" \
					"lightSource = normalize(vec3(u_LPos[i] - eyeCoords));" \
					"reflectionVector = reflect(-lightSource, transformedNormal);" \
					"ambient = u_LAmb[i] * u_KAmb;" \
					"diffuse = u_LDiff[i] * u_KDiff * max(dot(lightSource, transformedNormal), 0.0);" \
					"specular = u_LSpec[i] * u_KSpec * pow(max(dot(reflectionVector, viewVector), 0.0f), u_KShine);" \
					"out_light += (ambient + diffuse + specular);" \
				"}" \
			"}" \
			"gl_Position = u_PMatrix * u_VMatrix * u_MMatrix * vPosition;" \
		"}";
	glShaderSource(gVSObj, 1, (const GLchar**)&VSSrcCode, NULL);
	glCompileShader(gVSObj);				// Compile Shader
	[self shaderErrorCheck : gVSObj option : "COMPILE"];
	fprintf(gfp_log, "Vertex Shader Compiled successfully...\n");

	// Fragment Shader
	gFSObj = glCreateShader(GL_FRAGMENT_SHADER);	// Create shader
	const GLchar *FSSrcCode = 			// Source code of shader
		"#version 410 core\n" \
		"in vec3 out_light;" \
		"out vec4 FragColor;" \
		"void main(void) {" \
			"FragColor = vec4(out_light, 1.0);" \
		"}";
	glShaderSource(gFSObj, 1, (const GLchar**)&FSSrcCode, NULL);
	glCompileShader(gFSObj);				// Compile Shader
	[self shaderErrorCheck : gFSObj option : "COMPILE"];
	fprintf(gfp_log, "Fragment Shader Compiled successfully...\n");

	// Shader program
	gSPObj = glCreateProgram();		// Create final shader
	glAttachShader(gSPObj, gVSObj);		// Add Vertex shader code to final shader
	glAttachShader(gSPObj, gFSObj);		// Add Fragment shader code to final shader
	glBindAttribLocation(gSPObj, DV_ATTRIB_POS, "vPosition");
	glBindAttribLocation(gSPObj, DV_ATTRIB_NORM, "vNormal");
	glLinkProgram(gSPObj);
	[self shaderErrorCheck : gSPObj option : "LINK"];
	fprintf(gfp_log, "Shader Program Compiled successfully...\n");

	// get uniform location(s)
	gMMatrixUniform = glGetUniformLocation(gSPObj, "u_MMatrix");
	gVMatrixUniform = glGetUniformLocation(gSPObj, "u_VMatrix");
	gPMatrixUniform = glGetUniformLocation(gSPObj, "u_PMatrix");
	gLAmbUniform = glGetUniformLocation(gSPObj, "u_LAmb");
	gLDiffUniform = glGetUniformLocation(gSPObj, "u_LDiff");
	gLSpecUniform = glGetUniformLocation(gSPObj, "u_LSpec");
	gLPosUniform = glGetUniformLocation(gSPObj, "u_LPos");
	gKAmbUniform = glGetUniformLocation(gSPObj, "u_KAmb");
	gKDiffUniform = glGetUniformLocation(gSPObj, "u_KDiff");
	gKSpecUniform = glGetUniformLocation(gSPObj, "u_KSpec");
	gKShineUniform = glGetUniformLocation(gSPObj, "u_KShine");
	gLightEnabledUniform = glGetUniformLocation(gSPObj, "u_LightEnabled");
	
	// other global variable initialization
	const GLfloat PyramidVertex[] = {
		// Front face - Apex, Left bottom, Right bottom
		0.0f, 2.0f, 0.0f,	-1.0f, -1.0f, 1.0f,	1.0f, -1.0f, 1.0f,
		// Right face - Apex, Left bottom, Right bottom
		0.0f, 2.0f, 0.0f,	1.0f, -1.0f, 1.0f,	1.0f, -1.0f, -1.0f,
		// Back face - Apex, Left bottom, Right bottom
		0.0f, 2.0f, 0.0f,	1.0f, -1.0f, -1.0f,	-1.0f, -1.0f, -1.0f,
		// Left face - Apex, Left bottom, Right bottom
		0.0f, 2.0f, 0.0f,	-1.0f, -1.0f, -1.0f,	-1.0f, -1.0f, 1.0f
	};
	const GLfloat PyramidNormal[] = {
		// Front face - Apex, Left bottom, Right bottom
		0.0f, 0.447214f, 0.894427f,	0.0f, 0.447214f, 0.894427f,	0.0f, 0.447214f, 0.894427f,
		// Right face - Apex, Left bottom, Right bottom
		0.894427f, 0.447214f, 0.0f,	0.894427f, 0.447214f, 0.0f,	0.894427f, 0.447214f, 0.0f,
		// Back face - Apex, Left bottom, Right bottom
		0.0f, 0.447214f, -0.894427f,	0.0f, 0.447214f, -0.894427f,	0.0f, 0.447214f, -0.894427f,
		// Left face - Apex, Left bottom, Right bottom
		-0.894427f, 0.447214f, 0.0f,	-0.894427f, 0.447214f, 0.0f,	-0.894427f, 0.447214f, 0.0f
	};
	
	glGenVertexArrays(1, &gVAObj);
	glBindVertexArray(gVAObj);
		glGenBuffers(2, gVBObj_pyramid);
		glBindBuffer(GL_ARRAY_BUFFER, gVBObj_pyramid[0]);
		glBufferData(GL_ARRAY_BUFFER, sizeof(PyramidVertex), PyramidVertex, GL_STATIC_DRAW);
		glVertexAttribPointer(DV_ATTRIB_POS, 3, GL_FLOAT, GL_FALSE, 0, NULL);
		glEnableVertexAttribArray(DV_ATTRIB_POS);
		glBindBuffer(GL_ARRAY_BUFFER, 0);
		
		glBindBuffer(GL_ARRAY_BUFFER, gVBObj_pyramid[1]);
		glBufferData(GL_ARRAY_BUFFER, sizeof(PyramidNormal), PyramidNormal, GL_STATIC_DRAW);
		glVertexAttribPointer(DV_ATTRIB_NORM, 3, GL_FLOAT, GL_FALSE, 0, NULL);
		glEnableVertexAttribArray(DV_ATTRIB_NORM);
		glBindBuffer(GL_ARRAY_BUFFER, 0);
	glBindVertexArray(0);

	// Depth related OpenGL code
	glClearDepth(1.0f);
	glEnable(GL_DEPTH_TEST);
	glDepthFunc(GL_LEQUAL);
	
//	glPolygonMode(GL_FRONT_AND_BACK, GL_LINE);
	
	lightEnabled = false;
	animationEnabled = false;
	
	gPerspProjMatrix = mat4::identity();
	
	glClearColor(0.0f, 0.0f, 0.0f, 1.0f);
	
	// Core Video and Core Graphics related code
	CVDisplayLinkCreateWithActiveCGDisplays(&displayLink);
	CVDisplayLinkSetOutputCallback(displayLink, &myDisplayLinkCallback, self);
	CGLContextObj cglContext = (CGLContextObj)[[self openGLContext] CGLContextObj];
	CGLPixelFormatObj cglPixelFormat = (CGLPixelFormatObj)[[self pixelFormat] CGLPixelFormatObj];
	CVDisplayLinkSetCurrentCGDisplayFromOpenGLContext(displayLink, cglContext, cglPixelFormat);
	CVDisplayLinkStart(displayLink);
}
-(void)shaderErrorCheck : (GLuint)shaderObject option : (const char *)shaderOpr {
	// Variable declaration
	GLint iErrorLen = 0;
	GLint iStatus = 0;
	char *szError = NULL;

	// Code
	if(strcmp(shaderOpr, "COMPILE") == 0)
		glGetShaderiv(shaderObject, GL_COMPILE_STATUS, &iStatus);
	else if(strcmp(shaderOpr, "LINK") == 0)
		glGetProgramiv(shaderObject, GL_LINK_STATUS, &iStatus);
	else {
		fprintf(gfp_log, "Invalid second parameter in ShaderErrorCheck()");
		return;
	}
	if(iStatus == GL_FALSE) {
		if(strcmp(shaderOpr, "COMPILE") == 0)
			glGetShaderiv(shaderObject, GL_INFO_LOG_LENGTH, &iErrorLen);
		else
			glGetProgramiv(shaderObject, GL_INFO_LOG_LENGTH, &iErrorLen);
		if(iErrorLen > 0) {
			szError = (char *)malloc(iErrorLen);
			if(szError != NULL) {
				GLsizei written;
				if(strcmp(shaderOpr, "COMPILE") == 0) {
					glGetShaderInfoLog(shaderObject, iErrorLen, &written, szError);
					fprintf(gfp_log, "Shader Compilation Error log : \n");
				}
				else if(strcmp(shaderOpr, "LINK") == 0) {
					glGetProgramInfoLog(shaderObject, iErrorLen, &written, szError);
					fprintf(gfp_log, "Shader linking Error log : \n");
				}
				fprintf(gfp_log, "%s \n", szError);
				free(szError);
				szError = NULL;
			}
		}
		else
			fprintf(gfp_log, "Error occured during compilation. No error message. \n");
		[self release];
		[NSApp terminate : self];
	}
}
-(void)reshape {
	//Code
	[super reshape];
	CGLLockContext((CGLContextObj)[[self openGLContext] CGLContextObj]);

	NSRect rect = [self bounds];
	if(rect.size.height < 0) {
		rect.size.height = 1;
	}
	glViewport(0, 0, (GLsizei)rect.size.width, (GLsizei)rect.size.height);
	
	gPerspProjMatrix = perspective(45.0f, (GLfloat)rect.size.width/(GLfloat)rect.size.height, 0.1f, 100.0f);
	
	CGLUnlockContext((CGLContextObj)[[self openGLContext] CGLContextObj]);
}
-(void)drawRect : (NSRect)dirtyRect {
	// Code
	[self drawView];
}
-(void) drawView {		// Display() in windows
	// Variable declaration
	mat4 MMatrix, VMatrix, PMatrix;
	mat4 translationMatrix, rotationMatrix;
	vec3 materialAmbient, materialDiffuse, materialSpecular;
	GLfloat materialShininess;
	
	// Code
	[[self openGLContext] makeCurrentContext];
	CGLLockContext((CGLContextObj)[[self openGLContext] CGLContextObj]);
	
	// OpenGL Code starts here
	glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
	
	glUseProgram(gSPObj);
	
	if(lightEnabled) {
		GLfloat lightAmbient[] = { 0.5f, 0.5f, 0.5f,
			0.25f, 0.25f, 0.25f };
		GLfloat lightDiffuse[] = { 1.0f, 0.0f, 0.0f,
			0.0f, 0.0f, 1.0f };
		GLfloat lightSpecular[] = { 1.0f, 0.0f, 0.0f,
			0.0f, 0.0f, 1.0f };
		GLfloat lightPosition[] = { 2.0f, 0.0f, 0.0f, 1.0f,
			-2.0f, 0.0f, 0.0f, 1.0f };
		materialAmbient = vec3(0.0f, 0.0f, 0.0f);
		materialDiffuse = vec3(1.0f, 1.0f, 1.0f);
		materialSpecular = vec3(1.0f, 1.0f, 1.0f);
		materialShininess = 50.0f;
		
		glUniform1i(gLightEnabledUniform, true);
		glUniform3fv(gLAmbUniform, 2, lightAmbient);
		glUniform3fv(gLDiffUniform, 2, lightDiffuse);
		glUniform3fv(gLSpecUniform, 2, lightSpecular);
		glUniform4fv(gLPosUniform, 2, lightPosition);
		glUniform3fv(gKAmbUniform, 1, materialAmbient);
		glUniform3fv(gKDiffUniform, 1, materialDiffuse);
		glUniform3fv(gKSpecUniform, 1, materialSpecular);
		glUniform1fv(gKShineUniform, 1, &materialShininess);
	}
	else
		glUniform1i(gLightEnabledUniform, false);

	// Initialization
	MMatrix = mat4::identity();
	VMatrix = mat4::identity();
	PMatrix = gPerspProjMatrix;
	translationMatrix = mat4::identity();
	// Setting values
	translationMatrix = translate(0.0f, 0.0f, -5.0f);
	VMatrix *= translationMatrix;
	rotationMatrix = rotate(angle, 0.0f, 1.0f, 0.0f);
	VMatrix *= rotationMatrix;
	glUniformMatrix4fv(gMMatrixUniform, 1, GL_FALSE, MMatrix);
	glUniformMatrix4fv(gVMatrixUniform, 1, GL_FALSE, VMatrix);
	glUniformMatrix4fv(gPMatrixUniform, 1, GL_FALSE, PMatrix);
	// OpenGL Drawing
	glBindVertexArray(gVAObj);
		glDrawArrays(GL_TRIANGLES, 0, 12);
	glBindVertexArray(0);

	// End of OpenGL shading program
	glUseProgram(0);
	
	if(animationEnabled)
		angle += 0.5f;
	if(angle >= 360.0f)
		angle = 0.0f;
	
	CGLFlushDrawable((CGLContextObj)[[self openGLContext] CGLContextObj]);
	CGLUnlockContext((CGLContextObj)[[self openGLContext] CGLContextObj]);
}
-(BOOL)acceptsFirstResponder {
	// Code
	[[self window] makeFirstResponder : nil];
	return YES;
}
-(void)keyDown : (NSEvent *)theEvent {
	// Code
	int key = [[theEvent characters] characterAtIndex : 0];
	switch(key) {
		case 27 :		// ESC
			[self release];
			[NSApp terminate : self];
			break;
		case 'F' :
		case 'f' :
			[[self window] toggleFullScreen : self];
			break;
		case 'l' :
		case 'L' :
			lightEnabled = ! lightEnabled;
			break;
		case 'a' :
		case 'A' :
			animationEnabled = ! animationEnabled;
			break;
	}
}
-(void)mouseDown : (NSEvent *)theEvent {
	// Code
}
-(void)rightMouseDown : (NSEvent *)theEvent {
	// Code
}
-(void)otherMouseDown : (NSEvent *)theEvent {
	// Code
}
-(void)dealloc {
	// Code
	CVDisplayLinkStop(displayLink);
	CVDisplayLinkRelease(displayLink);
	
	// Unlink shader program (if not unlinked earlier)
	glUseProgram(0);
	
	// Destroy Vertex Array Object
	if(gVAObj) {
		glDeleteVertexArrays(1, &gVAObj);
		gVAObj = 0;
	}
	
	// Destroy Vertex Buffer Object
	if(gVBObj_pyramid) {
		glDeleteBuffers(2, gVBObj_pyramid);
		gVBObj_pyramid[0] = 0;
		gVBObj_pyramid[1] = 0;
	}

	// Detach shaders
	glDetachShader(gSPObj, gVSObj);		// Detach vertex shader from final shader program
	glDetachShader(gSPObj, gFSObj);		// Detach fragment shader from final shader program
	
	// Delete shaders
	if(gVSObj != 0) {			// Delete Vertex shader
		glDeleteShader(gVSObj);
		gVSObj = 0;
	}
	if(gFSObj != 0) {			// Delete Fragment shader
		glDeleteShader(gFSObj);
		gFSObj = 0;
	}
	if(gSPObj != 0) {			// Delete final shader program
		glDeleteProgram(gSPObj);
		gSPObj = 0;
	}
	
	[super dealloc];
}
@end

// Definition of callback function
CVReturn myDisplayLinkCallback(CVDisplayLinkRef displayLink, const CVTimeStamp *curr, const CVTimeStamp *outTime, CVOptionFlags flagsIn, CVOptionFlags * flagsOut, void *displayLinkContext) {
	// Code
	CVReturn result = [(OpenGLView *)displayLinkContext getFrameForTime : outTime];
	return result;
}
