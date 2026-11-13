// Cor: the owner's terminal for talking to the question-notes agent, on the Exam 3 pages.
// Only the owner's GitHub sign-in (abahsan1) sees it; /api/agent refuses everyone else too.
// It knows the question in view (window.a403Current, set by the practice page's note box) and can leave notes
// that the question-notes agent acts on when it next runs.
(function(){
const OWNER="a1be1e0f-896a-49c9-b997-a06979110fae";
const KEY="a403-cor-log";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let log=[];try{log=JSON.parse(sessionStorage.getItem(KEY)||"[]")}catch(e){}
const save=()=>{try{sessionStorage.setItem(KEY,JSON.stringify(log.slice(-40)))}catch(e){}};

// The icon: an anatomical heart with a spark at its core (Cor = heart in Latin)
let iconN=0;
const ICON=()=>{const g="cor-g"+(++iconN);return `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><defs>
<linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F08A6C"/><stop offset="1" stop-color="#B23A6E"/></linearGradient></defs>
<path d="M19 9c0-3 3-5 5-5M26 11V5.5c0-1.4 1.1-2.5 2.5-2.5S31 4.1 31 5.5V12M33 13c1.5-2.5 4-3.5 6.5-2.8" fill="none" stroke="#C9A7FF" stroke-width="2.6" stroke-linecap="round"/>
<path d="M24 44c-6.5-3.6-15-10-15-19.5C9 17.6 13.5 12 19.5 12c2 0 3.5.6 4.5 1.5 1-.9 2.9-1.8 5.3-1.8C35 11.7 39 16.4 39 23c0 10.2-8.3 17.4-15 21z" fill="url(#${g})"/>
<path d="M20.5 16.5c-3 1-5 4-5 8" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2" stroke-linecap="round"/>
<g transform="translate(24.5 26)" fill="#FFF4EA">${[0,30,60,90,120,150].map(a=>`<rect x="-1.1" y="-7.5" width="2.2" height="15" rx="1.1" transform="rotate(${a})"/>`).join("")}</g></svg>`};

const css=document.createElement("style");
css.textContent=`
.cor-fab{position:fixed;right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));z-index:60;width:56px;height:56px;padding:9px;border-radius:var(--x-r-btn,14px);border:1px solid var(--x-primary-edge,rgba(170,120,255,.55));background:rgba(139,44,245,.18);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,.45);transition:transform .15s ease,background-color .15s ease}
.cor-fab:hover{transform:translateY(-2px);background:rgba(139,44,245,.28)}
.cor-fab:focus-visible,.cor button:focus-visible,.cor textarea:focus-visible{outline:2px solid var(--x-pink,#ff7ac6);outline-offset:2px}
.cor-fab svg,.cor-head svg{width:100%;height:100%;display:block}
.cor{position:fixed;right:max(16px,env(safe-area-inset-right));bottom:calc(max(16px,env(safe-area-inset-bottom)) + 68px);z-index:61;width:min(440px,calc(100vw - 32px));height:min(560px,calc(100dvh - 120px));display:flex;flex-direction:column;border-radius:var(--x-r-md,16px);border:1px solid rgba(255,255,255,.12);background:rgba(10,8,16,.86);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:0 24px 60px rgba(0,0,0,.6);color:#E9E6F2;font:13.5px/1.55 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;overflow:hidden}
.cor[hidden]{display:none}
.cor-head{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.08);background:rgba(139,44,245,.10)}
.cor-head .ico{width:26px;height:26px;flex:none}
.cor-head b{font-weight:700;letter-spacing:.02em}
.cor-head span{color:#9C95AE}
.cor-head button{margin-left:auto;background:transparent;border:1px solid rgba(255,255,255,.14);color:#C9C3D8;border-radius:8px;font:inherit;padding:2px 9px;cursor:pointer}
.cor-ctx{padding:6px 12px;border-bottom:1px solid rgba(255,255,255,.06);color:#9C95AE;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cor-ctx em{font-style:normal;color:#C9A7FF}
.cor-log{flex:1;overflow-y:auto;padding:12px;display:grid;gap:10px;align-content:start}
.cor-log p{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}
.cor-log .u{color:#F3F0FA}.cor-log .u::before{content:"› ";color:#F08A6C;font-weight:700}
.cor-log .a{color:#D9D3E8}.cor-log .a::before{content:"cor ";color:#C9A7FF;font-weight:700}
.cor-log .sys{color:#8E879F;font-size:12px}
.cor-log .err{color:var(--x-bad-ink,#ff8a8a)}
.cor-log .ok{color:var(--x-good-ink,#7fe0a6);font-size:12px}
.cor-log .wait::after{content:"▍";animation:corblink 1s steps(1) infinite;color:#C9A7FF}
@keyframes corblink{50%{opacity:0}}
.cor-in{display:flex;align-items:flex-end;gap:8px;padding:10px 12px;border-top:1px solid rgba(255,255,255,.08)}
.cor-in label{color:#F08A6C;font-weight:700;padding-bottom:6px}
.cor-in textarea{flex:1;resize:none;min-height:22px;max-height:120px;background:transparent;border:0;color:#F3F0FA;font:inherit;padding:4px 0;outline:none}
.cor-in textarea::placeholder{color:#6F6882}
@media (max-width:560px){.cor{right:0;left:0;bottom:0;width:auto;height:min(78dvh,620px);border-radius:var(--x-r-md,16px) var(--x-r-md,16px) 0 0}}
@media (prefers-reduced-motion:reduce){.cor-fab{transition:none}.cor-log .wait::after{animation:none}}`;
document.head.appendChild(css);

let fab=null,panel=null,busy=false;
function question(){
  const c=window.a403Current;if(!c||!c.id)return null;
  // same key the practice page builds for each question (its qKey lives inside the page's own scope)
  const key=x=>x.deep?"d:"+x.q+"|"+(Array.isArray(x.c)?x.c[0]:x.c):"q:"+x.q;
  let q=null;try{q=typeof QUESTIONS!=="undefined"?QUESTIONS.find(x=>key(x)===c.key):null}catch(e){}
  if(q)return{id:c.id,q:q.q,options:[].concat(q.c,q.w||[]),answer:[].concat(q.c),e:q.e||""};
  return{id:c.id,q:c.text,options:[],answer:[],e:""};
}
function drawCtx(){
  if(!panel)return;const q=question();
  panel.querySelector(".cor-ctx").innerHTML=q?`on <em>${esc(q.id)}</em> · ${esc(q.q)}`:"no question in view · ask about anything from Exam 3";
}
function line(cls,text){const p=document.createElement("p");p.className=cls;p.textContent=text;const l=panel.querySelector(".cor-log");l.appendChild(p);l.scrollTop=l.scrollHeight;return p}
function drawLog(){
  const l=panel.querySelector(".cor-log");l.innerHTML="";
  line("sys","Cor · your Exam 3 study agent. Ask about the question in view, say what confuses you, or report a problem; I can leave notes for the question-notes agent to act on. /notes lists your notes, /clear wipes this chat.");
  for(const m of log)line(m.role==="user"?"u":"a",m.content);
}
async function token(){const sb=await window.a403Sync.client();const {data}=await sb.auth.getSession();return data.session&&data.session.access_token}
async function send(text){
  if(busy)return;text=text.trim();if(!text)return;
  if(text==="/clear"){log=[];save();drawLog();return}
  if(text==="/notes")text="List my saved notes and say which ones the agent has handled.";
  busy=true;log.push({role:"user",content:text});save();line("u",text);
  const w=line("a wait","");
  try{
    const r=await fetch("/api/agent",{method:"POST",cache:"no-store",headers:{"content-type":"application/json",authorization:"Bearer "+await token()},
      body:JSON.stringify({messages:log.slice(-20),question:question()})});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j.error||"The agent isn't reachable right now.");
    w.classList.remove("wait");w.textContent=j.reply||"(no answer)";log.push({role:"assistant",content:j.reply||""});save();
    if(j.saved&&j.saved.length)line("ok","✓ note saved on "+j.saved.join(", ")+"; the question-notes agent picks it up on its next run");
  }catch(e){w.remove();log.pop();save();line("err",e.message)}
  finally{busy=false;const ta=panel.querySelector("textarea");ta.focus()}
}
function build(){
  fab=document.createElement("button");fab.type="button";fab.className="cor-fab";fab.setAttribute("aria-label","Open Cor, your study agent");fab.setAttribute("aria-expanded","false");fab.innerHTML=ICON();
  panel=document.createElement("section");panel.className="cor";panel.hidden=true;panel.setAttribute("aria-label","Cor agent terminal");
  panel.innerHTML=`<div class="cor-head"><span class="ico">${ICON()}</span><b>cor</b><span>~/anatomy-403/exam-3</span><button type="button" data-x aria-label="Close">esc</button></div>
<div class="cor-ctx"></div><div class="cor-log" role="log" aria-live="polite"></div>
<form class="cor-in"><label for="cor-ta">›</label><textarea id="cor-ta" rows="1" placeholder="ask cor…" aria-label="Message to Cor"></textarea></form>`;
  document.body.append(panel,fab);
  const ta=panel.querySelector("textarea");
  const open=v=>{panel.hidden=!v;fab.setAttribute("aria-expanded",String(v));if(v){drawCtx();drawLog();ta.focus()}else fab.focus()};
  fab.onclick=()=>open(panel.hidden);
  panel.querySelector("[data-x]").onclick=()=>open(false);
  ta.addEventListener("input",()=>{ta.style.height="auto";ta.style.height=Math.min(ta.scrollHeight,120)+"px"});
  ta.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();const v=ta.value;ta.value="";ta.style.height="auto";send(v)}else if(e.key==="Escape")open(false)});
  panel.querySelector("form").addEventListener("submit",e=>e.preventDefault());
}
// typing in the terminal must not answer or skip questions
// on <html>, bubbling: the terminal's own keys still run, the page's document-level shortcuts don't
document.documentElement.addEventListener("keydown",e=>{if(e.target.closest&&e.target.closest(".cor"))e.stopPropagation()});
addEventListener("a403-question",drawCtx);
const setOwner=u=>{
  const yes=!!(u&&u.id===OWNER);
  if(yes&&!fab)build();
  if(!yes&&fab){fab.remove();panel.remove();fab=panel=null}
};
addEventListener("a403-auth",e=>setOwner(e.detail));
if(window.a403Sync&&a403Sync.ready())setOwner(a403Sync.user());
})();
