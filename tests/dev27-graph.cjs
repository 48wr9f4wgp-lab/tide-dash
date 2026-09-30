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
 const init=async source=>new AsyncFunction("FileManager","Color","Point","Rect","Size","Path","DrawContext","Font",source.slice(0,source.indexOf("const W=await main();"))+"\nreturn {graph,interpolateHourly};")({local:()=>fm},Color,Point,Rect,Size,Path,DrawContext,Font);
 const api=await init(src);
  function fixture(type,now=1151,event=1503,gap=false){
   const hourly=Array.from({length:65},(_,i)=>({minute:i*60-1440,level:100+(type==="low"?-70:70)*Math.cos((i*60-1440-event)*Math.PI/360)}));
   if(gap)hourly.find(p=>p.minute===1200).level=null;
   const next={type,absoluteMinute:event},start=Math.floor((now-120)/30)*30,end=start+1440;
   return {hourly,nowMin:now,current:api.interpolateHourly(hourly,now),nextEvent:next,
     referenceDate:'2026-09-30',graphStart:start,graphEnd:end,referenceAt:Date.parse("2026-09-30T10:11:00Z"),
     graphSeries:Array.from({length:97},(_,i)=>({minute:start+i*15,level:api.interpolateHourly(hourly,start+i*15)})),
     graphEvents:[next,{type:type==="low"?"high":"low",absoluteMinute:event+420}],hasGaps:gap};
 }

 const wp={current:{sunrise:"2026-09-30T05:37",sunset:"2026-09-30T17:29",sunriseNext:"2026-10-01T05:37",sunsetNext:"2026-10-01T17:28"}};
 for(const [name,type,now,event] of [["low","low",1171,1503],["high","high",1171,1503],["near","low",1495,1503],["midnight","high",1438,1450],["three-solar","low",1169,1503]]){
   const caseWP=name==="three-solar"?{current:{...wp.current,sunset:"2026-09-30T17:00",sunsetNext:"2026-10-01T17:00"}}:wp;
   const ops=api.graph(fixture(type,now,event),650,324,caseWP,false);
   assert(!ops.some(o=>o.kind==="rect"),name+" opaque box");
   assert(!ops.some(o=>o.kind==="stroke"&&o.width>=10),name+" oversized curve");
   assert(ops.some(o=>o.kind==="stroke"&&o.width===4.5&&o.color.alpha===.95),name+" full curve");
   const events=ops.filter(o=>o.kind==="text"&&/^(満潮|干潮) /.test(o.text));
   assert.equal(events.length,2,name+" event count");
   events.forEach(o=>assert(o.rect.y>=270&&o.rect.y+o.rect.h<=300,name+" event in reserved lane"));
   assert(events[0].rect.x+events[0].rect.w<=events[1].rect.x,name+" event overlap");
   const sun=ops.filter(o=>o.kind==="text"&&/(日の出|日没)/.test(o.text));
   if(name==="three-solar")assert.equal(sun.length,3);
   assert(sun.length>=2,name+" solar retained");sun.forEach(o=>assert.equal(o.rect.y,0));
   assert(ops.some(o=>o.text==="今"&&o.rect.y<50),name+" now outside plot");
   assert(!ops.some(o=>o.kind==="text"&&o.rect.x>=50&&o.rect.y>=50&&o.rect.y<270),name+" text on curve");
   ops.filter(o=>o.kind==="text").forEach(o=>assert(o.rect.x>=0&&o.rect.x+o.rect.w<=650&&o.rect.y+o.rect.h<=324,name+" bounds"));
   fs.mkdirSync("previews",{recursive:true});fs.writeFileSync("previews/dev27-"+name+".json",JSON.stringify(ops));
   console.log(name+": uncovered plot, full curve, event/solar lanes and bounds PASS");
 }
 const gap=api.graph(fixture("low",1151,1503,true),650,324,wp,false);
 assert(gap.filter(o=>o.kind==="stroke"&&o.width===4.5).length>=2,"missing data split");
 if(process.argv[3]){
  const base=await init(fs.readFileSync(process.argv[3],"utf8"));
  for(const [w,h] of [[420,132],[620,112]])assert.deepStrictEqual(api.graph(fixture("low"),w,h,wp,true),base.graph(fixture("low"),w,h,wp,true),"compact regression");
  fs.writeFileSync("previews/dev26-low.json",JSON.stringify(base.graph(fixture("low",1171),650,324,wp,false)));
  console.log("Small/Medium draw-operation equality against dev.26 PASS");
 }
 console.log("Missing-data segment preservation PASS");
})().catch(e=>{console.error(e);process.exit(1);});
