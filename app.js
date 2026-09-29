// A chave vem do config.js (arquivo fora do Git). Veja o README.
const TMDB_KEY = window.TMDB_KEY || "";

const $ = id => document.getElementById(id);
const ls = {
  get:(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}},
  set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
};
const state = {
  key: TMDB_KEY.startsWith("COLE") ? "" : TMDB_KEY,
  movies: ls.get("lbMovies",[]), results:[], bulk:[], open:new Set()
};

const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const poster = p => p ? `https://image.tmdb.org/t/p/w185${p}` : "";
const yr = m => m.release_date ? m.release_date.slice(0,4) : "";
const inList = id => state.movies.some(x=>String(x.tmdbID)===String(id));
const setStatus = t => { $("status").textContent = t; };

/* Tema */
function applyTheme(t){document.documentElement.dataset.theme=t;$("themeBtn").textContent=t==="light"?"🌙":"☀️";}
$("themeBtn").onclick=()=>{const n=document.documentElement.dataset.theme==="light"?"dark":"light";try{localStorage.setItem("lbTheme",n)}catch(e){}applyTheme(n);};
applyTheme(document.documentElement.dataset.theme||"dark");

/* Tutorial */
$("tutBtn").onclick=()=>$("tut").showModal();
$("tutClose").onclick=()=>$("tut").close();
$("tut").addEventListener("close",()=>ls.set("lbSeenTut",1));
if(!ls.get("lbSeenTut",0)) $("tut").showModal();

/* Abas */
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("on",x===b));
  ["tabSearch","tabBulk"].forEach(id=>$(id).hidden=id!==b.dataset.tab);
});

/* TMDB */
async function tmdb(q,year){
  const u=`https://api.themoviedb.org/3/search/movie?api_key=${encodeURIComponent(state.key)}&language=pt-BR&include_adult=false&query=${encodeURIComponent(q)}${year?`&year=${year}`:""}`;
  const r=await fetch(u); if(!r.ok) throw new Error(r.status);
  return (await r.json()).results||[];
}

/* Lista */
function addMovie(m){
  if(inList(m.id)) return false;
  state.movies.push({title:m.title,original_title:m.original_title,year:yr(m)?Number(yr(m)):"",tmdbID:m.id,poster_path:m.poster_path||"",rating:null,review:""});
  return true;
}
function save(){ls.set("lbMovies",state.movies);renderList();}
function counter(){$("counter").textContent=`${state.movies.filter(x=>x.rating).length}/${state.movies.length} avaliados`;}

/* Busca com botão + */
async function search(){
  const q=$("search").value.trim(); if(!q) return;
  if(!state.key){setStatus("A chave do TMDB não foi configurada (config.js).");return;}
  setStatus("Pesquisando..."); state.results=[]; renderResults();
  try{
    state.results=(await tmdb(q)).slice(0,8);
    setStatus(state.results.length?`${state.results.length} resultado(s). Toque em + para adicionar.`:"Nenhum filme encontrado.");
    renderResults();
  }catch(e){setStatus("Erro ao consultar o TMDB. Confira a chave e a conexão.");console.error(e);}
}
function renderResults(){
  $("results").innerHTML=state.results.map(m=>`
    <div class="res">
      ${m.poster_path?`<img class="poster" alt="" src="${poster(m.poster_path)}">`:`<div class="poster"></div>`}
      <div class="t"><b>${esc(m.title)}</b><span class="sub">${yr(m)||"Ano ?"}${m.original_title&&m.original_title!==m.title?" · "+esc(m.original_title):""}</span></div>
      <button class="add" data-id="${m.id}" ${inList(m.id)?"disabled title='Já na lista'":"title='Adicionar'"}>${inList(m.id)?"✓":"+"}</button>
    </div>`).join("");
}
$("results").onclick=e=>{
  const b=e.target.closest(".add"); if(!b||b.disabled) return;
  const m=state.results.find(x=>String(x.id)===b.dataset.id);
  if(m&&addMovie(m)){save();renderResults();setStatus(`Adicionado: ${m.title}`);}
};

/* Estrelas, review e remoção */
function stars(m){
  return [1,2,3,4,5].map(n=>`<span class="star ${m.rating>=n?"full":m.rating===n-.5?"half":""}" data-n="${n}">★</span>`).join("");
}
$("myList").addEventListener("click",e=>{
  const row=e.target.closest(".movie"); if(!row) return;
  const m=state.movies.find(x=>String(x.tmdbID)===row.dataset.id); if(!m) return;
  const s=e.target.closest(".star");
  if(s){
    const r=s.getBoundingClientRect(), n=Number(s.dataset.n);
    const v=e.clientX-r.left<r.width/2?n-.5:n;
    m.rating=m.rating===v?null:v; save(); return;
  }
  const a=e.target.dataset.act;
  if(a==="rm") {state.movies=state.movies.filter(x=>x!==m);state.open.delete(row.dataset.id);save();}
  else if(a==="rv"){state.open.has(row.dataset.id)?state.open.delete(row.dataset.id):state.open.add(row.dataset.id);renderList();}
  else if(a==="clr"){m.rating=null;save();}
});
$("myList").addEventListener("input",e=>{
  if(e.target.tagName!=="TEXTAREA") return;
  const m=state.movies.find(x=>String(x.tmdbID)===e.target.closest(".movie").dataset.id);
  if(m){m.review=e.target.value;ls.set("lbMovies",state.movies);}
});
function renderList(){
  const q=$("filter").value.toLowerCase(), mode=$("filterState").value;
  const list=state.movies.filter(m=>(m.title+" "+m.original_title+" "+m.year).toLowerCase().includes(q)&&(mode==="all"||(mode==="rated"?!!m.rating:!m.rating)));
  counter();
  if(!list.length){$("myList").innerHTML=`<div class="empty">${state.movies.length?"Nenhum filme nessa visão.":"Sua lista está vazia. Pesquise um filme e toque em +."}</div>`;return;}
  $("myList").innerHTML=list.map(m=>{
    const id=String(m.tmdbID), open=state.open.has(id)||m.review;
    return `<article class="movie" data-id="${id}">
      ${m.poster_path?`<img class="thumb" alt="" src="${poster(m.poster_path)}">`:`<div class="thumb"></div>`}
      <div class="info">
        <div class="title">${esc(m.title)}</div><div class="sub">${m.year||"?"}</div>
        <div class="stars">${stars(m)}${m.rating?`<span class="val">${m.rating}/5</span><button class="mini" data-act="clr" title="Limpar nota">limpar</button>`:""}</div>
        <button class="mini" data-act="rv">${open?"Ocultar review":"✎ Escrever review"}</button>
        ${open?`<textarea rows="3" placeholder="Sua review (opcional)">${esc(m.review)}</textarea>`:""}
      </div>
      <button class="x" data-act="rm" title="Remover">×</button>
    </article>`;}).join("");
}
$("filter").oninput=renderList; $("filterState").onchange=renderList;

/* Importar lista */
const parseLine=l=>{const m=l.match(/^(.*?)\s*\((\d{4})\)\s*$/);return m?{t:m[1].trim(),y:m[2]}:{t:l.trim(),y:""};};
let running=false;
$("bulkRun").onclick=async()=>{
  if(running) return;
  if(!state.key){$("bulkStatus").textContent="A chave do TMDB não foi configurada (config.js).";return;}
  const seen=new Set(), lines=$("bulkText").value.split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!seen.has(s.toLowerCase())&&seen.add(s.toLowerCase()));
  if(!lines.length){$("bulkStatus").textContent="Cole ao menos um título.";return;}
  running=true;$("bulkRun").disabled=true;
  const out=new Array(lines.length);let next=0,done=0;
  const work=async()=>{while(next<lines.length){
    const i=next++,{t,y}=parseLine(lines[i]);
    try{let r=await tmdb(t,y); if(y&&!r.length) r=await tmdb(t); out[i]={q:lines[i],m:r.slice(0,5),c:0,on:true};}
    catch(e){out[i]={q:lines[i],m:[],c:0,on:false,err:true};}
    $("bulkStatus").textContent=`Buscando... ${++done}/${lines.length}`;}};
  await Promise.all([work(),work(),work(),work()]);
  state.bulk=out.filter(x=>x.m.length); state.bulk.forEach(x=>{if(inList(x.m[0].id))x.on=false;});
  const nf=out.filter(x=>!x.m.length), er=nf.filter(x=>x.err).length;
  $("bulkStatus").textContent=`${state.bulk.length} encontrado(s), ${nf.length} não encontrado(s)${er?` (${er} por erro de conexão/chave)`:""}.`;
  $("bulkNotFound").hidden=!nf.length;$("bulkNotFoundTitle").textContent=`Não encontrados (${nf.length})`;
  $("bulkNotFoundText").value=nf.map(x=>x.q).join("\n");
  renderBulk(); running=false;$("bulkRun").disabled=false;
};
function renderBulk(){
  $("bulkFound").hidden=!state.bulk.length;
  $("bulkRows").innerHTML=state.bulk.map((it,i)=>{
    const m=it.m[it.c], dup=inList(m.id);
    return `<div class="brow">
      <input type="checkbox" data-i="${i}" ${it.on&&!dup?"checked":""} ${dup?"disabled":""}>
      ${m.poster_path?`<img class="poster" alt="" src="${poster(m.poster_path)}">`:`<div class="poster"></div>`}
      <div style="flex:1;min-width:0"><div class="title">${esc(m.title)} <span class="sub">${yr(m)}</span></div>
        <div class="sub">Você digitou: ${esc(it.q)}${dup?" · ✓ já na lista":""}</div>
        ${it.m.length>1?`<select data-i="${i}">${it.m.map((x,j)=>`<option value="${j}" ${j===it.c?"selected":""}>${esc(x.title)} (${yr(x)||"?"})</option>`).join("")}</select>`:""}
      </div></div>`;}).join("");
  const n=state.bulk.filter(x=>x.on&&!inList(x.m[x.c].id)).length;
  $("bulkCount").textContent=`${n} selecionado(s)`;$("bulkAdd").disabled=!n;
}
$("bulkRows").addEventListener("change",e=>{
  const it=state.bulk[Number(e.target.dataset.i)]; if(!it) return;
  if(e.target.tagName==="SELECT"){it.c=Number(e.target.value);it.on=!inList(it.m[it.c].id);}else it.on=e.target.checked;
  renderBulk();
});
$("bulkAdd").onclick=()=>{
  let n=0;state.bulk=state.bulk.filter(it=>{if(it.on&&addMovie(it.m[it.c])){n++;return false;}return true;});
  save();renderBulk();$("bulkStatus").textContent=`${n} filme(s) adicionado(s) à lista.`;
};
$("bulkCopy").onclick=async()=>{
  const t=$("bulkNotFoundText");
  try{await navigator.clipboard.writeText(t.value);}catch(e){t.select();document.execCommand("copy");}
  $("bulkStatus").textContent="Lista copiada.";
};

/* CSV */
const cell=v=>`"${String(v??"").replaceAll('"','""')}"`;
$("csvBtn").onclick=()=>{
  const rows=state.movies.filter(m=>m.rating||(m.review||"").trim()).map(m=>[m.title,m.year,m.tmdbID,m.rating??"",(m.review||"").trim()]);
  if(!rows.length){alert("Avalie ou escreva uma review de pelo menos um filme antes de gerar o CSV.");return;}
  const csv=["Title,Year,tmdbID,Rating,Review",...rows.map(r=>r.map(cell).join(","))].join("\r\n");
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}));
  a.download="letterboxd_import.csv";a.click();URL.revokeObjectURL(a.href);
};

$("searchBtn").onclick=search;
$("search").addEventListener("keydown",e=>{if(e.key==="Enter")search();});
$("clearAll").onclick=()=>{if(confirm("Apagar toda a sua lista?")){state.movies=[];state.open.clear();save();renderResults();}};
renderList();
