/* Sacudida de pantalla — de _shared/base/video-template.html. Requiere HITS=[...], la variable t (segundos), world (#world) y shakeKey. */
  function shake(){
    var sx=0,sy=0,k,dt,amp;
    for(k=0;k<HITS.length;k++){ dt=t-HITS[k]; if(dt<0||dt>.5)continue; amp=18*Math.exp(-dt*8); sx+=Math.sin(dt*71)*amp; sy+=Math.cos(dt*63)*amp*.7; }
    var key=sx.toFixed(1)+','+sy.toFixed(1);
    if(key!==shakeKey){
      shakeKey=key;
      /* al desplazar, se escala lo justo para que el contenido siga tapando los 4 bordes (sin franjas del fondo) */
      var sc=1+Math.max(Math.abs(sx)/540,Math.abs(sy)/960)+.004;
      world.style.transform=key==='0.0,0.0'?'none':'translate('+sx.toFixed(1)+'px,'+sy.toFixed(1)+'px) scale('+sc.toFixed(4)+')';
    }
  }
