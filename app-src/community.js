/* In-app Community/Feedback panels; current editor API and private feedback delivery. */
(()=>{
'use strict';
const root=document.getElementById('circuit-editor'),work=root.querySelector('.work');
const panel=document.getElementById('community-panel'),feedbackPanel=document.getElementById('feedback-panel');
work.append(panel,feedbackPanel);
const phone=matchMedia('(max-width:760px)');
function panelToggle(id,label,controls,parent){const button=document.createElement('button');button.type='button';button.id=id;button.className='head-button';button.textContent=label;button.setAttribute('aria-controls',controls);parent.append(button);return button;}
const communityButton=panelToggle('community-toggle','Community','community-panel',root.querySelector('.app-head'));
const feedbackButton=panelToggle('feedback-toggle','Feedback','feedback-panel',root.querySelector('.app-head'));
root.querySelector('[data-host="setup-toggle"]').after(communityButton,feedbackButton);
const dock=root.querySelector('.mobile-dock');
const dockButton=panelToggle('community-dock','Community','community-panel',dock),feedbackDock=panelToggle('feedback-dock','Feedback','feedback-panel',dock);
const resizer=document.createElement('div');resizer.id='community-resizer';resizer.className='panel-resizer community-resizer';resizer.tabIndex=0;resizer.setAttribute('role','separator');resizer.setAttribute('aria-label','Resize community panel');resizer.setAttribute('aria-orientation','vertical');work.append(resizer);
let sidePanel=null;
function setSidePanel(name){
  if(name&&phone.matches)root.querySelector('[data-dock="canvas"]')?.click();
  sidePanel=name;panel.hidden=name!=='community';feedbackPanel.hidden=name!=='feedback';resizer.hidden=!name;work.classList.toggle('community-hidden',!name);
  resizer.setAttribute('aria-label',name==='feedback'?'Resize feedback panel':'Resize community panel');
  if(phone.matches){if(name)root.querySelectorAll('[data-dock]').forEach(b=>b.classList.remove('active'));else if(!root.querySelector('[data-dock].active'))root.querySelector('[data-dock="canvas"]').classList.add('active');}
  for(const [button,key]of [[communityButton,'community'],[dockButton,'community'],[feedbackButton,'feedback'],[feedbackDock,'feedback']]){button.setAttribute('aria-pressed',String(name===key));button.classList.toggle('active',name===key);}
}
function setCommunity(shown){setSidePanel(shown?'community':null);}
communityButton.onclick=dockButton.onclick=()=>setSidePanel(sidePanel==='community'?null:'community');
feedbackButton.onclick=feedbackDock.onclick=()=>setSidePanel(sidePanel==='feedback'?null:'feedback');
new MutationObserver(()=>{if(phone.matches&&sidePanel)root.querySelectorAll('[data-dock].active').forEach(b=>b.classList.remove('active'));}).observe(dock,{subtree:true,attributes:true,attributeFilter:['class']});
panel.querySelector('#close-community').onclick=()=>{setSidePanel(null);communityButton.focus();};
feedbackPanel.querySelector('#close-feedback').onclick=()=>{setSidePanel(null);feedbackButton.focus();};
dock.addEventListener('click',event=>{if(event.target.closest('[data-dock]')&&phone.matches)setSidePanel(null);});
for(const button of root.querySelectorAll('[data-host="setup-toggle"],#ed-inspector-toggle'))button.addEventListener('click',()=>{if(phone.matches)setSidePanel(null);});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.querySelector('dialog[open]')&&sidePanel)setSidePanel(null);});
setCommunity(false);
const widthKey='inertance-community-panel-width';
function setPanelWidth(value){const width=Math.round(Math.max(250,Math.min(480,value)));work.style.setProperty('--community-width',width+'px');resizer.setAttribute('aria-valuenow',String(width));resizer.setAttribute('aria-valuemin','250');resizer.setAttribute('aria-valuemax','480');try{localStorage.setItem(widthKey,String(width));}catch{}}
try{setPanelWidth(+localStorage.getItem(widthKey)||320);}catch{setPanelWidth(320);}
let resizeDrag=null;
resizer.addEventListener('pointerdown',event=>{resizeDrag={x:event.clientX,width:(sidePanel==='feedback'?feedbackPanel:panel).getBoundingClientRect().width};resizer.setPointerCapture(event.pointerId);event.preventDefault();});
resizer.addEventListener('pointermove',event=>{if(resizeDrag)setPanelWidth(resizeDrag.width+resizeDrag.x-event.clientX);});
for(const name of ['pointerup','pointercancel'])resizer.addEventListener(name,event=>{resizeDrag=null;if(resizer.hasPointerCapture(event.pointerId))resizer.releasePointerCapture(event.pointerId);});
resizer.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const width=(sidePanel==='feedback'?feedbackPanel:panel).getBoundingClientRect().width;setPanelWidth(event.key==='Home'?250:event.key==='End'?480:width+(event.key==='ArrowLeft'?12:-12));});

const $ = id => document.getElementById(id);
const D = window.CircuitDocument;
const storageKey = 'inertance-community-exploration-v1';
let readable=true;
let seeds = [], queue = [], latestDraft = null;
const termsVersion = '2026-10-12';

const notice = (id, text, error = false) => { $(id).textContent = text; $(id).classList.toggle('error', error); };
const node = (tag, text, className) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (className) el.className = className; return el; };
const action = (text, run, className = '') => { const b = node('button', text, className); b.type = 'button'; b.onclick = run; return b; };

const builtIns=Object.entries(EditorPresets.names).map(([value,title])=>({value,title,group:value==='memristor'?'Memristor':value==='transformer'?'Examples':'Converters',document:D.validate(EditorPresets.create(value))}));
for(const [value,title]of Object.entries({buffer:'Capacitor buffer',freewheel:'Inductor + diode',meters:'Load + meters'}))builtIns.push({value,title,group:'Examples',document:EditorExampleLayouts.create(value)});
function circuitSignature(doc){
  const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
  const components=doc.components.map(({x,y,rotation,windingSides,windingFlowSigns,windingFlips,...c})=>c).sort((a,b)=>a.id.localeCompare(b.id));
  const wires=doc.wires.map(({id,from,to})=>({id,from,to})).sort((a,b)=>a.id.localeCompare(b.id));
  const {travel,colorReference,model,...settings}=doc.settings;
  return JSON.stringify(canonical({components,wires,settings}));
}
let workspaceOrigin=null;
function currentIdentity(doc){return builtIns.find(c=>circuitSignature(c.document)===circuitSignature(doc))||null;}
root.addEventListener('circuit-editor:change',()=>{const info=window.circuitEditor.schematic;workspaceOrigin=info.kind==='example'?{title:info.name,group:builtIns.find(c=>c.value===info.key)?.group}:null;});
function download(name, content, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type })), link = node('a');
  link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function store() {
  try { if(!readable)throw Error('Existing drafts unreadable');localStorage.setItem(storageKey, JSON.stringify(queue)); return true; }
  catch { notice('review-status', 'Browser storage is unavailable or full. Changes remain in memory until this page closes.', true); return false; }
}
function restore() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (!Array.isArray(stored) || stored.length > 40) throw Error('Invalid local queue.');
    queue = stored.map(item => {
      if (!item || !['pending', 'approved', 'rejected'].includes(item.state) || typeof item.id !== 'string' || !['title','author','description','category'].every(key => typeof item[key] === 'string') || !['Storage','Switching','Converters','Other'].includes(item.category)) throw Error('Invalid saved contribution.');
      return { ...item, document: D.validate(item.document) };
    });
  } catch { readable=false;queue = []; notice('review-status', 'Saved drafts could not be read. Existing browser data is retained; use downloads to keep new drafts.', true); }
}
// Contact and consent metadata belong to the local review record, never to a
// public gallery entry or sharing export. This demo has no owner authentication.
const gallery = () => [...seeds, ...queue.filter(c => c.state === 'approved').map(({id,title,author,description,category,document}) => ({id,title,author,description,category,document,origin: 'Approved in this browser only · simulated', file: null}))];
const previewCache=new WeakMap();
function schematicPreview(doc,title){
  if(previewCache.has(doc)){const copy=previewCache.get(doc).cloneNode(true);copy.setAttribute('aria-label',title+' schematic preview');return copy;}
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('schematic-preview');svg.setAttribute('role','img');svg.setAttribute('aria-label',title+' schematic preview');
  const shape=(tag,attrs,parent=svg)=>{const el=document.createElementNS(svg.namespaceURI,tag);for(const[key,value]of Object.entries(attrs))el.setAttribute(key,value);parent.append(el);return el;};
  const routes=CircuitRouting.routeAll(doc),boxes=doc.components.map(c=>D.bounds(c));
  const points=routes.flatMap(r=>r.points).concat(boxes.flatMap(b=>[{x:b.x,y:b.y},{x:b.x+b.w,y:b.y+b.h}]));
  const minX=Math.min(...points.map(p=>p.x))-40,minY=Math.min(...points.map(p=>p.y))-40,maxX=Math.max(...points.map(p=>p.x))+40,maxY=Math.max(...points.map(p=>p.y))+60;
  svg.setAttribute('viewBox',`${minX} ${minY} ${maxX-minX} ${maxY-minY}`);
  for(const route of routes){const d=CircuitRouting.path(route.points);shape('path',{d,fill:'none',stroke:'var(--c-ink)','stroke-width':13,'stroke-linecap':'round','stroke-linejoin':'round',...(route.failed?{'stroke-dasharray':'15 10'}:{})});shape('path',{d,fill:'none',stroke:'#73baf0','stroke-width':9,'stroke-linecap':'round','stroke-linejoin':'round'});}
  for(const c of doc.components){
    const g=shape('g',{transform:`translate(${c.x} ${c.y}) rotate(${c.rotation})`,'data-preview-component':c.id});
    const path=d=>shape('path',{d,fill:'var(--c-panel)',stroke:'var(--c-ink)','stroke-width':3,'stroke-linejoin':'round'},g);
    const circle=(x,y,r,fill='#a4d7fa')=>shape('circle',{cx:x,cy:y,r,fill,stroke:'var(--c-ink)','stroke-width':3},g);
    const text=(x,y,label,parent=g)=>{const el=shape('text',{x,y,fill:'var(--c-ink)','font-size':18,'text-anchor':'middle'},parent);el.textContent=label;return el;};
    if(c.type==='junction')circle(0,0,7,'#73baf0');
    else if(c.type==='source'){path('M0 -40 V-24 M0 24 V40');circle(0,0,25);text(0,6,'M').setAttribute('transform',`rotate(${-c.rotation})`);}
    else if(c.type==='resistor'){path('M-40 -6 H-28 L-12 -2 H12 L28 -6 H40 V6 H28 L12 2 H-12 L-28 6 H-40 Z');path('M-12 -8 L-8 8 L-4 -8 L0 8 L4 -8 L8 8 L12 -8');}
    else if(c.type==='capacitor'){path('M0 -60 V-41 M0 41 V60');shape('rect',{x:-30,y:-41,width:60,height:82,fill:'#a4d7fa',stroke:'var(--c-ink)','stroke-width':3},g);path('M-29 -15 H29 M0 -10 V0 L-8 5 L8 15 L-8 25 L0 32 V38');}
    else if(c.type==='inductor'){path('M-20 -60 V-40 M20 -60 V-40');circle(0,0,46);circle(0,0,20,'var(--c-soft)');text(0,6,'J').setAttribute('transform',`rotate(${-c.rotation})`);}
    else if(c.type==='switch'||c.type==='diode'){const reach=c.type==='switch'?30:35;path(`M0 ${-reach} V${reach}`);circle(0,0,18,'var(--c-panel)');path(c.type==='switch'?'M-13 -8 L13 8':'M-12 -8 L12 8 M-12 8 H12');}
    else if(c.type.startsWith('coupled')){for(const winding of D.windingGeometry(c)){circle(winding.x,winding.y,winding.r);circle(winding.x,winding.y,15,'var(--c-soft)');}for(const name of Object.keys(D.types[c.type].ports)){const[x,y]=D.windingPort(c,name);circle(x,y,5,'#73baf0');}}
    else{const[w,h]=D.types[c.type].size;shape('rect',{x:-w/2,y:-h/2,width:w,height:h,rx:10,fill:'var(--c-soft)',stroke:'var(--c-ink)','stroke-width':3},g);text(0,6,D.types[c.type].label.split(' ')[0]);}
    if(c.type!=='junction'){const box=D.bounds(c),label=shape('text',{x:c.x,y:box.y+box.h+23,fill:'var(--c-muted)','font-size':17,'text-anchor':'middle'});label.textContent=c.id;}
  }
  previewCache.set(doc,svg.cloneNode(true));return svg;
}
function renderGallery() {
  const query = $('search').value.trim().toLowerCase();
  const matches = gallery().filter(c => [c.title,c.description,c.author,c.category].join(' ').toLowerCase().includes(query));
  $('cards').replaceChildren(); $('result-count').textContent = `${matches.length} circuit${matches.length === 1 ? '' : 's'}`;
  for(const c of matches) {
    const card=node('article',undefined,'card'),body=node('div',undefined,'card-body'),actions=node('div',undefined,'actions');
    body.append(schematicPreview(c.document,c.title),node('span',c.category,'tag'),node('h3',c.title),node('p',c.description),node('small',c.file?'Inertance built-in · demo starter':'Approved locally'));
    actions.append(action('Open',()=>showCircuit(c),'primary'),action('Download',()=>download(c.id+'.json',JSON.stringify(c.document,null,2)),'download'));
    body.append(actions);card.append(body);$('cards').append(card);
  }
  if(!matches.length) $('cards').append(node('p','No circuits match. Try another search or category.','empty'));
}
function showCircuit(c) {
  try {
    root.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    if(window.circuitEditor.playing) $('ed-play').click();
    window.circuitEditor.load(D.clone(c.document),{name:c.title});
    notice('community-status','Opened '+c.title+'. Undo restores your previous circuit.');
    setCommunity(!phone.matches);
  } catch(error){notice('community-status','Could not open: '+error.message,true);}
}
$('search').oninput=renderGallery;
function openContribution(){
  const email=$('submission-email').value,author=$('submission-author').value;
  $('submission-form').reset();$('submission-email').value=email;$('submission-author').value=author;
  $('submission-options').open=false;$('submission-source-options').open=false;
  useCurrentCircuit();latestDraft=null;$('submission-result').hidden=true;notice('submission-status','');
  const doc=window.circuitEditor.document,identity=currentIdentity(doc);
  $('submission-title').value=doc.components.length?(identity?.title||(workspaceOrigin?workspaceOrigin.title+' — modified':'')):'';
  if((identity||workspaceOrigin)?.group==='Converters')$('submission-category').value='Converters';
  $('contribution-dialog').showModal();
}
$('share-button').onclick=openContribution;
const saveCommunity=action('Save to community…',openContribution);saveCommunity.id='ed-save-community';
const fileMenu=$('ed-save').closest('details');
$('ed-save').after(saveCommunity);
saveCommunity.addEventListener('click',()=>{fileMenu.open=false;});
$('close-contribution').onclick=()=>$('contribution-dialog').close();
$('view-review').onclick=()=>{$('contribution-dialog').close();setCommunity(true);$('review').open=true;const content=panel.querySelector('.community-content');content.scrollTo({top:$('review').offsetTop-content.offsetTop,behavior:'smooth'});};
function revealHash(){const section=$(location.hash.slice(1));if(section?.tagName==='DETAILS'){setCommunity(true);section.open=true;}}
window.addEventListener('hashchange',revealHash);revealHash();
function useCurrentCircuit(){
  $('submission-json').value=JSON.stringify(window.circuitEditor.document,null,2);$('submission-file').value='';
  $('file-note').textContent='Using current circuit. No JSON upload needed.';updateSubmissionSource('current');
}
function sourceAssessment(doc){
  if(!doc.components.length)return{allowed:false,text:'Blank circuit. Add components first, or choose a JSON file below.'};
  const signature=circuitSignature(doc),builtin=builtIns.find(c=>circuitSignature(c.document)===signature);
  if(builtin)return{allowed:false,text:'Unmodified built-in: '+builtin.title+'. Make it your own before sharing, or choose another JSON file.'};
  const existing=gallery().find(c=>circuitSignature(c.document)===signature);
  if(existing)return{allowed:false,text:'Unmodified community schematic: '+existing.title+'. Change the circuit before submitting another copy.'};
  return{allowed:true,text:workspaceOrigin?'Modified circuit based on '+workspaceOrigin.title+'.':'New custom circuit.'};
}
function updateSubmissionSource(source){
  $('submission-json').dataset.source=source;
  try{const doc=D.validate(JSON.parse($('submission-json').value)),assessment=sourceAssessment(doc);$('submission-source-note').textContent=source==='json'&&assessment.allowed?'Optional JSON · '+doc.components.length+' components. This file replaces the current workspace in your submission.':(source==='current'?'Current workspace · ':'Optional JSON · ')+assessment.text;$('save-submission').disabled=!assessment.allowed;}
  catch{$('submission-source-note').textContent='Optional JSON selected. Its structure will be checked when you save.';$('save-submission').disabled=false;}
}
$('submission-json').addEventListener('input',()=>updateSubmissionSource('json'));
$('use-example').onclick=useCurrentCircuit;
$('submission-file').onchange=async()=>{
  const file=$('submission-file').files[0];if(!file)return;
  if(file.size>100000){notice('submission-status','Choose a circuit JSON file smaller than 100 KB.',true);$('submission-file').value='';return;}
  try{$('submission-json').value=await file.text();$('file-note').textContent=file.name+' selected instead of the current circuit.';updateSubmissionSource('json');}catch(error){notice('submission-status','Could not read the file: '+error.message,true);}
};
function contributionMarkdown(item) {
  // Full circuit is in a fenced JSON block, never in a long URL query.
  return `# ${item.title}\n\nBy: ${item.author}\nCategory: ${item.category}\n\n${item.description}\n\n${item.termsVersion===termsVersion ? "Local draft terms: 2026-10-12. Proposed future submission licences: CC BY-SA 4.0 for schematic data/explanation; AGPL-3.0-or-later for separately identified code. You retain your rights. Identify authors, third-party sources/licences and AI assistance. Licence links: https://creativecommons.org/licenses/by-sa/4.0/ and https://inertance.org/LICENSE. Project has received no submission or grant. Private contact is excluded." : "Historical draft: original permission to share only. No new licence acceptance is inferred."}\n\nCircuit format: Inertance schemaVersion 1 (structural validation only).\nPlease review electrical behavior, explanation, attribution and reuse permission before publication.\n\n\`\`\`json\n${JSON.stringify(item.document,null,2)}\n\`\`\`\n\nPrepared locally. This draft has not been sent to GitHub or Lucas.\n`;
}
$('submission-form').onsubmit=e=>{
  e.preventDefault();latestDraft=null;$('submission-result').hidden=true;try{
    if(!$('submission-form').reportValidity())return;
    if(queue.length>=40)throw Error('This small demo holds 40 local drafts. Clear local data to start again.');
    if($('submission-json').value.length>100000)throw Error('Limit the circuit file to 100 KB.');
    const doc=D.validate(JSON.parse($('submission-json').value));
    const assessment=sourceAssessment(doc);if(!assessment.allowed)throw Error(assessment.text);
    const title=$('submission-title').value.trim(),author=$('submission-author').value.trim(),description=$('submission-description').value.trim(),contactEmail=$('submission-email').value.trim();
    if(!title||!author||description.length<10)throw Error('Add a title, display name and explanation of at least 10 characters.');
    const item={id:'draft-'+crypto.randomUUID(),title,author,description,category:$('submission-category').value,document:doc,state:'pending',contactEmail,termsVersion,termsAcceptedAt:new Date().toISOString()};
    queue.push(item);latestDraft=item;const saved=store();renderReview();$('submission-result').hidden=false;
    notice('submission-status',`Structure valid: ${doc.components.length} components, ${doc.wires.length} wires. ${saved?'Draft saved in this browser.':'Draft held in memory only.'} Electrical correctness still needs review.`);
  }catch(error){notice('submission-status','Draft not created: '+error.message,true);}
};
$('download-submission').onclick=()=>{if(latestDraft)download('community-circuit-draft.md',contributionMarkdown(latestDraft),'text/markdown');};
function renderReview(){
  $('queue-count').textContent=queue.filter(c=>c.state==='pending').length;$('review-items').replaceChildren();
  if(!queue.length){$('review-items').append(node('p','No local drafts yet. Create a contribution above to try the review flow.','empty'));return;}
  for(const c of queue){
    const item=node('article',undefined,'review-item'),text=node('div'),actions=node('div',undefined,'actions');
    text.append(node('h3',c.title),node('p',`${c.author} · ${c.category} · ${c.state === 'approved' ? 'Approved locally' : c.state === 'rejected' ? 'Declined locally' : 'Awaiting simulated review'}`),node('p',c.description));
    text.append(node('p',typeof c.contactEmail==='string'?'Review contact (local demo): '+c.contactEmail:'Older draft · contact email not collected.'));
    actions.append(action('Open',()=>showCircuit({...c,origin:'Local draft · not sent'})));
    if(c.state==='pending'){
      const change=state=>{c.state=state;const saved=store();renderReview();renderGallery();notice('review-status',`${state==='approved'?'Added to this browser’s gallery.':'Declined in this browser.'} ${saved?'Saved locally.':'Held in memory only.'} No GitHub or public site change.`);};
      actions.append(action('Approve locally',()=>change('approved'),'primary'),action('Decline locally',()=>change('rejected')));
    }
    item.append(text,actions);$('review-items').append(item);
  }
}
$('reset-local').onclick=()=>{try{localStorage.removeItem(storageKey);}catch{}queue=[];latestDraft=null;$('submission-result').hidden=true;renderReview();renderGallery();notice('review-status','This demo’s draft queue was cleared. Live app preferences were not changed.');};
let feedbackSending=false,feedbackAttempt=null;
const feedbackInputs=[$('feedback-kind'),$('feedback-title'),$('feedback-body'),$('feedback-email')];
feedbackInputs.forEach(input=>input.addEventListener('input',()=>{if(!feedbackSending){feedbackAttempt=null;$('feedback-result').hidden=true;}}));
$('feedback-form').onsubmit=async e=>{
  e.preventDefault();if(feedbackSending)return;
  const title=$('feedback-title').value.trim(),message=$('feedback-body').value,email=$('feedback-email').value.trim(),bug=$('feedback-kind').value==='bug';
  $('feedback-result').hidden=false;
  if(!title||!message.trim()){notice('feedback-status','Add a title and a message.',true);return;}
  const form=$('feedback-form');if(!form.reportValidity())return;
  const payload={name:'Inertance visitor',topic:bug?'Bug report':'Suggestion',title,message,_subject:'Inertance feedback · '+(bug?'Bug: ':'Suggestion: ')+title,_template:'table',_url:location.origin+location.pathname,_honey:form.elements._honey.value,...(email?{email,_replyto:email}:{})};
  const key=JSON.stringify(payload);if(feedbackAttempt?.key===key&&feedbackAttempt.sent){notice('feedback-status','This message has already been sent. Edit it to send another.');return;}
  feedbackSending=true;const button=$('send-feedback');button.disabled=true;button.textContent='Sending…';feedbackInputs.forEach(input=>input.readOnly=true);$('feedback-kind').disabled=true;
  notice('feedback-status','Sending your feedback…');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),60000);
  try{
    const response=await fetch(form.action,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload),credentials:'omit',referrerPolicy:'strict-origin',signal:controller.signal});
    const result=await response.json();
    // FormSubmit can return HTTP 200 with the string "false"; that is not success.
    if(!response.ok||(result.success!==true&&result.success!=='true')){
      if(/activat/i.test(result.message||''))throw Error('Feedback delivery is awaiting inbox activation. Your message is still here; please try again after setup is complete.');
      throw Error('Feedback could not be sent. Your message is still here; please try again.');
    }
    feedbackAttempt={key,sent:true};notice('feedback-status','Feedback sent. Thank you!'+(email?' Lucas can reply to the email you provided.':''));
  }catch(error){notice('feedback-status',error.name==='AbortError'?'Delivery could not be confirmed. Your message is still here. Wait a moment before trying again.':error.message.includes('inbox activation')?error.message:'Could not send feedback. Your message is still here; please try again.',true);}
  finally{clearTimeout(timer);feedbackSending=false;button.disabled=false;button.textContent='Send feedback';feedbackInputs.forEach(input=>input.readOnly=false);$('feedback-kind').disabled=false;}
};
async function start(){
  try{
    const response=await fetch(new URL('community/gallery.json',location.href));if(!response.ok)throw Error('Gallery manifest unavailable.');
    const manifest=await response.json();
    seeds=await Promise.all(manifest.map(async c=>{const response=await fetch(new URL('community/'+c.file,location.href));if(!response.ok)throw Error('Circuit unavailable: '+c.id);return{...c,document:D.validate(await response.json())};}));
    restore();renderGallery();renderReview();
  }catch(error){$('cards').replaceChildren(node('p','Could not load gallery: '+error.message+'. Serve the dist folder over HTTP.','empty'));}
}
start();

})();
