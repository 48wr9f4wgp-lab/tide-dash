// Field-view presentation only. Provider values, time windows and evidence are unchanged.
const FIELD={width:310,bg:"#071F2D",panel:"#12384A",ink:"#F7FBFF",sub:"#D0E1EB",line:"#53E2DF",grid:"#355564",warn:"#FFD078"};
function fieldText(parent,value,size,bold=false,color=FIELD.ink){
  const label=text(parent,value,size,color,bold);label.minimumScaleFactor=.9;return label;
}
function fieldEventRows(t){
  return (t.graphEvents||[]).filter(e=>Number.isFinite(e.absoluteMinute)&&e.absoluteMinute>=t.nowMin).slice(0,2);
}
function fieldGraph(t,wp,height=220){
  const width=620,c=new DrawContext();c.size=new Size(width,height);c.opaque=false;c.respectScreenScale=true;
  const L=60,R=10,T=30,B=82,W=width-L-R,H=height-T-B;
  const X=m=>L+(m-t.graphStart)/(t.graphEnd-t.graphStart)*W;
  const label=(s,cx,y,w=100,size=22,color=FIELD.sub)=>{
    c.setTextColor(new Color(color));c.setFont(Font.semiboldSystemFont(size));
    c.drawTextInRect(s,new Rect(Math.max(0,Math.min(width-w,cx-w/2)),y,w,size+3));
  };
  const line=(x1,y1,x2,y2,col,width=1,alpha=1)=>{
    const p=new Path();p.move(new Point(x1,y1));p.addLine(new Point(x2,y2));
    c.addPath(p);c.setStrokeColor(new Color(col,alpha));c.setLineWidth(width);c.strokePath();
  };
  const segments=splitTideSeries(t.graphSeries),points=segments.flat(),scale=tideScale(points);
  for(let minute=Math.ceil(t.graphStart/360)*360;minute<=t.graphEnd;minute+=360){
    const x=X(minute);line(x,T,x,T+H,FIELD.grid,1);
    label(clockFromAbs(minute),x,height-50,74,22);
    if(minute%1440===0)label(dateKey(addDay(new Date(t.referenceAt),Math.floor(minute/1440))).slice(5).replace("-","/"),x,height-23,72,20);
  }
  if(!scale){label("潮のデータなし",width/2,T+10,230,24,FIELD.warn);return c.getImage();}
  const Y=v=>T+(1-(v-scale.min)/(scale.max-scale.min))*H;
  const ticks=H<90?[scale.ticks[0],scale.ticks[scale.ticks.length-1]]:[...new Set([scale.ticks[0],scale.ticks[Math.floor((scale.ticks.length-1)/2)],scale.ticks[scale.ticks.length-1]])];
  label("cm",L/2,0,L-4,20);
  for(const value of ticks){const y=Y(value);line(L,y,L+W,y,FIELD.grid);label(String(value).replace("-","−"),L/2,Math.max(T,y-11),L-4,22);}
  for(const segment of segments){
    if(segment.length<2)continue;
    const area=new Path();area.move(new Point(X(segment[0].minute),T+H));
    for(const p of segment)area.addLine(new Point(X(p.minute),Y(p.level)));
    area.addLine(new Point(X(segment[segment.length-1].minute),T+H));area.closeSubpath();
    c.addPath(area);c.setFillColor(new Color(FIELD.line,.09));c.fillPath();
    const curve=new Path();segment.forEach((p,i)=>i?curve.addLine(new Point(X(p.minute),Y(p.level))):curve.move(new Point(X(p.minute),Y(p.level))));
    c.addPath(curve);c.setStrokeColor(new Color(FIELD.line));c.setLineWidth(5);c.strokePath();
  }
  // Only the next two official event labels are on the face. All events remain in Detail.
  const accepted=[];
  for(const e of fieldEventRows(t)){
    const x=X(e.absoluteMinute);if(x<L||x>L+W)continue;
    for(let y=T;y<T+H;y+=12)line(x,y,x,Math.min(y+5,T+H),FIELD.sub,1.5,.6);
    const name=e.type==="high"?"満潮":"干潮",day=Math.floor(e.absoluteMinute/1440),prefix=day===1?"翌日 ":day===2?"翌々日 ":"";
    const s=`${prefix}${name} ${eventClock(e)}`,w=prefix?184:132,lx=Math.max(L,Math.min(width-w,x-w/2));
    if(!accepted.some(b=>lx<b[1]+8&&lx+w>b[0]-8)){label(s,lx+w/2,T+H+3,w,22,FIELD.ink);accepted.push([lx,lx+w]);}
  }
  // Solar times have a single readable rail instead of multiple annotations inside the plot.
  const solar=solarEvents(t,wp).filter(e=>e.minute>=t.nowMin).slice(0,2);
  solar.forEach((e,i)=>{
    const day=Math.floor(e.minute/1440),prefix=day===1?"翌日 ":day===2?"翌々日 ":"";
    const name=e.label==="日の入り"?"日没":e.label;
    label(`${prefix}${name} ${clockFromAbs(e.minute)}`,i?width-145:L+138,1,i?268:238,22,FIELD.warn);
  });
  const x=X(t.nowMin);line(x,T,x,T+H,FIELD.ink,2.2);
  if(Number.isFinite(t.current)){const y=Y(t.current);c.setFillColor(new Color(FIELD.ink));c.fillEllipse(new Rect(x-5,y-5,10,10));}
  return c.getImage();
}
function fieldWidget(t,wp,S,badge,badgeColor,err,distanceKm,locationState,tideRef){
  const blocked=["far","previous","missing"].includes(locationState);
  // Existing location failure state remains intact and never leaks forecast values.
  if(blocked)return compactWidget(t,wp,S,badge,badgeColor,err,distanceKm,locationState,tideRef);
  const w=new ListWidget(),reference=new Date(t.referenceAt),now=new Date();
  w.backgroundColor=new Color(FIELD.bg);w.setPadding(7,14,7,14);
  const snapshot=saveDisplaySnapshot(t,{station:S,tideRef,locationState,distanceKm},wp,"large");
  const guide=snapshotGuideURL(snapshot?.id),settings=scriptURL("settings"),refreshURL=scriptURL("refresh");
  w.url=guide;w.refreshAfterDate=new Date(now.getTime()+C.refresh*60000);
  const center=w.addStack();center.layoutHorizontally();center.addSpacer();
  const body=center.addStack();body.layoutVertically();body.size=new Size(FIELD.width,0);center.addSpacer();
  const header=body.addStack();header.layoutHorizontally();header.centerAlignContent();
  const place=header.addStack();place.layoutVertically();place.size=new Size(185,0);
  fieldText(place,S.name,18,true);
  const ref=tideReferenceLabel(S,tideRef),dist=Number.isFinite(tideRef?.distanceKm)&&tideRef.distanceKm>0?`・${Math.round(tideRef.distanceKm)}km先`:"";
  fieldText(place,`潮：${ref}${dist}`,11,false,FIELD.sub);if(settings)place.url=settings;
  header.addSpacer();const time=header.addStack();time.layoutVertically();time.size=new Size(67,0);
  fieldText(time,dateKey(reference).slice(5).replace("-","/"),11,true,FIELD.sub);
  fieldText(time,`${clockJST(reference)}時点`,11,false,FIELD.sub);
  const refresh=header.addStack();refresh.size=new Size(44,44);refresh.centerAlignContent();refresh.setPadding(5,9,5,9);
  fieldText(refresh,"↻",26,true);if(refreshURL)refresh.url=refreshURL;
  body.addSpacer(4);
  const state=tideRead(t),view=glanceState(state),next=tideEventSummary(t),hero=body.addStack();hero.layoutHorizontally();hero.centerAlignContent();hero.url=guide;
  const current=hero.addStack();current.layoutVertically();current.size=new Size(206,0);
  fieldText(current,Number.isFinite(state.from)?`${glanceHour(state.from)}〜${glanceHour(state.to)}時の予測`:"潮の予測",11,false,FIELD.sub);
  fieldText(current,view.label,state.kind==="turning"?22:24,true,view.known?FIELD.ink:FIELD.warn);
  hero.addSpacer();const upcoming=hero.addStack();upcoming.layoutVertically();upcoming.size=new Size(96,0);
  fieldText(upcoming,`${next.title}${t.nextEvent?" "+eventDayWord(t.nextEvent).trim():""}`.trim(),12,false,FIELD.sub);fieldText(upcoming,t.nextEvent?eventClock(t.nextEvent):next.value,t.nextEvent?28:15,true);
  const issues=[...(wp?.issues||[])];
  if(t.hasGaps)issues.push("潮位に欠測");
  if(snapshot&&!snapshot.saved)issues.push("表示根拠の保存不可");
  if(Number.isFinite(tideRef?.distanceKm)&&tideRef.distanceKm>=C.tideRefCautionKm)issues.push("潮位は離れた基準点の参考値");
  if(err)issues.push(err);
  body.addSpacer(4);const graphHeight=issues.length?172:222;
  const graphBox=body.addImage(fieldGraph(t,wp,graphHeight));graphBox.imageSize=new Size(310,graphHeight/2);graphBox.applyFittingContentMode();graphBox.url=guide;
  if(issues.length){
    const messages=glanceIssues(issues),notice=fieldText(body,`⚠ ${messages.slice(0,2).join(" / ")}${messages.length>2?` / 他${messages.length-2}件`:""}`,11,true,FIELD.warn);notice.lineLimit=2;notice.url=guide;
  }
  body.addSpacer(3);fieldText(body,`風・波 ${forecastClock(wp)}予報`,11,false,FIELD.sub);body.addSpacer(2);
  // Wind and wave are peers. Neither is labelled safe from a model value alone.
  const row=body.addStack();row.layoutHorizontally();const c=wp?.current;
  const card=(name,value,unit,extra)=>{
    const box=row.addStack();box.layoutVertically();box.size=new Size(151,0);box.backgroundColor=new Color(FIELD.panel);box.cornerRadius=10;box.setPadding(4,9,4,9);box.url=guide;
    const top=box.addStack();top.layoutHorizontally();fieldText(top,name,12,true,FIELD.sub);if(extra){top.addSpacer();fieldText(top,extra,11,false,FIELD.sub);}
    const n=box.addStack();n.layoutHorizontally();n.centerAlignContent();fieldText(n,f1(value),28,true);n.addSpacer(3);fieldText(n,unit,13,false,FIELD.sub);
  };
  card("風",c?.wind,"m/s",Number.isFinite(c?.windDir)?`${dir8(c.windDir)}から`:"向き不明");row.addSpacer(8);card("波の高さ",c?.wave,"m",null);
  body.addSpacer(3);const bottom=body.addStack();bottom.layoutHorizontally();bottom.centerAlignContent();bottom.size=new Size(310,44);
  const rain=bottom.addStack();rain.layoutVertically();rain.size=new Size(225,0);rain.url=guide;
  const rainLine=rain.addStack();rainLine.layoutHorizontally();rainLine.centerAlignContent();
  fieldText(rainLine,`${glanceRainTime(c?.validTime)}の雨`,11,false,FIELD.sub);rainLine.addSpacer(7);fieldText(rainLine,f1(c?.precip),17,true);rainLine.addSpacer(2);fieldText(rainLine,"mm",11,false,FIELD.sub);
  bottom.addSpacer();const more=bottom.addStack();more.size=new Size(72,44);more.backgroundColor=new Color(FIELD.panel);more.cornerRadius=10;more.setPadding(12,12,12,12);more.url=guide;fieldText(more,"詳細 ›",13,true);
  return w;
}
function widget(t,wp,S,badge,badgeColor,err=null,distanceKm=null,locationState="current",tideRef=null){
  if((config.widgetFamily||"large")==="large")return fieldWidget(t,wp,S,badge,badgeColor,err,distanceKm,locationState,tideRef);
  return compactWidget(t,wp,S,badge,badgeColor,err,distanceKm,locationState,tideRef);
}
