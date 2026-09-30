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
 let clock=Date.parse('2026-09-30T12:09:00Z'),response=null,fail=false,delay=0,calls=0;
 const RealDate=Date;class ClockDate extends RealDate{constructor(...a){super(...(a.length?a:[clock]));}static now(){return clock;}}
 const files=new Map(),cachePath='/mock/TideDashCacheV09/jma_warning_signals_v2.json';
 const cacheFm={...fm,fileExists:p=>p==='/mock/TideDashCacheV09'||files.has(p),readString:p=>{if(!files.has(p))throw Error('missing');return files.get(p)},writeString:(p,s)=>files.set(p,s)};
 class Request{constructor(){}async loadString(){calls++;clock+=delay;if(fail)throw Error('offline');return JSON.stringify(response);}}
 const source=fs.readFileSync(process.argv[2]||'app-candidate.js','utf8');
 const api=await new AsyncFunction('FileManager','Color','Point','Rect','Size','Path','DrawContext','Font','Request','Date',source.slice(0,source.indexOf('const W=await main();'))+'\nreturn {validJmaWarningSignalsPayload,validJmaWarningSignalsStructure,parseJmaSafety,jmaSafetyFace,jmaSafetyEvidence,jmaSafetyWarnings,tideDetail};')({local:()=>cacheFm},Color,Point,Rect,Size,Path,DrawContext,Font,Request,ClockDate);
 const spot={jmaPrefCode:'220000',jmaWarningAreaCodes:['2220800','2220500'],jmaWarningAreaNames:['伊東市','熱海市']};
 const clone=o=>JSON.parse(JSON.stringify(o));
 const payload=(age=0,warnings=[])=>({schemaVersion:2,policy:{officialSourcesOnly:true,aggregateCurrentState:true},source:{product:'VPWS50',reportDatetime:new RealDate(clock-age*60000).toISOString()},areas:{'2220800':{name:'伊東市',warnings},'2220500':{name:'熱海市',warnings:[]}}});
 let passed=0;const check=(name,fn)=>{fn();passed++;console.log('PASS '+name)};
 const reset=()=>{files.clear();fail=false;delay=0;calls=0;response=payload();};
 check('fresh no-warning valid',()=>assert(api.validJmaWarningSignalsPayload(payload())));
 for(const [name,mutate]of [
  ['areas array',p=>p.areas=[]],['empty areas',p=>p.areas={}],['missing warnings',p=>delete p.areas['2220800'].warnings],
  ['warnings object',p=>p.areas['2220800'].warnings={}],['bad warning code',p=>p.areas['2220800'].warnings=[{code:'99',status:'継続'}]],
  ['numeric code',p=>p.areas['2220800'].warnings=[{code:16,status:'継続'}]],['missing status',p=>p.areas['2220800'].warnings=[{code:'16'}]],
  ['bad area name',p=>p.areas['2220800'].name=null],['wrong product',p=>p.source.product='wrong']]){
  check('reject '+name,()=>{const p=payload();mutate(p);assert(!api.validJmaWarningSignalsPayload(p));});
 }
 check('source exactly120 minutes',()=>assert(api.validJmaWarningSignalsPayload(payload(120))));
 check('reject source beyond120 minutes',()=>assert(!api.validJmaWarningSignalsPayload(payload(120.01))));
 check('future15 minutes accepted',()=>assert(api.validJmaWarningSignalsPayload(payload(-15))));
 check('future beyond15 rejected',()=>assert(!api.validJmaWarningSignalsPayload(payload(-15.01))));
 const ref={codes:spot.jmaWarningAreaCodes,names:spot.jmaWarningAreaNames};
 check('all requested areas required',()=>{const p=payload();delete p.areas['2220500'];assert(!api.parseJmaSafety(p,ref).areaMatched)});
 check('warning sort and release exclusion',()=>{const p=payload(0,[{code:'14',status:'継続'},{code:'07',status:'発表'},{code:'16',status:'解除'}]);assert.deepStrictEqual(api.parseJmaSafety(p,ref).items.map(x=>x.code),['07','14'])});
 for(const state of ['unavailable','unsupported','stale','fallback'])check('unknown/past evidence '+state,()=>{const safety={state,areaMatched:true,items:[]};const msg=api.jmaSafetyEvidence(safety);assert(msg.includes('確認できません'));assert(!msg.startsWith('発表中:'));assert(api.jmaSafetyFace(safety));});
 check('fresh verified no-warning evidence',()=>assert.equal(api.jmaSafetyEvidence({state:'network',areaMatched:true,items:[]}), '発表中: 対象の雷・波浪警報/注意報なし'));
 check('partial cached area not silent',()=>assert(api.jmaSafetyEvidence({state:'cached',areaMatched:false,items:[]}).includes('確認できません')));
 reset();let out=await api.jmaSafetyWarnings(spot);check('network valid clear',()=>{assert.equal(out.state,'network');assert(out.areaMatched);assert.equal(api.jmaSafetyFace(out),null)});
 fail=true;out=await api.jmaSafetyWarnings(spot);check('fresh valid cache reuse',()=>{assert.equal(out.state,'cached');assert.equal(calls,1)});
 clock+=11*60000;out=await api.jmaSafetyWarnings(spot);check('network failure valid fallback',()=>assert.equal(out.state,'fallback'));
 reset();const partial=payload();delete partial.areas['2220500'];files.set(cachePath,JSON.stringify({schema:2,fetchedAt:clock,payload:partial}));response=partial;out=await api.jmaSafetyWarnings(spot);check('partial network/cache rejected',()=>{assert.equal(out.state,'unavailable');assert.equal(calls,1)});
 reset();response=payload(121);out=await api.jmaSafetyWarnings(spot);check('stale valid source keeps historical state',()=>assert.equal(out.state,'stale'));
 reset();response=payload(-16);out=await api.jmaSafetyWarnings(spot);check('future source is unavailable',()=>assert.equal(out.state,'unavailable'));
 reset();response=payload(119.95);delay=7000;out=await api.jmaSafetyWarnings(spot);check('source freshness rechecked after network delay',()=>assert.equal(out.state,'stale'));
 reset();files.set(cachePath,JSON.stringify({schema:2,fetchedAt:clock-20*60000,payload:payload(119.95)}));fail=true;delay=7000;out=await api.jmaSafetyWarnings(spot);check('fallback source expired during request rejected',()=>assert.equal(out.state,'unavailable'));
 reset();files.set(cachePath,'{broken');fail=true;out=await api.jmaSafetyWarnings(spot);check('corrupt cache fails closed',()=>assert.equal(out.state,'unavailable'));
 const t={referenceAt:clock,current:100,nowMin:1269,hourly:[{minute:1260,level:100},{minute:1320,level:90}],graphSeries:[{minute:1260,level:100},{minute:1320,level:90}],graphEvents:[],nextEvent:null};
 check('Full Evidence unknown status integrated',()=>{const detail=api.tideDetail(t,{station:{name:'伊東',code:'IT',lat:35,lon:139}},{current:null,jmaSafety:{state:'unavailable',items:[],areaMatched:false}});assert(detail.includes('発表状況: 確認できません'));assert(!detail.includes('発表中: 対象の雷・波浪警報/注意報なし'))});
 if(process.argv[3]){const actual=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));check('captured production JSON structural contract',()=>assert(api.validJmaWarningSignalsStructure(actual)));for(const code of Object.keys(actual.areas))assert(api.parseJmaSafety(actual,{codes:[code]}).areaMatched);console.log(Object.keys(actual.areas).length+' production areas validated');}
 console.log(passed+' safety checks PASS');
})().catch(e=>{console.error(e);process.exit(1)});
