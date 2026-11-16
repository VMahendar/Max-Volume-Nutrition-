// One-time host-operator command, run only in the existing Render service Shell.
// This never reads, prints or stores plaintext passwords and never overwrites store data.
import {resolve,join} from 'node:path';
import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createInterface} from 'node:readline';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {openCommerce,email,passwordHash} from './commerce.mjs';

if(!process.stdin.isTTY||!process.stdout.isTTY){
 console.error('Run this command in the interactive Render service Shell.');
 process.exit(1);
}
const folder=resolve(process.env.DATA_DIR||'runtime');
if(!existsSync(join(folder,'orders.sqlite'))){
 console.error('The existing store database was not found. No changes made.');
 process.exit(1);
}
function plain(question){
 return new Promise(resolve=>{
  const rl=createInterface({input:process.stdin,output:process.stdout});
  rl.question(question,answer=>{rl.close();resolve(answer.trim())});
 });
}
async function hidden(question){
 const rl=createInterface({input:process.stdin,output:process.stdout,terminal:false});
 process.stdout.write(question);
 const off=spawnSync('stty',['-echo'],{stdio:'inherit'});
 if(off.status!==0){rl.close();throw Error('Cannot safely hide password input on this terminal. No changes made.');}
 try{
  const [answer]=await once(rl,'line');
  process.stdout.write('\n');
  return answer;
 }finally{
  spawnSync('stty',['echo'],{stdio:'inherit'});
  rl.close();
 }
}
const address=email(await plain('Owner email address: '));
const secret=await hidden('New owner password (12+ characters, invisible): ');
const password=await passwordHash(secret);
const C=openCommerce(folder);
try{
 C.tx(()=>{
  const found=C.db.prepare('SELECT id FROM users WHERE email=?').get(address);
  if(found){
   C.db.prepare("UPDATE users SET password=?,role='admin' WHERE id=?").run(password,found.id);
   C.db.prepare('DELETE FROM sessions WHERE user_id=?').run(found.id);
   C.audit('host-operator','owner.access.reset',found.id);
  } else {
   const id=randomUUID();
   C.db.prepare("INSERT INTO users(id,email,name,password,role,created) VALUES(?,?,?,?,?,?)").run(id,address,'MVN Owner',password,'admin',new Date().toISOString());
   C.audit('host-operator','owner.access.created',id);
  }
 });
 console.log('OWNER ACCESS READY. Sign in at https://maxvolumenutriton.shop/admin.html');
}catch(error){
 console.error('Owner setup failed; no committed changes:',error.message);
 process.exitCode=1;
}finally{
 C.db.close();
}