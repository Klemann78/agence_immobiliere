/* Catalogue public : uniquement les annonces non brouillon, lien vers l'agence */
(() => {
 'use strict';
 const store=window.CCStore;
 const el=id=>document.getElementById(id);
 const formatter=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0});
 const txt=(tag,cls,value)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(value!==undefined)x.textContent=String(value);return x;};
 const displayPrice=p=>p.price==null?'Prix sur demande':formatter.format(p.price)+(p.transaction==='location'?' / mois':'');
 function card(p) {
  const url=store.validUrl(p.external_url);
  if(!url) return null;
  const a=txt('a','property-card');a.href=url;a.target='_blank';a.rel='noopener noreferrer';
  a.setAttribute('aria-label',`${p.title}, ${p.city} — voir l’annonce sur le site de l’agence (nouvel onglet)`);
  const photo=txt('div','property-photo');
  const source=Array.isArray(p.photos)&&p.photos.length?p.photos[0]:'';
  if(source && (source.startsWith('data:image/') || store.validUrl(source))){
   const image=txt('img');image.src=source;image.alt=`Photo du bien ${p.title}`;image.loading='lazy';photo.append(image);
  }else photo.append(txt('span','photo-fallback','Chrystelle Couedor · Immobilier'));
  const badge=txt('span','property-badge '+(p.transaction==='location'?'rent':'')+(p.status!=='published'?' special':''),p.status==='published'?(p.transaction==='location'?'À LOUER':'À VENDRE'):store.statusNames[p.status]);
  photo.append(badge);
  const info=txt('div','property-info');
  info.append(txt('span','property-city',p.city.toUpperCase()),txt('h4','',p.title));
  const features=[p.type,p.area!=null?p.area+' m²':null,p.rooms!=null?p.rooms+' pièces':null,p.bedrooms!=null?p.bedrooms+' ch.':null].filter(Boolean).join(' · ');
  info.append(txt('p','property-meta',features));
  info.append(txt('strong','property-price',displayPrice(p)));
  if(p.fees)info.append(txt('p','property-disclosure',p.fees));
  info.append(txt('span','property-cta','Voir l’annonce sur le site de l’agence ↗'));
  a.append(photo,info);return a;
 }
 async function load(){
  try{
   const rows=(await store.listPublic()).sort((a,b)=>Number(!!b.featured)-Number(!!a.featured)||String(b.updated_at||'').localeCompare(String(a.updated_at||'')));
   for(const [id,trans,label] of [['properties-sale','vente','à vendre'],['properties-rent','location','à louer']]){
    const parent=el(id);if(!parent)continue;
    parent.replaceChildren();const matching=rows.filter(p=>p.transaction===trans);
    if(!matching.length){
     const empty=txt('div','empty-properties');
     empty.append(txt('strong','',`Aucun bien ${label} pour le moment.`),txt('span','', 'De nouvelles annonces arrivent prochainement.'));parent.append(empty);
    }else matching.forEach(p=>{const c=card(p);if(c)parent.append(c);});
   }
  }catch(err){console.error('Annonces:',err);for(const id of ['properties-sale','properties-rent']){
   const e=el(id);if(e){e.replaceChildren(txt('p','empty-properties','Les annonces ne sont momentanément pas disponibles.'));}
  }}
 }
 const nav=el('public-nav'),toggle=el('menu-toggle');
 toggle?.addEventListener('click',()=>{const open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));toggle.textContent=open?'✕':'☰';});
 nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');toggle?.setAttribute('aria-expanded','false');if(toggle)toggle.textContent='☰';}));
 const config=window.CHRYSTELLE_CONFIG||{};
 for(const a of document.querySelectorAll('[data-contact="phone"]')){
  if(config.contactPhone){a.href='tel:'+config.contactPhone;a.textContent=config.contactPhoneDisplay||config.contactPhone;}
  else {a.removeAttribute('href');a.textContent='Téléphone à renseigner';}
 }
 for(const a of document.querySelectorAll('[data-contact="email"]')){
  if(config.contactEmail){a.href='mailto:'+config.contactEmail;a.textContent=config.contactEmail;}
  else{a.removeAttribute('href');a.textContent='E-mail à renseigner';}
 }
 el('estimate-form')?.addEventListener('submit',e=>{
  e.preventDefault();const form=e.currentTarget,feedback=el('estimate-feedback');
  if(!form.checkValidity()){form.reportValidity();feedback.textContent='Veuillez renseigner les champs obligatoires.';return;}
  if(!config.contactEmail){feedback.textContent='L’adresse e-mail de Chrystelle doit être configurée avant utilisation.';return;}
  const v=[['Adresse',el('adresse')?.value],['Type',el('type')?.value],['Surface',el('surface')?.value+' m²'],['E-mail',el('email')?.value],['Téléphone',el('tel')?.value]];
  const body=v.map(([k,value])=>`${k} : ${value||''}`).join('\n');
  location.href='mailto:'+config.contactEmail+'?subject='+encodeURIComponent('Demande d’estimation immobilière')+'&body='+encodeURIComponent(body);
  feedback.textContent='Votre messagerie va s’ouvrir pour envoyer votre demande.';
 });
 window.addEventListener('storage',e=>{if(!store.prod&&e.key==='chrystelle-couedor-annonces-v1')load();});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});
 load();
})();
