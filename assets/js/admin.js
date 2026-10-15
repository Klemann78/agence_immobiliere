(() => {
'use strict';
const store=window.CCStore;
const $=(s)=>document.querySelector(s);
let properties=[],editingId=null,photos=[],saving=false;
const labels={draft:'Brouillon',published:'En ligne',under_offer:'Sous compromis',sold:'Vendu',rented:'Loué',archived:'Archivé'};
const fmt=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0});
const fields=['title','city','type','transaction','price','area','rooms','bedrooms','dpe','fees','charges','deposit','description','url','status','featured','furnished'];
function escape(value) {return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function alertUser(message,error=false){const n=$('#alert-zone');n.textContent=message;n.classList.toggle('error',error);if(n.scrollIntoView&&error)n.scrollIntoView({behavior:'smooth',block:'nearest'});}
function selectScreen(view){
 for(const s of document.querySelectorAll('.screen'))s.hidden=s.id!==`view-${view}`;
 const title={overview:'Vue d’ensemble',list:'Mes annonces',editor:editingId?'Modifier un bien':'Ajouter un bien',help:'Aide & mise en ligne'}[view]||'';
 $('#page-label').textContent=title;
 document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
 $('#alert-zone').textContent='';$('.sidebar').classList.remove('mobile-open');window.scrollTo({top:0,behavior:'instant'});
 if(view==='list')renderTable(); if(view==='overview')renderOverview();
}
function statusBadge(status){return `<span class="status-pill ${escape(status)}">${escape(labels[status]||status)}</span>`;}
function photoThumb(p,cls){const src=Array.isArray(p.photos)?p.photos[0]:null;if(src&&isImageSource(src))return `<img class="${cls}" src="${escape(src)}" alt="">`;return `<span class="${cls}" aria-hidden="true">⌂</span>`;}
function isImageSource(url){return typeof url==='string' && (url.startsWith('data:image/')||!!store.validUrl(url));}
function renderOverview(){
 const all=properties.length;$('#stat-total').textContent=all;
 $('#stat-live').textContent=properties.filter(p=>store.liveStatus.includes(p.status)).length;
 $('#stat-drafts').textContent=properties.filter(p=>p.status==='draft').length;
 $('#stat-done').textContent=properties.filter(p=>['sold','rented'].includes(p.status)).length;
 $('#side-total').textContent=String(all);
 const area=$('#overview-list');
 if(!all){area.innerHTML=`<div class="empty-list"><strong>Aucun bien pour le moment</strong><p>Créez votre première annonce pour commencer.</p><button type="button" class="btn btn-dark" data-new>＋ Ajouter un bien</button></div>`;return;}
 area.innerHTML=properties.slice(0,5).map(p=>`<div class="recent-item">${photoThumb(p,'recent-image')}<div class="recent-meta"><strong>${escape(p.title)} · ${escape(p.city)}</strong><small>${p.transaction==='vente'?'Vente':'Location'}${p.price!=null?' · '+fmt.format(p.price)+' €':''}</small></div><div class="recent-right">${statusBadge(p.status)}<button class="recent-edit" data-edit="${escape(p.id)}" type="button">Modifier ↗</button></div></div>`).join('');
}
function renderTable(){
 const search=($('#search-properties').value||'').toLowerCase().trim();const filter=$('#filter-status').value;const trans=$('#filter-transaction').value;
 const data=properties.filter(p=>(filter==='all'||p.status===filter)&&(trans==='all'||p.transaction===trans)&&(`${p.title} ${p.city} ${p.type}`).toLowerCase().includes(search));
 $('#rows-summary').textContent=`${data.length} annonce${data.length>1?'s':''}`;
 const tbody=$('#property-rows');
 if(!data.length){tbody.innerHTML='<tr><td colspan="6"><div class="empty-list"><strong>Aucune annonce trouvée</strong><p>Essayez un autre filtre ou ajoutez un bien.</p></div></td></tr>';return;}
 tbody.innerHTML=data.map(p=>{
  const url=store.validUrl(p.external_url);
  return `<tr><td><div class="row-property">${photoThumb(p,'row-thumb')}<span><strong>${escape(p.title)}</strong><small>${escape(p.city)}${p.area?' · '+escape(p.area)+' m²':''}</small></span></div></td><td>${escape(p.transaction==='vente'?'Vente':'Location')}</td><td>${p.price!=null?fmt.format(p.price)+' €':'—'}</td><td>${statusBadge(p.status)}</td><td>${url?`<a class="table-link" href="${escape(url)}" target="_blank" rel="noopener noreferrer">Ouvrir ↗</a>`:'<span class="no-link">Lien non renseigné</span>'}</td><td><div class="actions-cell"><button class="table-btn" type="button" data-edit="${escape(p.id)}">Modifier</button><button class="table-btn danger" type="button" data-delete="${escape(p.id)}">Supprimer</button></div></td></tr>`;
 }).join('');
}
function updateRentFields(){document.querySelectorAll('.only-rent').forEach(x=>x.hidden=$('#p-transaction').value!=='location');}
function readField(name){const node=$(`#p-${name}`);return node.type==='checkbox'?node.checked:node.value;}
function assignField(name,value){const node=$(`#p-${name}`);if(node.type==='checkbox')node.checked=!!value;else node.value=value??'';}
function setEditor(item){
 editingId=item?.id||null;const x=item||{title:'',city:'',type:'Appartement',transaction:'vente',price:'',area:'',rooms:'',bedrooms:'',dpe:'',fees:'',charges:'',deposit:'',description:'',external_url:'',status:'draft',featured:false,furnished:false,photos:[]};
 for(const f of fields)assignField(f,f==='url'?x.external_url:x[f]);photos=Array.isArray(x.photos)?x.photos.slice():[];
 $('#editor-heading').textContent=editingId?'Modifier un bien':'Ajouter un bien';$('#editor-message').textContent='';$('#photo-info').textContent='';
 updateRentFields();renderPhotos();updateStatusPill();checkPreviewUrl();selectScreen('editor');
}
function updateStatusPill(){const status=$('#p-status').value,n=$('#edit-status-pill');n.textContent=labels[status]||status;n.className=`status-pill ${status}`;}
function checkPreviewUrl(){const link=store.validUrl($('#p-url').value);const preview=$('#preview-url');preview.hidden=!link;if(link)preview.href=link;else preview.removeAttribute('href');}
function renderPhotos(){const parent=$('#photo-grid');parent.replaceChildren();photos.forEach((src,i)=>{
  const item=document.createElement('div');item.className='photo-item';
  const img=document.createElement('img');img.src=src;img.alt='Photo '+(i+1);item.append(img);
  if(i===0){const tag=document.createElement('span');tag.className='photo-cover';tag.textContent='Couverture';item.append(tag)}
  const controls=document.createElement('div');controls.className='photo-controls';
  for(const [action,symbol,label] of [['up','↑','Monter la photo'],['down','↓','Descendre la photo'],['remove','✕','Supprimer la photo']]){
   const button=document.createElement('button');button.type='button';button.textContent=symbol;button.title=label;button.dataset.photoAction=action;button.dataset.photoIndex=String(i);if(action==='up'&&i===0||action==='down'&&i===photos.length-1)button.disabled=true;controls.append(button);
  }
  item.append(controls);parent.append(item);
 });}
async function addPhotos(fileList){
 const list=Array.from(fileList||[]);if(!list.length)return;
 if(photos.length+list.length>12){$('#photo-info').textContent='Maximum 12 photos par annonce.';return;}
 $('#photo-info').textContent='Optimisation et import des photos en cours…';
 try{for(const file of list){photos.push(await store.shrinkImage(file));renderPhotos();}$('#photo-info').textContent=`${photos.length} photo${photos.length>1?'s':''} prête${photos.length>1?'s':''}.`;}
 catch(e){$('#photo-info').textContent=e.message;}
 finally{$('#p-photos').value='';}
}
async function saveProperty(asDraft=false){
 if(saving)return;
 if(!$('#p-title').value.trim()||!$('#p-city').value.trim()){$('#editor-message').textContent='Veuillez remplir le titre et la ville.';return;}
 const data=Object.fromEntries(fields.map(f=>[f,readField(f)]));data.external_url=data.url;delete data.url;
 if(asDraft)data.status='draft';
 if(store.liveStatus.includes(data.status)&&!store.validUrl(data.external_url)){$('#editor-message').textContent='Ajoutez l’URL officielle de l’agence avant de publier.';$('#p-url').focus();return;}
 if(!photos.length&&store.liveStatus.includes(data.status)){
   // Not mandatory, but transparent about appearance.
 }
 data.photos=photos.slice();data.id=editingId||undefined;
 if(editingId){const existing=properties.find(p=>p.id===editingId);if(existing)data.created_at=existing.created_at;}
 saving=true;$('#save-property').disabled=true;$('#save-draft').disabled=true;$('#editor-message').textContent='Enregistrement en cours…';
 try{const saved=await store.save(data);await refresh();selectScreen('list');alertUser(`Le bien « ${saved.title} » a été ${saved.status==='draft'?'enregistré en brouillon':'enregistré avec le statut « '+labels[saved.status]+' »'}.`);}
 catch(e){$('#editor-message').textContent=e.message;}
 finally{saving=false;$('#save-property').disabled=false;$('#save-draft').disabled=false;}
}
async function removeProperty(id){const item=properties.find(p=>p.id===id);if(!item)return;
 if(!window.confirm(`Supprimer définitivement « ${item.title} » ?\nCette action ne peut pas être annulée.`))return;
 try{await store.remove(id);await refresh();selectScreen('list');alertUser('Annonce supprimée.');}
 catch(e){alertUser(e.message,true)}
}
async function refresh(){properties=await store.listAll();properties.sort((a,b)=>Number(!!b.featured)-Number(!!a.featured)||String(b.updated_at||'').localeCompare(String(a.updated_at||'')));$('#side-total').textContent=String(properties.length);renderOverview();renderTable();}
async function showLoggedIn(){
 try {
   if(store.prod){$('#demo-banner').hidden=true;$('#mode-label').textContent='Mode connecté';$('#logout-btn').hidden=false;$('#local-actions').hidden=true;}
   else{$('#demo-banner').hidden=false;$('#mode-label').textContent='Mode démo';$('#logout-btn').hidden=true;$('#local-actions').hidden=false;}
   await refresh();$('#auth-gate').hidden=true;$('#admin-shell').hidden=false;selectScreen('overview');
 }catch(e){$('#admin-shell').hidden=true;$('#auth-gate').hidden=false;$('#login-error').textContent='Impossible de charger les annonces : '+e.message;}
}
async function initialize(){
 if(!store.prod){await showLoggedIn();return;}
 try {if(await store.isAdmin())await showLoggedIn();else{$('#auth-gate').hidden=false;$('#admin-shell').hidden=true;}}
 catch(e){$('#auth-gate').hidden=false;$('#login-error').textContent=e.message;}
}
function backup(){const blob=new Blob([JSON.stringify(properties,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='sauvegarde-chrystelle-annonces.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
async function importBackup(file){
 try{const data=JSON.parse(await file.text());if(!Array.isArray(data))throw new Error('Le fichier doit contenir une liste d’annonces.');if(data.length>200)throw new Error('Limite de 200 annonces par import.');
 if(!confirm(`Importer ${data.length} annonces dans ce navigateur ? Les identifiants existants seront écrasés.`))return;
 let count=0;for(const row of data){if(typeof row!=='object'||!row)continue;await store.save(row);count++;}
 await refresh();alertUser(`${count} annonce(s) importée(s).`);
 }catch(e){alertUser('Import impossible : '+e.message,true)}finally{$('#import-json').value='';}
}
function bind(){
 document.addEventListener('click',e=>{
   const edit=e.target.closest('[data-edit]'),del=e.target.closest('[data-delete]'),newBtn=e.target.closest('[data-new]'),view=e.target.closest('[data-view]');
   if(edit){const found=properties.find(p=>p.id===edit.dataset.edit);if(found)setEditor(found);}else if(del){removeProperty(del.dataset.delete);}else if(newBtn){setEditor(null);}else if(view){selectScreen(view.dataset.view);}
 });
 $('#property-form').addEventListener('submit',e=>{e.preventDefault();saveProperty(false);});
 $('#save-draft').addEventListener('click',()=>saveProperty(true));
 $('#p-transaction').addEventListener('change',updateRentFields);
 $('#p-status').addEventListener('change',updateStatusPill);
 $('#p-url').addEventListener('input',checkPreviewUrl);
 $('#p-photos').addEventListener('change',e=>addPhotos(e.target.files));
 $('#photo-grid').addEventListener('click',e=>{
   const b=e.target.closest('[data-photo-action]');if(!b)return;
   const i=Number(b.dataset.photoIndex);if(b.dataset.photoAction==='remove')photos.splice(i,1);
   if(b.dataset.photoAction==='up'&&i>0)[photos[i-1],photos[i]]=[photos[i],photos[i-1]];
   if(b.dataset.photoAction==='down'&&i<photos.length-1)[photos[i],photos[i+1]]=[photos[i+1],photos[i]];
   renderPhotos();
 });
 for(const id of ['search-properties','filter-status','filter-transaction']){$('#'+id).addEventListener(id==='search-properties'?'input':'change',renderTable);}
 $('#sidebar-toggle').addEventListener('click',()=>$('.sidebar').classList.toggle('mobile-open'));
 $('#login-form').addEventListener('submit',async e=>{e.preventDefault();const button=$('#login-form button[type="submit"]');button.disabled=true;$('#login-error').textContent='';try{await store.signIn($('#login-email').value,$('#login-password').value);await showLoggedIn();}catch(err){$('#login-error').textContent=err.message;}finally{button.disabled=false;}});
 $('#logout-btn').addEventListener('click',async()=>{try{await store.signOut();$('#admin-shell').hidden=true;$('#auth-gate').hidden=false;$('#login-password').value='';}catch(e){alertUser(e.message,true)}});
 $('#export-json').addEventListener('click',backup);$('#import-json').addEventListener('change',e=>{if(e.target.files[0])importBackup(e.target.files[0]);});
}
document.addEventListener('DOMContentLoaded',()=>{bind();initialize();});
})();
