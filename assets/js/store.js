/* Chrystelle Couedor — annonces partagées entre site et administration.
   Démo : localStorage sur le même navigateur. Production : Supabase Auth + RLS. */
(() => {
  'use strict';
  const config = window.CHRYSTELLE_CONFIG || {};
  const prod = Boolean(config.supabaseUrl && config.supabaseAnonKey);
  const key = 'chrystelle-couedor-annonces-v1';
  const remote = prod && window.supabase && typeof window.supabase.createClient === 'function'
    ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey)
    : null;
  const statuses = ['draft', 'published', 'under_offer', 'sold', 'rented', 'archived'];
  const liveStatus = ['published', 'under_offer', 'sold', 'rented'];
  const statusNames = {draft:'Brouillon',published:'Publié',under_offer:'Sous compromis',sold:'Vendu',rented:'Loué',archived:'Archivé'};
  const uuid = () => typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r=Math.floor(Math.random()*16); return (c==='x'?r:(r&3|8)).toString(16);
    });
  const str = x => String(x ?? '').trim();
  function validUrl(raw) {
    const input = str(raw);
    if (!input || /[\r\n\t]/.test(input)) return '';
    try {
      const u = new URL(input);
      if (!['https:', 'http:'].includes(u.protocol) || !u.hostname || u.username || u.password) return '';
      return u.href;
    } catch { return ''; }
  }
  const number = v => v === '' || v === null || v === undefined ? null : Math.max(0, Number(v) || 0);
  function normalise(entry) {
    const e = entry || {};
    const date = new Date().toISOString();
    return {
      id: e.id || uuid(),
      title: str(e.title), city: str(e.city), type: str(e.type) || 'Appartement',
      transaction: e.transaction === 'location' ? 'location' : 'vente',
      price: number(e.price), area: number(e.area), rooms: number(e.rooms), bedrooms: number(e.bedrooms),
      dpe: str(e.dpe), fees: str(e.fees), charges: number(e.charges), deposit: number(e.deposit),
      furnished: Boolean(e.furnished), description: str(e.description),
      status: statuses.includes(e.status) ? e.status : 'draft',
      external_url: str(e.external_url),
      photos: Array.isArray(e.photos) ? e.photos.filter(p => typeof p === 'string').slice(0, 12) : [],
      featured: Boolean(e.featured), created_at: e.created_at || date, updated_at: date
    };
  }
  function validate(p) {
    if (!p.title || !p.city) throw Error('Le titre et la ville sont obligatoires.');
    if (p.external_url && !validUrl(p.external_url)) throw Error('Lien invalide. Utilisez une URL commençant par https:// ou http://.');
    if (liveStatus.includes(p.status) && !validUrl(p.external_url)) throw Error('Le lien vers l’annonce officielle est obligatoire pour publier.');
  }
  function read() {
    try { const result=JSON.parse(localStorage.getItem(key) || '[]');return Array.isArray(result)?result:[]; }
    catch { return []; }
  }
  function write(list) {
    try { localStorage.setItem(key, JSON.stringify(list)); }
    catch { throw Error('Stockage local saturé : réduisez la taille des photos ou utilisez Supabase.'); }
  }
  function connected() {
    if (!remote) throw Error('Impossible de charger Supabase. Vérifiez le réseau et les clés dans config.js.');
    return remote;
  }
  async function listAll() {
    if (!prod) return read();
    const {data,error}=await connected().from('properties').select('*').order('updated_at',{ascending:false});
    if(error)throw error;return data || [];
  }
  async function listPublic() {
    if (!prod) return read().filter(p=>liveStatus.includes(p.status)&&validUrl(p.external_url));
    const {data,error}=await connected().from('properties').select('*').in('status',liveStatus).order('updated_at',{ascending:false});
    if(error)throw error;
    return (data || []).filter(p=>validUrl(p.external_url));
  }
  async function uploadPhoto(dataUrl, propertyId) {
    const match = /^data:image\/(?:webp|jpeg|png);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
    if (!match) throw Error('Format de photo incorrect.');
    const bin=atob(match[1]), bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
    const path = `${propertyId}/${uuid()}.webp`;
    const bucket=connected().storage.from(config.photoBucket || 'biens-photos');
    const {error}=await bucket.upload(path,new Blob([bytes],{type:'image/webp'}),{contentType:'image/webp',upsert:false});
    if(error)throw error;
    return bucket.getPublicUrl(path).data.publicUrl;
  }
  async function save(entry) {
    const row=normalise(entry);validate(row);
    if (!prod) {
      const all=read(), index=all.findIndex(p=>p.id===row.id);
      if(index>=0) {row.created_at=all[index].created_at;all[index]=row;}
      else all.unshift(row);
      write(all);return row;
    }
    for(let i=0;i<row.photos.length;i++){
      if (row.photos[i].startsWith('data:image/')) row.photos[i]=await uploadPhoto(row.photos[i],row.id);
      else if (!validUrl(row.photos[i])) throw Error('Adresse de photo invalide.');
    }
    const {data,error}=await connected().from('properties').upsert(row).select().single();
    if(error)throw error;return data;
  }
  async function remove(id) {
    if (!prod){write(read().filter(p=>p.id!==id));return;}
    const {error}=await connected().from('properties').delete().eq('id',id);
    if(error)throw error;
  }
  async function signIn(email,password) {
    const {error}=await connected().auth.signInWithPassword({email,password});
    if(error)throw error;
    if(!await isAdmin()) {await signOut();throw Error('Ce compte n’a pas l’autorisation d’administrer le site.');}
  }
  async function signOut() {const {error}=await connected().auth.signOut();if(error)throw error;}
  async function isAdmin() {
    if (!prod) return true;
    const {data:userData,error:userError}=await connected().auth.getUser();
    if(userError || !userData.user) return false;
    const {data,error}=await connected().rpc('is_site_admin');
    if(error)throw error;
    return data===true;
  }
  function shrinkImage(file) {
    if(!/^image\/(jpeg|png|webp)$/.test(file.type))return Promise.reject(Error('Utilisez une photo JPG, PNG ou WebP.'));
    if(file.size>12*1024*1024)return Promise.reject(Error('Chaque photo doit faire moins de 12 Mo.'));
    return new Promise((resolve,reject)=>{
      const source=URL.createObjectURL(file),image=new Image();
      image.onload=()=>{
        try {
          const max=1600,scale=Math.min(1,max/Math.max(image.naturalWidth,image.naturalHeight));
          const canvas=document.createElement('canvas');
          canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
          canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
          const ctx=canvas.getContext('2d');if(!ctx)throw Error('Votre navigateur ne peut pas traiter la photo.');
          ctx.drawImage(image,0,0,canvas.width,canvas.height);
          const output=canvas.toDataURL('image/webp',0.78);
          if(!output.startsWith('data:image/webp;'))throw Error('La compression WebP n’est pas prise en charge par le navigateur.');
          resolve(output);
        }catch(err){reject(err);}finally{URL.revokeObjectURL(source);}
      };
      image.onerror=()=>{URL.revokeObjectURL(source);reject(Error('Impossible de lire cette image.'));};
      image.src=source;
    });
  }
  window.CCStore={prod,remote,liveStatus,statusNames,validUrl,normalise,listAll,listPublic,save,remove,signIn,signOut,isAdmin,shrinkImage,read,write};
})();
