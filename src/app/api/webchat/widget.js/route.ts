import { corsHeaders } from "@/lib/webchat/http";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tenant = searchParams.get("tenant") ?? "tenant_1dentalai_production";
  const script = buildWidgetScript({ apiBase: origin, tenant });
  return new Response(script, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function buildWidgetScript({ apiBase, tenant }: { apiBase: string; tenant: string }) {
  return `
(function(){
  if (window.__oneDentalAiWebchat) return;
  window.__oneDentalAiWebchat = true;
  var API_BASE = ${JSON.stringify(apiBase)};
  var TENANT = ${JSON.stringify(tenant)};
  var state = { open: false, session: null, visitor: {}, sending: false, settings: null };
  var root = document.createElement('div');
  root.id = 'one-dental-ai-webchat';
  var shadow = root.attachShadow({ mode: 'open' });
  document.body.appendChild(root);

  function h(tag, attrs, children){
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function(key){
      if (key === 'class') el.className = attrs[key];
      else if (key === 'text') el.textContent = attrs[key];
      else if (key.indexOf('on') === 0) el.addEventListener(key.slice(2).toLowerCase(), attrs[key]);
      else el.setAttribute(key, attrs[key]);
    });
    (children || []).forEach(function(child){ el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child); });
    return el;
  }

  function escapeText(value){ return String(value || '').replace(/[<>&]/g, function(ch){ return ({'<':'&lt;','>':'&gt;','&':'&amp;'}[ch]); }); }

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
      '.identity{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px;border-bottom:1px solid #e5e5e5;background:#fafafa}.identity input{min-width:0;border:1px solid #d4d4d4;border-radius:9px;padding:10px;font-size:13px}.identity input:first-child{grid-column:1/-1}' +
      '.msgs{flex:1;overflow:auto;padding:14px;background:#f5f5f4;display:flex;flex-direction:column;gap:10px}.msg{max-width:86%;border-radius:13px;padding:10px 12px;font-size:13px;line-height:1.45;white-space:pre-wrap}.bot{align-self:flex-start;background:#fff;border:1px solid #e5e5e5}.me{align-self:flex-end;background:'+primary+';color:#fff}' +
      '.composer{display:grid;grid-template-columns:1fr auto;gap:8px;padding:12px;border-top:1px solid #e5e5e5;background:#fff}.composer textarea{height:44px;resize:none;border:1px solid #d4d4d4;border-radius:10px;padding:10px;font-size:13px;font-family:inherit}.composer button{border:0;border-radius:10px;background:#0a0a0a;color:#fff;font-weight:850;padding:0 14px;cursor:pointer}.note{padding:9px 12px;font-size:11px;line-height:1.35;color:#525252;border-top:1px solid #eee;background:#fff}' +
      '@media(max-width:520px){.wrap{right:12px;bottom:12px}.panel{width:calc(100vw - 24px);height:calc(100vh - 88px)}.identity{grid-template-columns:1fr}}' +
      '</style>';
    var wrap = h('div', { class: 'wrap' }, []);
    if (state.open) wrap.appendChild(panel());
    wrap.appendChild(h('button', { class: 'launcher', onclick: toggle, text: state.open ? 'Close chat' : ((theme.launcherLabel || 'Ask us') + '') }, []));
    shadow.appendChild(wrap);
    if (state.open) {
      var input = shadow.querySelector('textarea');
      if (input) input.focus();
    }
  }

  function panel(){
    var messages = h('div', { class: 'msgs' }, []);
    if (!state.session) {
      messages.appendChild(h('div', { class: 'msg bot', text: 'Hi. I can answer practice questions, collect appointment requests, and route urgent or insurance questions to the team. I will not finalize appointments or clinical advice without staff review.' }, []));
    }
    (state.messages || []).forEach(function(m){ messages.appendChild(h('div', { class: 'msg ' + (m.senderType === 'VISITOR' ? 'me' : 'bot'), text: m.body }, [])); });
    return h('div', { class: 'panel' }, [
      h('div', { class: 'head' }, [
        h('div', {}, [h('div', { class:'title', text:'1DentalAI Web Chat' }, []), h('div', { class:'sub', text:'Saved transcript · staff-reviewed scheduling handoff' }, [])]),
        h('button', { class:'close', onclick: toggle, 'aria-label':'Close chat', text:'×' }, [])
      ]),
      h('div', { class: 'identity' }, [
        input('visitorName','Name'),
        input('visitorPhone','Phone'),
        input('visitorEmail','Email')
      ]),
      messages,
      h('form', { class:'composer', onsubmit: submitMessage }, [
        h('textarea', { name:'message', placeholder:'Ask a question or request an appointment', maxlength:'3000' }, []),
        h('button', { type:'submit', text: state.sending ? '...' : 'Send' }, [])
      ]),
      h('div', { class:'note', text:'Appointment changes, insurance estimates, payments, and clinical decisions require staff verification and approved connectors.' }, [])
    ]);
  }

  function input(key, label){
    return h('input', { placeholder: label, value: state.visitor[key] || '', oninput: function(event){ state.visitor[key] = event.target.value; } }, []);
  }

  function toggle(){
    state.open = !state.open;
    render();
  }

  async function ensureSession(){
    if (state.session) return state.session;
    var response = await fetch(API_BASE + '/api/webchat/sessions', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ tenantId:TENANT, visitorName:state.visitor.visitorName, visitorPhone:state.visitor.visitorPhone, visitorEmail:state.visitor.visitorEmail, sourcePage:window.location.href })
    });
    var json = await response.json();
    state.session = json.session;
    state.messages = [];
    return state.session;
  }

  async function submitMessage(event){
    event.preventDefault();
    var textarea = shadow.querySelector('textarea[name="message"]');
    var body = textarea && textarea.value ? textarea.value.trim() : '';
    if (!body || state.sending) return;
    state.sending = true;
    var session = await ensureSession();
    state.messages.push({ senderType:'VISITOR', body: body });
    textarea.value = '';
    render();
    try {
      var response = await fetch(API_BASE + '/api/webchat/messages', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ tenantId:TENANT, conversationId:session.id, body:body, senderName:state.visitor.visitorName })
      });
      var json = await response.json();
      state.messages.push({ senderType:'ASSISTANT', body: json.reply ? json.reply.body : 'The team needs to review this request.' });
    } catch (error) {
      state.messages.push({ senderType:'ASSISTANT', body:'I could not save that message. Please call the practice or try again.' });
    }
    state.sending = false;
    render();
  }

  fetch(API_BASE + '/api/webchat/settings?tenant=' + encodeURIComponent(TENANT)).then(function(r){ return r.json(); }).then(function(json){ state.settings = json; render(); }).catch(render);
})();
`;
}
