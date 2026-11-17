import {api,esc} from './commerce-api.js';
const status=document.getElementById('storeHealthStatus');
async function load(){
 try{
  const data=await api('/api/admin/store-health'),backup=data.backup;
  status.textContent='Current checks loaded.';
  document.getElementById('backupHealth').innerHTML='<p>Offsite configuration: <strong>'+(backup.configured?'Connected':'Incomplete')+'</strong></p><p>Latest upload: '+esc(backup.lastUpload?backup.lastUpload.name+' · '+backup.lastUpload.completedAt:'Not recorded on this server')+'</p><p>'+(backup.overdue?'Upload needs checking.':'Latest recorded upload is within 36 hours.')+'</p><p>Downloaded-file restore: '+esc(backup.lastRestore?backup.lastRestore.name+' · verified '+backup.lastRestore.completedAt:'Not verified here yet')+'</p><p>'+esc(backup.schedule)+'</p>';
  document.getElementById('orderAlertHealth').innerHTML='<p>Owner alerts: '+(data.alerts.enabled?'Enabled':'Awaiting connection')+'</p>'+Object.entries(data.alerts.channels).map(([channel,value])=>'<p><strong>'+esc(channel)+'</strong>: '+(value.ready?'Ready':'Needs setup')+(value.missing.length?'<br>'+value.missing.map(esc).join(', '):'')+'</p>').join('')+'<p>Queue: '+data.alertCounts.map(x=>esc(x.status)+': '+x.count).join(' · ')+'</p><p>Alerts contain the enquiry reference and owner-dashboard link. They do not subscribe or message customers.</p>';
 }catch(e){status.textContent=e.message;}
}
document.getElementById('refreshStoreHealth').onclick=()=>void load();
document.getElementById('backupRestoreForm').onsubmit=async e=>{
 e.preventDefault();const file=document.getElementById('restoreArchive').files[0],message=document.getElementById('restoreResult'),button=e.submitter;
 if(!file||file.size>6*1024*1024+34){message.textContent='Choose an encrypted MVN backup smaller than 6 MB.';return;}
 button.disabled=true;message.textContent='Verifying the downloaded file in an isolated database…';
 try{
  const response=await fetch('/api/admin/backup-restore-check?name='+encodeURIComponent(file.name),{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:file});
  const result=await response.json();if(!response.ok)throw Error(result.error||'Restore check failed.');
  message.textContent='Verified '+result.name+': SQLite integrity OK. '+Object.entries(result.counts).map(([k,v])=>k+': '+v).join(' · ')+'. Your live database was not changed.';await load();
 }catch(error){message.textContent=error.message;}finally{button.disabled=false;}
};
document.addEventListener('admin-overview',()=>void load());
