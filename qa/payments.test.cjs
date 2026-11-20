const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');

// Executa a regra real, sem adaptar a implementação ou acessar Firebase.
const Rules=vm.runInNewContext(readFileSync(join(__dirname,'../domain.js'),'utf8')+';Rules', {structuredClone});
const actor={uid:'qa',email:'qa@example.test'};
const ledgerCents=r=>r.payments.reduce((sum,p)=>sum+(p.kind==='estorno'?-1:1)*Rules.cents(p.amount),0);
const reconciles=r=>assert.equal(ledgerCents(r),Rules.cents(r.paid));

for(const [name,history] of [['ausente',undefined],['nulo',null],['vazio',[]]]) {
  test('estorno reconcilia saldo legado com historico '+name,()=>{
    const r={price:90,paid:20,method:'Cartão',payments:structuredClone(history)};
    Rules.addPayment(r,20,'Pix',actor,true);
    assert.equal(r.paid,0);assert.equal(r.price,90);assert.equal(r.payments.length,2);
    const previous=r.payments[0],refund=r.payments[1];
    assert.equal(previous.kind,'saldo-anterior');assert.equal(previous.amount,20);
    assert.equal(previous.method,'Cartão');assert.equal(previous.at,null);assert.equal(previous.by,null);
    assert.equal(refund.kind,'estorno');assert.equal(refund.amount,20);assert.equal(refund.method,'Pix');
    assert.deepEqual(refund.by,actor);assert.ok(Number.isFinite(Date.parse(refund.at)));
    reconciles(r);
  });
}

test('recebimentos e estornos sucessivos registram saldo anterior uma unica vez',()=>{
  const r={price:90,paid:20,payments:[]};
  for(const [amount,refund,expected] of [[10,false,30],[5,true,25],[25,true,0],[2,false,2]]) {
    Rules.addPayment(r,amount,'Dinheiro',actor,refund);
    assert.equal(r.paid,expected);reconciles(r);
    assert.equal(r.payments.filter(p=>p.kind==='saldo-anterior').length,1);
  }
  assert.equal(r.payments[0].method,'Não informado');
  assert.deepEqual(structuredClone(r.payments.map(p=>[p.kind,p.amount])),[
    ['saldo-anterior',20],['recebimento',10],['estorno',5],['estorno',25],['recebimento',2]
  ]);
});

test('historico detalhado e preservado sem sintetizar saldo anterior',()=>{
  const entries=[{id:7,kind:'recebimento',amount:20,method:'Pix',at:'2026-01-01T12:00:00Z'},
    {id:8,kind:'estorno',amount:5,method:'Pix',at:'2026-01-02T12:00:00Z',note:'QA'}];
  const r={price:90,paid:15,payments:structuredClone(entries)};
  Rules.addPayment(r,10,'Transferência',actor,true);
  assert.equal(r.paid,5);assert.deepEqual(r.payments.slice(0,2),entries);
  assert.equal(r.payments.length,3);assert.equal(r.payments.some(p=>p.kind==='saldo-anterior'),false);
  reconciles(r);
});

test('saldo zero com historico vazio inicia apenas o recebimento real',()=>{
  const r={price:90,paid:0,payments:[]};
  for(const [amount,refund,expected] of [[10,false,10],[10,true,0],[5,false,5]]) {
    Rules.addPayment(r,amount,'Pix',actor,refund);
    assert.equal(r.paid,expected);reconciles(r);
  }
  assert.equal(r.payments.length,3);assert.equal(r.payments.some(p=>p.kind==='saldo-anterior'),false);
});

test('tentativas invalidas preservam saldo e historico legado',()=>{
  for(const [amount,method,refund,error] of [[0,'Pix',false,/positivo/],[-1,'Pix',true,/positivo/],
    [0.001,'Pix',false,/positivo/],[21,'Pix',true,/estorno/],[71,'Pix',false,/pagamento/],
    [1,'Invalido',false,/forma de pagamento/]]) {
    const r={price:90,paid:20,payments:[]},before=structuredClone(r);
    assert.throws(()=>Rules.addPayment(r,amount,method,actor,refund),error);
    assert.deepEqual(r,before);
  }
});
