const {readFileSync}=require('node:fs');const vm=require('node:vm');const assert=require('node:assert/strict');
const source=readFileSync(__dirname+'/../cloud.js','utf8').replace('import(base+x)','sdk(x)').replace("}catch{message('Não foi possível conectar'","}catch(e){console.error(e);message('Não foi possível conectar'");
async function fixture(){
 const records=new Map(),elements=new Map();let fail=false,closed=0;const element=()=>({textContent:'',hidden:false,open:false,replaceChildren(){}});
 const get=p=>({exists:()=>records.has(p),data:()=>structuredClone(records.get(p))});
 const F={getFirestore:()=>({}),doc:(_,a,b)=>a+'/'+b,collection:(_,g)=>g,getDocFromServer:async p=>get(p),getDocsFromServer:async g=>({docs:[...records].filter(([p])=>p.startsWith(g+'/')).map(([,v])=>({data:()=>structuredClone(v)}))}),serverTimestamp:()=>123,
 runTransaction:async(_,fn)=>{if(fail)throw Object.assign(Error('unavailable'),{code:'unavailable'});const staged=[];await fn({get:async p=>get(p),set:(p,v)=>staged.push([p,structuredClone(v)])});for(const [p,v]of staged)records.set(p,v)}};
 const auth={currentUser:{uid:'owner',email:'example@example.test'}};let resolve;const loaded=new Promise(r=>resolve=r);
 const A={getAuth:()=>auth,setPersistence:async()=>{},inMemoryPersistence:{},onAuthStateChanged:(_,cb)=>{Promise.resolve(cb(auth.currentUser)).then(resolve)},signOut:async()=>{}};
 const context={structuredClone,URL,console,setTimeout,crypto:require('node:crypto').webcrypto,navigator:{onLine:true},state:{},seed:()=>({fleet:[{id:1,name:'Fazendinha 01',half:50,full:90}]}),closeModal(){closed++},render(){},document:{querySelector:s=>{if(!elements.has(s))elements.set(s,element());return elements.get(s)},body:{classList:{add(){},remove(){}}}},window:{installUserAdmin:()=>({clear(){},async loadProfile(){},watchProfile(){return ()=>{}}}),APP_DOCUMENTS_ENABLED:true,APP_FIREBASE_CONFIG:{apiKey:'fake',projectId:'test',authDomain:'test',storageBucket:'test'},addEventListener(){}},sdk:async name=>name==='firebase-app.js'?{initializeApp:()=>({})}:name==='firebase-auth.js'?A:name==='firebase-firestore.js'?F:{getStorage:()=>({})}};
 vm.createContext(context);vm.runInContext(source,context);await Promise.race([loaded,new Promise((_,reject)=>setTimeout(()=>reject(Error('Initialization: '+elements.get('#access-note')?.textContent)),1000))]);return {context,records,closed:()=>closed,fail:v=>fail=v};
}
(async()=>{
 const f=await fixture(),cloud=f.context.window.rvCloud;
 assert.equal(f.context.state.clients.length,0,'No demo clients');
 f.context.state.clients.push({id:123,name:'Teste'});await cloud.save(f.context.state);
 assert.equal(f.records.get('clients/123').name,'Teste');assert.equal(f.records.get('management/revision').version,1);
 f.records.set('management/revision',{version:2});f.records.set('clients/123',{id:123,name:'Outra pessoa'});
 const beforeClose=f.closed();f.context.state.clients[0].name='Edição antiga';await assert.rejects(()=>cloud.save(f.context.state),/Outra pessoa atualizou/);
 assert.ok(f.closed()>beforeClose,'Stale form must be closed before refreshing');assert.equal(f.records.get('clients/123').name,'Outra pessoa');assert.equal(cloud.snapshot().clients[0].name,'Outra pessoa');
 f.fail(true);f.context.state.clients[0].name='Não salvar';await assert.rejects(()=>cloud.save(f.context.state),/Sem conexão/);assert.equal(f.records.get('clients/123').name,'Outra pessoa');
 await assert.rejects(()=>cloud.upload(123,'cnh',{type:'text/html',size:20}),/Selecione PDF/);
 console.log('PASS: initial empty state, successful save, stale edit rejection, rollback after failure, invalid upload rejection. Firebase SDK mocked; rules not exercised.');
})().catch(e=>{console.error(e);process.exitCode=1});

// Navigation must not dispatch a second hashchange render over a fresh screen.
{
 let hash='',renders=0;const queued=[];const context={document:{querySelector(){return {}}},Date,Number,String,Math,localStorage:{getItem(){return null}},location:{get hash(){return hash},set hash(value){hash=value.startsWith('#')?value:'#'+value;queued.push(()=>{renders++})}},history:{pushState(_state,_title,value){hash=value}},console};
 vm.createContext(context);vm.runInContext(readFileSync(__dirname+'/../app.js','utf8'),context);vm.runInContext('render=()=>{recordRender()}',Object.assign(context,{recordRender:()=>{renders++}}));
 context.go('frota');queued.forEach(fn=>fn());assert.equal(renders,1,'Navigation must render exactly once');assert.equal(hash,'#frota');
 console.log('PASS: navigation updates URL without queuing duplicate hashchange render.');
}
