import { scenario, assert } from './support.js';
async function open(p){await p.open();await p.waitText('#cloud-status','Sandbox QA');}
async function dates(p,start,end){
 await p.driver.executeScript(`for(const [name,value] of Object.entries(arguments[0])){const e=document.querySelector('#rf [name="'+name+'"]');e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));}`,{start,end});
}
async function detail(p){
 await p.click('button[onclick="openSummary(\'saldo\')"]');
 await p.click('button[onclick="summaryDetail(100,\'saldo\')"]');
}
scenario('sem configuracao Firebase mantem acesso bloqueado',async p=>{
 await p.open('/?qaMode=locked');await p.waitText('#access-note','Falta conectar o projeto Firebase');
 assert.equal(await p.driver.executeScript("return document.body.classList.contains('locked')"),true);
});
scenario('busca encontra cliente por placa',async p=>{
 await open(p);await p.click('[data-page="clientes"]');await p.fill('#search','DEF1G23');
 await p.waitText('#clientList','Cliente QA');
 await p.fill('#search','inexistente');await p.waitText('#clientList','Nenhum cliente encontrado.');
});
scenario('cadastro rejeita telefones iguais',async p=>{
 await open(p);await p.click('[data-page="clientes"]');await p.click('button[onclick="clientForm()"]');
 for(const [name,value]of Object.entries({name:'Outro QA',phone:'51911112222',extra:'51911112222',contact:'Contato QA',address:'Rua QA'})) await p.fill('#cf [name="'+name+'"]',value);
 await p.click('#cf button.primary');await p.waitText('#formError','telefone extra deve ser diferente');
 assert.equal(await p.driver.executeScript('return window.__qaSaves.length'),0);
});
scenario('nova reserva grava veiculo e reboque do cliente',async p=>{
 await open(p);await p.click('#newRental');await p.element('#rf');
 await dates(p,'2099-01-11T07:00','2099-01-11T13:00');
 await p.click('#rf button.primary');
 await p.driver.wait(async()=>await p.driver.executeScript('return window.__qaSaves.length===1'),10000);
 const s=await p.driver.executeScript('return window.__qaState()');
 assert.equal(s.rentals.length,2);assert.equal(s.rentals[1].status,'Reservada');
 assert.equal(s.rentals[1].vehicleSnapshot.plate,'DEF1G23');assert.equal(s.rentals[1].trailerSnapshot.plate,'ABC1D23');
});
scenario('reserva sobreposta e bloqueada sem gravar',async p=>{
 await open(p);await p.click('#newRental');await p.element('#rf');
 await dates(p,'2099-01-10T08:00','2099-01-10T12:00');
 await p.click('#rf button.primary');await p.waitText('#formError','já está reservado');
 assert.equal(await p.driver.executeScript('return window.__qaSaves.length'),0);
});
scenario('pagamento atualiza saldo e trilha financeira',async p=>{
 await open(p);await detail(p);await p.click('button[onclick="payment(100)"]');
 await p.fill('#pay [name="amount"]',10);await p.click('#pay button.primary');
 await p.driver.wait(async()=>await p.driver.executeScript('return window.__qaSaves.length===1'),10000);
 const s=await p.driver.executeScript('return window.__qaState()');
 assert.equal(s.rentals[0].paid,30);assert.equal(s.rentals[0].payments.at(-1).amount,10);
 assert.equal(s.rentals[0].payments.at(-1).method,'Pix');
});
scenario('pagamento acima do saldo e impedido pelo formulario',async p=>{
 await open(p);await detail(p);await p.click('button[onclick="payment(100)"]');
 await p.fill('#pay [name="amount"]',71);await p.click('#pay button.primary');
 assert.equal(await p.driver.executeScript('return document.querySelector("#pay").checkValidity()'),false);
 assert.equal(await p.driver.executeScript('return window.__qaSaves.length'),0);
});
scenario('erro ao salvar mantem valores persistidos',async p=>{
 await open(p);await p.click('[data-page="frota"]');await p.click('button[onclick="fleetForm(1)"]');
 await p.fill('#ff [name="half"]',70);await p.driver.executeScript('window.__qaFailNext=true');
 await p.click('#ff button.primary');await p.waitText('#formError','Falha simulada');
 const s=await p.driver.executeScript('return window.__qaState()');
 assert.equal(s.fleet[0].half,50);assert.equal(await p.driver.executeScript('return window.__qaSaves.length'),0);
});
