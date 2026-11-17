// Owner-only lab identification: when the owner's GitHub sign-in is detected, fetch the figures from
// /api/labfigs (which refuses every other account), fill FIGS and IMG, and reveal the Identification tab.
// Nobody else's page ever receives the images or the answers.
(function(){
  const OWN="a1be1e0f-896a-49c9-b997-a06979110fae";let started=false;
  async function tok(){const sb=await window.a403Sync.client();const {data}=await sb.auth.getSession();return data.session&&data.session.access_token}
  async function go(u){
    if(started||!u||u.id!==OWN)return;started=true;
    const b=document.getElementById("m-id");
    try{
      const h={authorization:"Bearer "+await tok()};
      const r=await fetch("/api/labfigs",{headers:h,cache:"no-store"});if(!r.ok)throw new Error(r.status);
      const figs=(await r.json()).figs||[];if(!figs.length)return;
      const label=t=>{if(b)b.textContent=t};
      if(b){b.hidden=false;b.disabled=true}
      let done=0;const urls={},q=[...figs];
      label("Identification (loading 0/"+figs.length+")");
      await Promise.all(Array.from({length:6},async()=>{while(q.length){const f=q.shift();
        try{const ir=await fetch("/api/labfigs?img="+encodeURIComponent(f.id)+"&v="+encodeURIComponent(f.v),{headers:h});
          if(ir.ok)urls[f.id]=URL.createObjectURL(await ir.blob())}catch(e){}
        label("Identification (loading "+(++done)+"/"+figs.length+")")}}));
      figs.forEach(f=>{if(urls[f.id]){IMG[f.id]=urls[f.id];FIGS.push({img:f.id,title:f.title,lec:f.lec,answers:f.answers})}});
      if(b){b.disabled=false;label("Identification")}
    }catch(e){started=false;if(b)b.hidden=true}
  }
  // FIGS and IMG are declared by the data script further down the page, so wait for it to parse
  const run=u=>document.readyState==="loading"?addEventListener("DOMContentLoaded",()=>go(u),{once:true}):go(u);
  addEventListener("a403-auth",e=>run(e.detail));
  if(window.a403Sync&&a403Sync.ready())run(a403Sync.user());
})();
