import {fail} from './commerce.mjs';

export function listCustomers(C,params){
 const page=Math.max(1,Math.min(100000,Number.parseInt(params.get('page')||'1',10)||1));
 const search=String(params.get('search')||'').trim().slice(0,100);
 const pattern='%'+search.replace(/[\\%_]/g,'\\$&')+'%';
 const where="WHERE (u.name LIKE ? ESCAPE '\\' OR u.email LIKE ? ESCAPE '\\')";
 const total=C.db.prepare('SELECT COUNT(*) total FROM users u '+where).get(pattern,pattern).total;
 const customers=C.db.prepare(`SELECT u.id,u.name,u.email,u.role,u.created,
  d.kind AS businessKind,d.status AS businessStatus,d.business,
  (SELECT MAX(created) FROM audit WHERE actor=u.id AND action='account.login') AS lastLogin,
  (SELECT COUNT(*) FROM orders WHERE user_id=u.id) AS orderCount,
  (SELECT COUNT(*) FROM lead_inbox WHERE user_id=u.id) AS enquiryCount
  FROM users u LEFT JOIN dealers d ON d.user_id=u.id ${where}
  ORDER BY u.created DESC,u.id LIMIT 50 OFFSET ?`).all(pattern,pattern,(page-1)*50);
 return {customers,total,page,pageSize:50,pages:Math.max(1,Math.ceil(total/50))};
}

export function customerDetails(C,id){
 const customer=C.db.prepare('SELECT id,name,email,role,created FROM users WHERE id=?').get(id);
 if(!customer)fail(404,'Customer not found.');
 const orders=C.db.prepare('SELECT id,status,created,payload FROM orders WHERE user_id=? ORDER BY created DESC LIMIT 100').all(id)
  .map(row=>{const payload=JSON.parse(row.payload);return {id:row.id,status:row.status,created:row.created,totalPaise:payload.totalPaise,lines:payload.lines};});
 const enquiries=C.db.prepare('SELECT id,kind,status,created FROM lead_inbox WHERE user_id=? ORDER BY created DESC LIMIT 100').all(id);
 return {customer,orders,enquiries};
}
