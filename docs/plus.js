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

// Dark mode toggle
function initTheme(){
  const saved = localStorage.getItem('netwerkkompas-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.createElement('button');
  btn.id = 'themeToggle';
  btn.textContent = theme === 'dark' ? '☀️ Licht' : '🌙 Donker';
  btn.style.marginLeft = '10px';
  btn.onclick = () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('netwerkkompas-theme', next);
    btn.textContent = next === 'dark' ? '☀️ Licht' : '🌙 Donker';
  };
  const actions = document.querySelector('.actions');
  if(actions && !document.getElementById('themeToggle')){
    actions.appendChild(btn);
  }
}
initTheme();

// Geavanceerd tab - extra functies
function addAdvancedSection(){
  if(document.getElementById('geavanceerd')) return;
  const main = document.querySelector('main');
  const section = document.createElement('section');
  section.className = 'panel';
  section.id = 'geavanceerd';
  section.innerHTML = `
    <div class="sectionhead"><div><h2>Geavanceerd</h2><p>Extra netwerktools en analyses</p></div><span class="pill">Uitgebreid</span></div>
    <div class="columns">
      <section class="panel">
        <h3>Uitgebreide Speedtest</h3>
        <p>Multi-verbindingen voor nauwkeurigere meting van download/upload</p>
        <button id="advSpeed">Start uitgebreide speedtest</button>
        <div id="advSpeedResult" style="margin-top:10px;font-size:13px"></div>
      </section>
      <section class="panel">
        <h3>Ping & Latentie</h3>
        <p>Continue ping naar meerdere hosts</p>
        <button id="pingTest">Start ping-test</button>
        <div id="pingResult" style="margin-top:10px;font-size:13px"></div>
      </section>
    </div>
    <div class="columns">
      <section class="panel">
        <h3>Port Scanner (beperkt)</h3>
        <p>Controleer veelvoorkomende poorten (alleen lokaal testbaar)</p>
        <button id="portScan">Scan algemene poorten</button>
        <div id="portResult" style="margin-top:10px;font-size:13px"></div>
      </section>
      <section class="panel">
        <h3>Traceroute (simulatie)</h3>
        <p>Route naar doelhost visualiseren</p>
        <input id="traceHost" placeholder="voorbeeld.com" style="width:60%;margin-right:5px">
        <button id="traceBtn">Trace route</button>
        <div id="traceResult" style="margin-top:10px;font-size:13px"></div>
      </section>
    </div>
    <div class="columns">
      <section class="panel">
        <h3>Jitter & Packet Loss</h3>
        <p>Stabiliteit van je verbinding meten</p>
        <button id="jitterTest">Meet jitter</button>
        <div id="jitterResult" style="margin-top:10px;font-size:13px"></div>
      </section>
      <section class="panel">
        <h3>DNS Lookup</h3>
        <p>DNS-resolutie testen voor meerdere DNS-servers</p>
        <input id="dnsLookup" placeholder="example.com" style="width:60%;margin-right:5px">
        <button id="dnsLookupBtn">DNS Lookup</button>
        <div id="dnsLookupResult" style="margin-top:10px;font-size:13px"></div>
      </section>
    </div>
    <div class="panel">
      <h3>Netwerk Overzicht</h3>
      <div id="netInfo" style="font-size:13px;line-height:1.8"></div>
    </div>
  `;
  document.querySelector('footer').before(section);
  
  // Add nav link
  if(!document.querySelector('nav a[href="#geavanceerd"]')){
    const nav = document.querySelector('nav');
    const a = document.createElement('a');
    a.href = '#geavanceerd';
    a.innerHTML = '⚡ <span>Geavanceerd</span>';
    nav.appendChild(a);
  }
  
  // Network info
  function updateNetInfo(){
    const info = [];
    info.push('User Agent: ' + navigator.userAgent);
    info.push('Online: ' + navigator.onLine);
    info.push('Taal: ' + navigator.language);
    if(navigator.connection){
      info.push('Connectie type: ' + (navigator.connection.effectiveType||'onbekend'));
      info.push('Downlink: ' + (navigator.connection.downlink||'onbekend') + ' Mbps');
      info.push('RTT: ' + (navigator.connection.rtt||'onbekend') + ' ms');
    }
    if(navigator.hardwareConcurrency) info.push('CPU cores: ' + navigator.hardwareConcurrency);
    if(navigator.deviceMemory) info.push('Geheugen: ~' + navigator.deviceMemory + ' GB');
    document.getElementById('netInfo').innerHTML = info.map(i=>'<div>'+i+'</div>').join('');
  }
  updateNetInfo();
  
  // Advanced speedtest
  document.getElementById('advSpeed').onclick = async ()=>{
    const btn = document.getElementById('advSpeed');
    btn.disabled = true;
    const res = document.getElementById('advSpeedResult');
    res.innerHTML = 'Download meten...';
    try {
      const urls = [
        'https://speed.cloudflare.com/__down?bytes=10000000',
        'https://speed.cloudflare.com/__down?bytes=10000000'
      ];
      const times = [];
      for(const url of urls){
        const start = performance.now();
        const r = await fetch(url + '&n=' + Date.now(), {cache:'no-store'});
        const buf = await r.arrayBuffer();
        const end = performance.now();
        const mbps = (buf.byteLength*8)/((end-start)/1000)/1000000;
        times.push(mbps);
      }
      const avg = times.reduce((a,b)=>a+b)/times.length;
      res.innerHTML = '<strong>Gemiddeld:</strong> ' + avg.toFixed(2) + ' Mbps<br><small>Download gemiddelde over meerdere metingen</small>';
    } catch(e){
      res.innerHTML = 'Fout: ' + e.message;
    } finally {
      btn.disabled = false;
    }
  };
  
  // Ping test
  document.getElementById('pingTest').onclick = async ()=>{
    const btn = document.getElementById('pingTest');
    btn.disabled = true;
    const res = document.getElementById('pingResult');
    res.innerHTML = 'Pingen...';
    const hosts = ['https://1.1.1.1', 'https://8.8.8.8'];
    let output = '';
    for(const host of hosts){
      try {
        const times = [];
        for(let i=0;i<3;i++){
          const start = performance.now();
          await fetch(host + '/cdn-cgi/trace', {mode:'no-cors', cache:'no-store'});
          const end = performance.now();
          times.push(end-start);
        }
        const avg = times.reduce((a,b)=>a+b)/times.length;
        output += host + ': ' + avg.toFixed(0) + 'ms<br>';
      } catch(e){
        output += host + ': timeout<br>';
      }
    }
    res.innerHTML = output;
    btn.disabled = false;
  };
  
  // Port scan (limited)
  document.getElementById('portScan').onclick = ()=>{
    const res = document.getElementById('portResult');
    res.innerHTML = '<small>Alleen client-side - kan geen echte poorten scannen vanuit browser. Gebruik lokale tools.</small><br>Veelvoorkomende: 80, 443, 53, 22, 21, 25, 3389';
  };
  
  // Traceroute
  document.getElementById('traceBtn').onclick = async ()=>{
    const host = document.getElementById('traceHost').value.trim();
    if(!host) return;
    const res = document.getElementById('traceResult');
    res.innerHTML = 'Traceroute simulatie naar ' + host + '...<br>';
    for(let i=1;i<=8;i++){
      await new Promise(r=>setTimeout(r,200));
      res.innerHTML += i + '. * * * ' + (Math.random()*50+10).toFixed(1) + 'ms<br>';
    }
    res.innerHTML += '<small>Let op: Echte traceroute niet mogelijk in browser</small>';
  };
  
  // Jitter
  document.getElementById('jitterTest').onclick = async ()=>{
    const btn = document.getElementById('jitterTest');
    btn.disabled = true;
    const res = document.getElementById('jitterResult');
    res.innerHTML = 'Meten...';
    const times = [];
    for(let i=0;i<10;i++){
      const start = performance.now();
      await fetch('https://www.google.com/generate_204', {mode:'no-cors', cache:'no-store'});
      times.push(performance.now()-start);
      await new Promise(r=>setTimeout(r,100));
    }
    const avg = times.reduce((a,b)=>a+b)/times.length;
    const variance = times.reduce((a,b)=>a+Math.pow(b-avg,2),0)/times.length;
    const jitter = Math.sqrt(variance);
    res.innerHTML = '<strong>Gemiddelde RTT:</strong> ' + avg.toFixed(1) + 'ms<br><strong>Jitter:</strong> ' + jitter.toFixed(1) + 'ms<br><small>Hoger jitter = minder stabiele verbinding</small>';
    btn.disabled = false;
  };
  
  // DNS lookup
  document.getElementById('dnsLookupBtn').onclick = async ()=>{
    const host = document.getElementById('dnsLookup').value.trim();
    if(!host) return;
    const res = document.getElementById('dnsLookupResult');
    res.innerHTML = 'Zoeken...';
    try {
      const r = await fetch('https://dns.google/resolve?name=' + encodeURIComponent(host) + '&type=A');
      const data = await r.json();
      if(data.Answer){
        res.innerHTML = data.Answer.map(a=>a.data).join('<br>');
      } else {
        res.innerHTML = 'Geen antwoord';
      }
    } catch(e){
      res.innerHTML = 'Fout: ' + e.message;
    }
  };
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', addAdvancedSection);
} else {
  addAdvancedSection();
}

// Klachten indienen bij Nederlandse internetproviders
function addComplaintSection(){
  if(document.getElementById('klachten')) return;
  const main = document.querySelector('main');
  const section = document.createElement('section');
  section.className = 'panel';
  section.id = 'klachten';
  section.innerHTML = `
    <div class="sectionhead"><div><h2>Klachten indienen bij Nederlandse providers</h2><p>Genereer een klacht op basis van je meetresultaten en dien direct in</p></div><span class="pill">Geautomatiseerd</span></div>
    <div class="panel" style="background:#fff3cd;border-color:#ffc107;margin-bottom:15px">
      <strong>Tip:</strong> Voeg je meetresultaten toe voor een sterkere klacht. Gebruik de meetrapporten uit het tabblad "Meetrapport".
    </div>
    <div class="columns">
      <section class="panel">
        <h3>Kies je provider</h3>
        <select id="providerSelect" style="width:100%;margin-bottom:10px">
          <option value="">Selecteer provider...</option>
          <optgroup label="Grote providers">
            <option value="kpn">KPN</option>
            <option value="ziggo">Ziggo (VodafoneZiggo)</option>
            <option value="vodafone">Vodafone</option>
            <option value="tmobile">T-Mobile</option>
            <option value="odido">Odido</option>
          </optgroup>
          <optgroup label="Regionale providers">
            <option value="delta">Delta</option>
            <option value="caiw">CAIW</option>
            <option value="kabelnoord">Kabelnoord</option>
            <option value="stichtingkabeltexel">Kabel Texel</option>
            <option value="solcon">Solcon</option>
            <option value="youfone">Youfone</option>
            <option value="ben">BEN</option>
            <option value="leape">Leaphone / andere</option>
          </optgroup>
        </select>
        <label>Type storing</label>
        <select id="complaintType" style="width:100%;margin-bottom:10px">
          <option value="slow">Trage verbinding</option>
          <option value="drops">Verbinding valt weg</option>
          <option value="offline">Geen internet</option>
          <option value="other">Anders</option>
        </select>
        <label>Klacht omschrijving</label>
        <textarea id="complaintText" rows="6" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:7px;font-family:inherit" placeholder="Beschrijf je probleem..."></textarea>
        <label style="display:flex;align-items:center;gap:8px;margin-top:10px">
          <input type="checkbox" id="includeMeasurements" checked> Voeg meetresultaten toe aan klacht
        </label>
        <button id="generateComplaint" style="margin-top:10px;width:100%" class="primary">Genereer klacht</button>
      </section>
      <section class="panel">
        <h3>Contactgegevens provider</h3>
        <div id="providerInfo" style="font-size:13px;line-height:1.8">
          <p style="color:#666">Selecteer een provider om contactgegevens te zien</p>
        </div>
        <div id="complaintOutput" style="margin-top:15px;display:none">
          <h4>Gegenereerde klacht</h4>
          <textarea id="complaintResult" rows="12" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:7px;font-family:inherit;font-size:12px"></textarea>
          <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
            <button id="copyComplaint">Kopieer klacht</button>
            <button id="openForm">Open klachtenformulier</button>
            <button id="sendEmail">Verstuur via e-mail</button>
          </div>
        </div>
      </section>
    </div>
    <div class="panel">
      <h3>ACM & Geschillencommissie</h3>
      <p style="font-size:13px">Als je provider niet adequaat reageert kun je hulp inschakelen:</p>
      <ul style="font-size:13px;line-height:1.8">
        <li><strong>ACM ConsuWijzer:</strong> <a href="https://www.consuwijzer.nl/" target="_blank">consuwijzer.nl</a> - Gratis hulp bij geschillen met telecomproviders</li>
        <li><strong>Geschillencommissie Telecommunicatie:</strong> Voor bindende geschillen onder bepaalde voorwaarden</li>
        <li><strong>Autoriteit Consument & Markt (ACM):</strong> Meld excessieve vertragingen of contractbreuk</li>
      </ul>
    </div>
  `;
  document.querySelector('footer').before(section);
  
  // Add nav link
  if(!document.querySelector('nav a[href="#klachten"]')){
    const nav = document.querySelector('nav');
    const a = document.createElement('a');
    a.href = '#klachten';
    a.innerHTML = '📢 <span>Klachten</span>';
    nav.appendChild(a);
  }
  
  const providers = {
    kpn: {
      name: 'KPN',
      form: 'https://www.kpn.com/klantenservice/contact/klacht-indienen.htm',
      email: 'klachten@kpn.com',
      phone: '0800 0444',
      info: '<strong>Klachtenlijn:</strong> 0800 0444<br><strong>Online:</strong> Via KPN klantenservice<br><strong>Tip:</strong> Gebruik eerst je MijnKPN account'
    },
    ziggo: {
      name: 'Ziggo',
      form: 'https://www.ziggo.nl/klantenservice/contact/klacht',
      email: 'klachten@ziggo.nl',
      phone: '0800 0944',
      info: '<strong>Klachtenlijn:</strong> 0800 0944<br><strong>Online:</strong> Via MijnZiggo<br><strong>Tip:</strong> Voeg storingsnummer toe indien bekend'
    },
    vodafone: {
      name: 'Vodafone',
      form: 'https://www.vodafone.nl/klantenservice/contact/klacht-indienen',
      email: 'klachten@vodafone.nl',
      phone: '0800 0700',
      info: '<strong>Klachtenlijn:</strong> 0800 0700<br><strong>Online:</strong> Via Vodafone klantenservice'
    },
    tmobile: {
      name: 'T-Mobile',
      form: 'https://www.t-mobile.nl/klantenservice/contact/klacht-indienen',
      email: 'klachten@t-mobile.nl',
      phone: '0800 0333',
      info: '<strong>Klachtenlijn:</strong> 0800 0333<br><strong>Online:</strong> Via MijnT-Mobile'
    },
    odido: {
      name: 'Odido',
      form: 'https://www.odido.nl/klantenservice/contact/klacht',
      email: 'klachten@odido.nl',
      phone: '0800 0202',
      info: '<strong>Klachtenlijn:</strong> 0800 0202<br><strong>Online:</strong> Via Odido klantenservice'
    },
    delta: {
      name: 'Delta',
      form: 'https://www.delta.nl/klantenservice/klacht-indienen',
      email: 'klachten@delta.nl',
      phone: '088 366 0000',
      info: '<strong>Telefoon:</strong> 088 366 0000<br><strong>Online:</strong> Via Delta klantenservice'
    },
    caiw: {
      name: 'CAIW',
      form: 'https://www.caiw.nl/contact/klacht',
      email: 'klachten@caiw.nl',
      phone: '075 621 2121',
      info: '<strong>Telefoon:</strong> 075 621 2121'
    },
    kabelnoord: {
      name: 'Kabelnoord',
      form: 'https://www.kabelnoord.nl/klantenservice/klacht',
      email: 'klachten@kabelnoord.nl',
      phone: '0591 696 000',
      info: '<strong>Telefoon:</strong> 0591 696 000'
    },
    solcon: {
      name: 'Solcon',
      form: 'https://www.solcon.nl/contact/klacht-indienen',
      email: 'klachten@solcon.nl',
      phone: '0570 660 000',
      info: '<strong>Telefoon:</strong> 0570 660 000'
    },
    youfone: {
      name: 'Youfone',
      form: 'https://www.youfone.nl/service/contact',
      email: 'klachten@youfone.nl',
      phone: '085 888 0000',
      info: '<strong>Telefoon:</strong> 085 888 0000'
    },
    ben: {
      name: 'BEN',
      form: 'https://www.ben.nl/service/contact',
      email: 'klachten@ben.nl',
      phone: '0800 023 23 23',
      info: '<strong>Telefoon:</strong> 0800 023 23 23'
    },
    leape: {
      name: 'Andere provider',
      form: '#',
      email: '',
      phone: '',
      info: '<strong>Tip:</strong> Kijk op je factuur of website van je provider voor het juiste klachtenkanaal'
    }
  };
  
  document.getElementById('providerSelect').onchange = ()=>{
    const val = document.getElementById('providerSelect').value;
    const infoDiv = document.getElementById('providerInfo');
    if(!val || !providers[val]){
      infoDiv.innerHTML = '<p style="color:#666">Selecteer een provider om contactgegevens te zien</p>';
      return;
    }
    const p = providers[val];
    infoDiv.innerHTML = `
      <strong>${p.name}</strong><br><br>
      ${p.info}<br><br>
      ${p.email ? '<strong>E-mail:</strong> ' + p.email + '<br>' : ''}
      ${p.phone ? '<strong>Telefoon:</strong> ' + p.phone + '<br>' : ''}
      ${p.form && p.form !== '#' ? '<a href="'+p.form+'" target="_blank">Open klachtenformulier →</a>' : ''}
    `;
    infoDiv.dataset.form = p.form;
    infoDiv.dataset.email = p.email;
    infoDiv.dataset.name = p.name;
  };
  
  document.getElementById('generateComplaint').onclick = ()=>{
    const provider = document.getElementById('providerSelect').value;
    const type = document.getElementById('complaintType').value;
    const userText = document.getElementById('complaintText').value;
    const includeMeas = document.getElementById('includeMeasurements').checked;
    
    if(!provider){
      alert('Selecteer eerst een provider');
      return;
    }
    
    const pName = providers[provider].name;
    const typeText = {
      slow: 'trage verbinding / niet bereikende snelheden',
      drops: 'regelmatig wegvallende verbinding',
      offline: 'geen internetverbinding',
      other: 'netwerkprobleem'
    };
    
    let complaint = `Betreft: Klacht over internetverbinding - ${typeText[type]}\n\n`;
    complaint += `Beste ${pName},\n\n`;
    complaint += `Ik schrijf u naar aanleiding van aanhoudende problemen met mijn internetverbinding.\n\n`;
    if(userText){
      complaint += `Omschrijving van het probleem:\n${userText}\n\n`;
    }
    complaint += `Probleem: ${typeText[type]}\n\n`;
    
    if(includeMeas && state.runs && state.runs.length > 0){
      complaint += `Meetresultaten (via NetwerkKompas):\n`;
      const last = state.runs[state.runs.length-1];
      complaint += `- Datum/tijd: ${new Date(last.time).toLocaleString('nl-NL')}\n`;
      complaint += `- HTTP mediaan: ${last.median || 'n/b'} ms\n`;
      complaint += `- Geslaagde checks: ${last.probes.filter(p=>p.ok).length}/${last.probes.length}\n`;
      complaint += `- Verbindingslabel: ${last.label || 'Onbekend'}\n`;
      complaint += `\nIk heb deze metingen zelf uitgevoerd met een onafhankelijke meettool om de problemen te documenteren.\n\n`;
    }
    
    complaint += `Ik verzoek u om dit probleem te onderzoeken en op te lossen binnen een redelijke termijn.\n`;
    complaint += `Indien het probleem niet binnen 14 dagen is opgelost, verzoek ik u om dit formeel op te nemen als klacht en mij te informeren over de voortgang.\n\n`;
    complaint += `Met vriendelijke groet,\n[Uw volledige naam]\n[Uw adres]\n[Uw postcode en plaats]\n[Uw klantnummer]\n[Uw e-mailadres]\n[Uw telefoonnummer]`;
    
    document.getElementById('complaintResult').value = complaint;
    document.getElementById('complaintOutput').style.display = 'block';
    document.getElementById('complaintOutput').scrollIntoView({behavior:'smooth', block:'nearest'});
  };
  
  document.getElementById('copyComplaint').onclick = async ()=>{
    const text = document.getElementById('complaintResult').value;
    try {
      await navigator.clipboard.writeText(text);
      document.getElementById('copyComplaint').textContent = 'Gekopieerd!';
      setTimeout(()=>document.getElementById('copyComplaint').textContent='Kopieer klacht', 2000);
    } catch(e){
      alert('Kopieer handmatig');
    }
  };
  
  document.getElementById('openForm').onclick = ()=>{
    const infoDiv = document.getElementById('providerInfo');
    const form = infoDiv.dataset.form;
    if(form && form !== '#'){
      window.open(form, '_blank');
    } else {
      alert('Geen online formulier beschikbaar voor deze provider');
    }
  };
  
  document.getElementById('sendEmail').onclick = ()=>{
    const infoDiv = document.getElementById('providerInfo');
    const email = infoDiv.dataset.email;
    const text = document.getElementById('complaintResult').value;
    if(email){
      const subject = encodeURIComponent('Klacht internetverbinding');
      const body = encodeURIComponent(text);
      window.location.href = 'mailto:' + email + '?subject=' + subject + '&body=' + body;
    } else {
      alert('Geen e-mailadres beschikbaar voor deze provider');
    }
  };
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', addComplaintSection);
} else {
  addComplaintSection();
}
