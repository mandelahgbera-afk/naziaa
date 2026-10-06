"use client";

import { useEffect, useRef } from "react";

/* Liquid amber: a slow, domain-warped flow of warm oil with light moving through it
   and a few suspended botanical motes. Plain WebGL (no 3D library) so it costs
   ~3 KB. Renders at reduced resolution, pauses off-screen / in background tabs,
   and paints a single still frame for reduced motion. */

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;

const FRAG = `
precision highp float;
uniform vec2 r;
uniform float t;
uniform vec2 m;

float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 R=mat2(.8,.6,-.6,.8);
  for(int i=0;i<5;i++){v+=a*n(p);p=R*p*2.02+.13;a*=.5;}return v;}

void main(){
  vec2 uv=gl_FragCoord.xy/r;
  vec2 p=(gl_FragCoord.xy-.5*r)/min(r.x,r.y);
  float T=t*.035;
  p+= (m-.5)*.08;

  vec2 q=vec2(fbm(p*1.3+vec2(0.,T)),fbm(p*1.3+vec2(5.2,-T*.8)));
  vec2 w=vec2(fbm(p*1.6+2.8*q+vec2(1.7,9.2)+T*.6),fbm(p*1.6+2.8*q+vec2(8.3,2.8)-T*.5));
  float f=fbm(p*1.2+3.2*w);

  vec3 deep=vec3(.13,.055,.02);
  vec3 amber=vec3(.52,.24,.07);
  vec3 honey=vec3(.89,.6,.3);
  vec3 cream=vec3(.98,.9,.78);

  vec3 c=mix(deep,amber,smoothstep(.15,.75,f));
  c=mix(c,honey,smoothstep(.55,.95,f*f*1.6)*.75);
  float caust=pow(smoothstep(.62,.98,length(w)*.9),3.);
  c+=mix(honey,cream,.35)*caust*.24;

  // light pouring in from the upper right
  float beam=smoothstep(1.2,0.,length((uv-vec2(.82,1.05))*vec2(1.,1.6)));
  c+=honey*beam*.35;

  // suspended motes
  for(int i=0;i<14;i++){
    float fi=float(i);
    vec2 s=vec2(h(vec2(fi,1.3)),h(vec2(fi,7.1)));
    vec2 pos=fract(s+vec2(sin(T*2.+fi)*.02,T*(.15+.25*s.x)));
    float d=length((uv-pos)*vec2(r.x/r.y,1.));
    c+=honey*smoothstep(.006+.004*s.y,0.,d)*.55;
  }

  // vignette for depth, darker at the edges like glass
  c*=mix(.62,1.08,smoothstep(1.25,.2,length(p*vec2(.9,1.1))));

  // melt into the cream page through honey, never through grey
  float melt=smoothstep(.48,.1,uv.y);
  c=mix(c,honey*1.06+caust*.1,melt*.82);
  c=mix(c,vec3(.98,.953,.925),smoothstep(.2,.0,uv.y));
  gl_FragColor=vec4(c,1.);
}`;

export function AmberField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uR = gl.getUniformLocation(prog, "r");
    const uT = gl.getUniformLocation(prog, "t");
    const uM = gl.getUniformLocation(prog, "m");

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lowPower = (navigator as Navigator & { deviceMemory?: number }).deviceMemory !== undefined &&
      ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 2;
    const scale = lowPower ? 0.35 : 0.55;

    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * scale));
      canvas.height = Math.max(1, Math.floor(h * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uR, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    const onMove = (e: PointerEvent) => {
      mouse.tx = e.clientX / window.innerWidth;
      mouse.ty = 1 - e.clientY / window.innerHeight;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0 });
    io.observe(canvas);

    let raf = 0;
    const start = performance.now() - 40_000; // begin mid-flow, never a blank first frame
    const draw = (now: number) => {
      mouse.x += (mouse.tx - mouse.x) * 0.03;
      mouse.y += (mouse.ty - mouse.y) * 0.03;
      gl.uniform1f(uT, (now - start) / 1000);
      gl.uniform2f(uM, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const loop = (now: number) => {
      if (visible && !document.hidden) draw(now);
      raf = requestAnimationFrame(loop);
    };
    if (reduce) draw(performance.now());
    else raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      // Free GPU objects but keep the context: the canvas (and its context) is
      // reused if the effect runs again, e.g. under React Strict Mode.
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
