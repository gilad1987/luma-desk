precision highp sampler3D;

uniform sampler2D tDepth; // scene depth at full resolution
uniform sampler2D tGobo; // 4 x 2 gobo cells
uniform sampler3D tNoise; // repeating haze noise
uniform vec2 uProj; // projection terms [2][2] and [3][2]
uniform vec4 uHaze; // x scattering, y extinction, z noise amount, w clock
uniform float uPix; // world size of one target pixel at 1 m
uniform int uSteps;

in vec3 vWorld;
flat in vec4 vApex;
flat in vec4 vAxis;
flat in vec4 vColor;
flat in vec4 vGobo;
flat in vec3 vSide;
flat in vec2 vSpan;
flat in float vSteps;

out vec4 fragColor;
