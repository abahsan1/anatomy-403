// The owner's note box on each Exam 3 question (injected into exam-3/cardio.html by src/build-exams.mjs).
// Only the owner's GitHub sign-in sees it. A Note button sits beside Flag; flagging a question also opens the box.
// Notes save through /api/notes under the question's id in cardio-data.js; Claude reads them and replies.
(function(){
const OWNER="a1be1e0f-896a-49c9-b997-a06979110fae";
const IDS=new Map(/*NOTE_IDS*/); // practice-page key -> question id
const SNAP=new Map(/*NOTE_SNAPS*/); // question id -> question text
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let owner=false, notes=null, loading=null, lastFlag=null;

const css=document.createElement("style");
css.textContent=`
.qnote-btn{flex:none;display:inline-flex;align-items:center;gap:6px;border:1px solid var(--x-line);background:transparent;color:var(--x-stage-muted);font:700 .8rem var(--x-font);padding:7px 14px;border-radius:var(--x-r-btn);cursor:pointer}
.qnote-btn[aria-expanded=true],.qnote-btn.has{border-color:var(--x-primary-edge);color:var(--x-ink);background:var(--x-primary)}
.qnote-btn:focus-visible,.qnote textarea:focus-visible,.qnote button:focus-visible{outline:2px solid var(--x-pink);outline-offset:2px}
.cardhead .qnote-acts{flex:none;display:flex;gap:8px;align-items:center}
.qnote{margin:12px 0 4px;padding:14px;border:1px solid var(--x-primary-edge);border-radius:var(--x-r-md);background:rgba(139,44,245,.10);display:grid;gap:10px}
.qnote textarea{width:100%;min-height:84px;resize:vertical;box-sizing:border-box;font:500 .95rem/1.45 var(--x-font);color:var(--x-ink);background:var(--x-stage-2);border:1px solid var(--x-line);border-radius:var(--x-r-sm);padding:10px 12px}
.qnote textarea::placeholder{color:var(--x-stage-muted)}
.qnote .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.qnote .st{margin:0;font-size:.8rem;font-weight:700;color:var(--x-yellow)}
.qnote .st.done{color:var(--x-good-ink)}
.qnote .reply{padding:10px 12px;border-radius:var(--x-r-sm);background:var(--x-good-wash);font-size:.9rem;line-height:1.45;white-space:pre-wrap}
.qnote .reply b{display:block;color:var(--x-good-ink);font-size:.8rem;margin-bottom:2px}
.qnote .msg{margin:0;font-size:.85rem;color:var(--x-stage-muted)}
.qnote .msg.err{color:var(--x-bad-ink)}
.qnote .sm{min-height:36px;padding:0 14px;border-radius:var(--x-r-btn);border:1px solid var(--x-line);background:var(--x-surface);color:var(--x-ink);font:700 .85rem var(--x-font);cursor:pointer}
.qnote .sm.primary{background:var(--x-primary);border-color:var(--x-primary-edge)}
.qnote .sm:disabled{opacity:.5;cursor:default}
.qnote a{color:var(--x-pink);font-weight:700;font-size:.85rem;margin-left:auto}`;
document.head.appendChild(css);

async function token(){const sb=await window.a403Sync.client();const {data}=await sb.auth.getSession();return data.session&&data.session.access_token}
async function api(method,body,qs){
  const r=await fetch("/api/notes"+(qs||""),{method,cache:"no-store",headers:{"content-type":"application/json",authorization:"Bearer "+await token()},body:body?JSON.stringify(body):undefined});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j.error||"Couldn't reach the notes store.");
  return j;
}
const load=()=>loading||(loading=api("GET").then(j=>{notes=new Map(j.notes.map(n=>[n.qid,n]))}).catch(e=>{loading=null;throw e}));

// called by the page each time it draws a question's Flag button
window.a403Note=function(flag){
  lastFlag=flag;
  if(!owner)return;
  const id=IDS.get(flag.dataset.key), head=flag.closest(".cardhead");
  if(!id||!head||head.querySelector(".qnote-btn"))return;
  const acts=document.createElement("span");acts.className="qnote-acts";
  head.insertBefore(acts,flag);acts.appendChild(flag);
  const btn=document.createElement("button");
  btn.type="button";btn.className="qnote-btn";btn.setAttribute("aria-expanded","false");btn.textContent="Note";
  acts.insertBefore(btn,flag);
  const label=()=>{const n=notes&&notes.get(id);btn.textContent=n?"Your note":"Note";btn.classList.toggle("has",!!n)};
  load().then(label,()=>{});
  let box=null;
  const close=()=>{if(box){box.remove();box=null}btn.setAttribute("aria-expanded","false");label()};
  const open=async()=>{
    if(box)return;
    box=document.createElement("div");box.className="qnote";box.innerHTML='<p class="msg">Loading your note…</p>';
    head.after(box);btn.setAttribute("aria-expanded","true");
    try{await load()}catch(e){box.innerHTML='<p class="msg err">'+esc(e.message)+'</p>';return}
    draw();
  };
  function draw(){
    const n=notes.get(id);
    box.innerHTML=(n?`<p class="st ${n.status==="done"?"done":""}">${n.status==="done"?"Updated by Claude":"Saved · waiting for Claude"}</p>`+(n.reply?`<div class="reply"><b>Claude</b>${esc(n.reply)}</div>`:""):"")+
      `<textarea aria-label="Your note on this question" placeholder="What's wrong, unclear or missing? Claude reads this and fixes the question.">${esc(n?n.note:"")}</textarea>
      <div class="row"><button type="button" class="sm primary" data-a="save">Save note</button>${n?'<button type="button" class="sm" data-a="del">Delete</button>':''}<button type="button" class="sm" data-a="close">Close</button><a href="/exam-3/notes">All notes</a></div>
      <p class="msg" role="status"></p>`;
    const ta=box.querySelector("textarea"), msg=box.querySelector(".msg[role]");
    ta.addEventListener("keydown",e=>{if(e.key==="Enter"&&(e.metaKey||e.ctrlKey)){e.preventDefault();box.querySelector('[data-a=save]').click()}});
    box.querySelectorAll("[data-a]").forEach(b=>b.onclick=async()=>{
      const a=b.dataset.a;
      if(a==="close"){close();btn.focus();return}
      b.disabled=true;msg.className="msg";
      try{
        if(a==="save"){
          const note=ta.value.trim();
          if(!note){msg.className="msg err";msg.textContent="Write a note first.";b.disabled=false;return}
          msg.textContent="Saving…";
          const j=await api("PUT",{qid:id,note,snap:SNAP.get(id)||""});notes.set(id,j.note);
        }else{
          if(!confirm("Delete your note on this question?")){b.disabled=false;return}
          await api("DELETE",null,"?qid="+encodeURIComponent(id));notes.delete(id);
        }
        label();draw();const m=box.querySelector(".msg[role]");m.textContent=a==="save"?"Saved.":"Deleted.";
      }catch(e){msg.className="msg err";msg.textContent=e.message;b.disabled=false}
    });
    if(!n)ta.focus();
  }
  btn.onclick=()=>box?close():open();
  // flagging a question opens the note box
  flag.addEventListener("click",()=>{if(flag.getAttribute("aria-pressed")==="true")open()});
};

// keep Enter inside the note box from moving to the next question
// (on <html>, bubbling: the box's own keys still run, the page's document-level shortcuts don't)
document.documentElement.addEventListener("keydown",e=>{if(e.target.closest&&e.target.closest(".qnote"))e.stopPropagation()});

const setOwner=u=>{
  const was=owner;owner=!!(u&&u.id===OWNER);
  if(!owner){document.querySelectorAll(".qnote,.qnote-btn").forEach(el=>el.remove());notes=null;loading=null;return}
  if(!was&&lastFlag&&lastFlag.isConnected)window.a403Note(lastFlag);
};
addEventListener("a403-auth",e=>setOwner(e.detail));
if(window.a403Sync&&a403Sync.ready())setOwner(a403Sync.user());
})();
