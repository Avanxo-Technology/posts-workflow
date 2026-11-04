/* Motor común de los videos AGA. Todo es función pura del tiempo t (segundos):
   las animaciones CSS se pausan y se mueven con currentTime, y las transiciones se dibujan en un canvas.
   Cada video define antes de cargar este archivo:
     VIDEO = { total, trans:[{t0,dur,type,swap}], hits:[...], frame(t){...} }
   - trans: transiciones entre escenas (type: 'wipe' | 'bars' | 'iris'). En `swap` la pantalla está 100% cubierta,
     ahí empieza la escena siguiente.
   - hits: instantes con golpe de pantalla (se repiten en gen_audio.py).
   - frame(t): contadores y cosas calculadas por tiempo. */
(function(){
var NAVY='#0B2938',LIME='#A8CB18',PAPER='#F4F0E7',TAU=Math.PI*2;
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function ease(u){return u<.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2}          /* cúbica in-out */
function outc(u){return 1-Math.pow(1-clamp(u,0,1),3)}
window.AGA={clamp:clamp,ease:ease,outc:outc};

var cv=document.getElementById('cv-tr'),x=cv.getContext('2d');

/* ---- transiciones ---- */
function wipe(u){            /* panel lima abre paso a un panel navy; luego salen hacia la derecha */
  var ul=clamp(u/.86,0,1),un=clamp((u-.14)/.86,0,1);
  function band(p,col){var R=1080*ease(clamp(p/.5,0,1)),L=1080*ease(clamp((p-.5)/.5,0,1));
    if(R-L<1)return;x.fillStyle=col;x.fillRect(L-1,0,R-L+2,1920)}
  band(ul,LIME);band(un,NAVY);
  /* filo claro en el borde de ataque */
  var R=1080*ease(clamp(un/.5,0,1));if(un<.5&&un>0){x.fillStyle='rgba(244,240,231,.9)';x.fillRect(R-5,0,5,1920)}
}
function bars(u){            /* 8 persianas horizontales alternando sentido y color */
  var n=8,h=1920/n,k,d,pi,po,L,R,dir;
  for(k=0;k<n;k++){
    d=k*.035;dir=k%2?1:-1;
    pi=ease(clamp((u-d)/.38,0,1));po=ease(clamp((u-.58-d*.6)/.38,0,1));
    if(pi<=0)continue;
    if(dir<0){R=1080;L=1080-1080*pi;R=1080-(1080*po)}     /* entra desde la derecha, sale hacia la izquierda */
    else{L=0;R=1080*pi;L=1080*po}                       /* entra desde la izquierda, sale hacia la derecha */
    if(R-L<1)continue;
    x.fillStyle=k%2?LIME:NAVY;x.fillRect(L-1,k*h-1,R-L+2,h+2);
  }
}
function iris(u){            /* círculo lima que cierra, luego un agujero que abre la nueva escena */
  var cx=540,cy=960,M=1300,r;
  if(u<.5){r=M*ease(u/.5);
    x.fillStyle=NAVY;x.beginPath();x.arc(cx,cy,r,0,TAU);x.fill();
    x.fillStyle=LIME;x.beginPath();x.arc(cx,cy,r*clamp(1.02-u*.3,0,1)*.78,0,TAU);x.fill();
    x.strokeStyle=PAPER;x.lineWidth=6;x.globalAlpha=.8;x.beginPath();x.arc(cx,cy,r,0,TAU);x.stroke();x.globalAlpha=1;
  }else{r=M*ease((u-.5)/.5);
    x.fillStyle=NAVY;x.beginPath();x.rect(-5,-5,1090,1930);x.arc(cx,cy,r,0,TAU,true);x.fill('evenodd');
    x.strokeStyle=LIME;x.lineWidth=14;x.beginPath();x.arc(cx,cy,r,0,TAU);x.stroke();
  }
}
var TR={wipe:wipe,bars:bars,iris:iris};
function drawTR(t){
  x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,1080,1920);
  VIDEO.trans.forEach(function(T){
    if(t<T.t0||t>T.t0+T.dur)return;
    TR[T.type]((t-T.t0)/T.dur);
  });
}

/* sacudida suave de pantalla en los golpes de sonido */
function shake(t){
  var sx=0,sy=0,k,dt,H=VIDEO.hits||[];
  for(k=0;k<H.length;k++){dt=t-H[k];if(dt<0||dt>.45)continue;
    var amp=5*Math.exp(-dt*9);sx+=Math.sin(dt*80)*amp;sy+=Math.cos(dt*70)*amp*.6}
  document.getElementById('world').style.transform='translate('+sx.toFixed(1)+'px,'+sy.toFixed(1)+'px)';
}

/* ---- reproductor ---- */
var TOTAL=VIDEO.total,q=new URLSearchParams(location.search),rec=q.get('rec')==='1';
if(rec)document.body.classList.add('rec');
var stage=document.getElementById('stage'),holder=document.getElementById('holder');
function fit(){var w=innerWidth,h=innerHeight-(rec?0:92),s=rec?1:Math.min(w/1080,h/1920);
  stage.style.transform='scale('+s+')';holder.style.width=1080*s+'px';holder.style.height=1920*s+'px'}
addEventListener('resize',fit);fit();
var au=document.getElementById('au'),soundOn=false,t=0,playing=!rec&&q.get('t')===null,last=null,anims=[];
function syncAudio(force){
    if(!soundOn||rec)return;
    if(playing){
      if(force)au.currentTime=t;
      if(au.paused)au.play().catch(function(){soundOn=false;var b=document.getElementById('snd');if(b)b.textContent='SONIDO'});
    }else au.pause();
  }
function apply(){
  var ms=t*1000,i;
  for(i=0;i<anims.length;i++){try{anims[i].currentTime=ms}catch(e){}}
  if(VIDEO.frame)VIDEO.frame(t);
  drawTR(t);shake(t);
  document.getElementById('fill').style.width=(t/TOTAL*100)+'%';
  var m=function(v){return Math.floor(v/60)+':'+('0'+Math.floor(v%60)).slice(-2)};
  document.getElementById('clock').textContent=m(t)+' / '+m(TOTAL);
}
window.seek=function(v){t=clamp(v,0,TOTAL);apply();return t};
window.REEL_TOTAL=TOTAL;
function loop(ts){
  if(playing){if(soundOn&&!rec){
        // el audio manda, pero el reloj se suaviza: au.currentTime avanza a saltos y hacía tartamudear la imagen
        if(au.ended) t=TOTAL;
        else if(!au.paused&&au.readyState>=3&&!au.seeking){
          if(last!==null){ t+=(ts-last)/1000; var e=au.currentTime-t; t+=(Math.abs(e)>.25?e:e*.1) } else t=au.currentTime;
          last=ts;
        } else last=null;
      }else{ if(last!==null) t+=(ts-last)/1000; last=ts }if(t>=TOTAL){t=0;syncAudio(true)}apply();syncAudio()}else last=null;
  requestAnimationFrame(loop)}
function setPlaying(p){playing=p;document.getElementById('pp').textContent=p?'PAUSA':'PLAY';last=null;syncAudio(true)}
document.getElementById('pp').onclick=function(){setPlaying(!playing)};
document.getElementById('rs').onclick=function(){t=0;apply();setPlaying(true)};
document.getElementById('snd').onclick=function(){soundOn=!soundOn;this.textContent=soundOn?'SONIDO ✓':'SONIDO';soundOn?syncAudio(true):au.pause()};
document.getElementById('track').onclick=function(e){var r=this.getBoundingClientRect();t=(e.clientX-r.left)/r.width*TOTAL;apply();syncAudio(true)};
addEventListener('keydown',function(e){
  if(e.code==='Space'){e.preventDefault();setPlaying(!playing)}
  if(e.key==='ArrowRight'){t=Math.min(TOTAL,t+1);apply();syncAudio(true)}
  if(e.key==='ArrowLeft'){t=Math.max(0,t-1);apply();syncAudio(true)}
  if(e.key==='r'||e.key==='R'){t=0;apply();setPlaying(true)}});
function start(){
  anims=document.getAnimations();anims.forEach(function(a){a.pause()});
  var qt=q.get('t');if(qt!==null){t=parseFloat(qt)||0;playing=false}
  var gate=!rec&&qt===null;
  if(gate)playing=false;            /* los navegadores bloquean el audio hasta que hay un clic: pantalla de inicio con sonido */
  apply();setPlaying(playing);requestAnimationFrame(loop);
  if(gate){
    var g=document.createElement('div');
    g.style.cssText='position:fixed;inset:0;z-index:99;background:rgba(7,28,39,.82);display:flex;align-items:center;justify-content:center;cursor:pointer';
    g.innerHTML='<div style="background:#A8CB18;color:#0B2938;font:800 22px Inter,sans-serif;padding:22px 38px;border-radius:999px;letter-spacing:-.02em">▶  Reproducir con sonido</div>';
    g.onclick=function(){g.remove();soundOn=true;document.getElementById('snd').textContent='SONIDO ✓';t=0;playing=true;last=null;au.currentTime=0;au.play().catch(function(){});apply()};
    document.body.appendChild(g);
  }}
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(start);else addEventListener('load',start);
})();
