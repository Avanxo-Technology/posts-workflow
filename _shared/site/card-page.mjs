// Miniatura autónoma de un efecto spec 1 (galería): mismo CSS de base que la vista previa, sin controles y en bucle.
// Pura (sin Node): recibe el FX, el efecto, la marca y el CSS de base (el primer <style> de fx-preview.html).
export function previewBaseCss(previewHtml) {
  return (previewHtml.match(/<style>([\s\S]*?)<\/style>/) || ['', ''])[1];
}

export function fxCardPage(FX, e, brand, baseCss) {
  const pal = {dark: brand?.dark || '#14181c', light: brand?.light || '#f4f1ea', accent: brand?.accent || '#c46a2b'};
  const r = FX.build(e, {}, pal);
  const on = (() => { const c = [1, 3, 5].map(i => { const v = parseInt(pal.accent.slice(i, i + 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] > 0.4 ? '#111111' : '#ffffff'; })();
  const vars = `--p-dark:${pal.dark};--p-light:${pal.light};--p-accent:${pal.accent};--p-on:${on};--kit-dark:${pal.dark};--kit-light:${pal.light};--kit-accent:${pal.accent};--kit-on:${on};--fx-bg-a:${pal.dark};--fx-bg-b:${pal.light};`;
  return `<!doctype html><html style="${vars}"><head><meta charset="utf-8"><style>${baseCss}#bar{display:none}#area{bottom:0}</style><style>${r.css}</style></head><body>
<div id="area"><div id="fit"><div id="stage"><div id="root">${r.previewHtml}</div></div></div></div>
<script>
var fit=document.getElementById('fit'),area=document.getElementById('area'),total=${Math.max(r.total, 0.1)},end=total+0.8,t=0,last=null,anims=[];
function size(){var k=Math.min(area.clientWidth/1080,area.clientHeight/1920);fit.style.transform='scale('+k+')';fit.style.left=(area.clientWidth-1080*k)/2+'px';fit.style.top=(area.clientHeight-1920*k)/2+'px'}
addEventListener('resize',size);size();
anims=document.getAnimations();anims.forEach(function(a){a.pause()});
function tick(ts){if(last!==null)t+=(ts-last)/1000;last=ts;if(t>=end)t=0;anims.forEach(function(a){a.currentTime=t*1000});requestAnimationFrame(tick)}
requestAnimationFrame(tick);
</script></body></html>`;
}
