const el=s=>document.querySelector(s);
const copy=v=>structuredClone(v);
let committed={fleet:[],clients:[],rentals:[]},revision=0,busy=false,ready=false;
const groups=['fleet','clients','rentals'];
function message(title,note){el('#access-title').textContent=title;el('#access-note').textContent=note;}
function lock(){ready=false;document.body.classList.add('locked');closeModal();state={fleet:[],clients:[],rentals:[]};el('#main').replaceChildren();}
function saving(value){busy=value;el('#saving').hidden=!value;}
function errorText(e){if(e.code==='permission-denied'||e.code==='storage/unauthorized')return 'Esta conta não tem acesso. Solicite a liberação ao administrador.';if(e.message==='CONFLICT')return 'Outra pessoa atualizou os dados. A lista foi recarregada; confira e repita a alteração.';if(e.code==='unavailable'||!navigator.onLine)return 'Sem conexão. A alteração não foi salva. Conecte-se e tente novamente.';return 'Não foi possível concluir. Confira a conexão e tente novamente.';}
async function start(){
 const config=window.APP_FIREBASE_CONFIG;
 if(!config?.apiKey||!config?.projectId||!config?.authDomain||!config?.storageBucket){message('Seu sistema está em preparação','Falta conectar o projeto Firebase para ativar o login e salvar os cadastros. Nenhum dado real pode ser inserido nesta etapa.');return;}
 try{
 const base='https://www.gstatic.com/firebasejs/12.4.0/';
 const [appSDK,A,F,S]=await Promise.all(['firebase-app.js','firebase-auth.js','firebase-firestore.js','firebase-storage.js'].map(x=>import(base+x)));
 const app=appSDK.initializeApp(config),auth=A.getAuth(app),db=F.getFirestore(app),storage=S.getStorage(app),meta=F.doc(db,'management','revision');
 await A.setPersistence(auth,A.inMemoryPersistence);
 const users=window.installUserAdmin({appSDK,A,F,auth,db,config});
 let stopProfile=()=>{};
 const logout=()=>A.signOut(auth);
 el('#logout').onclick=logout;el('#access-signout').onclick=logout;
 async function load(){
  for(let i=0;i<3;i++){
   const before=await F.getDocFromServer(meta);
   const records=await Promise.all(groups.map(g=>F.getDocsFromServer(F.collection(db,g))));
   const after=await F.getDocFromServer(meta);
   if((before.data()?.version||0)!==(after.data()?.version||0))continue;
   revision=after.data()?.version||0;
   committed=Object.fromEntries(groups.map((g,i)=>[g,records[i].docs.map(d=>d.data())]));
   state=copy(committed);state.fleet=seed().fleet.map(f=>state.fleet.find(x=>x.id===f.id)||f);
   render();return;
  }
  throw Error('CONFLICT');
 }
 window.rvCloud={actor:()=>({uid:auth.currentUser?.uid||'',email:auth.currentUser?.email||''}),snapshot:()=>copy(committed),async save(next){
  if(!ready||busy)throw Error('Aguarde a conexão antes de salvar.');
  saving(true);
  try{
   if(!navigator.onLine)throw Error('Offline');
   const desired=copy(next),expected=revision;
   const changes=groups.flatMap(g=>desired[g].filter(r=>JSON.stringify(r)!==JSON.stringify(committed[g].find(old=>old.id===r.id))).map(r=>({g,r})));
   if(changes.length>450)throw Error('Muitas alterações de uma vez.');
   await F.runTransaction(db,async tx=>{
    const snap=await tx.get(meta);
    if((snap.data()?.version||0)!==expected)throw Error('CONFLICT');
    for(const {g,r}of changes)tx.set(F.doc(db,g,String(r.id)),r);
    tx.set(meta,{version:expected+1,updatedAt:F.serverTimestamp(),updatedBy:auth.currentUser.uid});
   });
   committed=desired;revision++;el('#cloud-status').textContent='Dados salvos na nuvem';
  }catch(e){
   closeModal();
   try{await load()}catch{lock();message('Conexão interrompida','Recarregue a página e entre novamente para consultar os dados atualizados.');}
   const failure=Error(errorText(e));failure.code=e.message==='CONFLICT'?'stale-edit':e.code;throw failure;
  }finally{saving(false)}
 },async upload(clientId,kind,file){
  if(!window.APP_DOCUMENTS_ENABLED)throw Error('O envio de documentos ainda não foi ativado.');
  if(!ready)throw Error('Entre novamente para anexar.');
  if(!['image/jpeg','image/png','application/pdf'].includes(file.type)||file.size>10*1024*1024||!file.size)throw Error('Selecione PDF, JPG ou PNG de até 10 MB.');
  const path=`documents/${clientId}/${kind}/${crypto.randomUUID()}`;
  await S.uploadBytes(S.ref(storage,path),file,{contentType:file.type});
  return {path,name:file.name,type:file.type,size:file.size,uploadedAt:new Date().toISOString()};
 },async removeFile(path){await S.deleteObject(S.ref(storage,path))},async openFile(path,name='documento'){
  const blob=await S.getBlob(S.ref(storage,path),10*1024*1024),url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
 }};
 el('#login').onsubmit=async e=>{e.preventDefault();const f=e.target;el('#access-error').textContent='';f.querySelector('button').disabled=true;try{await A.signInWithEmailAndPassword(auth,f.email.value,f.password.value);f.password.value=''}catch{el('#access-error').textContent='Não foi possível entrar. Confira e-mail, senha e conexão.'}finally{f.querySelector('button').disabled=false}};
 el('#recover').onclick=async()=>{const email=el('#login').email;if(!email.reportValidity())return;try{await A.sendPasswordResetEmail(auth,email.value);el('#access-error').textContent='Se houver uma conta com esse e-mail, você receberá as instruções.'}catch{el('#access-error').textContent='Não foi possível enviar. Confira o e-mail e tente novamente.'}};
 A.onAuthStateChanged(auth,async user=>{
  stopProfile();users.clear();lock();el('#access-signout').hidden=!user;el('#login').hidden=!!user;
  if(!user){committed={fleet:[],clients:[],rentals:[]};message('Bem-vindo à gestão de locações','Entre para consultar a agenda, os clientes e os recebimentos.');return;}
  message('Carregando sua agenda','Conferindo o acesso à empresa…');
  try{await users.loadProfile(user);await load();if(auth.currentUser?.uid!==user.uid)return;stopProfile=users.watchProfile(user,()=>{lock();message('Acesso bloqueado','Seu acesso foi bloqueado pelo administrador.');});ready=true;document.body.classList.remove('locked');el('#cloud-status').textContent='Conectado · '+user.email;}catch(e){message('Acesso não disponível',errorText(e));}
 });
 window.addEventListener('focus',async()=>{if(ready&&!busy&&!el('#modal').open){try{await load()}catch{el('#cloud-status').textContent='Não foi possível atualizar. Confira a conexão.'}}});
 }catch{message('Não foi possível conectar','Confira a configuração do Firebase e sua conexão. Recarregue para tentar novamente.');}
}
start();
