import {api,esc,money} from './commerce-api.js';
const form=document.getElementById('customerSearch'),status=document.getElementById('customerDirectoryStatus'),table=document.getElementById('customerDirectory');
let page=1,pages=1,request=0;
const date=value=>value?new Date(value).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}):'Not recorded yet';
async function load(){
 const current=++request;
 status.textContent='Loading registered accounts…';
 try{
  const result=await api('/api/admin/customers?'+new URLSearchParams({page,search:form.elements.search.value}));
  if(current!==request)return;
  pages=result.pages;status.textContent=result.total+' registered account(s) · Page '+result.page+' of '+pages;
  table.innerHTML=result.customers.length?'<div class="table-scroll"><table><thead><tr><th>Customer</th><th>Account / business</th><th>Registered / last sign-in (IST)</th><th>Orders / enquiries</th></tr></thead><tbody>'+result.customers.map(c=>'<tr><td>'+esc(c.name)+'<br>'+esc(c.email)+'</td><td>'+esc(c.role)+(c.business?'<br>'+esc(c.business)+'<br>'+esc(c.businessKind)+' · '+esc(c.businessStatus):'')+'</td><td>'+esc(date(c.created))+'<br>'+esc(date(c.lastLogin))+'</td><td><button type="button" data-customer="'+esc(c.id)+'">'+c.orderCount+' order(s) · '+c.enquiryCount+' enquiry(s)</button></td></tr>').join('')+'</tbody></table></div>':'<p>No registered accounts match your search.</p>';
  document.getElementById('customerPrevious').disabled=page<=1;document.getElementById('customerNext').disabled=page>=pages;
 }catch(e){if(current===request)status.textContent=e.message;}
}
form.addEventListener('submit',e=>{e.preventDefault();page=1;void load();});
document.getElementById('customerPrevious').onclick=()=>{if(page>1){page--;void load();}};
document.getElementById('customerNext').onclick=()=>{if(page<pages){page++;void load();}};
table.addEventListener('click',async e=>{
 const button=e.target.closest('[data-customer]');if(!button)return;
 const box=document.getElementById('customerOrderDetails');box.textContent='Loading account history…';
 try{
  const data=await api('/api/admin/customer?id='+encodeURIComponent(button.dataset.customer));
  box.innerHTML='<h3>'+esc(data.customer.name)+' — account history</h3>'+(data.orders.length?'<ul>'+data.orders.map(o=>'<li>'+esc(o.id)+' · '+esc(o.status)+' · '+money(o.totalPaise)+'</li>').join('')+'</ul>':'<p>No saved online orders.</p>')+(data.enquiries.length?'<h4>WhatsApp enquiries</h4><ul>'+data.enquiries.map(x=>'<li>'+esc(x.id)+' · '+esc(x.status)+' · '+esc(date(x.created))+'</li>').join('')+'</ul>':'<p>No enquiries linked to this account. Guest enquiries remain in Dealers & leads.</p>');
 }catch(e){box.textContent=e.message;}
});
document.addEventListener('admin-overview',()=>void load());
