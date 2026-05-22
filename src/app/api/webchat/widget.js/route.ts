import { corsHeaders } from "@/lib/webchat/http";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenant = searchParams.get("tenant") ?? searchParams.get("tenantId") ?? "tenant_1dentalai_production";
  const script = buildWidgetScript({ tenant });
  return new Response(script, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function buildWidgetScript({ tenant }: { tenant: string }) {
  return `
(function(){
  if (window.__oneDentalAiWebchat) return;
  window.__oneDentalAiWebchat = true;

  var scriptEl = document.currentScript;
  var API_BASE = scriptEl && scriptEl.src ? new URL(scriptEl.src).origin : window.location.origin;
  var TENANT = ${JSON.stringify(tenant)};
  var storageKey = 'oneDentalAiWebchat:' + TENANT + ':' + location.hostname;
  var state = {
    open: false,
    session: null,
    visitor: {
      patientStatus: 'NEW_PATIENT',
      urgency: 'ROUTINE',
      consentAccepted: false,
      sourceChannel: 'WEBSITE',
      campaignSource: campaignSource(),
      referrerUrl: document.referrer || '',
      landingPageSlug: landingSlug(),
    },
    sending: false,
    settings: null,
    messages: [],
    editingIdentity: false,
    stream: null,
    speech: null,
    voiceListening: false,
    voiceStatus: '',
    draft: '',
  };
  var root = document.createElement('div');
  root.id = 'one-dental-ai-webchat';
  var shadow = root.attachShadow({ mode: 'open' });
  document.body.appendChild(root);

  function h(tag, attrs, children){
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function(key){
      if (attrs[key] === null || attrs[key] === undefined || attrs[key] === false) return;
      if (key === 'class') el.className = attrs[key];
      else if (key === 'text') el.textContent = attrs[key];
      else if (key.indexOf('on') === 0) el.addEventListener(key.slice(2).toLowerCase(), attrs[key]);
      else el.setAttribute(key, attrs[key]);
    });
    (children || []).forEach(function(child){
      el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return el;
  }

  function svgIcon(kind){
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    if (kind === 'mic') {
      [['path','M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z'],['path','M19 10v2a7 7 0 0 1-14 0v-2'],['path','M12 19v3'],['path','M8 22h8']].forEach(function(item){
        var path = document.createElementNS('http://www.w3.org/2000/svg', item[0]);
        path.setAttribute('d', item[1]);
        svg.appendChild(path);
      });
    }
    return svg;
  }

  function render(){
    var theme = (state.settings && state.settings.theme) || {};
    var primary = theme.primaryColor || '#0891b2';
    shadow.innerHTML = '<style>' +
      ':host{all:initial;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#111827}' +
      '.wrap{position:fixed;right:20px;bottom:20px;z-index:2147483000;display:flex;flex-direction:column;align-items:flex-end;gap:12px}' +
      '.launcher{border:0;border-radius:999px;background:'+primary+';color:white;padding:13px 17px;font-size:14px;font-weight:800;box-shadow:0 14px 34px rgba(0,0,0,.22);cursor:pointer}' +
      '.panel{width:min(384px,calc(100vw - 24px));height:min(620px,calc(100vh - 88px));background:#fff;border:1px solid #d4d4d4;border-radius:14px;box-shadow:0 24px 70px rgba(0,0,0,.22);overflow:hidden;display:flex;flex-direction:column}' +
      '.head{background:#0a0a0a;color:#fff;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px}' +
      '.title{font-size:14px;font-weight:850}.sub{font-size:11px;color:#cbd5e1;margin-top:2px}.close{background:transparent;border:0;color:#fff;font-size:24px;line-height:1;cursor:pointer}' +
      '.identity{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px;border-bottom:1px solid #e5e5e5;background:#fafafa}.identity input,.identity select{min-width:0;border:1px solid #d4d4d4;border-radius:9px;padding:10px;font-size:13px;background:#fff}.identity input:first-child{grid-column:1/-1}.wide{grid-column:1/-1}.consent{grid-column:1/-1;display:grid;grid-template-columns:auto 1fr;gap:8px;align-items:start;border:1px solid #e5e5e5;border-radius:9px;background:#fff;padding:9px;font-size:11px;line-height:1.35;color:#525252}.consent input{margin-top:2px}.consent b{color:#171717}' +
      '.contactbar{display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid #e5e5e5;background:#fff;padding:10px 12px}.contacttext{min-width:0}.contactname{font-size:13px;font-weight:850;color:#171717;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.contactmeta{margin-top:2px;font-size:11px;color:#737373;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.editbtn{border:1px solid #d4d4d4;border-radius:999px;background:#fff;padding:7px 10px;font-size:11px;font-weight:850;color:#171717;cursor:pointer}' +
      '.chips{display:flex;gap:7px;overflow-x:auto;padding:10px 12px;border-bottom:1px solid #e5e5e5;background:#fff}.chip{white-space:nowrap;border:1px solid #d4d4d4;background:#fff;border-radius:999px;padding:7px 10px;font-size:11px;font-weight:800;cursor:pointer}.chip:hover{border-color:'+primary+';color:'+primary+'}' +
      '.msgs{flex:1;overflow:auto;padding:14px;background:#f5f5f4;display:flex;flex-direction:column;gap:10px}.msg{max-width:86%;border-radius:13px;padding:10px 12px;font-size:13px;line-height:1.45;white-space:pre-wrap}.bot{align-self:flex-start;background:#fff;border:1px solid #e5e5e5}.me{align-self:flex-end;background:'+primary+';color:#fff}' +
      '.composer{display:grid;grid-template-columns:1fr auto auto;gap:8px;padding:12px;border-top:1px solid #e5e5e5;background:#fff}.composer textarea{height:44px;resize:none;border:1px solid #d4d4d4;border-radius:10px;padding:10px;font-size:13px;font-family:inherit}.composer button{border:0;border-radius:10px;background:#0a0a0a;color:#fff;font-weight:850;padding:0 14px;cursor:pointer}.composer button:disabled{opacity:.55;cursor:not-allowed}.iconbtn{width:44px;height:44px;display:grid;place-items:center;border-radius:999px!important;border:1px solid #d4d4d4!important;background:#fff!important;color:#111827!important;padding:0!important}.iconbtn svg{width:20px;height:20px}.iconbtn.listening{border-color:#fecaca!important;background:#fef2f2!important;color:#b91c1c!important}.voiceStatus{grid-column:1/-1;font-size:11px;font-weight:700;color:#525252;min-height:14px}.meta{padding:9px 12px;font-size:10px;line-height:1.35;color:#525252;border-top:1px solid #eee;background:#fff;white-space:pre-line}' +
      '@media(max-width:520px){.wrap{right:12px;bottom:12px}.panel{width:calc(100vw - 24px);height:calc(100vh - 88px)}.identity{grid-template-columns:1fr}}' +
      '</style>';
    var wrap = h('div', { class: 'wrap' }, []);
    if (state.open) wrap.appendChild(panel());
    wrap.appendChild(h('button', { class: 'launcher', onclick: toggle, text: state.open ? 'Close chat' : ((theme.launcherText || theme.launcherLabel || 'Ask us') + '') }, []));
    shadow.appendChild(wrap);
    if (state.open) {
      var input = shadow.querySelector('textarea');
      if (input) input.focus();
    }
  }

  function formatMessageText(message){
    var body = message.body || '';
    if (message.senderType !== 'VISITOR' && /PMS|RCM|writeback|connector|workflow|claim|provider approval|guardrail|approved knowledge base|STAFF_|AI_RULES|SENT_WITH|ANSWERED_WITH|RECEIVED|delivery|automation mode|cannot finalize|blocked|staged|route this to the right dental team member|Exact benefits or estimates require/i.test(body)) {
      if ((message.intent || '').indexOf('SCHEDULE') >= 0) return 'What would you like to book: cleaning, new patient exam, emergency visit, implant consult, or another treatment?';
      if ((message.intent || '').indexOf('INSURANCE') >= 0) return 'I can help get that reviewed. Please share your insurance plan name and the treatment you are asking about, and the team will confirm details before giving an estimate.';
      return 'I can help with appointments, services, insurance questions, forms, and follow-up requests. What would you like help with today?';
    }
    return body;
  }

  function normalizeMessage(message){
    return {
      senderType: message.senderType,
      body: message.body || '',
      intent: message.intent,
      actionStatus: message.actionStatus,
      deliveryStatus: message.deliveryStatus,
      automationMode: message.automationMode,
    };
  }

  function startTranscriptStream(){
    if (!state.session || !state.session.id || typeof EventSource === 'undefined') return;
    if (state.stream) state.stream.close();
    state.stream = new EventSource(API_BASE + '/api/webchat/stream?tenant=' + encodeURIComponent(TENANT) + '&conversationId=' + encodeURIComponent(state.session.id));
    state.stream.addEventListener('transcript', function(event){
      try {
        var transcript = JSON.parse(event.data);
        if (!transcript || !transcript.conversation) return;
        if (transcript.conversation.status === 'CLOSED') {
          localStorage.removeItem(storageKey);
          state.session = null;
          state.messages = [];
          if (state.stream) state.stream.close();
          state.stream = null;
          render();
          return;
        }
        state.messages = (transcript.messages || []).map(normalizeMessage);
        render();
      } catch (error) {}
    });
    state.stream.onerror = function(){
      if (state.stream) state.stream.close();
      state.stream = null;
      window.setTimeout(startTranscriptStream, 1200);
    };
  }

  function panel(){
    var messages = h('div', { class: 'msgs' }, []);
    var readyForChat = canChat();
    if (!readyForChat) {
      messages.appendChild(h('div', { class: 'msg bot', text: 'Hi. I can answer practice questions, capture appointment requests, and route urgent, insurance, or financing questions to the team. I will not finalize appointments, estimates, payments, or clinical advice without staff review.' }, []));
    }
    (state.messages || []).forEach(function(m){
      messages.appendChild(h('div', { class: 'msg ' + (m.senderType === 'VISITOR' ? 'me' : 'bot'), text: formatMessageText(m) }, []));
    });
    return h('div', { class: 'panel' }, [
      h('div', { class: 'head' }, [
        h('div', {}, [
          h('div', { class:'title', text:'1DentalAI Web Chat' }, []),
          h('div', { class:'sub', text:'Live chat · scheduling connected' }, [])
        ]),
        h('button', { class:'close', onclick: toggle, 'aria-label':'Close chat', text:'×' }, [])
      ]),
      readyForChat && !state.editingIdentity ? contactBar() : h('div', { class: 'identity' }, [
        input('visitorName','Name'),
        input('visitorPhone','Phone'),
        input('visitorEmail','Email'),
        select('serviceLine','What can we help with?', serviceOptions()),
        select('patientStatus','Patient status', [['NEW_PATIENT','New patient'],['EXISTING_PATIENT','Existing patient'],['CAREGIVER','Caregiver']]),
        input('preferredTime','Preferred time window', 'wide'),
        select('urgency','Urgency', [['ROUTINE','Routine'],['THIS_WEEK','This week'],['URGENT','Urgent symptoms']]),
        consentNotice()
      ]),
      quickChips(),
      messages,
      h('form', { class:'composer', onsubmit: submitMessage }, [
        h('textarea', { name:'message', placeholder:'Ask a question or request an appointment', maxlength:'3000', oninput: function(event){ state.draft = event.target.value; } }, [state.draft || '']),
        h('button', { type:'button', class:'iconbtn ' + (state.voiceListening ? 'listening' : ''), onclick: toggleVoiceTyping, 'aria-label': state.voiceListening ? 'Stop voice typing' : 'Start voice typing', title: state.voiceListening ? 'Stop voice typing' : 'Start voice typing' }, [svgIcon('mic')]),
        h('button', { type:'submit', disabled: state.visitor.consentAccepted ? null : 'disabled', text: state.sending ? '...' : 'Send' }, []),
        h('div', { class:'voiceStatus', text: state.voiceStatus || '' }, [])
      ]),
      h('div', { class:'meta' }, ['I can help with appointments, services, insurance questions, forms, and follow-up requests.']),
      h('div', { class:'meta' }, ['Call 911 or emergency services for life-threatening symptoms.'])
    ]);
  }

  function appendTranscript(text){
    if (!text || !text.trim()) return;
    var prefix = state.draft && state.draft.trim() ? state.draft.trim() + ' ' : '';
    state.draft = (prefix + text.trim()).trim();
    var textarea = shadow.querySelector('textarea[name="message"]');
    if (textarea) {
      textarea.value = state.draft;
      textarea.focus();
    }
  }

  function toggleVoiceTyping(){
    if (state.voiceListening) {
      if (state.speech) state.speech.stop();
      state.voiceListening = false;
      state.voiceStatus = '';
      render();
      return;
    }
    var Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      state.voiceStatus = 'Voice typing is not supported in this browser.';
      render();
      return;
    }
    var recognition = new Recognition();
    state.speech = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = function(event){
      var finalText = '';
      var interimText = '';
      for (var index = event.resultIndex; index < event.results.length; index += 1) {
        var transcript = event.results[index][0] && event.results[index][0].transcript ? event.results[index][0].transcript : '';
        if (event.results[index].isFinal) finalText += transcript;
        else interimText += transcript;
      }
      if (finalText) appendTranscript(finalText);
      state.voiceStatus = interimText ? 'Listening: ' + interimText : 'Listening...';
      render();
    };
    recognition.onerror = function(){
      state.voiceListening = false;
      state.voiceStatus = 'Microphone access failed. Check browser permission and try again.';
      render();
    };
    recognition.onend = function(){
      state.voiceListening = false;
      state.voiceStatus = '';
      render();
    };
    recognition.start();
    state.voiceListening = true;
    state.voiceStatus = 'Listening...';
    render();
  }

  function canChat(){
    return state.visitor.consentAccepted === true && Boolean((state.visitor.visitorName || '').trim()) && Boolean(((state.visitor.visitorPhone || '').trim()) || ((state.visitor.visitorEmail || '').trim()));
  }

  function contactBar(){
    var contact = [state.visitor.visitorPhone, state.visitor.visitorEmail].filter(Boolean).join(' · ') || 'contact captured';
    return h('div', { class:'contactbar' }, [
      h('div', { class:'contacttext' }, [
        h('div', { class:'contactname', text: state.visitor.visitorName || 'Website visitor' }, []),
        h('div', { class:'contactmeta', text: contact + ' · ' + (state.visitor.serviceLine || 'General question') }, []),
      ]),
      h('button', { class:'editbtn', type:'button', onclick:function(){ state.editingIdentity = true; render(); }, text:'Edit' }, [])
    ]);
  }

  function quickChips(){
    return h('div', { class:'chips' }, [
      h('button', { class:'chip', type:'button', onclick:function(){ seedPrompt('I want to schedule a dental appointment.'); }, text:'Book visit' }, []),
      h('button', { class:'chip', type:'button', onclick:function(){ seedPrompt('I have tooth pain or swelling and need help.'); }, text:'Urgent pain' }, []),
      h('button', { class:'chip', type:'button', onclick:function(){ seedPrompt('I want to know insurance or financing options.'); }, text:'Insurance/cost' }, []),
      h('button', { class:'chip', type:'button', onclick:function(){ seedPrompt('I need to reschedule my appointment.'); }, text:'Reschedule' }, [])
    ]);
  }

  function seedPrompt(text){
    var textarea = shadow.querySelector('textarea[name=\"message\"]');
    if (textarea) {
      textarea.value = text;
      textarea.focus();
    }
  }

  function input(key, label){
    return h('input', { placeholder: label, value: state.visitor[key] || '', oninput: function(event){ state.visitor[key] = event.target.value; saveVisitorState(); if (canChat()) state.editingIdentity = false; }, class: arguments[2] || '' }, []);
  }

  function select(key, label, options){
    var el = h('select', { 'aria-label': label, onchange: function(event){ state.visitor[key] = event.target.value; saveVisitorState(); if (canChat()) state.editingIdentity = false; } }, []);
    el.appendChild(h('option', { value:'', text: label }, []));
    options.forEach(function(option){
      var value = option[0];
      var text = option[1];
      var item = h('option', { value: value, text: text }, []);
      if (state.visitor[key] === value) item.selected = true;
      el.appendChild(item);
    });
    return el;
  }

  function serviceOptions(){
    var forms = (state.settings && state.settings.leadForms) || [];
    var seen = {};
    var options = forms.map(function(form){ return form.serviceLine; }).filter(function(service){
      if (!service || seen[service]) return false;
      seen[service] = true;
      return true;
    }).map(function(service){ return [service, service]; });
    return options.length ? options : [['Scheduling','Scheduling'],['Emergency','Emergency'],['Implants','Implants'],['Insurance','Insurance or billing'],['General dentistry','General question']];
  }

  function consentNotice(){
    var notice = (state.settings && state.settings.privacyNotice) || {};
    return h('label', { class:'consent' }, [
      h('input', { type:'checkbox', checked: state.visitor.consentAccepted ? 'checked' : null, onchange: function(event){ state.visitor.consentAccepted = event.target.checked; saveVisitorState(); if (canChat()) state.editingIdentity = false; render(); } }, []),
      h('span', {}, [
        h('b', { text:'Privacy notice: ' }, []),
        document.createTextNode(notice.label || 'This chat is saved for staff follow-up and does not replace emergency care, diagnosis, payments, or final appointment changes.')
      ])
    ]);
  }

  function toggle(){
    state.open = !state.open;
    if (state.open) {
      ensureSession();
    }
    render();
  }

  async function ensureSession(){
    if (state.session && state.session.id) return state.session;
    var persisted = loadSession();
    if (persisted && persisted.id) {
      state.session = { id: persisted.id };
      await loadTranscript();
      startTranscriptStream();
      return state.session;
    }

    var response = await fetch(API_BASE + '/api/webchat/sessions', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(capturePayload({ sourcePage:window.location.href }))
    });
    var json = await response.json();
    state.session = json.session;
    saveSession();
    state.messages = [];
    startTranscriptStream();
    return state.session;
  }

  function saveSession(){
    if (!state.session || !state.session.id) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ id: state.session.id, tenant: TENANT, origin: location.hostname, ts: Date.now() }));
    } catch (error) {
    }
  }

  function loadSession() {
    try {
      var raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.tenant !== TENANT || parsed.origin !== location.hostname || !parsed.id) return null;
      if (Date.now() - (parsed.ts || 0) > 14 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(storageKey);
        return null;
      }
      return { id: parsed.id };
    } catch (error) {
      return null;
    }
  }

  function saveVisitorState() {
    try {
      var snapshot = {
        visitorName: state.visitor.visitorName || '',
        visitorPhone: state.visitor.visitorPhone || '',
        visitorEmail: state.visitor.visitorEmail || '',
        serviceLine: state.visitor.serviceLine || '',
        preferredTime: state.visitor.preferredTime || '',
        patientStatus: state.visitor.patientStatus || 'NEW_PATIENT',
        urgency: state.visitor.urgency || 'ROUTINE',
        sourceChannel: state.visitor.sourceChannel || 'WEBSITE',
        consentAccepted: !!state.visitor.consentAccepted,
        campaignSource: state.visitor.campaignSource || '',
        referrerUrl: state.visitor.referrerUrl || '',
        landingPageSlug: state.visitor.landingPageSlug || '',
      };
      localStorage.setItem(storageKey + ':visitor', JSON.stringify(snapshot));
    } catch (error) {
    }
  }

  function loadVisitorState() {
    try {
      var raw = localStorage.getItem(storageKey + ':visitor');
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      state.visitor = {
        patientStatus: parsed.patientStatus || state.visitor.patientStatus,
        urgency: parsed.urgency || state.visitor.urgency,
        consentAccepted: !!parsed.consentAccepted,
        sourceChannel: parsed.sourceChannel || state.visitor.sourceChannel,
        campaignSource: parsed.campaignSource || state.visitor.campaignSource,
        referrerUrl: parsed.referrerUrl || state.visitor.referrerUrl,
        landingPageSlug: parsed.landingPageSlug || state.visitor.landingPageSlug,
        visitorName: parsed.visitorName || state.visitor.visitorName,
        visitorPhone: parsed.visitorPhone || state.visitor.visitorPhone,
        visitorEmail: parsed.visitorEmail || state.visitor.visitorEmail,
        serviceLine: parsed.serviceLine || state.visitor.serviceLine,
        preferredTime: parsed.preferredTime || state.visitor.preferredTime,
      };
    } catch (error) {
    }
  }

  async function loadTranscript() {
    if (!state.session || !state.session.id) return;
    try {
      var response = await fetch(API_BASE + '/api/webchat/transcript?tenant=' + encodeURIComponent(TENANT) + '&conversationId=' + encodeURIComponent(state.session.id), {
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) return;
      var transcript = await response.json();
      if (!transcript || !transcript.conversation) {
        state.messages = [];
        return;
      }
      if (transcript.conversation.status === 'CLOSED') {
        localStorage.removeItem(storageKey);
        state.session = null;
        state.messages = [];
        return;
      }
      state.messages = (transcript.messages || []).map(normalizeMessage);
    } catch (error) {
    }
  }

  async function submitMessage(event){
    event.preventDefault();
    var textarea = shadow.querySelector('textarea[name=\"message\"]');
    var body = textarea && textarea.value ? textarea.value.trim() : (state.draft || '').trim();
    if (!body || state.sending) return;

    if (!state.visitor.consentAccepted) {
      state.messages.push({ senderType:'ASSISTANT', body:'Please accept the privacy notice so I can save this chat for staff follow-up.' });
      render();
      return;
    }
    if (!canChat()) {
      state.editingIdentity = true;
      state.messages.push({ senderType:'ASSISTANT', body:'Please add your name and either phone or email so the practice can follow up if the chat disconnects.' });
      render();
      return;
    }

    state.sending = true;
    var session = await ensureSession();
    state.messages.push({ senderType:'VISITOR', body: body });
    state.draft = '';
    if (textarea) textarea.value = '';
    render();

    try {
      var response = await fetch(API_BASE + '/api/webchat/messages', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(capturePayload({ conversationId:session.id, body:body, senderName:state.visitor.visitorName }))
      });
      var json = await response.json();
      if (json.reply) {
        state.messages.push({
          senderType:'ASSISTANT',
          body: json.reply.body,
          actionStatus: json.analysis ? json.analysis.actionStatus : null,
          automationMode: json.automationMode,
          deliveryStatus: json.replyId ? 'delivered' : 'blocked',
        });
      } else {
        state.messages.push({ senderType:'ASSISTANT', body:'The team needs to review this request.' });
      }
    } catch (error) {
      state.messages.push({ senderType:'ASSISTANT', body:'I could not save that message. Please call the practice or try again.' });
    }

    state.sending = false;
    loadTranscript();
    render();
  }

  function capturePayload(extra){
    var notice = (state.settings && state.settings.privacyNotice) || {};
    var payload = {
      tenantId:TENANT,
      visitorName:state.visitor.visitorName,
      visitorPhone:state.visitor.visitorPhone,
      visitorEmail:state.visitor.visitorEmail,
      serviceLine:state.visitor.serviceLine,
      preferredTime:state.visitor.preferredTime,
      patientStatus:state.visitor.patientStatus,
      urgency:state.visitor.urgency,
      sourceChannel:state.visitor.sourceChannel,
      campaignSource:state.visitor.campaignSource,
      referrerUrl:state.visitor.referrerUrl,
      landingPageSlug:state.visitor.landingPageSlug,
      consentAccepted:state.visitor.consentAccepted === true,
      privacyNoticeVersion:notice.version || 'webchat-privacy-v1'
    };
    Object.keys(extra || {}).forEach(function(key){ payload[key] = extra[key]; });
    return payload;
  }

  function campaignSource(){
    try {
      var url = new URL(window.location.href);
      var source = url.searchParams.get('utm_source');
      var campaign = url.searchParams.get('utm_campaign');
      if (source || campaign) return [source, campaign].filter(Boolean).join(':').toUpperCase();
      if (/implant/i.test(url.pathname)) return 'IMPLANT_LANDING_PAGE';
      if (/emergency/i.test(url.pathname)) return 'EMERGENCY_LANDING_PAGE';
    } catch(e) {}
    return 'DIRECT_WEBSITE';
  }

  function landingSlug(){
    try {
      var parts = window.location.pathname.split('/').filter(Boolean);
      return parts.pop() || 'home';
    } catch(e) {
      return 'unknown';
    }
  }

  loadVisitorState();
  fetch(API_BASE + '/api/webchat/settings?tenant=' + encodeURIComponent(TENANT)).then(function(r){ return r.json(); }).then(function(json){
    state.settings = json;
    render();
    return ensureSession();
  }).then(function(){ startTranscriptStream(); render(); }).catch(render);
})();\n`;
}
