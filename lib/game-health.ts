import 'server-only';
const games = [
  ['president','Président','https://le-president-production.up.railway.app'],
  ['quiz-master','QuizMaster','https://www.quizzmaster.fr'],
  ['la-meute','La Meute','https://www.lameutenoire.fr'],
  ['10000','10000','https://lewisdee.onrender.com'],
  ['camouflip','Camouflip','https://camouflip-production.up.railway.app'],
  ['fortune-empire','Fortune Empire','https://atlasroyal-production.up.railway.app'],
  ['kilomax','Kilomax','https://www.kilomax.fr'],
] as const;
type HealthRow = { id:string; game:string; availability:string; http_status:number|null; response_ms:number; websocket:string; checked_at:string };
let cached: { expires:number; rows:HealthRow[] } | null = null;
function checkSocket(origin:string):Promise<boolean> {
  return new Promise(resolve => {
    if(typeof WebSocket==='undefined'){ resolve(false);return; }
    const ws=new WebSocket(origin.replace(/^https:/,'wss:')+'/ws');
    let finished=false;
    const finish=(ok:boolean)=>{ if(finished)return;finished=true;clearTimeout(timer);ws.close();resolve(ok); };
    const timer=setTimeout(()=>finish(false),5000);
    ws.onopen=()=>finish(true);ws.onerror=()=>finish(false);ws.onclose=()=>finish(false);
  });
}
export async function gameHealth():Promise<HealthRow[]> {
  if(cached && cached.expires>Date.now())return cached.rows;
  const rows=await Promise.all(games.map(async([id,game,origin])=>{
    const start=Date.now();let http_status:number|null=null,availability='Ne répond pas',websocket='Non vérifié';
    try {
      const response=await fetch(origin+(id==='10000'?'/health':'/'),{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(6000)});
      http_status=response.status;
      availability=response.ok?'Répond aux requêtes HTTP':`Erreur HTTP ${response.status}`;
      if(id==='10000'){
        const live=await checkSocket(origin);websocket=live?'Connexion disponible':'Connexion indisponible';
        if(!live)availability='Connexion de jeu indisponible';
      }
    }catch{availability='Vérification réseau en échec';}
    return {id,game,availability,http_status,response_ms:Date.now()-start,websocket,checked_at:new Date().toISOString()};
  }));
  cached={expires:Date.now()+30000,rows};return rows;
}
