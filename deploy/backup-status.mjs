import {readFileSync,writeFileSync,unlinkSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {decryptBackup} from './drive-backup.mjs';
import {fail} from '../commerce.mjs';

export function backupStatus(directory,env=process.env){
 const required=['MVN_BACKUP_ENDPOINT','MVN_BACKUP_ENCRYPTION_KEY_B64','MVN_BACKUP_AUTH_KEY_B64'];
 let lastUpload=null,lastRestore=null;
 try{const x=JSON.parse(readFileSync(join(directory,'.mvn-drive-backup-state.json'),'utf8'));lastUpload={name:x.name,completedAt:x.completedAt};}catch{}
 try{lastRestore=JSON.parse(readFileSync(join(directory,'.mvn-restore-check.json'),'utf8'));}catch{}
 return {configured:required.every(k=>Boolean(env[k])),missing:required.filter(k=>!env[k]),lastUpload,lastRestore,
  overdue:!lastUpload?.completedAt||Date.now()-Date.parse(lastUpload.completedAt)>36*3600000,
  schedule:'Daily after 2:00 am IST; the service checks hourly.',
  note:'A successful upload confirms receiver acceptance. Restore a downloaded Drive file here to verify offsite recovery.'};
}

export function verifyDownloadedBackup(directory,archive,name,env=process.env){
 if(!/^mvn-20\d{2}-\d{2}-\d{2}\.sqlite\.enc$/.test(name||''))fail(400,'Choose a downloaded MVN encrypted backup.');
 if(!Buffer.isBuffer(archive)||archive.length<34||archive.length>6*1024*1024+34)fail(400,'Backup must be smaller than 6 MB.');
 const key=Buffer.from(env.MVN_BACKUP_ENCRYPTION_KEY_B64||'','base64');
 if(key.length!==32)fail(503,'The backup encryption key is not configured on this server.');
 let plain;
 try{plain=decryptBackup(archive,key);}catch{fail(400,'Backup authentication failed. Use a file encrypted with this store’s recovery key.');}
 const folder=mkdtempSync(join(tmpdir(),'mvn-offsite-restore-')),path=join(folder,'restore.sqlite');let db;
 try{
  writeFileSync(path,plain,{mode:0o600,flag:'wx'});
  db=new DatabaseSync(path,{readOnly:true});
  if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')fail(400,'Backup integrity check failed.');
  const counts={};for(const table of ['users','dealers','products','inventory','orders']){
   if(!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table))fail(400,'Backup is missing required store tables.');
   counts[table]=db.prepare('SELECT COUNT(*) count FROM '+table).get().count;
  }
  const result={name,completedAt:new Date().toISOString(),integrity:'ok',counts};
  writeFileSync(join(directory,'.mvn-restore-check.json'),JSON.stringify(result),{mode:0o600});
  return result;
 }finally{db?.close();plain.fill(0);try{unlinkSync(path);}catch{}rmSync(folder,{recursive:true,force:true});}
}
