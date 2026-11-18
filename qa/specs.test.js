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

const adjacentReservations=[
 ['devolucao coincide com a proxima retirada','2099-01-10T06:00','2099-01-10T07:00'],
 ['retirada coincide com a devolucao anterior','2099-01-10T13:00','2099-01-10T14:00']
];
for(const [name,start,end] of adjacentReservations){
 scenario(name+' permite reserva sem alterar a anterior',async p=>{
  await open(p);
  const original=await p.driver.executeScript('return window.__qaState().rentals[0]');
  await p.click('#newRental');await p.element('#rf');await dates(p,start,end);
  await p.click('#rf button.primary');
  await p.driver.wait(async()=>await p.driver.executeScript('return window.__qaSaves.length===1'),10000);
  const saved=await p.driver.executeScript('return window.__qaState()');
  assert.equal(saved.rentals.length,2);
  assert.deepEqual(saved.rentals[0],original,'reserva anterior deve ser preservada');
  assert.equal(saved.rentals[1].start,start);assert.equal(saved.rentals[1].end,end);
  assert.equal(saved.rentals[1].fleet,original.fleet);
  assert.equal(saved.rentals[1].status,'Reservada');
 });
}
const rejectedIntervals=[
 ['sobreposicao de um minuto na retirada','2099-01-10T06:00','2099-01-10T07:01','já está reservado'],
 ['sobreposicao de um minuto na devolucao','2099-01-10T12:59','2099-01-10T14:00','já está reservado'],
 ['intervalo engloba reserva existente','2099-01-10T06:00','2099-01-10T14:00','já está reservado'],
 ['devolucao igual a retirada','2099-01-11T07:00','2099-01-11T07:00','posterior à retirada'],
 ['devolucao anterior a retirada','2099-01-11T13:00','2099-01-11T07:00','posterior à retirada']
];
for(const [name,start,end,error] of rejectedIntervals){
 scenario(name+' rejeita sem persistir',async p=>{
  await open(p);
  const original=await p.driver.executeScript('return window.__qaState()');
  await p.click('#newRental');await p.element('#rf');await dates(p,start,end);
  await p.click('#rf button.primary');await p.waitText('#formError',error);
  assert.equal(await p.driver.executeScript('return window.__qaSaves.length'),0);
  assert.deepEqual(await p.driver.executeScript('return window.__qaState()'),original,
   'tentativa rejeitada deve preservar o estado persistido');
  assert.equal(await (await p.element('#rf [name="start"]')).getAttribute('value'),start);
  assert.equal(await (await p.element('#rf [name="end"]')).getAttribute('value'),end);
 });
}

scenario('reserva paga exige estorno antes de cancelar e preserva trilha financeira',async p=>{
 await open(p);const original=await p.driver.executeScript('return window.__qaState()');
 await detail(p);await p.click('button[onclick="cancelRental(100)"]');
 await p.waitText('#modal','Registre a devolução desse valor antes de cancelar');
 assert.equal(await p.driver.executeScript('return window.__qaSaves.length'),0);
 assert.deepEqual(await p.driver.executeScript('return window.__qaState()'),original);
 await p.click('button[onclick="payment(100,true)"]');
 await p.fill('#pay [name="amount"]',20);await p.fill('#pay [name="note"]','Estorno fictício QA');
 await p.click('#pay input[type="checkbox"]');await p.click('#pay button.primary');
 await p.driver.wait(()=>p.driver.executeScript('return window.__qaSaves.length===1'),10000);
 const refunded=await p.driver.executeScript('return window.__qaState().rentals[0]');
 assert.equal(refunded.paid,0);assert.equal(refunded.status,'Reservada');
 assert.equal(refunded.price,original.rentals[0].price);
 assert.deepEqual(refunded.payments.map(x=>[x.kind,x.amount]),[['saldo-anterior',20],['estorno',20]]);
 assert.equal(refunded.payments.at(-1).note,'Estorno fictício QA');
 assert.equal(refunded.payments.at(-1).method,'Pix');
 await p.click('button[onclick="cancelRental(100)"]');
 await p.fill('#cancelForm [name="reason"]','Cancelamento fictício QA');
 await p.click('#cancelForm button.primary');
 await p.driver.wait(()=>p.driver.executeScript('return window.__qaSaves.length===2'),10000);
 const cancelled=await p.driver.executeScript('return window.__qaState()');
 assert.equal(cancelled.rentals.length,1,'cancelamento mantém o histórico da reserva');
 assert.equal(cancelled.rentals[0].status,'Cancelada');
 assert.equal(cancelled.rentals[0].cancelReason,'Cancelamento fictício QA');
 assert.equal(cancelled.rentals[0].paid,0);
 assert.deepEqual(cancelled.rentals[0].payments,refunded.payments);
 assert.deepEqual(cancelled.clients,original.clients);assert.deepEqual(cancelled.fleet,original.fleet);
});
scenario('estorno superior ao recebido bloqueia formulario sem gravar',async p=>{
 await open(p);const original=await p.driver.executeScript('return window.__qaState()');
 await detail(p);await p.click('button[onclick="payment(100,true)"]');
 await p.fill('#pay [name="amount"]',21);await p.fill('#pay [name="note"]','Tentativa fictícia QA');
 await p.click('#pay input[type="checkbox"]');await p.click('#pay button.primary');
 assert.equal(await p.driver.executeScript('return document.querySelector("#pay [name=amount]").validity.rangeOverflow'),true);
 assert.equal(await p.driver.executeScript('return document.querySelector("#pay").checkValidity()'),false);
 assert.equal(await p.driver.executeScript('return window.__qaSaves.length'),0);
 assert.deepEqual(await p.driver.executeScript('return window.__qaState()'),original,
  'estorno rejeitado não deve mudar saldo nem pagamentos');
});
