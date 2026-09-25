const STORAGE_KEY="second-brain-loic-v2";
const state={data:null,view:"home",selected:null};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const labels={active:"Actif",production:"Production",validation:"À valider",paused:"Pause",idea:"Idée",published:"Publié",completed:"Terminé",archived:"Archivé"};
const icons={Jeux:"✦",Business:"↗",Produit:"◇",Écriture:"✎",Personnel:"◌",Autre:"·"};
const statusDot={active:"#2f9f71",production:"#6c5ce7",validation:"#b97818",paused:"#a1a4aa",idea:"#3f7edb",published:"#2f9f71",completed:"#2f9f71",archived:"#a1a4aa"};
async function load(){
 let remote=null;
 try{const r=await fetch("/api/brain",{cache:"no-store"});if(r.ok&&(r.headers.get("content-type")||"").includes("json"))remote=await r.json()}catch{}
 if(!remote){try{const r=await fetch("data/brain.json",{cache:"no-store"});remote=await r.json()}catch{remote={meta:{owner:"Loïc NEBONNE"},items:[]}}}
 try{const local=JSON.parse(localStorage.getItem(STORAGE_KEY));state.data=local?.items?local:remote}catch{state.data=remote}
 render();
}
async function persist(msg="Enregistré"){
 state.data.meta.updated=new Date().toISOString().slice(0,10);
 localStorage.setItem(STORAGE_KEY,JSON.stringify(state.data));render();
 try{const r=await fetch("/api/brain",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(state.data)});if(r.ok)return toast(msg+" · JSON synchronisé")}catch{}
 toast(msg+" · sauvegarde navigateur");
}
const items=()=>state.data.items||[];
const roots=()=>items().filter(x=>x.type==="universe" || (!x.parentId&&x.type==="project"&&x.status!=="archived"));
const children=id=>items().filter(x=>x.parentId===id);
const ideas=()=>items().filter(x=>x.type==="idea"&&x.status!=="archived");
const archives=()=>items().filter(x=>x.status==="archived");
const activeish=x=>["active","production","validation"].includes(x.status);
function render(){renderHome();renderWorlds();renderIdeas();renderDecisions();renderArchive()}
function renderHome(){
 const activeWorlds=items().filter(x=>x.type==="universe"&&x.status!=="archived");
 const activeProjects=items().filter(x=>x.type==="project"&&activeish(x));
 const primary=activeProjects.sort((a,b)=>a.priority-b.priority||b.progress-a.progress)[0];
 const maxActive=state.data.rules?.focus?.maxActiveUniverses||3;
 const testable=items().filter(x=>x.type==="idea"&&x.challenge&&["test","keep"].includes(x.challenge.decision)&&x.status!=="archived").sort((a,b)=>b.challenge.score-a.challenge.score)[0];
 let suggestion;
 if(activeProjects.length>maxActive){
   const candidate=activeProjects.slice().sort((a,b)=>(b.priority-a.priority)||((a.progress||0)-(b.progress||0)))[0];
   suggestion={title:"N’ouvre rien de nouveau.",text:candidate?`Tu as ${activeProjects.length} projets ouverts. Le meilleur gain maintenant est de terminer, mettre en pause ou archiver « ${candidate.name} ».`:`Tu as ${activeProjects.length} projets ouverts. Réduis la charge avant d’en lancer un autre.`,id:candidate?.id};
 }else if(testable){
   suggestion={title:"Tu as de la capacité.",text:`La meilleure idée encore non engagée est « ${testable.name} » (${testable.challenge.score}/100). Fais uniquement un test léger, pas un produit complet.`,id:testable.id};
 }else{
   suggestion={title:"Rien à ajouter.",text:"Continue le projet principal. Le système n’a aucune raison valable de te distraire aujourd’hui.",id:null};
 }
 $("#hero").className="hero";
 $("#hero").innerHTML=`<div><small>Focus système</small><h2>${primary?esc(primary.name):"Aucun projet principal"}</h2><p>${primary?esc(primary.next||primary.description):"Choisis volontairement ce qui mérite ton énergie."}</p><div class="hero-actions">${primary?`<button class="action strong" data-open="${esc(primary.id)}">Ouvrir</button>`:""}<button class="action" data-go="decisions">Voir les idées challengées</button>${suggestion.id?`<button class="action" data-open="${esc(suggestion.id)}">Suggestion du cerveau</button>`:""}</div><div class="challenge"><strong>${esc(suggestion.title)}</strong><p>${esc(suggestion.text)}</p></div></div><div class="hero-focus"><div class="metric">${activeProjects.length}</div><div class="metric-label">projets réellement ouverts</div><div class="progress"><i style="width:${Math.min(100,activeProjects.length*18)}%"></i></div></div>`;
 $("#homeWorlds").innerHTML=activeWorlds.map(worldCard).join("")||'<div class="empty">Aucun univers.</div>';
 const challenged=items().filter(x=>x.challenge&&x.status!=="archived").sort((a,b)=>b.challenge.score-a.challenge.score).slice(0,5);
 $("#decisionPreview").innerHTML=`<div class="mini-list">${challenged.map(x=>miniRow(x,`${x.challenge.score}/100`)).join("")}</div>`;
 $("#ideaPreview").innerHTML=`<div class="mini-list">${ideas().slice(0,5).map(x=>miniRow(x,x.category)).join("")}</div>`;
 bind();
}
function worldCard(x){
 const c=children(x.id), done=c.filter(i=>["published","completed"].includes(i.status)).length;
 const active=c.filter(activeish).length;
 return `<article class="world-card" data-open="${esc(x.id)}"><div class="world-top"><div class="world-icon">${icons[x.category]||"·"}</div><span class="status">${esc(labels[x.status]||x.status)}</span></div><h3>${esc(x.name)}</h3><p>${esc(x.description)}</p><div class="progress"><i style="width:${+x.progress||0}%"></i></div><div class="world-stats"><div><strong>${c.length}</strong><span>éléments</span></div><div><strong>${active}</strong><span>ouverts</span></div><div><strong>${done}</strong><span>terminés</span></div></div></article>`;
}
function miniRow(x,right){
 return `<div class="mini-row" data-open="${esc(x.id)}"><span class="dot" style="background:${statusDot[x.status]||"#aaa"}"></span><div><strong>${esc(x.name)}</strong><small>${esc(labels[x.status]||x.status)} · ${esc(x.category)}</small></div><em>${esc(right)}</em></div>`;
}
function renderWorlds(){
 const list=roots().filter(x=>x.status!=="archived").sort((a,b)=>a.priority-b.priority);
 $("#worldsList").innerHTML=list.map(x=>{
   const c=children(x.id).sort((a,b)=>a.priority-b.priority||a.name.localeCompare(b.name,"fr"));
   return `<section class="world-section open"><div class="world-summary" data-toggle><div class="world-icon">${icons[x.category]||"·"}</div><div><h3>${esc(x.name)}</h3><p>${esc(x.description)}</p></div><span class="status">${c.length} élément${c.length>1?"s":""} · ${labels[x.status]||x.status}</span><span class="chev">›</span></div><div class="children">${c.length?c.map(childCard).join(""):'<div class="empty">Aucun sous-projet.</div>'}</div></section>`;
 }).join("")||'<div class="empty">Aucun univers.</div>';
 $$("[data-toggle]").forEach(el=>el.onclick=()=>el.closest(".world-section").classList.toggle("open"));bind();
}
function childCard(x){
 return `<article class="child-card" data-open="${esc(x.id)}"><div><h4>${esc(x.name)}</h4><p>${esc(x.next||x.description)}</p></div><div class="child-meta"><span class="status">${esc(labels[x.status]||x.status)}</span><span class="status">P${x.priority}</span><span class="status">${+x.progress||0}%</span></div></article>`;
}
function renderIdeas(){
 const list=ideas().sort((a,b)=>(b.challenge?.score||0)-(a.challenge?.score||0));
 const challenged=list.filter(x=>x.challenge).length;
 $("#ideaStats").innerHTML=`<strong>${list.length}</strong> idées · ${challenged} challengées`;
 $("#ideasList").innerHTML=list.map(x=>`<article class="idea-card" data-open="${esc(x.id)}"><div class="idea-icon">${icons[x.category]||"✦"}</div><div><h3>${esc(x.name)}</h3><p>${esc(x.description)}</p></div><div class="score">${x.challenge?x.challenge.score:"—"}</div></article>`).join("")||'<div class="empty">Aucune idée.</div>';bind();
}
function renderDecisions(){
 const list=items().filter(x=>x.challenge).sort((a,b)=>b.challenge.score-a.challenge.score);
 $("#decisionLab").innerHTML=`<div class="decision-board">${list.map(x=>`<article class="decision-row" data-open="${esc(x.id)}"><div class="decision-score">${x.challenge.score}</div><div><h3>${esc(x.name)}</h3><p>${esc(x.challenge.reason)}</p></div><span class="verdict v-${esc(x.challenge.decision)}">${verdictLabel(x.challenge.decision)}</span></article>`).join("")}</div>`;bind();
}
function verdictLabel(v){return({keep:"À garder",test:"À tester",incubate:"Incuber",archive:"À archiver",merge:"Fusionner"}[v]||v)}
function renderArchive(){
 $("#archiveList").innerHTML=archives().sort((a,b)=>String(b.updated).localeCompare(String(a.updated))).map(x=>`<article class="archive-row" data-open="${esc(x.id)}"><div><strong>${esc(x.name)}</strong><p>${esc(x.category)}</p></div><p>${esc(x.note||x.description)}</p><time>${esc(x.updated||"")}</time></article>`).join("")||'<div class="empty">Aucune archive.</div>';bind();
}
function bind(){
 $$("[data-open]").forEach(el=>el.onclick=e=>{e.stopPropagation();openDetail(el.dataset.open)});
 $$("[data-go]").forEach(el=>el.onclick=()=>switchView(el.dataset.go));
}
function openDetail(id){
 const x=items().find(i=>i.id===id);if(!x)return;state.selected=id;
 const parent=x.parentId?items().find(i=>i.id===x.parentId):null;
 const kids=children(x.id);
 $("#detailContent").innerHTML=`<div class="detail"><div class="dialog-head"><div><small>${esc(x.type)} · ${esc(x.category)}</small><h2>${esc(x.name)}</h2></div><button class="round" data-close>×</button></div><p class="detail-desc">${esc(x.description)}</p><div class="detail-actions">${!["completed","published"].includes(x.status)?'<button class="quick q-complete" data-transition="complete">✓ Terminer</button>':""}${x.status!=="archived"?'<button class="quick q-archive" data-transition="archive">Archiver</button>':""}${x.status!=="paused"&&x.status!=="archived"?'<button class="quick q-pause" data-transition="pause">Pause</button>':""}${!activeish(x)&&x.status!=="archived"?'<button class="quick q-active" data-transition="activate">Réactiver</button>':""}<button class="quick q-edit" data-edit>Modifier</button></div><div class="detail-grid"><div class="detail-box"><small>État</small><strong>${esc(labels[x.status]||x.status)}</strong></div><div class="detail-box"><small>Progression</small><strong>${+x.progress||0}%</strong></div><div class="detail-box"><small>Priorité</small><strong>P${x.priority}</strong></div><div class="detail-box"><small>Dossier</small><span>${parent?esc(parent.name):"Racine"}</span></div><div class="detail-box"><small>Prochaine action</small><span>${esc(x.next||"—")}</span></div><div class="detail-box"><small>Sous-éléments</small><strong>${kids.length}</strong></div></div>${x.challenge?`<div class="challenge"><strong>${x.challenge.score}/100 · ${verdictLabel(x.challenge.decision)}</strong><p>${esc(x.challenge.reason)}</p></div>`:""}${x.note?`<div class="challenge"><strong>Contexte</strong><p>${esc(x.note)}</p></div>`:""}</div>`;
 $("#detailDialog").showModal();
 $("[data-close]").onclick=()=>$("#detailDialog").close();
 $$("[data-transition]").forEach(b=>b.onclick=()=>transition(id,b.dataset.transition));
 $("[data-edit]").onclick=()=>{$("#detailDialog").close();openEdit(id)};
}
function transition(id,action){
 const x=items().find(i=>i.id===id);if(!x)return;
 if(action==="complete"){x.status="completed";x.progress=100;x.energy="low";x.next="Aucune action : terminé."}
 if(action==="archive"){x.status="archived";x.priority=4;x.energy="low";x.next="Aucune action : archivé."}
 if(action==="pause"){x.status="paused"}
 if(action==="activate"){x.status="active";x.progress=Math.max(1,+x.progress||0);x.priority=Math.min(+x.priority||3,2)}
 x.updated=new Date().toISOString().slice(0,10);$("#detailDialog").close();persist("État mis à jour automatiquement");
}
function openEdit(id=null){
 state.selected=id;const x=id?items().find(i=>i.id===id):null;
 $("#editKicker").textContent=x?"Modifier":"Capturer";$("#editTitle").textContent=x?x.name:"Nouvel élément";
 $("#itemId").value=x?.id||"";$("#itemName").value=x?.name||"";$("#itemType").value=x?.type||"idea";$("#itemCategory").value=x?.category||"Autre";$("#itemStatus").value=x?.status||"idea";$("#itemPriority").value=String(x?.priority||4);$("#itemDescription").value=x?.description||"";$("#itemNext").value=x?.next||"";$("#itemProgress").value=x?.progress??0;$("#itemEnergy").value=x?.energy||"medium";$("#itemLink").value=x?.link||"";$("#itemTags").value=(x?.tags||[]).join(", ");$("#itemNote").value=x?.note||"";$("#deleteBtn").style.visibility=x?"visible":"hidden";$("#editDialog").showModal();
}
function slug(v){return v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,48)||"item"}
function saveEdit(e){
 e.preventDefault();const name=$("#itemName").value.trim();if(!name)return;
 let x=state.selected?items().find(i=>i.id===state.selected):null;
 if(!x){let id=slug(name),base=id,n=2;while(items().some(i=>i.id===id))id=`${base}-${n++}`;x={id};state.data.items.unshift(x)}
 Object.assign(x,{name,type:$("#itemType").value,category:$("#itemCategory").value,status:$("#itemStatus").value,priority:+$("#itemPriority").value,description:$("#itemDescription").value.trim(),next:$("#itemNext").value.trim(),progress:Math.max(0,Math.min(100,+$("#itemProgress").value||0)),energy:$("#itemEnergy").value,link:$("#itemLink").value.trim(),tags:$("#itemTags").value.split(",").map(v=>v.trim()).filter(Boolean),note:$("#itemNote").value.trim(),updated:new Date().toISOString().slice(0,10)});
 $("#editDialog").close();state.selected=null;persist("Élément enregistré");
}
function removeSelected(){if(!state.selected)return;const x=items().find(i=>i.id===state.selected);if(!x||!confirm(`Supprimer “${x.name}” ?`))return;state.data.items=items().filter(i=>i.id!==state.selected);$("#editDialog").close();state.selected=null;persist("Élément supprimé")}
function switchView(v){state.view=v;$$(".view").forEach(x=>x.classList.remove("active"));$("#"+v+"View").classList.add("active");$$(".nav").forEach(x=>x.classList.toggle("active",x.dataset.view===v));const t={home:"Ton cerveau, sans le bruit.",worlds:"Tes univers.",ideas:"L’incubateur.",decisions:"Décider avant de construire.",archive:"La mémoire utile."};$("#pageTitle").textContent=t[v];window.scrollTo({top:0,behavior:"smooth"})}
function search(){
 $("#searchDialog").showModal();$("#searchInput").value="";renderSearch("");setTimeout(()=>$("#searchInput").focus(),20)
}
function renderSearch(q){const n=q.toLowerCase().trim();const l=items().filter(x=>!n||[x.name,x.description,x.category,...(x.tags||[])].join(" ").toLowerCase().includes(n)).slice(0,14);$("#searchResults").innerHTML=l.map(x=>`<div class="result" data-result="${esc(x.id)}"><strong>${esc(x.name)}</strong><span>${esc(x.category)} · ${esc(labels[x.status]||x.status)}</span></div>`).join("")||'<div class="empty">Aucun résultat.</div>';$$("[data-result]").forEach(el=>el.onclick=()=>{$("#searchDialog").close();openDetail(el.dataset.result)})}
function exportData(){const blob=new Blob([JSON.stringify(state.data,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="second-brain-"+new Date().toISOString().slice(0,10)+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),500)}
async function importData(file){try{const d=JSON.parse(await file.text());if(!Array.isArray(d.items))throw 0;state.data=d;persist("Import réussi")}catch{toast("JSON invalide")}}
let tt;function toast(m){const e=$("#toast");e.textContent=m;e.classList.add("show");clearTimeout(tt);tt=setTimeout(()=>e.classList.remove("show"),1800)}
$("#nav").onclick=e=>{const b=e.target.closest("[data-view]");if(b)switchView(b.dataset.view)};
$("#addBtn").onclick=()=>openEdit();$("#searchBtn").onclick=search;$("#closeSearch").onclick=()=>$("#searchDialog").close();$("#searchInput").oninput=e=>renderSearch(e.target.value);
$("#itemStatus").onchange=e=>{
 const s=e.target.value;
 if(s==="completed"||s==="published"){$("#itemProgress").value=100;$("#itemEnergy").value="low"}
 if(s==="archived"){$("#itemPriority").value="4";$("#itemEnergy").value="low"}
 if(s==="idea"){$("#itemPriority").value="4";$("#itemProgress").value=Math.min(20,+$("#itemProgress").value||0)}
};
$("#closeEdit").onclick=()=>$("#editDialog").close();$("#cancelEdit").onclick=()=>$("#editDialog").close();$("#editForm").onsubmit=saveEdit;$("#deleteBtn").onclick=removeSelected;$("#exportBtn").onclick=exportData;$("#importInput").onchange=e=>{if(e.target.files[0])importData(e.target.files[0]);e.target.value=""};
document.addEventListener("keydown",e=>{if(e.key==="/"&&!["INPUT","TEXTAREA","SELECT"].includes(document.activeElement.tagName)){e.preventDefault();search()}});
load();