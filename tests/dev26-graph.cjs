const fs=require("fs"),assert=require("assert");
const src=fs.readFileSync(process.argv[2]||"app-candidate.js","utf8");
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
class Color {constructor(hex,alpha=1){assert(/^#[0-9a-f]{6}$/i.test(hex));this.hex=hex;this.alpha=alpha;}}
class Point {constructor(x,y){assert(Number.isFinite(x)&&Number.isFinite(y));this.x=x;this.y=y;}}
class Rect {constructor(x,y,w,h){[x,y,w,h].forEach(v=>assert(Number.isFinite(v)));assert(w>=0&&h>=0);Object.assign(this,{x,y,w,h});}}
class Size {constructor(w,h){this.width=w;this.height=h;}}
class Path {constructor(){this.points=[];}move(p){this.points.push(["M",p.x,p.y]);}addLine(p){this.points.push(["L",p.x,p.y]);}closeSubpath(){this.points.push(["Z"]);}}
class DrawContext {
  constructor(){this.ops=[];}
  addPath(p){this.path=p;}setStrokeColor(c){this.stroke=c;}setFillColor(c){this.fill=c;}setLineWidth(w){this.lineWidth=w;}
  strokePath(){this.ops.push({kind:"stroke",path:this.path.points,color:this.stroke,width:this.lineWidth});}
  fillPath(){this.ops.push({kind:"fillPath",path:this.path.points,color:this.fill});}
  fillRect(r){this.ops.push({kind:"rect",rect:r,color:this.fill});}
  fillEllipse(r){this.ops.push({kind:"ellipse",rect:r,color:this.fill});}
  setFont(f){this.font=f;}setTextColor(c){this.textColor=c;}
  drawTextInRect(text,r){this.ops.push({kind:"text",text,rect:r,font:this.font,color:this.textColor});}
  getImage(){return this.ops;}
}
const fm={documentsDirectory:()=>"/mock",joinPath:(a,b)=>a+"/"+b,fileExists:()=>true};
const Font={systemFont:n=>({size:n}),boldSystemFont:n=>({size:n,bold:true})};
(async()=>{
 const code=src.slice(0,src.indexOf("const W=await main();"))+"\nreturn {graph,interpolateHourly};";
 const api=await new AsyncFunction("FileManager","Color","Point","Rect","Size","Path","DrawContext","Font",code)({local:()=>fm},Color,Point,Rect,Size,Path,DrawContext,Font);
 function fixture(type,now=1151,event=1503,gap=false){
   const hourly=Array.from({length:65},(_,i)=>({minute:i*60-1440,level:100+(type==="low"?-70:70)*Math.cos((i*60-1440-event)*Math.PI/360)}));
   if(gap)hourly.find(p=>p.minute===1200).level=null;
   const next={type,absoluteMinute:event},start=Math.floor((now-120)/30)*30,end=start+1440;
   return {hourly,nowMin:now,current:api.interpolateHourly(hourly,now),nextEvent:next,
     graphStart:start,graphEnd:end,referenceAt:Date.parse("2026-09-30T10:11:00Z"),
     graphSeries:Array.from({length:97},(_,i)=>({minute:start+i*15,level:api.interpolateHourly(hourly,start+i*15)})),
     graphEvents:[next,{type:type==="low"?"high":"low",absoluteMinute:event+420}],hasGaps:gap};
 }
 for(const [name,type,now,event] of [["low","low",1151,1503],["high","high",1151,1503],["near","low",1495,1503],["midnight","high",1438,1450]]){
   const ops=api.graph(fixture(type,now,event),650,324,null,false);
   assert(ops.some(o=>o.kind==="text"&&o.text==="現在"),name);
   assert(ops.some(o=>o.kind==="text"&&o.text==="次の"+(type==="low"?"干潮":"満潮")),name);
   assert(ops.some(o=>o.kind==="stroke"&&o.width===10),name);
   const tags=ops.filter(o=>o.kind==="rect"&&o.color.alpha===.96);
   tags.forEach(o=>assert(o.rect.x>=50&&o.rect.x+o.rect.w<=636&&o.rect.y>=50&&o.rect.y+o.rect.h<=270));
   const [a,b]=tags.map(o=>o.rect);assert(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),name+" tag collision");
   console.log(name+": direct labels, focus path, bounds and tag separation PASS");
 }
 const gap=api.graph(fixture("low",1151,1503,true),650,324,null,false);
 assert(!gap.some(o=>o.kind==="stroke"&&o.width===10));assert(!gap.some(o=>o.text==="次の干潮"));
 const missing=fixture("low");missing.current=null;missing.nextEvent=null;
 const ops=api.graph(missing,650,324,null,false);assert(!ops.some(o=>o.text==="現在"));
 for(const [w,h] of [[420,132],[620,112]]){const compact=api.graph(fixture("low"),w,h,null,true);assert(!compact.some(o=>o.text==="現在"||o.text==="次の干潮"));}
 console.log("missing-data fail-closed and compact scope PASS");
})().catch(e=>{console.error(e);process.exit(1);});
