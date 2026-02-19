const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextCtx = nextCanvas.getContext('2d');

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

canvas.width = COLS * BLOCK;
canvas.height = ROWS * BLOCK;
nextCanvas.width = 4 * BLOCK;
nextCanvas.height = 4 * BLOCK;

function createMatrix(w,h){
  const m = [];
  while(h--) m.push(new Array(w).fill(0));
  return m;
}

const COLORS = [null,'#00f0f0','#0000f0','#f0a000','#f0f000','#00f000','#a000f0','#f00000'];

const PIECES = {
  'T': [[0,1,0],[1,1,1]],
  'O': [[2,2],[2,2]],
  'L': [[0,0,3],[3,3,3]],
  'J': [[4,0,0],[4,4,4]],
  'I': [[5,5,5,5]],
  'S': [[0,6,6],[6,6,0]],
  'Z': [[7,7,0],[0,7,7]]
};

function rotate(matrix, dir){
  for(let y=0;y<matrix.length;y++){
    for(let x=0;x<y;x++){
      [matrix[x][y],matrix[y][x]] = [matrix[y][x],matrix[x][y]];
    }
  }
  if(dir>0) matrix.forEach(row => row.reverse()); else matrix.reverse();
}

function collide(arena, player){
  const [m,o] = [player.matrix, player.pos];
  for(let y=0;y<m.length;y++){
    for(let x=0;x<m[y].length;x++){
      if(m[y][x] && (arena[y+o.y] && arena[y+o.y][x+o.x])!==0){
        return true;
      }
    }
  }
  return false;
}

function merge(arena, player){
  player.matrix.forEach((row,y)=>{
    row.forEach((val,x)=>{
      if(val) arena[y+player.pos.y][x+player.pos.x] = val;
    });
  });
}

function sweep(arena){
  let rowCount=1;
  outer: for(let y=arena.length-1;y>0;y--){
    for(let x=0;x<arena[y].length;x++){
      if(arena[y][x]===0) continue outer;
    }
    const row = arena.splice(y,1)[0].fill(0);
    arena.unshift(row);
    y++;
    player.score += rowCount*10;
    rowCount *=2;
  }
}

function createPiece(type){
  const matrix = PIECES[type];
  // deep copy
  return matrix.map(r=>r.slice());
}

function drawMatrix(matrix, offset, context, texs){
  matrix.forEach((row,y)=>{
    row.forEach((val,x)=>{
      if(val){
        const px = (x + offset.x) * BLOCK;
        const py = (y + offset.y) * BLOCK;
        if(texs && texs[val]) context.drawImage(texs[val], px, py, BLOCK, BLOCK);
        else {
          context.fillStyle = COLORS[val];
          context.fillRect(px, py, BLOCK, BLOCK);
          context.strokeStyle = 'rgba(0,0,0,0.15)';
          context.lineWidth = 1;
          context.strokeRect(px, py, BLOCK, BLOCK);
        }
      }
    });
  });
}

// textures will be generated from provided JPG
const textures = [];
const texImg = new Image();
texImg.src = '22114.jpg';
texImg.onload = () => createTextures();

function createTextures(){
  for(let i=1;i<=7;i++){
    const oc = document.createElement('canvas');
    oc.width = BLOCK; oc.height = BLOCK;
    const octx = oc.getContext('2d');
    // draw the source image scaled to cover the block
    octx.drawImage(texImg, 0, 0, texImg.width, texImg.height, 0, 0, BLOCK, BLOCK);
    // tint using source-atop so color shows through texture
    octx.globalCompositeOperation = 'source-atop';
    octx.fillStyle = COLORS[i];
    octx.fillRect(0,0,BLOCK,BLOCK);
    octx.globalCompositeOperation = 'source-over';
    octx.strokeStyle = 'rgba(0,0,0,0.25)';
    octx.lineWidth = 2;
    octx.strokeRect(0,0,BLOCK,BLOCK);
    textures[i] = oc;
  }
}

function draw(){
  ctx.fillStyle = '#111';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  drawMatrix(arena, {x:0,y:0}, ctx, textures);
  drawMatrix(player.matrix, player.pos, ctx, textures);
}

function drawNext(){
  nextCtx.fillStyle = '#111';
  nextCtx.fillRect(0,0,nextCanvas.width,nextCanvas.height);
  const m = player.next && player.next.matrix;
  const offset = {x:1, y:1};
  drawMatrix(m, offset, nextCtx, textures);
}

function playerDrop(){
  player.pos.y++;
  if(collide(arena, player)){
    player.pos.y--;
    merge(arena, player);
    playerReset();
    sweep(arena);
    updateScore();
  }
  dropCounter = 0;
}

function playerMove(dir){
  player.pos.x += dir;
  if(collide(arena, player)) player.pos.x -= dir;
}

// rotate matrix and return new rotated matrix
function rotateMatrix(matrix, dir){
  const h = matrix.length;
  const w = matrix[0].length;
  let res;
  if(dir > 0){
    res = Array.from({length: w}, (_,i)=> Array.from({length: h}, (_,j)=> matrix[h-1-j][i]));
  } else {
    res = Array.from({length: w}, (_,i)=> Array.from({length: h}, (_,j)=> matrix[j][w-1-i]));
  }
  return res;
}

const KICKS = {
  normal: {
    '0>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    '1>0': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
    '1>2': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
    '2>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    '2>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
    '3>2': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
    '3>0': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
    '0>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]]
  },
  I: {
    '0>1': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
    '1>0': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
    '1>2': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
    '2>1': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
    '2>3': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
    '3>2': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
    '3>0': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
    '0>3': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]]
  }
};

function getKicks(type, from, to){
  const key = `${from}>${to}`;
  if(type === 'I') return KICKS.I[key] || KICKS.normal[key];
  if(type === 'O') return [[0,0]];
  return KICKS.normal[key];
}

function playerRotate(dir){
  const oldDir = player.dir;
  const newDir = (oldDir + (dir>0?1:3)) % 4;
  const oldMatrix = player.matrix;
  const rotated = rotateMatrix(oldMatrix, dir);
  player.matrix = rotated;
  const kicks = getKicks(player.type, oldDir, newDir) || [[0,0]];
  for(const k of kicks){
    player.pos.x += k[0];
    player.pos.y += k[1];
    if(!collide(arena, player)){
      player.dir = newDir;
      return;
    }
    player.pos.x -= k[0];
    player.pos.y -= k[1];
  }
  // failed all kicks, revert
  player.matrix = oldMatrix;
}

function playerReset(){
  // take the queued next piece as current
  if(player.next && player.next.matrix){
    player.matrix = player.next.matrix;
    player.type = player.next.type;
  } else {
    const t = randomPiece(); player.matrix = createPiece(t); player.type = t;
  }
  player.dir = 0;
  // generate new next
  const nt = randomPiece(); player.next = { type: nt, matrix: createPiece(nt) };
  player.pos.y = 0;
  player.pos.x = Math.floor((COLS - player.matrix[0].length)/2);
  if(collide(arena, player)){
    arena.forEach(row => row.fill(0));
    player.score = 0;
    updateScore();
  }
}

function randomPiece(){
  const keys = Object.keys(PIECES);
  return keys[(keys.length*Math.random())|0];
}

let arena = createMatrix(COLS, ROWS);
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;

const player = { pos:{x:0,y:0}, matrix:null, next:null, score:0, dir:0, type:null };

function update(time=0){
  const deltaTime = time - lastTime;
  lastTime = time;
  dropCounter += deltaTime;
  if(dropCounter > dropInterval){
    playerDrop();
  }
  draw();
  drawNext();
  requestAnimationFrame(update);
}

function updateScore(){
  document.getElementById('score').innerText = player.score;
}

document.addEventListener('keydown', event =>{
  if(event.key === 'ArrowLeft') playerMove(-1);
  else if(event.key === 'ArrowRight') playerMove(1);
  else if(event.key === 'ArrowDown') playerDrop();
  else if(event.key === ' '){
    // hard drop
    while(!collide(arena, player)) player.pos.y++;
    player.pos.y--;
    merge(arena, player);
    playerReset();
    sweep(arena);
    updateScore();
    dropCounter = 0;
  }
  else if(event.key === 'ArrowUp' || event.key.toLowerCase()==='x') playerRotate(1);
  else if(event.key.toLowerCase()==='z') playerRotate(-1);
  else if(event.key.toLowerCase()==='p') paused = !paused;
});

let paused = false;

// Pause handling via animation frame wrapper
const _raf = window.requestAnimationFrame;
window.requestAnimationFrame = function(cb){
  function wrapped(t){ if(!paused) cb(t); else _raf(wrapped); }
  return _raf(wrapped);
};

const nt = randomPiece();
player.next = { type: nt, matrix: createPiece(nt) };
playerReset();
updateScore();
requestAnimationFrame(update);
