import { serializeSvg } from './export';

/** A standalone, local snapshot with no dependency on the editor tab. */
export function createPreviewUrl(svg: SVGSVGElement, dark: boolean) {
  const { source, width, height } = serializeSvg(svg, dark ? 'dark' : 'white');
  const data = JSON.stringify({ source, width, height }).replaceAll('<', '\u003c');
  const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>图表预览 · Mermaid mmd</title>
<style>
*{box-sizing:border-box}body{margin:0;overflow:hidden;background: ${dark ? '#20232b' : '#f7f8fc'};font:14px system-ui,sans-serif;color: ${dark ? '#eee' : '#535a70'}}
#canvas{position:fixed;inset:0;overflow:hidden;touch-action:none;cursor:grab}#canvas.dragging{cursor:grabbing}#diagram{position:absolute;left:0;top:0;transform-origin:0 0;pointer-events:none}svg{display:block;max-width:none!important}
nav{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);display:flex;align-items:center;gap:8px;padding:7px;background: ${dark ? '#303440' : '#fff'};border:1px solid #8884;border-radius:10px;box-shadow:0 4px 20px #0001}button{font:inherit;border:0;background:transparent;color:inherit;padding:8px 12px;border-radius:5px;cursor:pointer}button:hover{background:#8882}output{min-width:58px;text-align:center;font-variant-numeric:tabular-nums}.hint{position:fixed;top:16px;left:20px;opacity:.65;pointer-events:none}
</style><div id="canvas" aria-label="可缩放图表画布"><div id="diagram"></div></div><span class="hint">滚轮缩放 · 拖动平移</span><nav aria-label="预览操作"><button id="minus" aria-label="缩小">−</button><output id="level"></output><button id="plus" aria-label="放大">＋</button><button id="fit">适应窗口</button><button id="actual">原始大小</button></nav>
<script>
const data = ${data};
const canvas=document.getElementById('canvas'), diagram=document.getElementById('diagram');
diagram.innerHTML=data.source;
let scale=1,x=0,y=0,fitted=true;
function paint(){diagram.style.transform='translate('+x+'px,'+y+'px) scale('+scale+')';document.getElementById('level').textContent=Math.round(scale*100)+'%';}
function center(next){scale=next;x=(innerWidth-data.width*scale)/2;y=(innerHeight-data.height*scale)/2;paint();}
function fit(){fitted=true;center(Math.min(1,Math.max(.001,(innerWidth-48)/data.width),Math.max(.001,(innerHeight-120)/data.height)));}
function zoom(factor,cx=innerWidth/2,cy=innerHeight/2){fitted=false;const next=Math.min(20,Math.max(.001,scale*factor));const ratio=next/scale;x=cx-(cx-x)*ratio;y=cy-(cy-y)*ratio;scale=next;paint();}
canvas.addEventListener('wheel',e=>{e.preventDefault();const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1);zoom(Math.exp(-Math.max(-250,Math.min(250,delta))*.002),e.clientX,e.clientY);},{passive:false});
let drag=null;
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging');});
canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;fitted=false;x+=e.clientX-drag.x;y+=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;paint();});
function stop(){drag=null;canvas.classList.remove('dragging');}
canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);canvas.addEventListener('lostpointercapture',stop);
document.getElementById('plus').onclick=()=>zoom(1.2);document.getElementById('minus').onclick=()=>zoom(1/1.2);document.getElementById('fit').onclick=fit;document.getElementById('actual').onclick=()=>{fitted=false;center(1);};
addEventListener('resize',()=>{if(fitted)fit();});fit();
</script></html>`;
  return URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
}
