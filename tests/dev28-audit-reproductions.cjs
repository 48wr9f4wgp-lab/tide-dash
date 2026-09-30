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
 const source=fs.readFileSync('app-candidate.js','utf8');
 const init=new AsyncFunction('FileManager','Color','Point','Rect','Size','Path','DrawContext','Font',source.slice(0,source.indexOf('const W=await main();'))+'\nreturn {parseJmaSafety,jmaSafetyFace,tideDetail,validJmaWarningSignalsPayload,validLiveSignalsPayload,shizuokaTargetSuggestions,sourceMonthAgeDays};');
 const api=await init({local:()=>fm},Color,Point,Rect,Size,Path,DrawContext,Font);
 const now=new Date('2026-09-30T12:09:00Z');
 const t={referenceAt:now.getTime(),current:100,nowMin:1269,hourly:[{minute:1260,level:100},{minute:1320,level:90}],graphSeries:[{minute:1260,level:100},{minute:1320,level:90}],graphEvents:[],nextEvent:null};
 for(const state of ['unavailable','unsupported','stale']){
  const safety={state,items:[],areaMatched:false,fetchedAt:now.getTime()};
  const detail=api.tideDetail(t,{station:{name:'伊東',code:'IT',lat:35,lon:139}}, {current:null,jmaSafety:safety});
  assert(detail.includes('発表中: 対象の雷・波浪警報/注意報なし'));
  console.log('CONFIRMED BUG: '+state+' -> Full Evidence says no warnings; face='+api.jmaSafetyFace(safety));
 }
 const p={schemaVersion:2,policy:{officialSourcesOnly:true,aggregateCurrentState:true},source:{product:'VPWS50',reportDatetime:new Date().toISOString()},areas:{'2220800':{name:'伊東市'}}};
 assert(api.validJmaWarningSignalsPayload(p));
 const safety=api.parseJmaSafety(p,{codes:['2220800','2220500'],names:['伊東市','熱海市']});
 assert(safety.areaMatched&&safety.items.length===0);assert.equal(api.jmaSafetyFace({...safety,state:'network'}),null);
 console.log('CONFIRMED BUG: missing warnings array and partial area coverage accepted as no-warning');
 const future={schemaVersion:1,generatedAt:new Date().toISOString(),policy:{officialSourcesOnly:true},regions:{SHIZUOKA_EAST_IZU:{sourceMonth:'2099-01',source:'test',ranking:[{id:'1',name:'X',tons:100},{id:'2',name:'Y',tons:80},{id:'3',name:'Z',tons:50}]}}};
 assert(api.validLiveSignalsPayload(future));
 const rank=api.shizuokaTargetSuggestions({area:'静岡 東伊豆',name:'伊東'},now,{liveSignals:{payload:future,fetchedAt:now.getTime(),cacheState:'network'}});
 assert(rank.top.every(x=>x.confidence==='A'));
 console.log('CONFIRMED BUG: future sourceMonth accepted and promoted to A');
})().catch(e=>{console.error(e);process.exit(1)});
