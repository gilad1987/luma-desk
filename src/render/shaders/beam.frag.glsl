uniform vec3 uColor;uniform float uInt,uHaze,uGobo,uGRot,uLen,uEnd,uSoft,uTime;varying float vT;varying vec3 vN;varying vec3 vV;varying vec3 vL;varying vec3 vW;
float h3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
void main(){float f=abs(dot(normalize(vN),normalize(vV)));float edge=pow(f,uSoft);
float d=vT*uLen;float fall=1./(1.+d*.075);float a=smoothstep(0.,.012,vT)*fall;a*=mix(1.,1.-smoothstep(.55,1.,vT),uEnd);
float g=1.;if(uGobo>.5){float an=atan(vL.x,vL.z)+uGRot;float n=uGobo;
 if(n<1.5)g=.5+.5*cos(an*8.);else if(n<2.5)g=.5+.5*sin(an*5.)*sin(an*3.+1.7);else if(n<3.5)g=pow(.5+.5*cos(an*10.),3.);else if(n<4.5)g=.5+.5*cos(an*5.);else if(n<5.5)g=pow(.5+.5*cos(an*3.),2.);else if(n<6.5)g=.75;else g=.5+.5*cos(an*6.);
 g=mix(.12,1.,smoothstep(.25,.75,g));}
a*=smoothstep(3.,26.,length(vV));vec3 hp=vW*.16+vec3(uTime*.05,uTime*.025,-uTime*.035);float hz=.45*n3(hp)+.3*n3(hp*2.3+7.)+.25;float o=uInt*uHaze*edge*a*g*mix(1.,.35+1.1*hz,clamp(uHaze*1.2,0.,1.));gl_FragColor=vec4(uColor,o);}