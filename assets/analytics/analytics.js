/* Optional Umami/PostHog collection. No SDK, circuit data, persistent IDs or event queue. */
(() => {
  'use strict';
  const website = window.InertanceAnalyticsConfig?.website;
  const posthog = window.InertanceAnalyticsConfig?.posthog;
  const hosts = new Set(['inertance.org', 'www.inertance.org', 'hydraulicanalogy.com', 'www.hydraulicanalogy.com']);
  const paths = new Set(['/app/', '/about/']);
  const umamiConfigured = typeof website === 'string' && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(website);
  const posthogConfigured = typeof posthog?.token === 'string' && /^phc_[A-Za-z0-9]{20,128}$/.test(posthog.token) &&
    ['https://eu.i.posthog.com','https://us.i.posthog.com'].includes(posthog.host);
  const providers = [umamiConfigured && 'Umami', posthogConfigured && 'PostHog'].filter(Boolean).join(' and ');
  const eligible = !!providers && location.protocol === 'https:' && hosts.has(location.hostname) && paths.has(location.pathname);
  const key = 'inertance-analytics-consent';
  // Acceptance predating PostHog must be renewed; an existing decline stays off.
  const version = 2, lifetime = 180 * 24 * 60 * 60 * 1000;
  const endpoint = 'https://gateway.umami.is/api/send';
  const pagePath = location.pathname;
  const presets = ['buck','boost','inverting','noninverting','flyback','forward','half','fullbuck','fullboost','transformer','buffer','meters','freewheel','memristor','memristorHold','memristorStates'];
  const names = new Set(['simulation_started','circuit_edited','arrange_completed','default_view_reset','changes_discarded','export_json_download','export_json_copy',
    ...presets.map(p => 'preset_' + p), ...['ideal','ripple','leakage','transients','fallback'].map(m => 'mode_' + m),
    ...['json','spice','kicad','unknown'].flatMap(f => ['preview_success','preview_failed','applied','apply_failed'].map(s => 'import_' + f + '_' + s))]);
  let choice = readChoice(), pageviewSent = false, started = false, edited = false, panel, returnFocus, settingsOpen = false;
  let minute = 0, count = 0, total = 0;
  let anonymousId, sessionId, sessionStart = 0, lastAction = 0;
  const pending = new Set();
  function blocked() { return navigator.globalPrivacyControl === true || [navigator.doNotTrack, window.doNotTrack, navigator.msDoNotTrack].some(v => v === '1' || v === 'yes'); }
  function readChoice() {
    try {
      const c = JSON.parse(localStorage.getItem(key));
      return c && (c.version === version || (c.version === 1 && c.value === 'rejected')) && ['accepted','rejected'].includes(c.value) && Number.isFinite(c.time) &&
        c.time <= Date.now() && Date.now() - c.time < lifetime ? c : null;
    } catch { return null; }
  }
  function allowed() { return eligible && !blocked() && choice?.value === 'accepted' && choice.time <= Date.now() && Date.now() - choice.time < lifetime; }
  function stop() {
    for (const controller of pending) controller.abort(); pending.clear();
    started = edited = pageviewSent = false; anonymousId = sessionId = undefined; sessionStart = lastAction = 0;
  }
  function posthogBody(name) {
    const now = Date.now();
    // IDs live only in this page's memory, created after consent. Never identify a person.
    anonymousId ||= crypto.randomUUID();
    if (!sessionId || now - lastAction >= 30 * 60000 || now - sessionStart >= 24 * 3600000 || now < sessionStart) {
      const random = crypto.randomUUID(), time = now.toString(16).padStart(12, '0');
      sessionId = time.slice(0,8) + '-' + time.slice(8) + '-7' + random.slice(15); // UUIDv7
      sessionStart = now;
    }
    lastAction = now;
    return {api_key:posthog.token, event:name ?? '$pageview', distinct_id:anonymousId, properties:{
      $process_person_profile:false, $is_identified:false, $geoip_disable:true,
      $current_url:'https://' + location.hostname + pagePath, $host:location.hostname, $pathname:pagePath, $session_id:sessionId
    }};
  }
  function request(url, body) {
    const controller = new AbortController(); pending.add(controller);
    const timer = setTimeout(() => controller.abort(), 5000);
    // IP/User-Agent reach both providers. Response identifiers are ignored.
    try {
      Promise.resolve(fetch(url, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body),
        credentials:'omit', referrerPolicy:'no-referrer', redirect:'error', signal:controller.signal}))
        .catch(() => {}).finally(() => { clearTimeout(timer); pending.delete(controller); });
    } catch { clearTimeout(timer); pending.delete(controller); }
  }
  function send(name) {
    if (!allowed() || (name !== undefined && !names.has(name))) return false;
    const nowMinute = Math.floor(Date.now() / 60000);
    if (minute !== nowMinute) { minute = nowMinute; count = 0; }
    // Bound accidental repeated UI actions. Drop events rather than retain a queue.
    const requests = [];
    if (umamiConfigured) {
      const payload = {website, hostname:location.hostname, url:pagePath};
      if (name !== undefined) payload.name = name;
      requests.push([endpoint, {type:'event',payload}]);
    }
    if (posthogConfigured) {
      try { requests.push([posthog.host + '/i/v0/e/', posthogBody(name)]); } catch { /* An unavailable crypto API must not affect Umami or the simulator. */ }
    }
    if (!requests.length || count >= 60 || total >= 300 || pending.size + requests.length > 8) return false;
    count++; total++;
    for (const [url, body] of requests) request(url, body);
    return true;
  }
  function begin() { if (!pageviewSent && allowed()) pageviewSent = send(); }
  function save(value) {
    choice = {version, value, time:Date.now()};
    try { localStorage.setItem(key, JSON.stringify(choice)); } catch { /* Choice lasts for this page only. */ }
    close();
    if (!allowed()) stop(); else begin();
  }
  function close() { if (panel) panel.hidden = true; if (returnFocus?.isConnected) returnFocus.focus(); returnFocus = null; settingsOpen = false; }
  function show(settings = false) {
    settingsOpen = settings;
    if (!panel) {
      panel = document.createElement('section'); panel.className = 'analytics-panel'; panel.hidden = true;
      panel.setAttribute('role','dialog'); panel.setAttribute('aria-modal','false'); panel.setAttribute('aria-labelledby','analytics-heading');
      panel.innerHTML = '<h2 id="analytics-heading">Optional usage analytics</h2><p>Help improve Inertance by sharing page visits and actions such as Run, preset selection and import outcomes with ' + (providers || 'our analytics providers') + '. Circuit contents and filenames stay in your browser.</p><p>Providers receive your IP address and browser information. No analytics cookies or persistent visitor IDs are saved. PostHog uses random IDs held only in this page’s memory to group actions. Your choice is saved for 180 days on this site.</p><p><a href="../about/#privacy">Privacy details</a></p><p data-analytics-status></p><div class="analytics-actions"><button type="button" data-analytics-allow>Allow analytics</button><button type="button" data-analytics-reject>No thanks</button><button type="button" data-analytics-close hidden>Close</button></div>';
      document.body.append(panel);
      panel.querySelector('[data-analytics-allow]').onclick = () => save('accepted');
      panel.querySelector('[data-analytics-reject]').onclick = () => save('rejected');
      panel.querySelector('[data-analytics-close]').onclick = close;
      panel.addEventListener('keydown', e => { if (e.key === 'Escape' && settingsOpen) close(); });
    }
    const status = panel.querySelector('[data-analytics-status]');
    status.textContent = !eligible ? 'Analytics stays off on this preview. You can save your preference below.' : blocked() ? 'Your browser requests no tracking. Analytics is off.' :
      allowed() ? 'Analytics is on. You can turn it off below.' : 'Analytics is off until you allow it.';
    panel.querySelector('[data-analytics-allow]').disabled = blocked();
    panel.querySelector('[data-analytics-reject]').textContent = allowed() ? 'Turn analytics off' : 'No thanks';
    panel.querySelector('[data-analytics-close]').hidden = false;
    panel.hidden = false;
    if (settings) { if (!returnFocus) returnFocus = document.activeElement; panel.querySelector('[data-analytics-reject]').focus(); }
  }
  document.querySelectorAll('[data-analytics-settings]').forEach(button => button.addEventListener('click', () => show(true)));
  function refreshChoice() {
    choice = readChoice();
    if (!allowed()) stop(); else begin();
    if (panel && !panel.hidden) show(!!returnFocus);
  }
  window.addEventListener('storage', e => { if (e.key === key || e.key === null) refreshChoice(); });
  window.addEventListener('focus', refreshChoice);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (!allowed()) stop(); } else refreshChoice(); });
  window.addEventListener('pagehide', stop);
  // Check expiry even when a simulator stays open overnight. Never contacts a provider.
  if (eligible) setInterval(() => { if (!allowed()) stop(); }, 60000);
  // Wait until the host's initial preset has finished; it is not a user selection.
  queueMicrotask(() => {
    const root = document.getElementById('circuit-editor');
    root?.addEventListener('circuit-editor:playback', () => {
      if (!started && window.circuitEditor?.playing && allowed()) started = send('simulation_started');
    });
    root?.addEventListener('circuit-editor:action', e => {
      if (!allowed()) return;
      const name = e.detail?.name;
      if (name === 'circuit_edited') { if (!edited) edited = send(name); }
      else send(name);
    });
    begin();
    if (eligible && !blocked() && !choice && location.pathname === '/app/') show();
  });
})();
