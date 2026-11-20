/* Business validation shared by forms and tests. No Firebase dependency. */
const Rules={
 plate:value=>String(value||'').toUpperCase().replace(/[^A-Z0-9]/g,''),
 validPlate:value=>/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(String(value||'')),
 digits:value=>String(value||'').replace(/\D/g,''),
 text:value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),
 cents:value=>Math.round(Number(value)*100),
 moneyValue:value=>Number.isFinite(Number(value))&&Number(value)>=0&&Math.abs(Number(value)*100-Math.round(Number(value)*100))<0.00001,
 id:()=>Math.floor(Date.now()*1000+Math.random()*1000),
 localNow:()=>{const d=new Date();return new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,16)},
 active:r=>!['Concluída','Cancelada'].includes(r.status),
 vehicles:c=>(c?.vehicles||[]),
 vehicleSnapshot:v=>({id:v.id,plate:v.plate,model:v.model,brand:v.brand||'',color:v.color||'',document:v.document?structuredClone(v.document):null}),
 trailerSnapshot:f=>({id:f.id,name:f.name,plate:f.plate||''}),
 clientError(c){if(String(c.name||'').trim().length<3||String(c.name||'').length>160)return 'Informe o nome completo (3 a 160 caracteres).';for(const key of ['phone','extra'])if(!/^(?:55)?\d{10,11}$/.test(this.digits(c[key])))return 'Informe os dois telefones com DDD.';if(this.digits(c.phone)===this.digits(c.extra))return 'O telefone extra deve ser diferente do principal.';if(!String(c.contact||'').trim())return 'Informe o nome do contato extra.';if(!String(c.address||'').trim())return 'Informe o endereço do cliente.';return ''},
 vehicleError(v,vehicles,id){if(!this.validPlate(v.plate))return 'Informe uma placa válida: ABC1234 ou ABC1D23.';if(!v.model.trim())return 'Informe o modelo do veículo.';if(vehicles.some(x=>x.id!==id&&this.plate(x.plate)===v.plate))return 'Esta placa já está cadastrada para o cliente, inclusive entre os veículos arquivados.';return ''},
 rentalError(v,rs,now=new Date()){
 if(!v.start||!v.end||!Number.isFinite(new Date(v.start).getTime())||!Number.isFinite(new Date(v.end).getTime())||v.end<=v.start)return 'A devolução deve ser posterior à retirada.';
 if(!this.moneyValue(v.price))return 'Informe um valor válido com até duas casas decimais.';
 if(rs.some(r=>r.id!==v.id&&r.fleet==v.fleet&&this.active(r)&&v.start<r.end&&v.end>r.start))return 'Este reboque já está reservado nesse intervalo.';
 if(rs.some(r=>r.id!==v.id&&r.fleet==v.fleet&&r.status==='Em locação'&&new Date(r.end)<now&&v.start>=r.end))return 'Confirme a devolução atrasada antes de reservar este reboque.';return '';
 },
 readyClient:c=>!!c?.checked&&!!c.cnhExpires&&c.cnhExpires>=new Date().toLocaleDateString('en-CA'),
 addPayment(r,amount,method,actor,refund=false){
 if(!this.moneyValue(amount)||Number(amount)<=0)throw Error('Informe um valor positivo com até duas casas decimais.');
 if(!['Pix','Dinheiro','Cartão','Transferência'].includes(method))throw Error('Escolha a forma de pagamento.');
 const cents=this.cents(amount),paid=this.cents(r.paid),price=this.cents(r.price);
 if(cents>(refund?paid:price-paid))throw Error(refund?'O estorno não pode exceder o valor recebido.':'O pagamento não pode exceder o saldo pendente.');
 if(!r.payments||r.payments.length===0)r.payments=paid?[{id:this.id(),kind:'saldo-anterior',amount:paid/100,method:r.method||'Não informado',at:null,by:null}]:[];
 r.payments.push({id:this.id(),kind:refund?'estorno':'recebimento',amount:cents/100,method,at:new Date().toISOString(),by:actor});
 r.paid=(paid+(refund?-cents:cents))/100;
 }
};
function fleetLabel(f){return f?`${f.name} · ${f.plate||'Placa não informada'}`:'Reboque não encontrado'}
function rentalFleetLabel(r){return fleetLabel(r.trailerSnapshot||unit(r.fleet))}
function clientReady(c){return !!c?.checked&&!!c.cnhExpires&&c.cnhExpires>=today()}
