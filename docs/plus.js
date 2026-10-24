'use strict';
const STORAGE='netwerkkompas-v2';state.notes=[];
function saveLocal(){if(!$('remember').checked)return;try{localStorage.setItem(STORAGE,JSON.stringify({version:2,runs:state.runs.slice(-300),events:state.events.slice(-200),notes:state.notes.slice(-200)}));say('storageStatus','Metingen worden alleen in deze browser bewaard.');}catch{say('storageStatus','Lokaal bewaren is niet gelukt. Download je rapport om het te behouden.');}}
function drawTimeline(){const items=[...state.events.map(e=>({time:e.time,text:e.event==='offline'?'Browser meldt offline':e.event==='online'?'Browser meldt online':e.event,type:'event'})),...state.notes.map(n=>({...n,type:'note'})),...state.runs.filter(r=>r.probes.some(p=>p.external&&!p.ok)).map(r=>({time:r.time,text:`${r.label||'Onbekend'}: ${r.probes.filter(p=>p.external&&!p.ok).length} extern(e) meetpunt(en) niet meetbaar. Oorzaak nog onbekend.`,type:'failure'}))].sort((a,b)=>b.time.localeCompare(a.time)).slice(0,40);$('timeline').replaceChildren();if(!items.length){const p=document.createElement('p');p.className='micro';p.textContent='Nog geen gebeurtenissen.';$('timeline').append(p);}items.forEach(item=>{const el=document.createElement('div');el.className='event '+item.type;const time=document.createElement('time');time.dateTime=item.time;time.textContent=new Date(item.time).toLocaleString('nl-NL',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});const text=document.createElement('span');text.textContent=item.text;el.append(time,text);$('timeline').append(el);});}
function updatePlus(){const values=state.runs.map(r=>r.median).filter(n=>typeof n==='number');say('range',values.length?`${Math.min(...values)} / ${Math.max(...values)} ms`:'—');const all=state.runs.length;const good=state.runs.filter(r=>r.probes.filter(p=>p.external).length===2&&r.probes.filter(p=>p.external).every(p=>p.ok)).length;say('successRate',all?`${Math.round(good/all*100)}% (${good}/${all})`:'—');say('failedRounds',all?String(all-good):'—');if(state.events.length>200)state.events=state.events.slice(-200);drawTimeline();saveLocal();}
window.addEventListener('nk-update',updatePlus);window.addEventListener('nk-events',updatePlus);
$('noteForm').onsubmit=e=>{e.preventDefault();const text=$('noteInput').value.trim();if(!text)return;state.notes.push({time:new Date().toISOString(),text:text.slice(0,300)});state.notes=state.notes.slice(-200);$('noteInput').value='';updatePlus();};
$('remember').onchange=()=>{if($('remember').checked)saveLocal();else{try{localStorage.removeItem(STORAGE);say('storageStatus','Lokale opslag verwijderd. Je huidige sessie blijft beschikbaar.');}catch{say('storageStatus','Verwijderen mislukt; wis de sitegegevens in je browser.');}}};
try{const saved=JSON.parse(localStorage.getItem(STORAGE)||'null');if(saved?.version===2&&Array.isArray(saved.runs)&&Array.isArray(saved.notes)&&Array.isArray(saved.events)){state.runs=saved.runs.filter(r=>typeof r.time==='string'&&Number.isFinite(Date.parse(r.time))&&Array.isArray(r.probes)&&r.probes.length<=5&&r.probes.every(p=>p&&typeof p.name==='string'&&typeof p.ok==='boolean')&&(r.median===null||Number.isFinite(r.median))).slice(-300);state.notes=saved.notes.filter(n=>n&&typeof n.text==='string'&&Number.isFinite(Date.parse(n.time))).map(n=>({time:n.time,text:n.text.slice(0,300)})).slice(-200);state.events=saved.events.filter(e=>e&&typeof e.event==='string'&&Number.isFinite(Date.parse(e.time))).slice(-200);$('remember').checked=true;if(state.runs.length)render(state.runs.at(-1));updatePlus();}}catch{say('storageStatus','Opgeslagen gegevens konden niet worden geladen. De app werkt zonder opslag.');}
const oldClear=$('clear').onclick;$('clear').onclick=()=>{if(state.busy||state.monitor){oldClear();return;}oldClear();state.notes=[];try{localStorage.removeItem(STORAGE)}catch{}updatePlus();say('storageStatus','Meetgeschiedenis en notities gewist.');};
function downloadFile(name,content,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
const csvCell=v=>'"'+String(v??'').replaceAll('"','""')+'"';
$('csv').onclick=()=>{const rows=[['Tijd','Verbinding','HTTP mediaan ms','Meetpunt','Extern','Geslaagd','Responstijd ms','Toelichting']];state.runs.forEach(r=>r.probes.forEach(p=>rows.push([r.time,r.label||'Onbekend',r.median,p.name,p.external?'ja':'nee',p.ok?'ja':'nee',p.ms,p.error||''])));downloadFile('netwerkkompas-metingen.csv','\uFEFF'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n'),'text/csv;charset=utf-8');};
$('printReport').onclick=()=>{const lines=['NETWERKKOMPAS — MEETRAPPORT',new Date().toLocaleString('nl-NL'),'','Methode: HTTP-aanvragen, geen echte ping of pakketverliesmeting.',`Aantal meetrondes: ${state.runs.length}`,`Laagste / hoogste HTTP-tijd: ${$('range').textContent}`,`Rondes met beide externe meetpunten: ${$('successRate').textContent}`,''];state.runs.forEach(r=>{lines.push(`${new Date(r.time).toLocaleString('nl-NL')} | ${r.label||'Onbekend'} | mediaan ${r.median??'—'} ms`);r.probes.forEach(p=>lines.push(`  ${p.name}: ${p.ok?p.ms+' ms':p.error}`));});lines.push('','NOTITIES');state.notes.forEach(n=>lines.push(`${new Date(n.time).toLocaleString('nl-NL')}: ${n.text}`));lines.push('','Een mislukte aanvraag bewijst geen router- of providerstoring.','DNS-checks via Google testen niet de lokale DNS-resolver.');say('printSummary',lines.join('\n'));window.print();};
setInterval(()=>{if(state.monitor){const remaining=Math.max(0,Math.ceil((state.deadline-Date.now())/1000));say('monitorStatus',`Monitoring actief · nog ${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')} · ${document.hidden?'tabblad op achtergrond, timing kan afwijken':'houd dit tabblad open'}`);}else say('monitorStatus',`Monitoring gestopt · ${state.runs.length} meetrondes beschikbaar. Interval telt vanaf het einde van elke check.`);},1000);
document.addEventListener('visibilitychange',()=>{if(state.monitor){state.events.push({time:new Date().toISOString(),event:document.hidden?'App naar achtergrond; metingen kunnen worden vertraagd.':'App weer op voorgrond.'});updatePlus();}});
let installPrompt=null;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;say('installStatus','Je kunt NetwerkKompas als app installeren.');});$('install').onclick=async()=>{if(installPrompt){await installPrompt.prompt();const choice=await installPrompt.userChoice;say('installStatus',choice.outcome==='accepted'?'Installatie aangevraagd.':'Installatie overgeslagen.');installPrompt=null;}else{say('installStatus','Chrome/Edge: browsermenu → App installeren. iPhone/iPad: Safari → Deel → Zet op beginscherm. De optie verschijnt alleen als je browser installatie ondersteunt.');}};
if('serviceWorker'in navigator){navigator.serviceWorker.register('./sw.js').then(()=>{say('installStatus','Offline storingshulp wordt voorbereid. Metingen hebben internet nodig.');}).catch(()=>{say('installStatus','Offline opslag is niet beschikbaar. Online werkt de app gewoon.');});}

// ---------- Thema ----------
function initTheme(){
  const mq=window.matchMedia?.('(prefers-color-scheme: dark)');
  const stored=()=>{try{const value=localStorage.getItem('netwerkkompas-theme');return value==='dark'||value==='light'?value:null;}catch{return null;}};
  const apply=theme=>{
    document.documentElement.setAttribute('data-theme',theme);
    document.documentElement.style.colorScheme=theme;
    const btn=$('themeToggle');
    if(btn){
      btn.textContent=theme==='dark'?'☀️ Licht':'🌙 Donker';
      btn.setAttribute('aria-label',theme==='dark'?'Schakel naar lichte weergave':'Schakel naar donkere weergave');
    }
  };
  apply(stored()||(mq?.matches?'dark':'light'));
  mq?.addEventListener?.('change',event=>{if(!stored())apply(event.matches?'dark':'light');});
  const actions=document.querySelector('.actions');
  if(actions&&!$('themeToggle')){
    const btn=document.createElement('button');
    btn.type='button';
    btn.id='themeToggle';
    btn.className='theme-toggle';
    btn.addEventListener('click',()=>{
      const next=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';
      apply(next);
      try{localStorage.setItem('netwerkkompas-theme',next);}catch{}
    });
    actions.append(btn);
    apply(stored()||(mq?.matches?'dark':'light'));
  }
}
initTheme();

// ---------- Hulpfuncties ----------
function addNavLink(href,icon,label){
  const nav=document.querySelector('nav');
  if(!nav||document.querySelector('nav a[href="'+href+'"]'))return;
  const a=document.createElement('a');
  a.href=href;
  a.append(icon+' ');
  const span=document.createElement('span');
  span.textContent=label;
  a.append(span);
  nav.append(a);
}

function toolRow(label,value,warn){
  const row=document.createElement('div');
  row.className='toolrow'+(warn?' warn':'');
  const key=document.createElement('strong');
  key.textContent=label;
  const val=document.createElement('span');
  val.textContent=value;
  row.append(key,val);
  return row;
}

function advMedian(values){
  if(!values.length)return null;
  const sorted=[...values].sort((a,b)=>a-b);
  const mid=Math.floor(sorted.length/2);
  return sorted.length%2?sorted[mid]:Math.round((sorted[mid-1]+sorted[mid])/2);
}

function meanDelta(values){
  if(values.length<2)return null;
  let sum=0;
  for(let i=1;i<values.length;i++)sum+=Math.abs(values[i]-values[i-1]);
  return Math.round(sum/(values.length-1));
}

const ADV_TARGETS=[
  {name:'Cloudflare',url:()=>'https://speed.cloudflare.com/__down?bytes=0&n='+Date.now()},
  {name:'Google DNS',url:()=>'https://dns.google/resolve?name=example.com&type=A'},
  {name:'Cloudflare trace',url:()=>'https://speed.cloudflare.com/cdn-cgi/trace'}
];

const DNS_RESOLVERS=[
  {name:'Google',url:host=>'https://dns.google/resolve?name='+encodeURIComponent(host)+'&type=A'},
  {name:'Cloudflare',url:host=>'https://cloudflare-dns.com/dns-query?name='+encodeURIComponent(host)+'&type=A',headers:{Accept:'application/dns-json'}}
];

const ADV_COMMANDS={
  linux:[
    ['Route en gateway','Toon de actieve routes en standaardgateway.','ip route'],
    ['Traceroute','Toon de route naar Cloudflare.','traceroute -n 1.1.1.1'],
    ['MTR','Herhaalde traceroute met latentie per hop.','mtr -rw 1.1.1.1'],
    ['DNS-resolvers','Toon de DNS-servers van dit systeem.','resolvectl status | head -25']
  ],
  windows:[
    ['Netwerkconfiguratie','Toon IPv4, gateway en DNS-servers.','ipconfig /all'],
    ['Traceroute','Toon de route naar Cloudflare.','tracert -d 1.1.1.1'],
    ['Pathping','Route met latentie per hop.','pathping 1.1.1.1'],
    ['DNS-servers','Toon de ingestelde DNS-servers.','ipconfig /all | findstr /i "DNS"']
  ],
  mac:[
    ['Route en gateway','Toon de standaardgateway.','route -n get default'],
    ['Traceroute','Toon de route naar Cloudflare.','traceroute -n 1.1.1.1'],
    ['DNS-resolvers','Toon de DNS-configuratie.','scutil --dns | head -30']
  ]
};

// ---------- Geavanceerd ----------
function addAdvancedSection(){
  if(document.getElementById('geavanceerd'))return;
  const section=document.createElement('section');
  section.className='panel';
  section.id='geavanceerd';
  section.innerHTML=`
    <div class="sectionhead"><div><h2>Geavanceerd</h2><p>Extra metingen en hulpmiddelen. Een browser kan alleen HTTP-verkeer meten.</p></div><span class="pill">Vrijwillig</span></div>
    <div class="toolgrid">
      <section class="toolcard">
        <h3>Downloadmeting</h3>
        <p>Drie parallelle downloads van 10 MB. Samen een indicatie van je downloadsnelheid.</p>
        <button id="advSpeed" type="button">Start downloadmeting</button>
        <div id="advSpeedResult" class="toolresult" role="status" aria-live="polite">Nog niet gemeten.</div>
      </section>
      <section class="toolcard">
        <h3>Uploadmeting</h3>
        <p>Verstuurt 5 MB naar Cloudflare. Dit verbruikt mobiele data.</p>
        <button id="advUp" type="button">Start uploadmeting</button>
        <div id="advUpResult" class="toolresult" role="status" aria-live="polite">Nog niet gemeten.</div>
      </section>
      <section class="toolcard">
        <h3>HTTP-latentie en jitter</h3>
        <p>Vijf aanvragen per meetpunt. Dit is HTTP-responstijd, geen ICMP-ping.</p>
        <button id="pingTest" type="button">Meet latentie</button>
        <div id="pingResult" class="toolresult" role="status" aria-live="polite">Nog niet gemeten.</div>
      </section>
      <section class="toolcard">
        <h3>DNS-resolvers vergelijken</h3>
        <p>Vraagt hetzelfde domein op bij Google en Cloudflare. Dit test niet de DNS-server van je apparaat.</p>
        <div class="inputrow"><input id="dnsLookup" placeholder="example.com" autocomplete="off" aria-label="Domeinnaam voor DNS-vergelijking"><button id="dnsLookupBtn" type="button">Vergelijk</button></div>
        <div id="dnsLookupResult" class="toolresult" role="status" aria-live="polite">Nog niet opgevraagd.</div>
      </section>
      <section class="toolcard wide">
        <h3>Router en traceroute</h3>
        <p>Een browser kan geen traceroute uitvoeren. Deze opdrachten lezen alleen uit en veranderen niets.</p>
        <div class="inlinefield"><label for="advOs">Besturingssysteem</label><select id="advOs"><option value="linux">Linux / ParrotOS</option><option value="windows">Windows</option><option value="mac">macOS</option></select></div>
        <div id="advCommands"></div>
      </section>
      <section class="toolcard wide">
        <h3>Wat je browser over de verbinding meldt</h3>
        <div id="netInfo" class="toolresult"></div>
        <p class="micro">Deze waarden zijn schattingen van de browser en bewijzen niet welk netwerk of welke provider actief is.</p>
      </section>
    </div>
    <p class="micro">Geen echte ping, traceroute, poortscan of wifi-scan: browsers blokkeren die metingen. Gebruik daarvoor de opdrachten hierboven op je eigen systeem.</p>
  `;
  document.querySelector('footer').before(section);
  addNavLink('#geavanceerd','⚡','Geavanceerd');

  function renderNetInfo(){
    const out=$('netInfo');
    if(!out)return;
    const connection=navigator.connection||{};
    const rows=[
      ['Browser',navigator.userAgent],
      ['Online volgens browser',navigator.onLine?'ja':'nee'],
      ['Taal',navigator.language],
      ['Netwerktype (schatting)',connection.effectiveType||'onbekend'],
      ['Geschatte downlink',connection.downlink!=null?connection.downlink+' Mbit/s':'onbekend'],
      ['Geschatte RTT',connection.rtt!=null?connection.rtt+' ms':'onbekend'],
      ['Databesparing',connection.saveData?'aan':'nee'],
      ['CPU-threads',navigator.hardwareConcurrency||'onbekend'],
      ['Apparaatgeheugen',navigator.deviceMemory?'~'+navigator.deviceMemory+' GB':'onbekend'],
      ['Scherm',`${screen.width} × ${screen.height} @ ${window.devicePixelRatio||1}x`],
      ['Tijdzone',Intl.DateTimeFormat().resolvedOptions().timeZone||'onbekend']
    ];
    out.replaceChildren(...rows.map(([label,value])=>toolRow(label,value)));
  }
  renderNetInfo();
  navigator.connection?.addEventListener?.('change',renderNetInfo);

  $('advSpeed').addEventListener('click',async()=>{
    const btn=$('advSpeed'),out=$('advSpeedResult');
    btn.disabled=true;out.textContent='Bezig met downloaden…';
    try{
      const streams=3,bytes=10000000,stamp=Date.now();
      const started=performance.now();
      const parts=await Promise.all(Array.from({length:streams},(_,i)=>request(`https://speed.cloudflare.com/__down?bytes=${bytes}&n=${stamp}-${i}`,'bytes',60000)));
      const ms=performance.now()-started;
      const good=parts.filter(part=>part.ok);
      const total=good.reduce((sum,part)=>sum+(part.body?.byteLength||0),0);
      if(!good.length||ms<=0){
        out.replaceChildren(toolRow('Resultaat','niet meetbaar: '+(parts.find(part=>!part.ok)?.error||'onbekende fout'),true));
        return;
      }
      out.replaceChildren(
        toolRow('Downloadsnelheid',(total*8/(ms/1000)/1e6).toFixed(1)+' Mbit/s'),
        toolRow('Ontvangen',(total/1e6).toFixed(1)+' MB in '+(ms/1000).toFixed(1)+' s'),
        toolRow('Streams',good.length+' / '+streams,good.length<streams)
      );
    }finally{btn.disabled=false;}
  });

  $('advUp').addEventListener('click',async()=>{
    const btn=$('advUp'),out=$('advUpResult');
    btn.disabled=true;out.textContent='Bezig met uploaden…';
    const size=5000000;
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),60000);
    try{
      const started=performance.now();
      const response=await fetch('https://speed.cloudflare.com/__up',{method:'POST',body:new Uint8Array(size),cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal});
      const ms=performance.now()-started;
      if(!response.ok)throw new Error('HTTP '+response.status);
      try{await response.arrayBuffer();}catch{}
      out.replaceChildren(
        toolRow('Uploadsnelheid',(size*8/(ms/1000)/1e6).toFixed(1)+' Mbit/s'),
        toolRow('Verstuurd',(size/1e6).toFixed(1)+' MB in '+(ms/1000).toFixed(1)+' s'),
        toolRow('Let op','één meting; serververwerking kan meetellen',true)
      );
    }catch(error){
      out.replaceChildren(toolRow('Resultaat',error.name==='AbortError'?'timeout':'niet meetbaar: '+error.message,true));
    }finally{clearTimeout(timer);btn.disabled=false;}
  });

  $('pingTest').addEventListener('click',async()=>{
    const btn=$('pingTest'),out=$('pingResult');
    btn.disabled=true;out.textContent='Bezig met meten…';
    const samples=new Map(ADV_TARGETS.map(target=>[target.name,[]]));
    let failed=0;
    try{
      for(let round=0;round<5;round++){
        const results=await Promise.all(ADV_TARGETS.map(async target=>{
          const result=await request(target.url(),'bytes',6000);
          return {name:target.name,ok:result.ok,ms:result.ms};
        }));
        results.forEach(result=>{
          if(result.ok)samples.get(result.name).push(result.ms);
          else failed++;
        });
      }
      const rows=ADV_TARGETS.map(target=>{
        const values=samples.get(target.name);
        if(!values.length)return toolRow(target.name,'geen geldige meting',true);
        const jitter=meanDelta(values);
        return toolRow(target.name,`mediaan ${advMedian(values)} ms · min ${Math.min(...values)} · max ${Math.max(...values)}${jitter===null?'':' · jitter '+jitter+' ms'}`);
      });
      rows.push(toolRow('Mislukte aanvragen',String(failed),failed>0));
      out.replaceChildren(...rows);
    }finally{btn.disabled=false;}
  });

  $('dnsLookupBtn').addEventListener('click',async()=>{
    const btn=$('dnsLookupBtn'),out=$('dnsLookupResult');
    let host;
    try{host=validDomain($('dnsLookup').value);}catch(error){out.replaceChildren(toolRow('Ongeldig domein',error.message,true));return;}
    btn.disabled=true;out.textContent='Opvragen…';
    try{
      const results=await Promise.all(DNS_RESOLVERS.map(async resolver=>{
        const result=await request(resolver.url(host),'json',8000,resolver.headers||null);
        return {name:resolver.name,result};
      }));
      const answerSets=[];
      const rows=results.map(({name,result})=>{
        if(!result.ok)return toolRow(name,'niet meetbaar: '+result.error,true);
        const body=result.body||{};
        if(body.Status===3)return toolRow(name,'domein niet gevonden (NXDOMAIN)',true);
        if(body.Status!==0)return toolRow(name,'foutcode '+body.Status,true);
        const addresses=(body.Answer||[]).filter(answer=>answer&&answer.type===1).map(answer=>answer.data);
        answerSets.push([...addresses].sort().join(','));
        return toolRow(name,addresses.length?addresses.join(', '):'geen IPv4-adres');
      });
      if(answerSets.length===2&&answerSets[0]!==answerSets[1])rows.push(toolRow('Verschil','de resolvers geven verschillende antwoorden; dat kan door geografische DNS of caching',true));
      out.replaceChildren(...rows);
    }finally{btn.disabled=false;}
  });

  function renderAdvCommands(){
    const box=$('advCommands');
    if(!box)return;
    box.replaceChildren();
    (ADV_COMMANDS[$('advOs').value]||[]).forEach(([title,description,command])=>{
      const row=document.createElement('div');
      row.className='commandrow';
      const text=document.createElement('div');
      text.textContent=title;
      const small=document.createElement('small');
      small.textContent=description;
      text.append(small);
      const code=document.createElement('code');
      code.textContent=command;
      const copy=document.createElement('button');
      copy.type='button';
      copy.textContent='Kopieer';
      copy.addEventListener('click',async()=>{
        try{
          await navigator.clipboard.writeText(command);
          copy.textContent='Gekopieerd';
          setTimeout(()=>copy.textContent='Kopieer',2000);
        }catch{copy.textContent='Selecteer de opdracht';}
      });
      row.append(text,code,copy);
      box.append(row);
    });
  }
  $('advOs').addEventListener('change',renderAdvCommands);
  renderAdvCommands();
}

// ---------- Klachten ----------
const PROVIDERS={
  kpn:{name:'KPN',url:'https://www.kpn.com/klantenservice/',note:'Klachten verlopen via de klantenservice van KPN.'},
  ziggo:{name:'Ziggo',url:'https://www.ziggo.nl/klantenservice/contact/klacht',note:'Gebruik bij voorkeur het online klachtenformulier van Ziggo.'},
  odido:{name:'Odido (voorheen T-Mobile)',url:'https://www.odido.nl/klantenservice',note:'Odido is de nieuwe naam van T-Mobile Nederland.'},
  vodafone:{name:'Vodafone',url:'https://www.vodafone.nl/klantenservice/contact',note:''},
  online:{name:'Online.nl',url:'https://www.online.nl/',note:''},
  freedom:{name:'Freedom Internet',url:'https://freedom.nl/',note:''},
  youfone:{name:'Youfone',url:'https://www.youfone.nl/',note:''},
  ben:{name:'BEN',url:'https://www.ben.nl/',note:''},
  solcon:{name:'Solcon',url:'https://www.solcon.nl/',note:''},
  delta:{name:'Delta',url:'https://www.delta.nl/klantenservice/',note:''},
  caiway:{name:'Caiway',url:'https://www.caiway.nl/',note:''},
  kabelnoord:{name:'Kabelnoord',url:'https://www.kabelnoord.nl/',note:''},
  other:{name:'Andere provider',url:'',note:'Zoek op de website of factuur van je provider naar het klachtenformulier of de klachtenprocedure.'}
};

const PROVIDER_GROUPS=[
  {label:'Landelijk',keys:['kpn','ziggo','odido','vodafone','online','freedom','youfone','ben','solcon']},
  {label:'Regionaal en kabel',keys:['delta','caiway','kabelnoord']},
  {label:'Anders',keys:['other']}
];

function addComplaintSection(){
  if(document.getElementById('klachten'))return;
  const section=document.createElement('section');
  section.className='panel';
  section.id='klachten';
  section.innerHTML=`
    <div class="sectionhead"><div><h2>Klacht indienen</h2><p>Stel een klacht op met je meetresultaten en open de klachtenpagina van je provider.</p></div><span class="pill">Concept</span></div>
    <div class="callout"><strong>Zo werkt het:</strong> NetwerkKompas verstuurt niets. Je kopieert de klacht zelf naar het formulier of de e-mail van je provider. Voeg waar mogelijk je klantnummer en eerdere storingsmeldingen toe.</div>
    <div class="columns">
      <section class="toolcard">
        <h3>Jouw klacht</h3>
        <div class="field"><label for="providerSelect">Provider</label><select id="providerSelect"><option value="">Selecteer een provider…</option></select></div>
        <div class="field"><label for="complaintType">Soort probleem</label><select id="complaintType"><option value="slow">Trage verbinding</option><option value="drops">Verbinding valt weg</option><option value="offline">Geen internet</option><option value="other">Anders</option></select></div>
        <div class="field"><label for="complaintText">Wat merk je? (optioneel)</label><textarea id="complaintText" rows="5" maxlength="1500" placeholder="Bijvoorbeeld: sinds drie dagen valt de verbinding elke avond weg."></textarea></div>
        <label class="checkline" for="includeMeasurements"><input type="checkbox" id="includeMeasurements" checked> Meetresultaten uit deze sessie toevoegen</label>
        <div class="buttonrow"><button id="generateComplaint" type="button" class="primary">Genereer klacht</button></div>
        <p id="complaintStatus" class="micro" role="status" aria-live="polite"></p>
      </section>
      <section class="toolcard">
        <h3>Klachtenkanaal</h3>
        <div id="providerInfo" class="provider-card">Selecteer een provider om het klachtenkanaal te zien.</div>
        <div id="complaintOutput" hidden>
          <div class="field"><label for="complaintResult">Conceptklacht</label><textarea id="complaintResult" class="complaint-text" rows="14" readonly></textarea></div>
          <div class="buttonrow">
            <button id="copyComplaint" type="button">Kopieer</button>
            <button id="downloadComplaint" type="button">Download .txt</button>
            <button id="openForm" type="button">Open klachtenpagina</button>
          </div>
          <p class="micro">Controleer het concept en vul je eigen gegevens in voordat je het verstuurt.</p>
        </div>
      </section>
    </div>
    <section class="toolcard wide">
      <h3>Als je er niet uitkomt</h3>
      <ul class="escalation">
        <li><a href="https://www.consuwijzer.nl/" target="_blank" rel="noopener noreferrer">ACM ConsuWijzer</a> geeft gratis uitleg over je rechten bij internet- en telecomproblemen.</li>
        <li><a href="https://www.degeschillencommissie.nl/" target="_blank" rel="noopener noreferrer">Geschillencommissie</a>: een geschil indienen kan meestal pas nadat je de klachtenprocedure van je provider hebt doorlopen. Bewaar je correspondentie.</li>
        <li><a href="https://www.acm.nl/" target="_blank" rel="noopener noreferrer">Autoriteit Consument &amp; Markt</a> houdt toezicht op de telecommarkt; een melding daar vervangt geen individuele klacht.</li>
      </ul>
      <p class="micro">NetwerkKompas is geen juridisch adviseur en heeft geen invloed op de afhandeling van je klacht.</p>
    </section>
  `;
  document.querySelector('footer').before(section);
  addNavLink('#klachten','📢','Klachten');

  const select=$('providerSelect');
  PROVIDER_GROUPS.forEach(group=>{
    const optgroup=document.createElement('optgroup');
    optgroup.label=group.label;
    group.keys.forEach(key=>{
      const option=document.createElement('option');
      option.value=key;
      option.textContent=PROVIDERS[key].name;
      optgroup.append(option);
    });
    select.append(optgroup);
  });

  function renderProvider(){
    const box=$('providerInfo');
    const provider=PROVIDERS[select.value];
    if(!provider){
      box.textContent='Selecteer een provider om het klachtenkanaal te zien.';
      return;
    }
    box.replaceChildren();
    const name=document.createElement('strong');
    name.textContent=provider.name;
    box.append(name);
    if(provider.note){
      const note=document.createElement('p');
      note.textContent=provider.note;
      box.append(note);
    }
    if(provider.url){
      const link=document.createElement('a');
      link.href=provider.url;
      link.target='_blank';
      link.rel='noopener noreferrer';
      link.textContent='Open klachtenpagina ↗';
      const line=document.createElement('p');
      line.append(link);
      box.append(line);
    }
    const tip=document.createElement('p');
    tip.className='micro';
    tip.textContent='Controleer op de providerpagina welk kanaal voor klachten bedoeld is; niet elke contactpagina is een klachtenformulier.';
    box.append(tip);
  }

  function measurementSummary(){
    if(!state.runs.length)return null;
    const values=state.runs.map(run=>run.median).filter(value=>Number.isFinite(value));
    const failed=state.runs.filter(run=>run.probes.some(probe=>probe.external&&!probe.ok)).length;
    const labels=[...new Set(state.runs.map(run=>run.label).filter(Boolean))];
    const lines=[`- Aantal meetrondes: ${state.runs.length}`];
    if(values.length)lines.push(`- HTTP-responstijd mediaan: ${Math.min(...values)} tot ${Math.max(...values)} ms`);
    lines.push(`- Rondes met een mislukt extern meetpunt: ${failed}`);
    if(labels.length)lines.push(`- Verbinding: ${labels.join(', ')}`);
    lines.push(`- Periode: ${new Date(state.runs[0].time).toLocaleString('nl-NL')} tot ${new Date(state.runs[state.runs.length-1].time).toLocaleString('nl-NL')}`);
    return lines.join('\n');
  }

  function buildComplaint(){
    const provider=PROVIDERS[select.value];
    if(!provider)return null;
    const typeText={slow:'een trage verbinding',drops:'een verbinding die regelmatig wegvalt',offline:'geen internetverbinding',other:'een netwerkprobleem'}[$('complaintType').value]||'een netwerkprobleem';
    const description=$('complaintText').value.trim();
    const lines=[];
    lines.push(`Betreft: klacht over mijn internetverbinding (${typeText})`,'');
    lines.push(`Geachte klantenservice van ${provider.name},`,'');
    lines.push(`Ik dien een klacht in over ${typeText} op mijn internetverbinding.`,'');
    if(description)lines.push('Toelichting:',description,'');
    if($('includeMeasurements').checked){
      const summary=measurementSummary();
      if(summary){
        lines.push('Metingen met NetwerkKompas (browsertool):',summary,'');
        lines.push('Dit zijn HTTP-aanvragen vanuit een browser. Het zijn geen ping-, pakketverlies- of volledige snelheidsmetingen en ze wijzen geen specifieke schakel aan. De volledige resultaten kan ik op verzoek sturen.','');
      }else{
        lines.push('In deze app staan nog geen meetresultaten; die kan ik later toevoegen.','');
      }
    }
    lines.push('Ik verzoek u het probleem te onderzoeken en mij te laten weten wat de oorzaak is en wanneer het is opgelost.','');
    lines.push('Ik verzoek u deze klacht volgens uw klachtenprocedure vast te leggen en mij een schriftelijke reactie te sturen.','');
    lines.push('Met vriendelijke groet,','','[Naam]','[Adres]','[Postcode en plaats]','[Klantnummer]','[E-mailadres]','[Telefoonnummer]');
    return lines.join('\n');
  }

  $('generateComplaint').addEventListener('click',()=>{
    const status=$('complaintStatus');
    if(!select.value){
      status.textContent='Selecteer eerst een provider.';
      return;
    }
    $('complaintResult').value=buildComplaint();
    $('complaintOutput').hidden=false;
    status.textContent='Concept klaargezet. Controleer de tekst en vul je eigen gegevens in.';
    $('complaintOutput').scrollIntoView({behavior:'smooth',block:'nearest'});
  });

  $('copyComplaint').addEventListener('click',async()=>{
    const btn=$('copyComplaint');
    try{
      await navigator.clipboard.writeText($('complaintResult').value);
      btn.textContent='Gekopieerd';
      setTimeout(()=>btn.textContent='Kopieer',2000);
    }catch{
      $('complaintResult').select();
      $('complaintStatus').textContent='Automatisch kopiëren lukte niet. De tekst is geselecteerd; kopieer met Ctrl+C of ⌘+C.';
    }
  });

  $('downloadComplaint').addEventListener('click',()=>{
    downloadFile('netwerkkompas-klacht.txt',$('complaintResult').value,'text/plain;charset=utf-8');
  });

  $('openForm').addEventListener('click',()=>{
    const provider=PROVIDERS[select.value];
    if(provider?.url)window.open(provider.url,'_blank','noopener');
    else $('complaintStatus').textContent='Deze provider heeft geen vaste klachtenpagina in de app. Zoek het klachtenkanaal op de providerwebsite.';
  });

  select.addEventListener('change',renderProvider);
  renderProvider();
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',()=>{addAdvancedSection();addComplaintSection();});
}else{
  addAdvancedSection();
  addComplaintSection();
}
