// Program to show Tweaked smiley on a simple square
// By : Darshan Vikam
// Date : 27 March 2021

// Global header files
#include <Windows.h>
#include <stdio.h>
#include <string.h>
#include <gl/glew.h>
#include <gl/GL.h>
#include "../Include/vmath.h"
#include "../Icon/WinIcon.h"
#include "WinTextures.h"

// Library linking
#pragma comment(lib, "user32.lib")
#pragma comment(lib, "gdi32.lib")
#pragma comment(lib, "kernel32.lib")
#pragma comment(lib, "glew32.lib")
#pragma comment(lib, "OpenGL32.lib")

// Call back function - WndProc()
LRESULT CALLBACK WndProc(HWND, UINT, WPARAM, LPARAM);

// Global macro definitions
#define WIN_WIDTH 800
#define WIN_HEIGHT 600

// Namespace declaration
using namespace vmath;

// Global enum declaration
enum {
	DV_ATTRIBUTE_POSITION = 0,
	DV_ATTRIBUTE_COLOR,
	DV_ATTRIBUTE_NORMAL,
	DV_ATTRIBUTE_TEXTURE0,
};

// Global variable declaration
HWND ghwnd = NULL;
HDC ghdc = NULL;
HGLRC ghrc = NULL;
FILE *gfp = NULL;
DWORD dwStyle;
WINDOWPLACEMENT wpPrev = { sizeof(WINDOWPLACEMENT) };

bool gbActiveWindow = false;
bool gbFullscreen = false;

int keyPressed = 0;
GLuint Smiley_Texture;

GLuint gVSObj;		// Vertex Shader Object
GLuint gFSObj;		// Fragment Shader Object
GLuint gSPObj;		// Shader Program Object
GLuint gVAObj;		// Vertex Array Object 
GLuint gVBObj_pos;	// Fragment Buffer Object for position
GLuint gVBObj_texture;	// Fragment Buffer Object for texture
GLuint gMVPUniform;	// Matrix 
GLuint gTextureSamplerUniform;

mat4 gPerspectiveProjectionMatrix;	// Matrix of 4x4

// Entry point function - WinMain()
int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpszCmdLine, int iCmdShow) {
	// Function declarations
	void Initialize(void);
	void Display(void);
	void Update(void);
	void Uninitialize(void);

	// Variable declaration
	WNDCLASSEX wndclass;
	HWND hwnd;
	MSG msg;
	TCHAR szAppName[] = TEXT("TweakedSmileyInPP");
	bool bDone = false;

	// Code
	if(fopen_s(&gfp, "Log.txt", "w") != 0) {
		MessageBox(NULL, TEXT("Log.txt file cannot be created.\n Exitting..."), TEXT("ERROR"), MB_OK | MB_ICONERROR);
		exit(0);
	}
	else
		fprintf(gfp, "Log file created successfully...\n");

	wndclass.cbSize = sizeof(WNDCLASSEX);
	wndclass.style = CS_HREDRAW | CS_VREDRAW | CS_OWNDC;
	wndclass.cbClsExtra = 0;
	wndclass.cbWndExtra = 0;
	wndclass.hInstance = hInstance;
	wndclass.hbrBackground = (HBRUSH)GetStockObject(BLACK_BRUSH);
	wndclass.hIcon = LoadIcon(hInstance, MAKEINTRESOURCE(D_ICON));
	wndclass.hCursor = LoadCursor(NULL, IDC_ARROW);
	wndclass.hIconSm = LoadIcon(hInstance, MAKEINTRESOURCE(D_ICON));
	wndclass.lpfnWndProc = WndProc;
	wndclass.lpszClassName = szAppName;
	wndclass.lpszMenuName = NULL;

	RegisterClassEx(&wndclass);

	hwnd = CreateWindowEx(WS_EX_APPWINDOW, szAppName, TEXT("Tweaked Smiley"), WS_OVERLAPPEDWINDOW | WS_CLIPCHILDREN | WS_CLIPSIBLINGS | WS_VISIBLE, 100, 100, WIN_WIDTH, WIN_HEIGHT, NULL, NULL, hInstance, NULL);
	ghwnd = hwnd;

	ShowWindow(hwnd, iCmdShow);
	SetForegroundWindow(hwnd);
	SetFocus(hwnd);

	Initialize();

	while(bDone == false) {
		if(PeekMessage(&msg, NULL, 0, 0, PM_REMOVE)) {
			if(msg.message == WM_QUIT)
				bDone = true;
			else {
				TranslateMessage(&msg);
				DispatchMessage(&msg);
			}
		}
		else {
			Display();
			Update();
		}
	}

	return((int)msg.wParam);
}

// Call back function definition - WndProc()
LRESULT CALLBACK WndProc(HWND hwnd, UINT iMsg, WPARAM wParam, LPARAM lParam) {
	// Function declaration
	void Resize(int, int);
	void ToggleFullscreen(void);
	void Uninitialize(void);

	// Code
	switch(iMsg) {
		case WM_ACTIVATE :
			if(HIWORD(wParam) == 0)
				gbActiveWindow = true;
			else
				gbActiveWindow = false;
			break;

		case WM_ERASEBKGND :
			return(0);

		case WM_SIZE :
			Resize(LOWORD(lParam), HIWORD(lParam));
			break;

		case WM_KEYDOWN :
			switch(wParam) {
				case VK_ESCAPE :
					if(MessageBox(ghwnd, TEXT("Do you want really want to quit?"), TEXT("Quit"), MB_YESNO) == IDYES)
						DestroyWindow(ghwnd);
					break;
				case 0x46 :
				case 0x66 :
					ToggleFullscreen();
					if(gbFullscreen == false)
						gbFullscreen = true;
					else
						gbFullscreen = false;
					break;
				case 0x31 :	// Case '1' :
				case VK_NUMPAD1 :
					keyPressed = 1;
					break;
				case 0x32 :	// Case '2' :
				case VK_NUMPAD2 :
					keyPressed = 2;
					break;
				case 0x33 :	// Case '3' :
				case VK_NUMPAD3 :
					keyPressed = 3;
					break;
				case 0x34 :	// Case '4' :
				case VK_NUMPAD4 :
					keyPressed = 4;
					break;
				default :
					keyPressed = 0;
					break;
			}
			break;

		case WM_CLOSE :
			if(MessageBox(ghwnd, TEXT("Do you want really want to quit?"), TEXT("Quit"), MB_YESNO) == IDYES)
				DestroyWindow(ghwnd);
			else
				return true;
			break;

		case WM_DESTROY :
			Uninitialize();
			PostQuitMessage(0);
			break;

		default :
			break;
	}
	return(DefWindowProc(hwnd, iMsg, wParam, lParam));
}

// User defined function definitions
void ToggleFullscreen(void) {
	// Variable declaration
	MONITORINFO mi;

	// Code
	if(gbFullscreen == false) {
		dwStyle = GetWindowLong(ghwnd, GWL_STYLE);
		if(dwStyle & WS_OVERLAPPEDWINDOW) {
			mi = {sizeof(MONITORINFO)};
			if(GetWindowPlacement(ghwnd, &wpPrev) && GetMonitorInfo(MonitorFromWindow(ghwnd, MONITORINFOF_PRIMARY), &mi)) {
				SetWindowLong(ghwnd, GWL_STYLE, dwStyle & ~WS_OVERLAPPEDWINDOW);
				SetWindowPos(ghwnd, HWND_TOP, mi.rcMonitor.left, mi.rcMonitor.top, mi.rcMonitor.right - mi.rcMonitor.left, mi.rcMonitor.bottom - mi.rcMonitor.top, SWP_NOZORDER | SWP_FRAMECHANGED);
			}
		}
		ShowCursor(FALSE);
	}
	else {
		SetWindowLong(ghwnd, GWL_STYLE, dwStyle | WS_OVERLAPPEDWINDOW);
		SetWindowPlacement(ghwnd, &wpPrev);
		SetWindowPos(ghwnd, HWND_TOP, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOOWNERZORDER | SWP_NOZORDER | SWP_FRAMECHANGED);
		ShowCursor(TRUE);
	}
}

void Initialize(void) {
	// Function declaration
	void Uninitialize(void);
	void Resize(int, int);
	void ShaderErrorCheck(GLuint, char*);			// ShaderErrorCheck(GLuint shader_object, char* ["COMPILE"/"LINK"]);
	bool loadGLTexture(GLuint *, TCHAR[]);			// Texture loading function

	// Variable declaration
	PIXELFORMATDESCRIPTOR pfd;
	int iPixelFormatIndex;
	FILE *fp_OGL_info = NULL;

	// Code
	ZeroMemory(&pfd, sizeof(PIXELFORMATDESCRIPTOR));
	pfd.nSize = sizeof(PIXELFORMATDESCRIPTOR);
	pfd.nVersion = 1;
	pfd.dwFlags = PFD_DRAW_TO_WINDOW | PFD_SUPPORT_OPENGL | PFD_DOUBLEBUFFER;
	pfd.iPixelType = PFD_TYPE_RGBA;
	pfd.cColorBits = 32;
	pfd.cRedBits = 8;
	pfd.cGreenBits = 8;
	pfd.cBlueBits = 8;
	pfd.cAlphaBits = 8;
	pfd.cDepthBits = 32;

	ghdc = GetDC(ghwnd);

	iPixelFormatIndex = ChoosePixelFormat(ghdc, &pfd);
	if(iPixelFormatIndex == 0)
		DestroyWindow(ghwnd);

	if(SetPixelFormat(ghdc, iPixelFormatIndex, &pfd) == false)
		DestroyWindow(ghwnd);

	ghrc = wglCreateContext(ghdc);
	if(ghrc == NULL)
		DestroyWindow(ghwnd);

	if(wglMakeCurrent(ghdc, ghrc) == false)
		DestroyWindow(ghwnd);

	GLenum glew_error = glewInit();
	if(glew_error != GLEW_OK)
		DestroyWindow(ghwnd);

	// OpenGL related log entry
	fopen_s(&fp_OGL_info, "OpenGL_info.txt", "w");
	if(fp_OGL_info == NULL)
		MessageBox(ghwnd, TEXT("Unable to open file to write OpenGL related information"), NULL, NULL);
	fprintf(fp_OGL_info, "*** OpenGL Information ***\n\n");
	fprintf(fp_OGL_info, "*** OpenGL related basic information ***\n");
	fprintf(fp_OGL_info, "OpenGL Vendor Company : %s\n", glGetString(GL_VENDOR));
	fprintf(fp_OGL_info, "OpenGL Renderer(Graphics card company) : %s\n", glGetString(GL_RENDERER));
	fprintf(fp_OGL_info, "OpenGL Version : %s\n", glGetString(GL_VERSION));
	fprintf(fp_OGL_info, "Graphics Library Shading Language(GLSL) Version : %s\n\n", glGetString(GL_SHADING_LANGUAGE_VERSION));
	fprintf(fp_OGL_info, "*** OpenGL supported/related extentions ***\n");
	// OpenGL supported/related Extensions
	GLint numExts;
	glGetIntegerv(GL_NUM_EXTENSIONS, &numExts);
	for(int i = 0; i < numExts; i++)
		fprintf(fp_OGL_info, "%d. %s\n", i+1, glGetStringi(GL_EXTENSIONS, i));
	fclose(fp_OGL_info);
	fp_OGL_info = NULL;

	// Vertex Shader
	gVSObj = glCreateShader(GL_VERTEX_SHADER);		// Create shader
	const GLchar *VSSrcCode = 				// Source code of shader
		"#version 450 core" \
		"\n" \
		"in vec4 vPosition;" \
		"in vec2 vTexCoord;" \
		"uniform mat4 u_mvpMatrix;" \
		"out vec2 out_TexCoord;" \
		"void main(void)" \
		"{" \
		"gl_Position = u_mvpMatrix * vPosition;" \
		"out_TexCoord = vTexCoord;" \
		"}";
	glShaderSource(gVSObj, 1, (const GLchar**)&VSSrcCode, NULL);
	glCompileShader(gVSObj);				// Compile Shader
	ShaderErrorCheck(gVSObj, "COMPILE");

	// Fragment Shader
	gFSObj = glCreateShader(GL_FRAGMENT_SHADER);	// Create shader
	const GLchar *FSSrcCode = 			// Source code of shader
		"#version 450 core" \
		"\n" \
		"in vec2 out_TexCoord;" \
		"uniform sampler2D u_texture_sampler;" \
		"out vec4 FragColor;" \
		"void main(void)" \
		"{" \
		"if(out_TexCoord == dvec2(-1.0f, -1.0f)) {" \
		"FragColor = vec4(1.0f, 1.0f, 1.0f, 1.0f);" \
		" }" \
		"else {" \
		"FragColor = texture(u_texture_sampler, out_TexCoord);" \
		" }" \
		"}";
	glShaderSource(gFSObj, 1, (const GLchar**)&FSSrcCode, NULL);
	glCompileShader(gFSObj);				// Compile Shader
	ShaderErrorCheck(gFSObj, "COMPILE");

	// Shader program
	gSPObj = glCreateProgram();		// Create final shader
	glAttachShader(gSPObj, gVSObj);		// Add Vertex shader code to final shader
	glAttachShader(gSPObj, gFSObj);		// Add Fragment shader code to final shader
	glBindAttribLocation(gSPObj, DV_ATTRIBUTE_POSITION, "vPosition");	// Binding of shader program with enum declared - for position(coordinates)
	glBindAttribLocation(gSPObj, DV_ATTRIBUTE_TEXTURE0, "vTexCoord");		// Binding of shader program with enum declared - for texture
	glLinkProgram(gSPObj);
	ShaderErrorCheck(gSPObj, "LINK");

	// get MVP uniform location
	gMVPUniform = glGetUniformLocation(gSPObj, "u_mvpMatrix");
	gTextureSamplerUniform = glGetUniformLocation(gSPObj, "u_texture_sampler");

	// other variable initialization
	const GLfloat SquareVertex[] = {
		-1.0f, 1.0f, 0.0f,	// top left
		-1.0f, -1.0f, 0.0f,	// bottom left
		1.0f, -1.0, 0.0f,	// bottom right
		1.0f, 1.0, 0.0f		// top right
	};

	// For Square
	glGenVertexArrays(1, &gVAObj);
	glBindVertexArray(gVAObj);		// Bind following steps into gVAObj variable

	// vPosition of square
	glGenBuffers(1, &gVBObj_pos);		// Generate buffer
	glBindBuffer(GL_ARRAY_BUFFER, gVBObj_pos);	// Binding buffer
	glBufferData(GL_ARRAY_BUFFER, sizeof(SquareVertex), SquareVertex, GL_STATIC_DRAW);	// Placing values in OpenGL's shader buffer(GL_VERTEX_BUFFER)
	glVertexAttribPointer(DV_ATTRIBUTE_POSITION, 3, GL_FLOAT, GL_FALSE, 0, NULL);		// Formatting of data entered into OpenGL's shader buffer(GL_VERTEX_BUFFER)
	glEnableVertexAttribArray(DV_ATTRIBUTE_POSITION);	// Enabling of OpenGL's buffer(GL_VERTEX_BUFFER)

	// vColor of square
	glGenBuffers(1, &gVBObj_texture);		// Generate buffer
	glBindBuffer(GL_ARRAY_BUFFER, gVBObj_texture);	// Binding buffer
	glBufferData(GL_ARRAY_BUFFER, sizeof(GLfloat) * 4 * 2, NULL, GL_DYNAMIC_DRAW);		// Placing values in OpenGL's shader buffer(GL_VERTEX_BUFFER)
	glVertexAttribPointer(DV_ATTRIBUTE_TEXTURE0, 2, GL_FLOAT, GL_FALSE, 0, NULL);		// Formatting of data entered into OpenGL's shader buffer(GL_VERTEX_BUFFER)
	glEnableVertexAttribArray(DV_ATTRIBUTE_TEXTURE0);	// Enabling of OpenGL's buffer(GL_VERTEX_BUFFER)

	glBindBuffer(GL_ARRAY_BUFFER, 0);	// Unbinding buffer - GL_ARRAY_BUFFER
	glBindVertexArray(0);			// unbind and save above steps into gVAObj

	// Depth related OpenGL code
	glClearDepth(1.0f);
	glEnable(GL_DEPTH_TEST);
	glDepthFunc(GL_LEQUAL);

	glClearColor(0.0f, 0.0f, 0.0f, 0.0f);

	glEnable(GL_TEXTURE_2D);
	// Loading textures
	loadGLTexture(&Smiley_Texture, MAKEINTRESOURCE(SMILEY_BITMAP));

	gPerspectiveProjectionMatrix = mat4::identity();

	// Warm up call to Resize()
	Resize(WIN_WIDTH, WIN_HEIGHT);
}

void ShaderErrorCheck(GLuint shaderObject, char *shaderOpr) {	// Error checking after shader compilation
	// Variable declaration
	GLint iErrorLen = 0;
	GLint iShaderStatus = 0;
	char *szError = NULL;

	// Code
	if(strcmp(shaderOpr, "COMPILE") == 0)
		glGetShaderiv(shaderObject, GL_COMPILE_STATUS, &iShaderStatus);
	else if(strcmp(shaderOpr, "LINK") == 0)
		glGetShaderiv(shaderObject, GL_LINK_STATUS, &iShaderStatus);
	else {
		fprintf(gfp, "Invalid second parameter in ShaderErrorCheck()");
		return;
	}
	if(iShaderStatus == GL_FALSE) {
		glGetShaderiv(shaderObject, GL_INFO_LOG_LENGTH, &iErrorLen);
		if(iErrorLen > 0) {
			szError = (char *)malloc(iErrorLen);
			if(szError != NULL) {
				GLsizei written;
				glGetShaderInfoLog(shaderObject, iErrorLen, &written, szError);
				if(strcmp(shaderOpr, "COMPILE") == 0)
					fprintf(gfp, "Shader Compilation Error log : \n");
				else if(strcmp(shaderOpr, "LINK") == 0)
					fprintf(gfp, "Shader linking Error log : \n");
				fprintf(gfp, "%s \n", szError);
				free(szError);
				szError = NULL;
				DestroyWindow(ghwnd);
			}
		}
	}
}

bool loadGLTexture(GLuint *texture, TCHAR resourceID[]) {
	// Variable declaration
	bool bResult = false;
	HBITMAP hBitmap = NULL;
	BITMAP bmp;

	// Code
	hBitmap = (HBITMAP)LoadImage(GetModuleHandle(NULL), resourceID, IMAGE_BITMAP, 0, 0, LR_CREATEDIBSECTION);
	if(hBitmap) {
		bResult = true;
		GetObject(hBitmap, sizeof(BITMAP), &bmp);
		// Actual code of texture
		glPixelStorei(GL_UNPACK_ALIGNMENT, 1);
		glGenTextures(1, texture);
		glBindTexture(GL_TEXTURE_2D, *texture);
		glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
		glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR_MIPMAP_LINEAR);
		glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB, bmp.bmWidth, bmp.bmHeight, 0, GL_BGR, GL_UNSIGNED_BYTE, bmp.bmBits);
		glGenerateMipmap(GL_TEXTURE_2D);
	//	gluBuild2DMipmaps(GL_TEXTURE_2D, 3, bmp.bmWidth, bmp.bmHeight, GL_BGR_EXT, GL_UNSIGNED_BYTE, bmp.bmBits);
		DeleteObject(hBitmap);
	}
	return bResult;
}

void Resize(int width, int height) {
	// Code
	if(height == 0)
		height = 1;
	glViewport(0, 0, (GLsizei)width, (GLsizei)height);

	gPerspectiveProjectionMatrix = perspective(45.0f, (GLfloat)width/(GLfloat)height, 0.1f, 100.0f);
}

void Display(void) {
	// Variable declaration
	mat4 modelviewMatrix, modelviewProjectionMatrix;
	mat4 translateMatrix;
	GLfloat texCoord[8];

	// Code
	glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

	// Starting of OpenGL shading program
	glUseProgram(gSPObj);

	modelviewMatrix = mat4::identity();
	modelviewProjectionMatrix = mat4::identity();
	translateMatrix = mat4::identity();

	// For Pyramid
	translateMatrix = translate(0.0f, 0.0f, -3.0f);
	modelviewMatrix = translateMatrix;

	modelviewProjectionMatrix = gPerspectiveProjectionMatrix * modelviewMatrix;
	glUniformMatrix4fv(gMVPUniform, 1, GL_FALSE, modelviewProjectionMatrix);

	// Texture specific code to be sent to sampler in shader
	glActiveTexture(GL_TEXTURE0);
	glBindTexture(GL_TEXTURE_2D, Smiley_Texture);
	glUniform1i(gTextureSamplerUniform, 0);

	// OpenGL Drawing
	glBindVertexArray(gVAObj);
	if(keyPressed == 1) {
		texCoord[0] = 0.0f;
		texCoord[1] = 1.0f;
		texCoord[2] = 0.0f;
		texCoord[3] = 0.0f;
		texCoord[4] = 1.0f;
		texCoord[5] = 0.0f;
		texCoord[6] = 1.0f;
		texCoord[7] = 1.0f;
	}
	else if(keyPressed == 2) {
		texCoord[0] = 0.0f;
		texCoord[1] = 0.5f;
		texCoord[2] = 0.0f;
		texCoord[3] = 0.0f;
		texCoord[4] = 0.5f;
		texCoord[5] = 0.0f;
		texCoord[6] = 0.5f;
		texCoord[7] = 0.5f;
	}
	else if(keyPressed == 3) {
		texCoord[0] = 0.0f;
		texCoord[1] = 2.0f;
		texCoord[2] = 0.0f;
		texCoord[3] = 0.0f;
		texCoord[4] = 2.0f;
		texCoord[5] = 0.0f;
		texCoord[6] = 2.0f;
		texCoord[7] = 2.0f;
	}
	else if(keyPressed == 4) {
		texCoord[0] = 0.5f;
		texCoord[1] = 0.5f;
		texCoord[2] = 0.5f;
		texCoord[3] = 0.5f;
		texCoord[4] = 0.5f;
		texCoord[5] = 0.5f;
		texCoord[6] = 0.5f;
		texCoord[7] = 0.5f;
	}
	else {
		texCoord[0] = -1.0f;
		texCoord[1] = -1.0f;
		texCoord[2] = -1.0f;
		texCoord[3] = -1.0f;
		texCoord[4] = -1.0f;
		texCoord[5] = -1.0f;
		texCoord[6] = -1.0f;
		texCoord[7] = -1.0f;
	}
	glBindBuffer(GL_ARRAY_BUFFER, gVBObj_texture);
	glBufferData(GL_ARRAY_BUFFER, sizeof(GLfloat) * 4 * 2, texCoord, GL_DYNAMIC_DRAW);
	glVertexAttribPointer(DV_ATTRIBUTE_TEXTURE0, 2, GL_FLOAT, GL_FALSE, 0, NULL);
	glEnableVertexAttribArray(DV_ATTRIBUTE_TEXTURE0);
	glBindBuffer(GL_ARRAY_BUFFER, 0);

	glDrawArrays(GL_TRIANGLE_FAN, 0, 4);
	glBindVertexArray(0);

	// End of OpenGL shading program
	glUseProgram(0);

	SwapBuffers(ghdc);
}

void Update(void) {
	// Code
}

void Uninitialize(void) {
	// Code
	if(gbFullscreen == true)
		ToggleFullscreen();

	// Destroy Vertex Array Object
	if(gVAObj) {
		glDeleteVertexArrays(1, &gVAObj);
		gVAObj = 0;
	}

	// Destroy Vertex Buffer Object
	if(gVBObj_pos) {
		glDeleteBuffers(1, &gVBObj_pos);
		gVBObj_pos = 0;
	}
	if(gVBObj_texture) {
		glDeleteBuffers(1, &gVBObj_texture);
		gVBObj_texture = 0;
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

	// Unlink shader program
	glUseProgram(0);

	if(wglGetCurrentContext() == ghrc)
		wglMakeCurrent(NULL, NULL);

	glDeleteTextures(1, &Smiley_Texture);

	if(ghrc) {
		wglDeleteContext(ghrc);
		ghrc = NULL;
	}

	if(ghdc) {
		ReleaseDC(ghwnd, ghdc);
		ghdc = NULL;
	}

	if(gfp) {
		fprintf(gfp, "Closing Log file successfully..\n");
		fclose(gfp);
		gfp = NULL;
	}
}