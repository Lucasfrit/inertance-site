// Privacy/consent regression checks. Every network request is intercepted;
// no synthetic events are sent to either provider or the published websites.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT || path.join(process.env.HOME, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root = path.resolve(__dirname, '..');
const fixture = name => fs.readFileSync(path.join(root, '../cwas/simulator/import-fixtures', name), 'utf8');
const key = 'inertance-analytics-consent';
const endpoint = 'https://gateway.umami.is/api/send';
const posthogEndpoint = 'https://eu.i.posthog.com/i/v0/e/';
const defaultConfig = JSON.parse(fs.readFileSync(path.join(root,'app-src/analytics/config.json'),'utf8'));
const out = path.join(__dirname, 'out'); fs.mkdirSync(out, { recursive:true });
const cors = {'access-control-allow-origin':'*'};
(async () => {
  const browser = await chromium.launch({channel:'chrome', headless:true});
  const contexts = [];
  const records = [], pairs = new WeakMap();
  async function open({host='inertance.org', pathName='/app/?email=PRIVATE_QUERY#PRIVATE_HASH', signal, stored, config, fail=false, posthogFail=false, mobile=false, noStorage=false, hold=false}={}) {
    const context = await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000}}); contexts.push(context);
    await context.addInitScript(({signal,stored,key,noStorage,hold,endpoint,posthogEndpoint}) => {
      if (hold) { const original=window.fetch; window.analyticsSignals=[]; window.fetch=(url,options)=>[endpoint,posthogEndpoint].includes(url)?(window.analyticsSignals.push(options.signal),new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError'))))):original(url,options); }
      if (signal === 'dnt') Object.defineProperty(navigator,'doNotTrack',{get:()=> '1'});
      if (signal === 'gpc') Object.defineProperty(navigator,'globalPrivacyControl',{get:()=>true});
      if (stored) localStorage.setItem(key, JSON.stringify(stored));
      if (noStorage) { Storage.prototype.getItem = () => {throw Error('blocked')}; Storage.prototype.setItem = () => {throw Error('blocked')}; }
    },{signal,stored,key,noStorage,hold,endpoint,posthogEndpoint});
    const hits = [], posthogHits = [], errors = [];
    await context.route('**/*', async route => {
      const req=route.request(),url=new URL(req.url());
      if ([endpoint,posthogEndpoint].includes(req.url())) {
        if (req.method()==='OPTIONS') return route.fulfill({status:200,headers:{...cors,'access-control-allow-methods':'POST','access-control-allow-headers':'content-type'}});
        const isPosthog=req.url()===posthogEndpoint;
        (isPosthog?posthogHits:hits).push({body:req.postDataJSON(),headers:await req.allHeaders()});
        if (isPosthog?posthogFail:fail) return route.abort('failed');
        return route.fulfill({status:200,headers:cors,json:{cache:'DO_NOT_STORE',sessionId:'DO_NOT_STORE',visitId:'DO_NOT_STORE'}});
      }
      assert.equal(url.hostname,host,'no unapproved external requests, including tracker SDKs');
      let relative=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
      const file=path.join(root,relative); assert(file.startsWith(root+path.sep));
      if (!fs.existsSync(file)) return route.fulfill({status:404,body:''});
      let body=fs.readFileSync(file);
      const ext=path.extname(file);
      if (host.includes('hydraulicanalogy') && ['.html','.js','.css','.svg'].includes(ext)) body=Buffer.from(body.toString().replaceAll('https://inertance.org','https://hydraulicanalogy.com'));
      if (url.pathname.endsWith('/analytics/config.js') && config !== undefined) body=Buffer.from('window.InertanceAnalyticsConfig='+JSON.stringify(typeof config==='object'?config:{website:config}));
      return route.fulfill({status:200,body,contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[ext]||'text/plain'});
    });
    const page=await context.newPage(); page.on('pageerror',e=>errors.push(e.message)); page.setDefaultTimeout(60000);
    await page.goto('https://'+host+pathName); if(pathName.startsWith('/app/')) await page.waitForFunction(()=>!!window.circuitEditor);
    const result = {page,context,hits,posthogHits,errors,config}; records.push(result);
    if (config === undefined) pairs.set(hits,posthogHits);
    return result;
  }
  const settings=async page=>{if(await page.locator('[data-analytics-settings]').isHidden())await page.locator('.menu > summary').filter({hasText:'Help'}).click();await page.click('[data-analytics-settings]');};
  const action=async(page,id)=>page.evaluate(id=>document.getElementById(id).click(),id);
  const settle=async page=>{await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));};
  const waitHits=async(hits,n)=>{const other=pairs.get(hits);for(let i=0;i<100 && (hits.length<n || (other && other.length<n));i++)await new Promise(r=>setTimeout(r,20));assert.equal(hits.length,n);if(other)assert.equal(other.length,n);};
  try {
    const denied=await open(); await denied.page.selectOption('#ed-converter','boost',{force:true}); await action(denied.page,'ed-play'); await settle(denied.page);
    assert.equal(denied.hits.length,0,'nothing before consent, including initial preset and Run');
    await denied.page.click('[data-analytics-reject]'); await denied.page.reload(); await settle(denied.page);
    assert(await denied.page.locator('.analytics-panel').isHidden()); assert.equal(denied.hits.length,0,'decline survives reload');
    const t=await open(); const p=t.page;
    await p.selectOption('#ed-converter','boost',{force:true}); await p.click('[data-analytics-allow]'); await waitHits(t.hits,1);
    assert.equal(t.hits[0].body.payload.name,undefined,'only pageview; no pre-consent action history');
    await action(p,'ed-play'); await waitHits(t.hits,2); await action(p,'ed-play'); await action(p,'ed-play'); await settle(p);assert.equal(t.hits.length,2,'first actual playback only');
    await p.selectOption('#ed-converter','buck',{force:true}); await waitHits(t.hits,3); assert.equal(t.hits[2].body.payload.name,'preset_buck');
    await action(p,'ed-model-ideal'); await waitHits(t.hits,4);assert.equal(t.hits[3].body.payload.name,'mode_ideal');
    await p.evaluate(()=>circuitEditor.setTiming({duration:.02}));await waitHits(t.hits,5);assert.equal(t.hits[4].body.payload.name,'circuit_edited');
    await p.evaluate(()=>circuitEditor.setTiming({duration:.025}));await settle(p);assert.equal(t.hits.length,5,'first edit only');
    await action(p,'ed-default-view');await waitHits(t.hits,6);assert.equal(t.hits[5].body.payload.name,'changes_discarded');
    await action(p,'ed-arrange');await p.waitForFunction(()=>!circuitEditor.arranging);await waitHits(t.hits,7);assert.equal(t.hits[6].body.payload.name,'arrange_completed');
    await action(p,'ed-load');await p.fill('#ed-json','PRIVATE_INVALID_JSON');await p.click('#ed-import');await waitHits(t.hits,8);assert.equal(t.hits[7].body.payload.name,'import_json_apply_failed');await p.click('#ed-close-transfer');
    await action(p,'ed-external-open');await p.fill('#ed-external-text',fixture('ltspice-rc.cir')+'\n* PRIVATE_PASTED_CONTENT');await p.click('#ed-external-preview');await p.waitForFunction(()=>!document.getElementById('ed-external-apply').disabled);await waitHits(t.hits,9);assert.equal(t.hits[8].body.payload.name,'import_spice_preview_success');await p.click('#ed-external-apply');await waitHits(t.hits,10);assert.equal(t.hits[9].body.payload.name,'import_spice_applied');
    await action(p,'ed-save');await p.click('#ed-download');await waitHits(t.hits,11);assert.equal(t.hits[10].body.payload.name,'export_json_download');await p.click('#ed-close-transfer');
    // Filename and native-netlist text stay local; changing format is not an event.
    await action(p,'ed-external-open');await p.setInputFiles('#ed-external-file',{name:'PRIVATE_FILENAME.net',mimeType:'text/plain',buffer:Buffer.from(fixture('kicad-rc.net'))});await p.waitForFunction(()=>document.getElementById('ed-external-report').textContent.includes('Read PRIVATE_FILENAME'));await p.click('#ed-external-preview');await p.waitForFunction(()=>!document.getElementById('ed-external-apply').disabled);await waitHits(t.hits,12);assert.equal(t.hits[11].body.payload.name,'import_kicad_preview_success');await p.click('#ed-external-apply');await waitHits(t.hits,13);
    await action(p,'ed-external-open');await p.fill('#ed-external-text',fixture('unsupported.cir'));await p.click('#ed-external-preview');await p.waitForFunction(()=>document.getElementById('ed-external-report').textContent.includes('Import blocked'));await waitHits(t.hits,14);assert.equal(t.hits[13].body.payload.name,'import_spice_preview_failed');await p.click('#ed-external-close');
    await p.evaluate(()=>document.getElementById('circuit-editor').dispatchEvent(new CustomEvent('circuit-editor:action',{detail:{name:'PRIVATE_ARBITRARY_EVENT',data:'PRIVATE_DATA'}})));await settle(p);assert.equal(t.hits.length,14,'unknown events rejected');
    for (const hit of t.hits) {
      assert.deepEqual(Object.keys(hit.body).sort(),['payload','type']);assert.equal(hit.body.type,'event');
      assert.deepEqual(Object.keys(hit.body.payload).sort(),hit.body.payload.name?['hostname','name','url','website']:['hostname','url','website']);
      assert.equal(hit.body.payload.url,'/app/');assert.equal(hit.body.payload.hostname,'inertance.org');
      assert.equal(hit.headers.referer,undefined);assert.equal(hit.headers.cookie,undefined);assert(!JSON.stringify(hit.body).includes('PRIVATE_'));
    }
    assert(!(await p.evaluate(()=>JSON.stringify({...localStorage}))).includes('DO_NOT_STORE'));
    const id=t.posthogHits[0].body.distinct_id;
    assert(t.posthogHits.every(hit=>hit.body.distinct_id===id),'anonymous ID groups actions within this page');
    assert(!(await p.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}))).includes(id),'anonymous ID is never persisted');
    assert.deepEqual(await t.context.cookies(),[],'no analytics cookies');
    await settings(p);await p.screenshot({path:path.join(out,'analytics-desktop.png')});await p.click('[data-analytics-reject]');await action(p,'ed-play');await p.selectOption('#ed-converter','boost',{force:true});await settle(p);assert.equal(t.hits.length,14,'withdrawal stops future requests');
    await p.reload();await settle(p);assert.equal(t.hits.length,14,'withdrawal persists');
    // A second same-origin tab accepts stored consent and reacts to withdrawal.
    const cross=await open({stored:{version:2,value:'accepted',time:Date.now()}});await waitHits(cross.hits,1);
    const second=await cross.context.newPage();await second.goto('https://inertance.org/app/');await waitHits(cross.hits,2);await cross.page.evaluate(key=>localStorage.setItem(key,JSON.stringify({version:2,value:'rejected',time:Date.now()})),key);await settle(second);await action(second,'ed-play');await settle(second);assert.equal(cross.hits.length,2,'cross-tab withdrawal');
    for (const signal of ['dnt','gpc']) {const s=await open({signal,stored:{version:2,value:'accepted',time:Date.now()}});await settings(s.page);assert(await s.page.locator('[data-analytics-allow]').isDisabled());await action(s.page,'ed-play');await settle(s.page);assert.equal(s.hits.length,0,signal+' vetoes consent');}
    for (const stored of [{version:2,value:'accepted',time:Date.now()-181*86400000},{version:0,value:'accepted',time:Date.now()},{version:2,value:'accepted',time:Date.now()+86400000}]) {const expired=await open({stored});assert(await expired.page.locator('.analytics-panel').isVisible());assert.equal(expired.hits.length,0);}
    const mobile=await open({mobile:true,host:'hydraulicanalogy.com'});assert(await mobile.page.locator('.analytics-panel').isVisible());assert(await mobile.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await mobile.page.screenshot({path:path.join(out,'analytics-phone.png')});await mobile.page.click('[data-analytics-allow]');await waitHits(mobile.hits,1);assert.equal(mobile.hits[0].body.payload.hostname,'hydraulicanalogy.com');await mobile.page.click('#ed-play');await waitHits(mobile.hits,2);
    const about=await open({pathName:'/about/',stored:{version:2,value:'accepted',time:Date.now()}});await waitHits(about.hits,1);assert.equal(about.hits[0].body.payload.url,'/about/');await settings(about.page);await about.page.locator('[data-analytics-close]').press('Escape');assert(await about.page.locator('.analytics-panel').isHidden());
    const preview=await open({host:'preview.inertance.org',stored:{version:2,value:'accepted',time:Date.now()}});await settle(preview.page);assert.equal(preview.hits.length,0,'unapproved hosts remain disabled');
    const disabled=await open({config:''});await settle(disabled.page);assert.equal(disabled.hits.length,0);assert.equal(await disabled.page.locator('.analytics-panel').count(),0);
    const oldAllow=await open({stored:{version:1,value:'accepted',time:Date.now()}});await settle(oldAllow.page);assert.equal(oldAllow.hits.length,0);assert(await oldAllow.page.locator('.analytics-panel').isVisible(),'Umami-only consent must be renewed');
    const oldDecline=await open({stored:{version:1,value:'rejected',time:Date.now()}});await settle(oldDecline.page);assert.equal(oldDecline.hits.length,0);assert.equal(await oldDecline.page.locator('.analytics-panel').count(),0,'old decline stays off without a new prompt');
    const onlyPosthog=await open({config:{...defaultConfig,website:''},stored:{version:2,value:'accepted',time:Date.now()}});await waitHits(onlyPosthog.posthogHits,1);assert.equal(onlyPosthog.hits.length,0,'Umami can be disabled independently');
    for(const posthog of [{token:'',host:defaultConfig.posthog.host},{...defaultConfig.posthog,token:'phx_PRIVATE_API_KEY'},{...defaultConfig.posthog,host:'https://PRIVATE_HOST.invalid'}]) {
      const onlyUmami=await open({config:{...defaultConfig,posthog},stored:{version:2,value:'accepted',time:Date.now()}});await waitHits(onlyUmami.hits,1);assert.equal(onlyUmami.posthogHits.length,0,'disabled or unsafe PostHog config fails closed');
    }
    const json=await open({stored:{version:2,value:'accepted',time:Date.now()}});await waitHits(json.hits,1);const document=await json.page.evaluate(()=>circuitEditor.document);await json.page.setInputFiles('#ed-file',{name:'PRIVATE_JSON_FILENAME.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(document))});await waitHits(json.hits,2);assert.equal(json.hits[1].body.payload.name,'import_json_applied');assert(!JSON.stringify(json.hits).includes('PRIVATE_'));await json.page.evaluate(()=>{circuitEditor.select('Co');document.querySelector('#ed-inspector').hidden=false;});await json.page.fill('#ed-value','12345');await json.page.locator('#ed-value').press('Tab');await waitHits(json.hits,3);assert.equal(json.hits[2].body.payload.name,'circuit_edited');assert(!JSON.stringify(json.hits).includes('12345'));assert.deepEqual(json.errors,[]);
    // The integrated native preset is a fixed feature event; custom names remain private.
    const memory=await open();await memory.page.selectOption('#ed-converter','memristor',{force:true});await settle(memory.page);
    assert.equal(memory.hits.length,0,'memristor selection before consent stays local');
    await memory.page.click('[data-analytics-allow]');await waitHits(memory.hits,1);
    await memory.page.selectOption('#ed-converter','buck',{force:true});await waitHits(memory.hits,2);
    await memory.page.selectOption('#ed-converter','memristor',{force:true});await waitHits(memory.hits,3);
    assert.equal(memory.hits[2].body.payload.name,'preset_memristor');assert.equal(memory.posthogHits[2].body.event,'preset_memristor');
    await memory.page.evaluate(()=>document.getElementById('circuit-editor').dispatchEvent(new CustomEvent('circuit-editor:action',{detail:{name:'preset_PRIVATE_SCHEMATIC',data:'PRIVATE_DOCUMENT'}})));
    await settle(memory.page);assert.equal(memory.hits.length,3);assert.equal(memory.posthogHits.length,3);
    assert(!JSON.stringify([...memory.hits,...memory.posthogHits]).includes('PRIVATE_'));assert.deepEqual(memory.errors,[]);
    const held=await open({hold:true});await held.page.click('[data-analytics-allow]');assert.equal(await held.page.evaluate(()=>window.analyticsSignals.length),2);await settings(held.page);await held.page.click('[data-analytics-reject]');assert(await held.page.evaluate(()=>window.analyticsSignals.every(signal=>signal.aborted)),'withdrawal aborts both providers');assert.deepEqual(held.errors,[]);
    const bounded=await open({hold:true});await bounded.page.click('[data-analytics-allow]');await bounded.page.evaluate(()=>{for(let i=0;i<100;i++)document.getElementById('circuit-editor').dispatchEvent(new CustomEvent('circuit-editor:action',{detail:{name:'preset_buck'}}));});assert.equal(await bounded.page.evaluate(()=>window.analyticsSignals.length),8,'both providers share the eight-request cap');await settings(bounded.page);await bounded.page.click('[data-analytics-reject]');
    const offline=await open({fail:true});await offline.page.click('[data-analytics-allow]');await action(offline.page,'ed-play');await settle(offline.page);assert(await offline.page.evaluate(()=>circuitEditor.playing),'blocked collector cannot break simulator');assert.deepEqual(offline.errors,[]);
    await waitHits(offline.hits,2);assert.equal(offline.posthogHits[1].body.event,'simulation_started','Umami failure does not suppress PostHog');
    const posthogOffline=await open({posthogFail:true});await posthogOffline.page.click('[data-analytics-allow]');await action(posthogOffline.page,'ed-play');await waitHits(posthogOffline.hits,2);assert.deepEqual(posthogOffline.errors,[],'PostHog failure cannot break Umami or the simulator');
    const renewed=await open();await renewed.page.click('[data-analytics-allow]');await waitHits(renewed.hits,1);const initialId=renewed.posthogHits[0].body.distinct_id;await settings(renewed.page);await renewed.page.click('[data-analytics-reject]');await settings(renewed.page);await renewed.page.click('[data-analytics-allow]');await waitHits(renewed.hits,2);assert.notEqual(renewed.posthogHits[1].body.distinct_id,initialId,'fresh consent creates fresh IDs and a pageview');await renewed.page.reload();await waitHits(renewed.hits,3);assert.notEqual(renewed.posthogHits[2].body.distinct_id,renewed.posthogHits[1].body.distinct_id,'reload never reuses anonymous ID');
    const sessions=await open({stored:{version:2,value:'accepted',time:Date.now()}});await waitHits(sessions.hits,1);await sessions.page.evaluate(()=>{const now=Date.now();Date.now=()=>now+31*60000;document.getElementById('circuit-editor').dispatchEvent(new CustomEvent('circuit-editor:action',{detail:{name:'preset_buck'}}));});await waitHits(sessions.hits,2);assert.notEqual(sessions.posthogHits[0].body.properties.$session_id,sessions.posthogHits[1].body.properties.$session_id,'inactive session rotates after 30 minutes');assert.equal(sessions.posthogHits[0].body.distinct_id,sessions.posthogHits[1].body.distinct_id);
    const storage=await open({noStorage:true});await storage.page.click('[data-analytics-reject]');await storage.page.reload();assert.equal(storage.hits.length,0);assert(await storage.page.locator('.analytics-panel').isVisible(),'blocked storage defaults to off');
    const redirected=await open({pathName:'/'});await redirected.page.waitForURL(url=>url.pathname==='/app/');await settle(redirected.page);assert.equal(redirected.hits.length,0,'redirect does not count a visit');
    assert(!fs.readFileSync(path.join(root,'index.html'),'utf8').includes('assets/analytics'));
    for(const record of records) {
      await settle(record.page);
      if(record.config===undefined) {
        assert.equal(record.posthogHits.length,record.hits.length,'every gate applies to both providers');
        record.posthogHits.forEach((hit,i)=>assert.equal(hit.body.event,record.hits[i].body.payload.name??'$pageview'));
      }
      for(const hit of record.posthogHits) {
        const {body,headers}=hit, props=body.properties;
        assert.deepEqual(Object.keys(body).sort(),['api_key','distinct_id','event','properties']);
        assert.equal(body.api_key,defaultConfig.posthog.token);
        assert.match(body.distinct_id,/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/);
        assert.deepEqual(Object.keys(props).sort(),['$current_url','$geoip_disable','$host','$is_identified','$pathname','$process_person_profile','$session_id']);
        assert.equal(props.$process_person_profile,false);assert.equal(props.$is_identified,false);assert.equal(props.$geoip_disable,true);
        assert.match(props.$session_id,/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
        assert(['inertance.org','hydraulicanalogy.com'].includes(props.$host));assert(['/app/','/about/'].includes(props.$pathname));
        assert.equal(props.$current_url,'https://'+props.$host+props.$pathname);assert.equal(headers.referer,undefined);assert.equal(headers.cookie,undefined);
        assert(!JSON.stringify(body).includes('PRIVATE_'));
      }
    }
    assert.notEqual(cross.posthogHits[0].body.distinct_id,cross.posthogHits[1].body.distinct_id,'separate tabs use separate IDs');
    assert.deepEqual(t.errors,[]);console.log('Analytics: consent, withdrawal, privacy signals, bounded payloads, semantic actions, mirror, mobile, failures and redirects passed. No public events sent.');
  } finally {for(const c of contexts)await c.close();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
