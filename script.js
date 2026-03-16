const joystick = document.getElementById("joystick");
const stick = document.getElementById("stick");
const look = document.getElementById("touch-look");

let joyActive=false;
let joyX=0, joyY=0;

joystick.addEventListener("touchstart",e=>{
joyActive=true;
});

joystick.addEventListener("touchmove",e=>{
const rect=joystick.getBoundingClientRect();
const t=e.touches[0];

joyX=t.clientX-rect.left-60;
joyY=t.clientY-rect.top-60;

const dist=Math.sqrt(joyX*joyX+joyY*joyY);
if(dist>40){
joyX*=40/dist;
joyY*=40/dist;
}

stick.style.left=joyX+60-20+"px";
stick.style.top=joyY+60-20+"px";

});

joystick.addEventListener("touchend",()=>{
joyActive=false;
joyX=0;
joyY=0;
stick.style.left="40px";
stick.style.top="40px";
});

/* convert joystick to WASD */

function updateJoystick(){
if(!joyActive) return;

keys.KeyW = joyY < -10;
keys.KeyS = joyY > 10;
keys.KeyA = joyX < -10;
keys.KeyD = joyX > 10;
}

setInterval(updateJoystick,16);

/* look controls */

let lastX=0,lastY=0;

look.addEventListener("touchstart",e=>{
const t=e.touches[0];
lastX=t.clientX;
lastY=t.clientY;
});

look.addEventListener("touchmove",e=>{
const t=e.touches[0];

yaw -= (t.clientX-lastX)*0.004;
pitch -= (t.clientY-lastY)*0.004;

pitch=Math.max(-1.5,Math.min(1.5,pitch));

lastX=t.clientX;
lastY=t.clientY;
});

/* jump */

document.getElementById("jumpBtn").ontouchstart=()=>{
keys.Space=true;
};
document.getElementById("jumpBtn").ontouchend=()=>{
keys.Space=false;
};

/* break */

document.getElementById("breakBtn").ontouchstart=()=>{
const event=new MouseEvent("mousedown",{button:0});
dispatchEvent(event);
};

/* place */

document.getElementById("placeBtn").ontouchstart=()=>{
const event=new MouseEvent("mousedown",{button:2});
dispatchEvent(event);
};

// ===== SCENE =====
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

addEventListener("resize",()=>{
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ===== LIGHTING =====
const ambientLight = new THREE.AmbientLight(0xffffff,0.65);

scene.add(ambientLight);

const sun = new THREE.DirectionalLight(0xfff2cc,1.1);

sun.castShadow = true;
sun.shadow.mapSize.set(256,256);
sun.shadow.camera.left = -50;
sun.shadow.camera.right = 50;
sun.shadow.camera.top = 50;
sun.shadow.camera.bottom = -50;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 200;
scene.add(sun);
scene.add(sun.target);

// Visible Sun
const sunMesh = new THREE.Mesh(
  new THREE.SphereGeometry(3,16,16),
  new THREE.MeshBasicMaterial({color:0xffffaa})
);
scene.add(sunMesh);

// Moon light
const moon = new THREE.DirectionalLight(0x8899ff,0);
scene.add(moon);

const textureLoader = new THREE.TextureLoader();

function makeMaterial(color, url){
  if(!url){
    return new THREE.MeshLambertMaterial({ color });
  }

  const tex = textureLoader.load(url);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;

  return new THREE.MeshLambertMaterial({ map: tex });
}


// ===== WORLD =====

// ===== TEXTURE URLS (PASTE PNG LINKS HERE) =====
const TEXTURES = {
  grass: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSg_-bqwE6hgIr2gGHuDBEZIxfECgl-zF_E3A&s", // grass block png
  wood: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS5VmgsMxS74pqN215tUPSVe7boLhKXcS_P2Q&s",  // wood / log png
  leaf: "https://cdn.modrinth.com/data/Ocyuzgoe/f51e8ebd6737cad5c7b1d3d81bf17f2eef4164f4.png"   // leaves png
};

const geo = new THREE.BoxGeometry(1,1,1);
const mats = {
  grass: makeMaterial(0x55aa44, TEXTURES.grass),
  wood:  makeMaterial(0x8b5a2b, TEXTURES.wood),
  leaf:  makeMaterial(0x228833, TEXTURES.leaf)
};

const world = new Map();
const key=(x,y,z)=>`${x},${y},${z}`;

function addBlock(x,y,z,mat){
  const b = new THREE.Mesh(geo,mat);
  b.position.set(x+0.5,y+0.5,z+0.5);
  b.receiveShadow = true;
  if(!world.has(key(x,y+1,z))) b.castShadow = true;
  scene.add(b);
  world.set(key(x,y,z),b);
}

function removeBlock(x,y,z){
  const k=key(x,y,z);
  if(world.has(k)){
    scene.remove(world.get(k));
    world.delete(k);
  }
}

// ===== TERRAIN + FIXED TREES =====
const SIZE=15, BASE=0;
for(let x=-SIZE;x<=SIZE;x++){
  for(let z=-SIZE;z<=SIZE;z++){
    addBlock(x,BASE-1,z,mats.grass);

    const h=Math.max(0,Math.floor(Math.sin(x/6)*2+Math.cos(z/6)*2));
    for(let y=BASE;y<BASE+h;y++) addBlock(x,y,z,mats.grass);

    // FEWER TREES
    if(Math.random()<0.015){
      const ty=BASE+h;
      const trunk=6+Math.floor(Math.random()*3); // 6-8 tall

      // Trunk
      for(let i=0;i<trunk;i++) addBlock(x,ty+i,z,mats.wood);

      // Leaves (no wood sticking out)
      const leafStart=ty+trunk-2;
      for(let dy=0;dy<4;dy++){
        const r=2-dy;
        for(let dx=-r;dx<=r;dx++){
          for(let dz=-r;dz<=r;dz++){
            const ly=leafStart+dy;
            if(ly>ty+trunk-1) continue;
            const k2=key(x+dx,ly,z+dz);
            if(!world.has(k2)) addBlock(x+dx,ly,z+dz,mats.leaf);
          }
        }
      }
    }
  }
}

// ===== PLAYER =====
const player={pos:new THREE.Vector3(0,2,0),vel:new THREE.Vector3(),onGround:false};
const SPEED=0.12, GRAVITY=0.02, JUMP=0.35, HEIGHT=2, RADIUS=0.35;

// ===== INPUT =====
const keys={};
let yaw=0,pitch=0,locked=false;

addEventListener("keydown",e=>keys[e.code]=true);
addEventListener("keyup",e=>keys[e.code]=false);

const start=document.getElementById("start");
start.onclick=()=>renderer.domElement.requestPointerLock();

document.addEventListener("pointerlockchange",()=>{
  locked=document.pointerLockElement===renderer.domElement;
  start.style.display=locked?"none":"flex";
});

addEventListener("mousemove",e=>{
  if(!locked) return;
  yaw-=e.movementX*0.002;
  pitch-=e.movementY*0.002;
  pitch=Math.max(-1.5,Math.min(1.5,pitch));
});

// ===== COLLISION =====
function collides(x,y,z){
  for(let X=Math.floor(x-RADIUS);X<=Math.floor(x+RADIUS);X++)
    for(let Y=Math.floor(y);Y<=Math.floor(y+HEIGHT);Y++)
      for(let Z=Math.floor(z-RADIUS);Z<=Math.floor(z+RADIUS);Z++)
        if(world.has(key(X,Y,Z))) return true;
  return false;
}

// ===== HOTBAR =====
const slots=document.querySelectorAll(".hotbar-slot");
let active=0;
let items=[mats.grass,mats.wood,mats.leaf,null,null];

function updateHotbar(){
  slots.forEach((s,i)=>{
    s.classList.toggle("active",i===active);
    s.style.background=items[i]?
      "#"+items[i].color.getHexString():"rgba(0,0,0,0.4)";
  });
}
updateHotbar();

addEventListener("keydown",e=>{
  if(e.code.startsWith("Digit")){
    active=parseInt(e.code[5])-1;
    updateHotbar();
  }
});

// ===== BLOCK INTERACTION =====
const ray=new THREE.Raycaster();
addEventListener("mousedown",e=>{
  if(!locked) return;
  ray.setFromCamera({x:0,y:0},camera);
  const hit=ray.intersectObjects([...world.values()])[0];
  if(!hit) return;

  const x=Math.floor(hit.object.position.x-0.5);
  const y=Math.floor(hit.object.position.y-0.5);
  const z=Math.floor(hit.object.position.z-0.5);

  if(e.button===0) removeBlock(x,y,z);
  if(e.button===2 && items[active]){
    const n=hit.face.normal;
    if(!collides(x+n.x+0.5,y+n.y,z+n.z+0.5))
      addBlock(x+n.x,y+n.y,z+n.z,items[active]);
  }
  if(e.button===1){
    const mat=hit.object.material;
    let i=items.indexOf(mat);
    if(i===-1) i=items.findIndex(v=>v===null);
    if(i!==-1){ items[i]=mat; active=i; }
    updateHotbar();
  }
});
addEventListener("contextmenu",e=>e.preventDefault());

// ===== DAY / NIGHT =====
let time=0;
const inc=1/(30*60*60);

function updateLighting(){
  const a=time*Math.PI*2;
  const x=Math.cos(a)*80;
  const y=Math.sin(a)*80+20;

  sunMesh.position.set(x,y,50);
  sun.position.copy(sunMesh.position);
  sun.target.position.set(0,0,0);

  if(y>0){
    sun.intensity=0.8;
    ambientLight.intensity=0.4;
    moon.intensity=0;
    scene.background.setHSL(0.55,0.6,0.65);
  }else{
    sun.intensity=0;
    ambientLight.intensity=0.12;
    moon.intensity=0.25;
    scene.background.setHSL(0.65,0.5,0.07);
  }
  time+=inc; if(time>1) time=0;
}

// ===== LOOP =====
function loop(){
  requestAnimationFrame(loop);

  camera.rotation.order="YXZ";
  camera.rotation.y=yaw;
  camera.rotation.x=pitch;

  const dir=new THREE.Vector3(
    (keys.KeyA?-1:0)+(keys.KeyD?1:0),
    0,
    (keys.KeyW?-1:0)+(keys.KeyS?1:0)
  ).normalize().applyAxisAngle(new THREE.Vector3(0,1,0),yaw);

  player.vel.x=dir.x*SPEED;
  player.vel.z=dir.z*SPEED;
  player.vel.y-=GRAVITY;

  if(player.onGround&&keys.Space){player.vel.y=JUMP;player.onGround=false;}

  let ny=player.pos.y+player.vel.y;
  if(collides(player.pos.x,ny,player.pos.z)){
    if(player.vel.y<0){player.onGround=true;player.pos.y=Math.floor(player.pos.y);}
    player.vel.y=0;
  } else player.pos.y=ny;

  let nx=player.pos.x+player.vel.x;
  if(!collides(nx,player.pos.y,player.pos.z)) player.pos.x=nx;
  let nz=player.pos.z+player.vel.z;
  if(!collides(player.pos.x,player.pos.y,nz)) player.pos.z=nz;

  camera.position.set(player.pos.x,player.pos.y+1.6,player.pos.z);
  updateLighting();
  renderer.render(scene,camera);
}
loop();