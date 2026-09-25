const STORAGE_KEY = "second-brain-loic-v1";
const state = { data:null, view:"dashboard", projectFilter:"Tous", editingId:null };

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const statusLabel = {
  active:"Actif", production:"Production", validation:"À valider", paused:"Pause",
  idea:"Idée", archived:"Archivé", published:"Publié"
};
const statusColor = {
  active:"#53d68a", production:"#8f7cff", validation:"#f0b65c", paused:"#7d8798",
  idea:"#65a7ff", archived:"#555d6b", published:"#53d68a"
};
const categoryIcon = {Jeux:"✦",Business:"↗",Produit:"◇",Professionnel:"⌘",Écriture:"✎",Personnel:"◌",Autre:"·"};
const priorityLabel = {1:"P1",2:"P2",3:"P3",4:"P4"};
const itemColor = item => statusColor[item.status] || "#8f7cff";

async function loadData(){
  let seed = null;
  try{
    const r = await fetch("data/brain.json", {cache:"no-store"});
    if(!r.ok) throw new Error("seed unavailable");
    seed = await r.json();
  }catch(err){
    seed = {meta:{owner:"Loïc",version:1},items:[]};
  }
  try{
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    state.data = saved && Array.isArray(saved.items) ? saved : seed;
  }catch{
    state.data = seed;
  }
  renderAll();
}

function persist(message="Modifications enregistrées"){
  state.data.meta.updated = new Date().toISOString().slice(0,10);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
  toast(message);
  renderAll();
}

function items(){ return state.data?.items || []; }
function visibleProjects(){ return items().filter(x => x.type==="project" && x.status!=="archived"); }
function ideas(){ return items().filter(x => x.type==="idea" && x.status!=="archived"); }
function archives(){ return items().filter(x => x.status==="archived"); }
function byPriority(a,b){ return (+a.priority - +b.priority) || (+b.progress - +a.progress); }

function renderAll(){
  $("#navProjectCount").textContent = visibleProjects().length;
  $("#navIdeaCount").textContent = ideas().length;
  renderDashboard();
  renderProjects();
  renderIdeas();
  renderFocus();
  renderArchive();
}

function renderDashboard(){
  const candidates = visibleProjects().filter(x => [1,2].includes(+x.priority) && ["active","production","validation"].includes(x.status)).sort(byPriority);
  const focus = candidates[0] || visibleProjects().sort(byPriority)[0];
  $("#mainFocus").innerHTML = focus ? `
    <div class="focus-main">
      <div>
        <span class="status" style="border-color:${itemColor(focus)}55;color:${itemColor(focus)}">● ${esc(statusLabel[focus.status])} · ${esc(focus.category)}</span>
        <h2>${esc(focus.name)}</h2>
        <p>${esc(focus.description)}</p>
        <div class="focus-meta">
          <span class="pill"><strong>${priorityLabel[focus.priority]}</strong> priorité</span>
          <span class="pill"><strong>${focus.energy === "high" ? "Forte" : focus.energy === "medium" ? "Moyenne" : "Faible"}</strong> énergie</span>
          ${focus.link ? `<a class="pill project-link" href="${esc(focus.link)}" target="_blank" rel="noreferrer">Ouvrir ↗</a>` : ""}
        </div>
      </div>
      <div class="ring" style="--p:${Math.max(0,Math.min(100,+focus.progress||0))}"><span>${+focus.progress||0}%</span></div>
    </div>
    <div class="focus-next"><b>Prochaine action</b><span>${esc(focus.next || "Définir la prochaine action.")}</span></div>
  ` : '<div class="empty">Aucun projet actif.</div>';

  const active = visibleProjects().filter(x => ["active","production","validation"].includes(x.status));
  const heavy = visibleProjects().filter(x => x.energy==="high" && !["published","paused"].includes(x.status)).length;
  const overloaded = active.length > 4 || heavy > 2;
  $("#signalScore").textContent = overloaded ? "Attention" : "Stable";
  $("#brainSignal").innerHTML = `
    <div class="signal-copy">
      <h3>${overloaded ? "Trop de fronts ouverts." : "Charge sous contrôle."}</h3>
      <p>${overloaded
        ? `Tu as ${active.length} projets qui réclament une décision ou de l'exécution. Le risque principal n'est pas le manque d'idées, mais la dilution.`
        : `Tu as ${active.length} fronts réellement ouverts. Garde cette limite et transforme les nouvelles idées en options, pas en obligations.`}</p>
    </div>
    <div class="signal-rule"><span>◎</span><div><strong>Règle de passage</strong><small>Une nouvelle production doit remplacer explicitement un projet actif.</small></div></div>
  `;

  $("#activeProjects").innerHTML = visibleProjects().sort(byPriority).slice(0,6).map(projectCard).join("") || '<div class="empty">Aucun projet.</div>';
  $("#radarIdeas").innerHTML = ideas().sort(byPriority).slice(0,5).map((x,i)=>`
    <article class="radar-item" data-id="${esc(x.id)}">
      <span class="radar-num">0${i+1}</span><div><strong>${esc(x.name)}</strong><p>${esc(x.next || x.description)}</p></div><span class="tag">${esc(x.category)}</span>
    </article>`).join("") || '<div class="empty">Aucune idée en attente.</div>';

  const cats = {};
  visibleProjects().filter(x=>x.status!=="published").forEach(x=>cats[x.category]=(cats[x.category]||0)+1);
  const total = Object.values(cats).reduce((a,b)=>a+b,0)||1;
  const series = ["#8f7cff","#53d68a","#65a7ff","#f0b65c","#ef6b73","#8b92a1"];
  $("#allocation").innerHTML = Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([cat,n],i)=>`
    <div class="alloc-row"><div class="alloc-label"><span>${esc(cat)}</span><strong>${n}</strong></div>
    <div class="alloc-bar"><i style="width:${(n/total)*100}%;background:${series[i%series.length]}"></i></div></div>
  `).join("") + `<div class="alloc-note">Répartition par nombre de projets ouverts, pas par heures passées. Le but est de rendre visible la dispersion.</div>`;
  bindCards();
}

function projectCard(x){
  return `<article class="project-card" data-id="${esc(x.id)}" style="--card-color:${itemColor(x)}">
    <div class="project-top"><div class="project-icon">${categoryIcon[x.category]||"·"}</div><span class="priority p${x.priority}">${priorityLabel[x.priority]||"P4"}</span></div>
    <h3>${esc(x.name)}</h3><p>${esc(x.description)}</p>
    <div class="progress-row"><span>${esc(statusLabel[x.status]||x.status)}</span><strong>${+x.progress||0}%</strong></div>
    <div class="progress"><i style="width:${Math.max(0,Math.min(100,+x.progress||0))}%"></i></div>
    <div class="project-footer"><small>${esc(x.next||"Prochaine action à définir")}</small>${x.link ? `<a class="project-link" href="${esc(x.link)}" target="_blank" rel="noreferrer" data-stop>↗</a>`:""}</div>
  </article>`;
}

function renderProjects(){
  const cats = ["Tous", ...new Set(visibleProjects().map(x=>x.category))];
  $("#projectFilters").innerHTML = cats.map(c=>`<button class="chip ${state.projectFilter===c?"active":""}" data-filter="${esc(c)}">${esc(c)}</button>`).join("");
  let list = visibleProjects().filter(x=>state.projectFilter==="Tous" || x.category===state.projectFilter);
  const sort = $("#sortProjects").value;
  if(sort==="priority") list.sort(byPriority);
  if(sort==="updated") list.sort((a,b)=>String(b.updated).localeCompare(String(a.updated)));
  if(sort==="name") list.sort((a,b)=>a.name.localeCompare(b.name,"fr"));
  $("#allProjects").innerHTML = list.map(projectCard).join("") || '<div class="empty">Aucun projet dans cette vue.</div>';
  $$("#projectFilters .chip").forEach(b=>b.addEventListener("click",()=>{state.projectFilter=b.dataset.filter;renderProjects()}));
  bindCards();
}

function renderIdeas(){
  const list = ideas().sort(byPriority);
  $("#ideaCount").textContent = list.length;
  $("#ideasList").innerHTML = list.map(x=>`
    <article class="idea-card" data-id="${esc(x.id)}">
      <div class="idea-symbol">${categoryIcon[x.category]||"✦"}</div>
      <div><h3>${esc(x.name)}</h3><p>${esc(x.description)}</p></div>
      <div class="idea-rank"><strong>${priorityLabel[x.priority]||"P4"}</strong><small>${esc(x.category)}</small></div>
    </article>`).join("") || '<div class="empty">Incubateur vide. Profite-en.</div>';
  bindCards();
}

function renderFocus(){
  const p1 = visibleProjects().filter(x=>+x.priority===1 && !["published","paused"].includes(x.status)).sort(byPriority);
  const p2 = visibleProjects().filter(x=>+x.priority===2 && !["published","paused"].includes(x.status)).sort(byPriority);
  $("#focusBoard").className="focus-board";
  $("#focusBoard").innerHTML = `
    <section class="focus-lane"><span class="section-kicker">P1 · Maintenant</span><h2>Maximum 1–2 résultats à pousser</h2>
      ${p1.length?p1.map(focusTask).join(""):'<div class="empty">Aucun P1.</div>'}
    </section>
    <section class="focus-lane"><span class="section-kicker">P2 · Ensuite</span><h2>Important, mais ne doit pas voler le focus</h2>
      ${p2.length?p2.map(focusTask).join(""):'<div class="empty">Aucun P2.</div>'}
    </section>`;
  bindCards();
}
function focusTask(x){ return `<article class="focus-task" data-id="${esc(x.id)}"><strong>${esc(x.name)}</strong><p>→ ${esc(x.next||"Définir la prochaine action")}</p></article>`; }

function renderArchive(){
  $("#archiveList").innerHTML = archives().sort((a,b)=>String(b.updated).localeCompare(String(a.updated))).map(x=>`
    <article class="archive-row" data-id="${esc(x.id)}"><div><strong>${esc(x.name)}</strong><p>${esc(x.category)}</p></div><p>${esc(x.note||x.description)}</p><time>${esc(x.updated||"")}</time></article>
  `).join("") || '<div class="empty">Aucune archive.</div>';
  bindCards();
}

function bindCards(){
  $$("[data-id]").forEach(el=>{ el.onclick = e => {
    if(e.target.closest("[data-stop]")) return;
    openEditor(el.dataset.id);
  }});
}

function switchView(view){
  state.view=view;
  $$(".view").forEach(v=>v.classList.remove("active"));
  $("#"+view+"View")?.classList.add("active");
  $$(".nav-item").forEach(b=>b.classList.toggle("active", b.dataset.view===view));
  const titles={dashboard:"Bonjour Loïc.",projects:"Tes projets.",ideas:"Incubateur.",focus:"Le vrai focus.",archive:"Archives."};
  const kickers={dashboard:"Vendredi 25 septembre 2026",projects:"Portefeuille vivant",ideas:"Capturer sans s'éparpiller",focus:"Décider où va l'énergie",archive:"Décisions assumées"};
  $("#pageTitle").textContent=titles[view]||"Second Brain";
  $("#eyebrow").textContent=kickers[view]||"Second Brain";
  window.scrollTo({top:0,behavior:"smooth"});
}

function openEditor(id=null){
  state.editingId=id;
  const x = id ? items().find(i=>i.id===id) : null;
  $("#dialogKicker").textContent=x?"Modifier":"Nouvel élément";
  $("#dialogTitle").textContent=x?x.name:"Capture rapide";
  $("#itemId").value=x?.id||"";
  $("#itemName").value=x?.name||"";
  $("#itemType").value=x?.type||"idea";
  $("#itemCategory").value=x?.category||"Autre";
  $("#itemStatus").value=x?.status||"idea";
  $("#itemPriority").value=String(x?.priority||4);
  $("#itemDescription").value=x?.description||"";
  $("#itemNext").value=x?.next||"";
  $("#itemProgress").value=x?.progress??0;
  $("#itemEnergy").value=x?.energy||"medium";
  $("#itemLink").value=x?.link||"";
  $("#itemTags").value=(x?.tags||[]).join(", ");
  $("#itemNote").value=x?.note||"";
  $("#deleteBtn").style.visibility=x?"visible":"hidden";
  $("#itemDialog").showModal();
  setTimeout(()=>$("#itemName").focus(),30);
}

function slugify(v){
  return v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,48) || "item";
}
function saveForm(){
  const name=$("#itemName").value.trim();
  if(!name){ $("#itemName").focus(); return; }
  const existing=state.editingId?items().find(x=>x.id===state.editingId):null;
  let id=existing?.id || slugify(name);
  if(!existing){
    let base=id,n=2;
    while(items().some(x=>x.id===id)) id=`${base}-${n++}`;
  }
  const item={
    id,name,type:$("#itemType").value,category:$("#itemCategory").value,status:$("#itemStatus").value,
    priority:+$("#itemPriority").value,description:$("#itemDescription").value.trim(),
    next:$("#itemNext").value.trim(),progress:Math.max(0,Math.min(100,+$("#itemProgress").value||0)),
    energy:$("#itemEnergy").value,link:$("#itemLink").value.trim(),
    tags:$("#itemTags").value.split(",").map(x=>x.trim()).filter(Boolean),
    note:$("#itemNote").value.trim(),updated:new Date().toISOString().slice(0,10)
  };
  if(existing) Object.assign(existing,item); else state.data.items.unshift(item);
  $("#itemDialog").close();
  state.editingId=null;
  persist(existing?"Élément mis à jour":"Idée capturée");
}

function deleteCurrent(){
  if(!state.editingId) return;
  const x=items().find(i=>i.id===state.editingId);
  if(!x || !confirm(`Supprimer “${x.name}” ?`)) return;
  state.data.items=items().filter(i=>i.id!==state.editingId);
  $("#itemDialog").close(); state.editingId=null; persist("Élément supprimé");
}

function exportData(){
  const blob=new Blob([JSON.stringify(state.data,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=`second-brain-${new Date().toISOString().slice(0,10)}.json`;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000); toast("Export JSON créé");
}
async function importData(file){
  try{
    const data=JSON.parse(await file.text());
    if(!data || !Array.isArray(data.items)) throw new Error();
    state.data=data;persist("Données importées");
  }catch{ toast("JSON invalide"); }
}

function openSearch(){
  $("#searchDialog").showModal();
  $("#searchInput").value="";
  renderSearch("");
  setTimeout(()=>$("#searchInput").focus(),30);
}
function renderSearch(q){
  const needle=q.trim().toLowerCase();
  const list=items().filter(x=>!needle || [x.name,x.description,x.category,x.status,...(x.tags||[])].join(" ").toLowerCase().includes(needle)).slice(0,12);
  $("#searchResults").innerHTML=list.map(x=>`<div class="search-result" data-search-id="${esc(x.id)}"><strong>${esc(x.name)}</strong><span>${esc(x.category)} · ${esc(statusLabel[x.status]||x.status)}</span></div>`).join("") || '<div class="empty">Aucun résultat.</div>';
  $$("[data-search-id]").forEach(el=>el.onclick=()=>{$("#searchDialog").close();openEditor(el.dataset.searchId)});
}
let toastTimer;
function toast(msg){
  const el=$("#toast");el.textContent=msg;el.classList.add("show");clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove("show"),1800);
}

$("#nav").addEventListener("click",e=>{const b=e.target.closest("[data-view]");if(b)switchView(b.dataset.view)});
$$("[data-go]").forEach(b=>b.addEventListener("click",()=>switchView(b.dataset.go)));
$("#addBtn").addEventListener("click",()=>openEditor());
$("#closeDialog").addEventListener("click",()=>$("#itemDialog").close());
$("#cancelBtn").addEventListener("click",()=>$("#itemDialog").close());
$("#deleteBtn").addEventListener("click",deleteCurrent);
$("#itemForm").addEventListener("submit",e=>{e.preventDefault();saveForm()});
$("#exportBtn").addEventListener("click",exportData);
$("#importInput").addEventListener("change",e=>{if(e.target.files[0])importData(e.target.files[0]);e.target.value=""});
$("#sortProjects").addEventListener("change",renderProjects);
$("#commandBtn").addEventListener("click",openSearch);
$("#closeSearch").addEventListener("click",()=>$("#searchDialog").close());
$("#searchInput").addEventListener("input",e=>renderSearch(e.target.value));
document.addEventListener("keydown",e=>{
  if(e.key==="/" && !["INPUT","TEXTAREA","SELECT"].includes(document.activeElement.tagName)){
    e.preventDefault();openSearch();
  }
  if(e.key==="Escape"){$("#itemDialog").open&&$("#itemDialog").close();$("#searchDialog").open&&$("#searchDialog").close()}
});

loadData();