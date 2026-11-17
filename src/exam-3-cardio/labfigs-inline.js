// Owner-only lab identification: when the owner's GitHub sign-in is detected, fetch the figures from
// /api/labfigs (which refuses every other account), fill FIGS and IMG, and reveal the Identification tab.
// Nobody else's page ever receives the images or the answers.
(function(){
  const OWN="a1be1e0f-896a-49c9-b997-a06979110fae";let started=false;
  async function tok(){const sb=await window.a403Sync.client();const {data}=await sb.auth.getSession();return data.session&&data.session.access_token}
  const btn=()=>document.getElementById("m-id");
  const label=t=>{const b=btn();if(b)b.textContent=t};
  async function go(u){
    if(started||!u||u.id!==OWN)return;started=true;
    const b=btn();if(b){b.hidden=false;b.disabled=true}
    label("Identification (loading)");
    try{
      const t=await tok();if(!t)throw new Error("no session");
      const h={authorization:"Bearer "+t};
      const r=await fetch("/api/labfigs",{headers:h,cache:"no-store"});if(!r.ok)throw new Error("list "+r.status);
      const figs=(await r.json()).figs||[];if(!figs.length)throw new Error("no figures");
      // each figure joins as soon as its image arrives, so the tab works before all of them are in
      let done=0,ok=0;const q=[...figs];
      await Promise.all(Array.from({length:6},async()=>{while(q.length){const f=q.shift();
        try{const ir=await fetch("/api/labfigs?img="+encodeURIComponent(f.id)+"&v="+encodeURIComponent(f.v),{headers:h});
          if(ir.ok){IMG[f.id]=URL.createObjectURL(await ir.blob());FIGS.push({img:f.id,title:f.title,lec:f.lec,answers:f.answers});ok++}}catch(e){}
        done++;if(b&&ok)b.disabled=false;
        label(done<figs.length?"Identification ("+done+"/"+figs.length+")":"Identification")}}));
      // keep the lab's order once everything is in
      const ord=new Map(figs.map((f,i)=>[f.id,i]));FIGS.sort((x,y)=>ord.get(x.img)-ord.get(y.img));
      if(!ok)throw new Error("no images");
    }catch(e){
      // show the failure instead of hiding the tab; tapping retries
      started=false;
      if(b){b.hidden=false;b.disabled=false;label("Identification (couldn't load, tap to retry)");
        b.addEventListener("click",ev=>{if(!FIGS.length){ev.stopImmediatePropagation();go(window.a403Sync&&a403Sync.user())}},{capture:true,once:true})}
      console.warn("lab figures:",e&&e.message);
    }
  }
  // FIGS and IMG are declared by the data script further down the page, so wait for it to parse
  const run=u=>document.readyState==="loading"?addEventListener("DOMContentLoaded",()=>go(u),{once:true}):go(u);
  addEventListener("a403-auth",e=>run(e.detail));
  if(window.a403Sync&&a403Sync.ready())run(a403Sync.user());
})();
