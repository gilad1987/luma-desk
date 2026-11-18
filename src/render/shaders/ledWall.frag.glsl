uniform float uT,uDim,uMode,uSpd;uniform vec3 uCol;varying vec2 vUv;
  float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  void main(){vec2 uv=vUv;float t=uT*(0.4+uSpd*0.03);float m=uMode;float v=1.;vec3 c=uCol;
  if(m<0.5){v=1.;}
  else if(m<1.5){v=mix(.15,1.,uv.y)*(.8+.2*sin(t*.7+uv.x*3.));}
  else if(m<2.5){v=step(.5,fract(uv.x*8.-t*.6));}
  else if(m<3.5){float p=sin(uv.x*6.+t)+sin(uv.y*5.-t*1.3)+sin((uv.x+uv.y)*4.+t*.7);v=.5+.5*sin(p*1.7);c=mix(uCol,uCol.gbr,.5+.5*sin(p));}
  else if(m<4.5){float d=length((uv-.5)*vec2(2.9,1.));v=pow(.5+.5*sin(d*12.-t*4.),3.);}
  else if(m<5.5){vec2 g=floor(uv*vec2(13.,4.5));v=step(.5,h(g+floor(t*1.5)));}
  else if(m<6.5){v=.5+.5*sin(uv.x*14.+sin(uv.y*3.+t)*2.-t*2.);v=pow(v,3.);}
  else {vec2 g=floor(uv*vec2(80.,28.));v=step(.93,h(g+floor(t*8.)));}
  vec2 px=fract(uv*vec2(208.,72.));float led=smoothstep(.0,.2,px.x)*smoothstep(1.,.8,px.x)*smoothstep(.0,.2,px.y)*smoothstep(1.,.8,px.y);
  vec3 col=c*v*uDim*1.35*(.55+.45*led);gl_FragColor=vec4(col+vec3(.006),1.);}