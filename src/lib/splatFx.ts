// Post-processing FX stack for the station splat background.
// Ported 1:1 from the Splat Explorer (the standalone HTML tool): same shaders,
// same uniforms, same render order. The component builds an EffectComposer,
// adds a RenderPass (Spark renders the splats inside the scene), then this
// stack, then an always-on CopyShader to the screen.
//
// Colors are handled manually (THREE.ColorManagement.enabled = false,
// renderer.toneMapping = NoToneMapping) so the splat colors stay faithful
// through the whole chain — do not introduce sRGB conversion passes here.

import * as THREE from "three";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { HalftonePass } from "three/addons/postprocessing/HalftonePass.js";

/** Shape of the JSON exported by the Splat Explorer's "COPIAR PRESET" button. */
export interface SplatPreset {
  camera: {
    parallaxDeg?: number;
    damping?: number;
    fov?: number;
    /** orbit radius as a fraction of the splat's bbox diagonal (smaller = more "inside") */
    radiusScale?: number;
    /** manual radius multiplier (the explorer's "dolly") */
    dolly?: number;
    /** holder.rotation [x,y,z] in Three.js world space */
    orientation?: [number, number, number];
    /** authored camera position in Three.js world space */
    position?: [number, number, number];
    /** authored camera target in Three.js world space */
    target?: [number, number, number];
  };
  effects: {
    duo?: { dark?: string; light?: string; amount?: number };
    post?: { levels?: number };
    dith?: { levels?: number; scale?: number };
    half?: { radius?: number; shape?: number; scatter?: number; greyscale?: boolean };
    pix?: { size?: number };
    chr?: { amount?: number };
    scn?: { count?: number; intensity?: number };
    grv?: { grain?: number; vig?: number };
    bloom?: { strength?: number; radius?: number; threshold?: number };
    sharp?: { amount?: number };
    irid?: { amount?: number };
    holo?: { amount?: number };
    prism?: { amount?: number };
    streak?: { amount?: number };
    hue?: { amount?: number };
  };
}

const VERT = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;

const Posterize = {
  uniforms: { tDiffuse: { value: null }, levels: { value: 6.0 } },
  vertexShader: VERT,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float levels; varying vec2 vUv;
  void main(){ vec4 c=texture2D(tDiffuse,vUv);
    vec3 q=floor(c.rgb*(levels-1.0)+0.5)/(levels-1.0);
    gl_FragColor=vec4(q,c.a); }`,
};

const Dither = {
  uniforms: {
    tDiffuse: { value: null },
    levels: { value: 4.0 },
    scale: { value: 2.0 },
    res: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: VERT,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float levels; uniform float scale;
  uniform vec2 res; varying vec2 vUv;
  float bayer(int i){
    if(i==0)return 0.0/16.0; if(i==1)return 8.0/16.0; if(i==2)return 2.0/16.0; if(i==3)return 10.0/16.0;
    if(i==4)return 12.0/16.0; if(i==5)return 4.0/16.0; if(i==6)return 14.0/16.0; if(i==7)return 6.0/16.0;
    if(i==8)return 3.0/16.0; if(i==9)return 11.0/16.0; if(i==10)return 1.0/16.0; if(i==11)return 9.0/16.0;
    if(i==12)return 15.0/16.0; if(i==13)return 7.0/16.0; if(i==14)return 13.0/16.0; return 5.0/16.0;
  }
  void main(){
    vec4 c=texture2D(tDiffuse,vUv);
    vec2 p=floor(vUv*res/scale);
    int x=int(mod(p.x,4.0)); int y=int(mod(p.y,4.0));
    float t=bayer(x+y*4)-0.5;
    vec3 col=c.rgb + t/levels;
    col=floor(col*(levels-1.0)+0.5)/(levels-1.0);
    gl_FragColor=vec4(col,c.a);
  }`,
};

const Duotone = {
  uniforms: {
    tDiffuse: { value: null },
    dark: { value: new THREE.Color(0x0a1626) },
    light: { value: new THREE.Color(0x7fdfff) },
    amount: { value: 0.0 },
  },
  vertexShader: VERT,
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec3 dark; uniform vec3 light;
  uniform float amount; varying vec2 vUv;
  void main(){ vec4 c=texture2D(tDiffuse,vUv);
    float l=dot(c.rgb,vec3(0.299,0.587,0.114));
    vec3 duo=mix(dark,light,l);
    gl_FragColor=vec4(mix(c.rgb,duo,amount),c.a); }`,
};

const Pixelate = {
  uniforms: {
    tDiffuse: { value: null },
    size: { value: 4.0 },
    res: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: VERT,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float size; uniform vec2 res; varying vec2 vUv;
  void main(){ vec2 d=size/res; vec2 uv=(floor(vUv/d)+0.5)*d; gl_FragColor=texture2D(tDiffuse,uv); }`,
};

const Chroma = {
  uniforms: { tDiffuse: { value: null }, amount: { value: 0.004 } },
  vertexShader: VERT,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float amount; varying vec2 vUv;
  void main(){ vec2 dir=vUv-0.5; float d=length(dir);
    float r=texture2D(tDiffuse,vUv-dir*amount*d).r;
    float g=texture2D(tDiffuse,vUv).g;
    float b=texture2D(tDiffuse,vUv+dir*amount*d).b;
    gl_FragColor=vec4(r,g,b,1.0); }`,
};

const Scan = {
  uniforms: { tDiffuse: { value: null }, count: { value: 700.0 }, intensity: { value: 0.0 } },
  vertexShader: VERT,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float count; uniform float intensity; varying vec2 vUv;
  void main(){ vec4 c=texture2D(tDiffuse,vUv);
    float s=0.5+0.5*sin(vUv.y*count*3.14159);
    c.rgb*=mix(1.0,s,intensity);
    gl_FragColor=c; }`,
};

const GrainVig = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0.0 },
    grain: { value: 0.0 },
    vig: { value: 0.0 },
  },
  vertexShader: VERT,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time; uniform float grain;
  uniform float vig; varying vec2 vUv;
  float rnd(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
  void main(){ vec4 c=texture2D(tDiffuse,vUv);
    float n=rnd(vUv+time)-0.5; c.rgb+=n*grain;
    float d=distance(vUv,vec2(0.5)); c.rgb*=1.0-smoothstep(0.4,0.95,d)*vig;
    gl_FragColor=c; }`,
};

// Unsharp mask 3x3: out = c + amount*(4c - vizinhos). Aumenta a nitidez.
const Sharpen = {
  uniforms: {
    tDiffuse: { value: null },
    amount: { value: 0.0 },
    res: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: VERT,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float amount; uniform vec2 res; varying vec2 vUv;
  void main(){
    vec2 px = 1.0 / res;
    vec4 c = texture2D(tDiffuse, vUv);
    vec3 sum = texture2D(tDiffuse, vUv + vec2(px.x, 0.0)).rgb
             + texture2D(tDiffuse, vUv - vec2(px.x, 0.0)).rgb
             + texture2D(tDiffuse, vUv + vec2(0.0, px.y)).rgb
             + texture2D(tDiffuse, vUv - vec2(0.0, px.y)).rgb;
    vec3 sharp = c.rgb + amount * (4.0 * c.rgb - sum);
    gl_FragColor = vec4(sharp, c.a);
  }`,
};

// ─── Iridescent / cinematic passes ────────────────────────────────────────
// Lighting/color brief: high-contrast directional highlights, silvery holo-
// graphic hues, rainbow dispersion on edges, sleek liquid-glass reflections.

// Thin-film iridescence: a cos-palette rainbow sheen driven by luminance +
// screen gradient, biased toward bright/edge areas so metal & glass shimmer.
const Iridescence = {
  uniforms: { tDiffuse: { value: null }, amount: { value: 0.55 }, time: { value: 0.0 } },
  vertexShader: VERT,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float amount; uniform float time; varying vec2 vUv;
  vec3 pal(float t){ return 0.5+0.5*cos(6.28318*(t+vec3(0.0,0.33,0.67))); }
  void main(){ vec4 c=texture2D(tDiffuse,vUv);
    float l=dot(c.rgb,vec3(0.299,0.587,0.114));
    float phase=l*2.4 + (vUv.x+vUv.y)*1.4 + time*0.12;
    vec3 sheen=pal(fract(phase));
    float k=smoothstep(0.28,0.96,l);
    vec3 outc=mix(c.rgb, c.rgb*(0.55+sheen*0.9), amount*k);
    gl_FragColor=vec4(outc,c.a); }`,
};

// Holographic sweep: a moving diagonal rainbow band added over the image,
// like light raking across a foil surface.
const Holographic = {
  uniforms: { tDiffuse: { value: null }, amount: { value: 0.45 }, time: { value: 0.0 } },
  vertexShader: VERT,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float amount; uniform float time; varying vec2 vUv;
  void main(){ vec4 c=texture2D(tDiffuse,vUv);
    float band=sin((vUv.x+vUv.y)*7.0 - time*1.1);
    float m=smoothstep(0.55,1.0,band);
    vec3 rain=0.5+0.5*cos(6.28318*((vUv.x-vUv.y)*0.9+time*0.08+vec3(0.0,0.33,0.67)));
    float l=dot(c.rgb,vec3(0.299,0.587,0.114));
    gl_FragColor=vec4(c.rgb + rain*m*amount*(0.4+l*0.8), c.a); }`,
};

// Prism dispersion: animated radial chromatic split (stronger than ABERRAÇÃO),
// breathing in and out for that liquid-glass refraction feel.
const Prism = {
  uniforms: { tDiffuse: { value: null }, amount: { value: 0.012 }, time: { value: 0.0 } },
  vertexShader: VERT,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float amount; uniform float time; varying vec2 vUv;
  void main(){ vec2 dir=vUv-0.5; float d=length(dir);
    float a=amount*(0.65+0.35*sin(time*0.6));
    float r=texture2D(tDiffuse,vUv-dir*a*d*60.0).r;
    float g=texture2D(tDiffuse,vUv).g;
    float b=texture2D(tDiffuse,vUv+dir*a*d*60.0).b;
    gl_FragColor=vec4(r,g,b,1.0); }`,
};

// Anamorphic streak: cheap 1D horizontal smear of the bright pixels added
// back as a cool-tinted light streak — that lens-flare highlight bleed.
const Streak = {
  uniforms: {
    tDiffuse: { value: null },
    amount: { value: 0.5 },
    res: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: VERT,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float amount; uniform vec2 res; varying vec2 vUv;
  void main(){ vec4 c=texture2D(tDiffuse,vUv);
    vec3 s=vec3(0.0); float w=0.0;
    for(int i=-8;i<=8;i++){ float fx=float(i);
      vec2 o=vec2(fx*3.0/res.x,0.0);
      vec3 t=texture2D(tDiffuse,vUv+o).rgb;
      float lum=dot(t,vec3(0.299,0.587,0.114));
      float hi=smoothstep(0.68,1.0,lum);
      float ww=1.0-abs(fx)/9.0;
      s+=t*hi*ww; w+=ww; }
    s/=max(w,0.001);
    gl_FragColor=vec4(c.rgb + s*amount*1.6*vec3(0.62,0.8,1.0), c.a); }`,
};

const PointerNeo = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0.0 },
    res: { value: new THREE.Vector2(1, 1) },
    mouse: { value: new THREE.Vector2(-10, -10) },
    hover: { value: 0.0 },
    amount: { value: 0.86 },
    radius: { value: 0.32 },
  },
  vertexShader: VERT,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time; uniform vec2 res;
  uniform vec2 mouse; uniform float hover; uniform float amount; uniform float radius;
  varying vec2 vUv;
  float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  vec3 neonPal(float p){
    return 0.56 + 0.44 * cos(6.28318 * (p + vec3(0.52, 0.86, 0.12)));
  }
  void main(){
    vec2 aspect = vec2(res.x / max(res.y, 1.0), 1.0);
    vec2 delta = (vUv - mouse) * aspect;
    float d = length(delta);
    float local = (1.0 - smoothstep(0.0, radius, d)) * hover;
    vec2 px = 1.0 / res;

    vec2 cell = floor((vUv - mouse) * res / 12.0);
    float h = hash(cell);
    float build = 0.5 + 0.5 * sin(time * 3.2 + h * 6.28318);
    float destruct = 0.5 + 0.5 * sin(time * 2.45 + h * 9.1 + d * 34.0);
    vec2 shard = (vec2(hash(cell + 4.1), hash(cell + 9.7)) - 0.5) * px * 34.0;
    vec2 dir = normalize(delta + vec2(0.0001));
    vec2 radial = dir / aspect * (0.011 * amount * local * destruct);
    vec2 sampleUv = vUv + shard * local * (build - 0.5) + radial;

    vec4 c = texture2D(tDiffuse, sampleUv);
    float l = lum(c.rgb);
    float ex = abs(l - lum(texture2D(tDiffuse, sampleUv + vec2(px.x * 2.0, 0.0)).rgb));
    float ey = abs(l - lum(texture2D(tDiffuse, sampleUv + vec2(0.0, px.y * 2.0)).rgb));
    float edge = smoothstep(0.025, 0.22, ex + ey);

    float angle = atan(delta.y, delta.x);
    float pulse = 0.5 + 0.5 * sin(angle * 7.0 - d * 42.0 + time * 1.65);
    float ring = (1.0 - smoothstep(radius * 0.58, radius * 0.96, d)) *
      smoothstep(radius * 0.20, radius * 0.52, d);
    vec3 neon = neonPal(time * 0.055 + angle * 0.08 + pulse * 0.08);

    vec2 split = dir / aspect * (0.006 * amount * local + 0.004 * local * destruct);
    vec3 chroma = vec3(
      texture2D(tDiffuse, sampleUv - split).r,
      c.g,
      texture2D(tDiffuse, sampleUv + split).b
    );

    vec2 gridUv = fract((vUv - mouse) * res / 12.0);
    float gridLine = max(
      1.0 - smoothstep(0.0, 0.12, min(gridUv.x, 1.0 - gridUv.x)),
      1.0 - smoothstep(0.0, 0.12, min(gridUv.y, 1.0 - gridUv.y))
    );
    float assemble = smoothstep(0.2, 0.95, build) *
      (1.0 - smoothstep(radius * 0.12, radius, d));
    float dissolve = step(0.78, destruct) * h * local;

    vec3 outc = mix(c.rgb, chroma, local * 0.55);
    outc += neon * edge * local * amount * (1.9 + pulse * 0.55);
    outc += neon * ring * local * amount * (0.28 + destruct * 0.28);
    outc += neon * gridLine * local * amount * assemble * 0.28;
    outc += neon * dissolve * amount * 0.22;
    outc += neon * smoothstep(0.62, 1.0, l) * local * amount * 0.34;
    outc = mix(outc, outc * vec3(0.78, 0.88, 1.12) + neon * 0.14, local * 0.2);

    vec3 original = texture2D(tDiffuse, vUv).rgb;
    outc = mix(outc, original * (0.55 + neon * 0.55), dissolve * 0.22);

    gl_FragColor = vec4(outc, c.a);
  }`,
};

// Hue rotate: a clean cinematic colour shift around the luma axis.
const HueRotate = {
  uniforms: { tDiffuse: { value: null }, amount: { value: 0.5 } },
  vertexShader: VERT,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float amount; varying vec2 vUv;
  vec3 hs(vec3 col,float a){ const vec3 k=vec3(0.57735);
    float c=cos(a),s=sin(a);
    return col*c + cross(k,col)*s + k*dot(k,col)*(1.0-c); }
  void main(){ vec4 c=texture2D(tDiffuse,vUv);
    gl_FragColor=vec4(hs(c.rgb, amount*6.28318), c.a); }`,
};

// Loose typing: passes only need .enabled / .uniforms / (bloom) .strength etc.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FxPass = any;

export interface FxStack {
  /** passes in composer render order (insert between RenderPass and CopyShader) */
  order: FxPass[];
  /** keyed by preset effect id */
  byKey: Record<string, FxPass>;
}

/** Build every FX pass (all disabled). Caller enables them via applyPreset. */
export function buildFxStack(size: THREE.Vector2): FxStack {
  const bloom = new UnrealBloomPass(size.clone(), 0.6, 0.5, 0.85);
  bloom.enabled = false;
  const duo = new ShaderPass(Duotone);
  duo.enabled = false;
  const post = new ShaderPass(Posterize);
  post.enabled = false;
  const dith = new ShaderPass(Dither);
  dith.enabled = false;
  // three 0.184: HalftonePass takes a single params object; width/height are
  // managed internally via setSize (kept in sync by composer.setSize).
  const half = new HalftonePass({
    shape: 1,
    radius: 5,
    rotateR: Math.PI / 12,
    rotateG: (Math.PI / 12) * 2,
    rotateB: (Math.PI / 12) * 3,
    scatter: 0,
    blending: 1,
    blendingMode: 1,
    greyscale: false,
  });
  half.enabled = false;
  const pix = new ShaderPass(Pixelate);
  pix.enabled = false;
  const chr = new ShaderPass(Chroma);
  chr.enabled = false;
  const scn = new ShaderPass(Scan);
  scn.enabled = false;
  const grv = new ShaderPass(GrainVig);
  grv.enabled = false;
  const sharp = new ShaderPass(Sharpen);
  sharp.enabled = false;
  const irid = new ShaderPass(Iridescence);
  irid.enabled = false;
  const holo = new ShaderPass(Holographic);
  holo.enabled = false;
  const prism = new ShaderPass(Prism);
  prism.enabled = false;
  const streak = new ShaderPass(Streak);
  streak.enabled = false;
  const neo = new ShaderPass(PointerNeo);
  neo.enabled = false;
  const hue = new ShaderPass(HueRotate);
  hue.enabled = false;

  const byKey: Record<string, FxPass> = {
    sharp,
    irid,
    holo,
    prism,
    streak,
    neo,
    hue,
    duo,
    post,
    dith,
    half,
    pix,
    chr,
    scn,
    grv,
    bloom,
  };
  // Nitidez primeiro (sobre o render cru), depois bloom, a camada iridescente e a
  // cadeia de estilização — grão/vinheta sempre por último.
  const order: FxPass[] = [
    sharp,
    bloom,
    irid,
    holo,
    prism,
    streak,
    hue,
    duo,
    post,
    dith,
    half,
    pix,
    chr,
    scn,
    neo,
    grv,
  ];
  return { order, byKey };
}

/** Passes whose `uniforms.time` should advance every frame (animated effects). */
export const TIME_FX_KEYS = ["grv", "irid", "holo", "prism", "neo"] as const;

/** Keep resolution-dependent uniforms in sync (device-pixel sized). */
export function syncFxResolution(byKey: Record<string, FxPass>, pxSize: THREE.Vector2) {
  byKey.dith.uniforms.res.value.copy(pxSize);
  byKey.pix.uniforms.res.value.copy(pxSize);
  byKey.sharp.uniforms.res.value.copy(pxSize);
  byKey.streak.uniforms.res.value.copy(pxSize);
  byKey.neo.uniforms.res.value.copy(pxSize);
}

/**
 * Enable + configure only the effects present in `preset.effects`, exactly as
 * the explorer's applyPreset() does. Everything else is turned off.
 */
export function applyPreset(byKey: Record<string, FxPass>, preset: SplatPreset) {
  const fx = preset.effects ?? {};
  for (const p of Object.values(byKey)) p.enabled = false;

  if (fx.duo) {
    const p = byKey.duo;
    p.enabled = true;
    if (fx.duo.dark) p.uniforms.dark.value.set(fx.duo.dark);
    if (fx.duo.light) p.uniforms.light.value.set(fx.duo.light);
    if (fx.duo.amount != null) p.uniforms.amount.value = fx.duo.amount;
  }
  if (fx.post) {
    const p = byKey.post;
    p.enabled = true;
    if (fx.post.levels != null) p.uniforms.levels.value = fx.post.levels;
  }
  if (fx.dith) {
    const p = byKey.dith;
    p.enabled = true;
    if (fx.dith.levels != null) p.uniforms.levels.value = fx.dith.levels;
    if (fx.dith.scale != null) p.uniforms.scale.value = fx.dith.scale;
  }
  if (fx.half) {
    const p = byKey.half;
    p.enabled = true;
    if (fx.half.radius != null) p.uniforms.radius.value = fx.half.radius;
    if (fx.half.shape != null) p.uniforms.shape.value = fx.half.shape;
    if (fx.half.scatter != null) p.uniforms.scatter.value = fx.half.scatter;
    if (fx.half.greyscale != null) p.uniforms.greyscale.value = fx.half.greyscale;
  }
  if (fx.pix) {
    const p = byKey.pix;
    p.enabled = true;
    if (fx.pix.size != null) p.uniforms.size.value = fx.pix.size;
  }
  if (fx.chr) {
    const p = byKey.chr;
    p.enabled = true;
    if (fx.chr.amount != null) p.uniforms.amount.value = fx.chr.amount;
  }
  if (fx.scn) {
    const p = byKey.scn;
    p.enabled = true;
    if (fx.scn.count != null) p.uniforms.count.value = fx.scn.count;
    if (fx.scn.intensity != null) p.uniforms.intensity.value = fx.scn.intensity;
  }
  if (fx.grv) {
    const p = byKey.grv;
    p.enabled = true;
    if (fx.grv.grain != null) p.uniforms.grain.value = fx.grv.grain;
    if (fx.grv.vig != null) p.uniforms.vig.value = fx.grv.vig;
  }
  if (fx.bloom) {
    const p = byKey.bloom;
    p.enabled = true;
    if (fx.bloom.strength != null) p.strength = fx.bloom.strength;
    if (fx.bloom.radius != null) p.radius = fx.bloom.radius;
    if (fx.bloom.threshold != null) p.threshold = fx.bloom.threshold;
  }
  if (fx.sharp) {
    const p = byKey.sharp;
    p.enabled = true;
    if (fx.sharp.amount != null) p.uniforms.amount.value = fx.sharp.amount;
  }
  for (const key of ["irid", "holo", "prism", "streak", "hue"] as const) {
    const params = fx[key];
    if (!params) continue;
    const p = byKey[key];
    p.enabled = true;
    if (params.amount != null) p.uniforms.amount.value = params.amount;
  }

  byKey.neo.enabled = true;
  byKey.neo.uniforms.amount.value = 0.9;
  byKey.neo.uniforms.radius.value = 0.34;
}

// ===========================================================================
// Live tuning support: control schema + presets + config <-> preset helpers,
// shared by SplatBackground (pipeline) and SplatControls (panel). Keys match
// exactly what applyPreset() reads above.
// ===========================================================================

/** Imperative handle the panel uses to drive the live pipeline. */
export interface SplatController {
  applyPreset(preset: SplatPreset): void;
  setCamera(
    c: Partial<{
      parallaxDeg: number;
      damping: number;
      dolly: number;
      fov: number;
      radiusScale: number;
    }>,
  ): void;
  flip(axis: "x" | "y" | "z"): void;
  flipView(): void;
  recenter(): void;
  getOrientation(): [number, number, number];
  /** set authored camera pose live (orbit base = position looking at target) */
  setPose(
    p: Partial<{ position: [number, number, number]; target: [number, number, number] }>,
  ): void;
  getPose(): { position: [number, number, number]; target: [number, number, number] };
}

export type FxControl =
  | { t: "range"; label: string; key: string; min: number; max: number; step: number; def: number }
  | { t: "color"; label: string; key: string; def: string }
  | { t: "bool"; label: string; key: string; def: boolean };

export interface FxDef {
  key: string;
  name: string;
  ctrls: FxControl[];
}

/** Per-effect controls, in render order. */
export const FX_SCHEMA: FxDef[] = [
  {
    key: "sharp",
    name: "NITIDEZ",
    ctrls: [{ t: "range", label: "qtd", key: "amount", min: 0, max: 1.5, step: 0.05, def: 0.4 }],
  },
  {
    key: "duo",
    name: "DUOTONE",
    ctrls: [
      { t: "color", label: "escuro", key: "dark", def: "#0a1422" },
      { t: "color", label: "claro", key: "light", def: "#79d8ff" },
      { t: "range", label: "mistura", key: "amount", min: 0, max: 1, step: 0.01, def: 0.85 },
    ],
  },
  {
    key: "post",
    name: "POSTERIZE",
    ctrls: [{ t: "range", label: "níveis", key: "levels", min: 2, max: 16, step: 1, def: 6 }],
  },
  {
    key: "dith",
    name: "DITHER (bayer)",
    ctrls: [
      { t: "range", label: "níveis", key: "levels", min: 2, max: 8, step: 1, def: 4 },
      { t: "range", label: "escala", key: "scale", min: 1, max: 8, step: 1, def: 2 },
    ],
  },
  {
    key: "half",
    name: "HALFTONE",
    ctrls: [
      { t: "range", label: "raio", key: "radius", min: 1, max: 14, step: 1, def: 5 },
      { t: "range", label: "shape", key: "shape", min: 1, max: 4, step: 1, def: 1 },
      { t: "range", label: "scatter", key: "scatter", min: 0, max: 1, step: 0.05, def: 0 },
      { t: "bool", label: "p&b", key: "greyscale", def: false },
    ],
  },
  {
    key: "pix",
    name: "PIXELATE",
    ctrls: [{ t: "range", label: "tamanho", key: "size", min: 1, max: 16, step: 1, def: 4 }],
  },
  {
    key: "chr",
    name: "ABERRAÇÃO",
    ctrls: [
      { t: "range", label: "qtd", key: "amount", min: 0, max: 0.03, step: 0.001, def: 0.004 },
    ],
  },
  {
    key: "scn",
    name: "SCANLINES",
    ctrls: [
      { t: "range", label: "linhas", key: "count", min: 100, max: 1400, step: 20, def: 700 },
      { t: "range", label: "força", key: "intensity", min: 0, max: 1, step: 0.02, def: 0.4 },
    ],
  },
  {
    key: "grv",
    name: "GRAIN + VIG",
    ctrls: [
      { t: "range", label: "grão", key: "grain", min: 0, max: 0.4, step: 0.01, def: 0.08 },
      { t: "range", label: "vinheta", key: "vig", min: 0, max: 1, step: 0.02, def: 0.5 },
    ],
  },
  {
    key: "bloom",
    name: "BLOOM",
    ctrls: [
      { t: "range", label: "força", key: "strength", min: 0, max: 3, step: 0.05, def: 0.6 },
      { t: "range", label: "raio", key: "radius", min: 0, max: 1, step: 0.02, def: 0.5 },
      { t: "range", label: "limiar", key: "threshold", min: 0, max: 1, step: 0.02, def: 0.85 },
    ],
  },
  {
    key: "irid",
    name: "IRIDESCÊNCIA",
    ctrls: [{ t: "range", label: "qtd", key: "amount", min: 0, max: 1, step: 0.02, def: 0.55 }],
  },
  {
    key: "holo",
    name: "HOLOGRÁFICO",
    ctrls: [{ t: "range", label: "qtd", key: "amount", min: 0, max: 1, step: 0.02, def: 0.45 }],
  },
  {
    key: "prism",
    name: "PRISMA",
    ctrls: [
      { t: "range", label: "qtd", key: "amount", min: 0, max: 0.04, step: 0.001, def: 0.012 },
    ],
  },
  {
    key: "streak",
    name: "ANAMÓRFICO",
    ctrls: [{ t: "range", label: "qtd", key: "amount", min: 0, max: 1.5, step: 0.05, def: 0.5 }],
  },
  {
    key: "hue",
    name: "MATIZ",
    ctrls: [{ t: "range", label: "giro", key: "amount", min: 0, max: 1, step: 0.01, def: 0.5 }],
  },
];

export interface CameraControl {
  key: "parallaxDeg" | "damping" | "dolly" | "fov" | "radiusScale";
  label: string;
  min: number;
  max: number;
  step: number;
  def: number;
}

export const CAMERA_SCHEMA: CameraControl[] = [
  { key: "radiusScale", label: "distância", min: 0.08, max: 1.0, step: 0.01, def: 0.32 },
  { key: "dolly", label: "dolly", min: 0.35, max: 1.3, step: 0.01, def: 1 },
  { key: "fov", label: "fov", min: 25, max: 80, step: 1, def: 50 },
  { key: "parallaxDeg", label: "parallax°", min: 0, max: 30, step: 1, def: 13 },
  { key: "damping", label: "damping", min: 0.02, max: 0.3, step: 0.01, def: 0.08 },
];

/**
 * Look publicado (afinado no tuner). `effects` é a IDENTIDADE VISUAL
 * COMPARTILHADA por todas as estações; `camera` é a pose de referência do
 * subway.ply — cada estação com .ply próprio sobrescreve `camera` (ver
 * `pose` em portfolioStations.ts).
 */
export const DEFAULT_PRESET: SplatPreset = {
  camera: {
    radiusScale: 0.44,
    dolly: 1.3,
    fov: 28,
    // fov 28 é telefoto: cada grau varre muito quadro. 1° = só um respiro 3D.
    parallaxDeg: 1,
    damping: 0.19,
    orientation: [Math.PI, 0, 0],
    position: [2.09, 0.08, -8.06],
    target: [3.32, 3.38, -37.63],
  },
  effects: {
    sharp: { amount: 0.6 },
    chr: { amount: 0.013 },
    grv: { grain: 0.08, vig: 0.72 },
    bloom: { strength: 0.45, radius: 0, threshold: 0.8 },
    irid: { amount: 0.18 },
    prism: { amount: 0.001 },
  },
};

/**
 * Override GLOBAL de efeitos. Se NÃO estiver vazio, este look vale pra TODAS as
 * estações (sobrescreve efeitos por estação e o deriveLook); a câmera/pose
 * continua por estação. Vazio = cada estação usa seu próprio efeito.
 * Cole aqui o JSON do botão "COPIAR EFEITOS (global)" do tuner.
 */
export const GLOBAL_EFFECTS: SplatPreset["effects"] = {
  sharp: { amount: 0.6 },
  chr: { amount: 0.013 },
  grv: { grain: 0.08, vig: 0.72 },
  bloom: { strength: 0.45, radius: 0, threshold: 0.8 },
  irid: { amount: 0.18 },
  prism: { amount: 0.001 },
};

// O tuner é GLOBAL: ao mexer nos efeitos, salva aqui (localStorage) e toda
// estação passa a ler este look. A câmera/pose continua por estação.
const GLOBAL_FX_KEY = "matsSplatGlobalEffects:v2";
let globalFxCache: SplatPreset["effects"] | null | undefined;

/** Lê o override global de efeitos salvo no navegador. */
export function loadGlobalEffects(): SplatPreset["effects"] | null {
  if (globalFxCache !== undefined) return globalFxCache;
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(GLOBAL_FX_KEY) : null;
    globalFxCache = raw ? (JSON.parse(raw) as SplatPreset["effects"]) : null;
  } catch {
    globalFxCache = null;
  }
  return globalFxCache;
}

/** Salva o look global (vale pra todas as estações). */
export function saveGlobalEffects(effects: SplatPreset["effects"]): void {
  globalFxCache = effects;
  try {
    if (typeof window !== "undefined")
      window.localStorage.setItem(GLOBAL_FX_KEY, JSON.stringify(effects));
  } catch {
    /* ignore */
  }
}

/** Remove o override global → volta pro efeito por-estação / deriveLook. */
export function clearGlobalEffects(): void {
  globalFxCache = null;
  try {
    if (typeof window !== "undefined") window.localStorage.removeItem(GLOBAL_FX_KEY);
  } catch {
    /* ignore */
  }
}

/** Efeito global efetivo: tuner (localStorage) > baked GLOBAL_EFFECTS > null. */
export function activeGlobalEffects(): SplatPreset["effects"] | null {
  const live = loadGlobalEffects();
  if (live && Object.keys(live).length > 0) return live;
  if (Object.keys(GLOBAL_EFFECTS).length > 0) return GLOBAL_EFFECTS;
  return null;
}

// ─── Per-line metro look ────────────────────────────────────────────────────
// "uma imagem de metro diferente pra cada linha": there is a single subway.ply,
// so each line gets a distinct *look* derived from its accent colour — a duotone
// graded toward the accent, an accent-tinted bloom and a touch of iridescence,
// so every station reads as its own metro while sharing the same geometry.

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const int = parseInt(n, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}
const clamp255 = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
const toHex = (rgb: [number, number, number]) =>
  "#" + rgb.map((c) => clamp255(c).toString(16).padStart(2, "0")).join("");
function mixRgb(a: [number, number, number], b: [number, number, number], t: number) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t] as [
    number,
    number,
    number,
  ];
}

/**
 * Distinct, on-brand "metro" look for a line, keyed off its accent colour.
 * Shadows are pushed toward a deep accent-tinted ink; highlights bloom toward a
 * bright accent tint, giving each line its own holographic-metallic mood.
 */
export function deriveLook(accent: string): SplatPreset["effects"] {
  const rgb = hexToRgb(accent);
  // hue-stable variance so each accent shifts the cinematic grade a little
  const seed = (rgb[0] * 2 + rgb[1] * 3 + rgb[2] * 5) % 100;
  const dark = toHex(mixRgb(rgb, [4, 6, 10], 0.84)); // deep, accent-tinted black
  const light = toHex(mixRgb(rgb, [255, 255, 255], 0.62)); // bright accent highlight
  return {
    sharp: { amount: 0.6 },
    duo: { dark, light, amount: 0.7 },
    irid: { amount: 0.28 + (seed / 100) * 0.22 },
    prism: { amount: 0.008 + (seed / 100) * 0.01 },
    bloom: { strength: 0.32, radius: 0.45, threshold: 0.62 },
    grv: { grain: 0.08, vig: 0.72 },
  };
}

/** The explorer's preset buttons (effects only; camera framing is kept as-is). */
export const PRESETS: Record<string, SplatPreset["effects"]> = {
  LIMPO: {},
  "SUBWAY DARK": {
    duo: { amount: 0.8, dark: "#0a1422", light: "#79d8ff" },
    post: { levels: 7 },
    grv: { grain: 0.06, vig: 0.55 },
    bloom: { strength: 0.7, threshold: 0.7, radius: 0.6 },
  },
  BAYER: { dith: { levels: 3, scale: 2 }, post: { levels: 5 }, grv: { grain: 0.04, vig: 0.4 } },
  NEWSPRINT: { half: { radius: 4, shape: 1, greyscale: true }, grv: { vig: 0.5 } },
  "DUOTONE CYAN": { duo: { amount: 1, dark: "#06141f", light: "#8ff0ff" }, grv: { vig: 0.5 } },
  CRT: {
    scn: { intensity: 0.5, count: 800 },
    chr: { amount: 0.006 },
    grv: { grain: 0.08, vig: 0.6 },
    bloom: { strength: 0.5, threshold: 0.6, radius: 0.5 },
  },
  "LOFI PIXEL": { pix: { size: 5 }, post: { levels: 6 }, grv: { grain: 0.1, vig: 0.5 } },
  GHOST: {
    duo: { amount: 0.6, dark: "#101014", light: "#cfd2d6" },
    dith: { levels: 4, scale: 3 },
    grv: { grain: 0.12, vig: 0.7 },
  },
};

export type EffectConfig = { enabled: boolean } & Record<string, number | string | boolean>;
export interface EditableConfig {
  camera: Record<CameraControl["key"], number>;
  effects: Record<string, EffectConfig>;
}

/** Blank editable config from schema defaults (every effect present but off). */
export function defaultConfig(): EditableConfig {
  const camera = {} as Record<CameraControl["key"], number>;
  for (const c of CAMERA_SCHEMA) camera[c.key] = c.def;
  const effects: Record<string, EffectConfig> = {};
  for (const fx of FX_SCHEMA) {
    const e: EffectConfig = { enabled: false };
    for (const c of fx.ctrls) e[c.key] = c.def;
    effects[fx.key] = e;
  }
  return { camera, effects };
}

/** Overlay a preset's enabled effects (and any camera fields) onto defaults. */
export function configFromPreset(preset: SplatPreset): EditableConfig {
  const cfg = defaultConfig();
  for (const c of CAMERA_SCHEMA) {
    const v = preset.camera?.[c.key];
    if (typeof v === "number") cfg.camera[c.key] = v;
  }
  for (const [key, params] of Object.entries(preset.effects ?? {})) {
    if (!cfg.effects[key]) continue;
    cfg.effects[key].enabled = true;
    Object.assign(cfg.effects[key], params);
  }
  return cfg;
}

/** Serialize an editable config back to a SplatPreset (only enabled effects). */
export function configToPreset(cfg: EditableConfig): SplatPreset {
  const effects: SplatPreset["effects"] = {};
  for (const fx of FX_SCHEMA) {
    const e = cfg.effects[fx.key];
    if (!e?.enabled) continue;
    const out: Record<string, number | string | boolean> = {};
    for (const c of fx.ctrls) out[c.key] = e[c.key];
    (effects as Record<string, unknown>)[fx.key] = out;
  }
  return { camera: { ...cfg.camera }, effects };
}
