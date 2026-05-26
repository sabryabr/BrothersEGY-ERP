const{google}=require("googleapis");
const admin=require("firebase-admin");
const fs=require("fs");

const SHEETS={
  cars:{id:"1tQVkPj7tCnrKsHEIs04a1WzzC04jpOWuLsXgXOkVMkk",tab:"صفحة الإدخالات لقاعدة البيانات",collection:"fleet",idCol:0,minFields:2},
  orders:{id:"1T6j2xnRBTY31crQcJHioKurs4Rvaj-VlEQkm6joGxGM",tab:"صفحة الإدخالات للإيجارات",collection:"bookings",idCol:0,minFields:3},
  clients:{id:"13YZOGdRCEy7IMZHiTmjLFyO417P8dD0m5Sh9xwKI8js",tab:"صفحة الإدخالات لقاعدة البيانات",collection:"customers",idCol:0,minFields:2},
  collections:{id:"1jtp-ihtAOt9NNHETZ5muiL5OA9yW3WrpBIIDAf5UAyg",tab:"صفحة الإدخالات لقاعدة البيانات",collection:"collections",idCol:null,minFields:2},
  car_expenses:{id:"1vDKKOywOEGfmLcHr4xk7KMTChHJ0_qquNopXpD81XVE",tab:"صفحة الإدخالات لقاعدة البيانات",collection:"car_expenses",idCol:null,minFields:2},
  gen_expenses:{id:"1hZoymf0CN1wOssc3ddQiZXxbJTdzJZBnamp_aCobl1Q",tab:"صفحة الإدخالات لقاعدة البيانات",collection:"gen_expenses",idCol:null,minFields:2}
};

const SA="./service-account.json";
const GC="./google-credentials.json";
const PID="brothers-egy-portal";
const BSZ=400;
const MCE=20;
let db,sheets;

function initFirebase(){
  if(admin.apps.length)return;
  const sa=JSON.parse(fs.readFileSync(SA,"utf8"));
  admin.initializeApp({credential:admin.credential.cert(sa),projectId:PID});
  db=admin.firestore();
  log("Firebase","OK");
}

async function initSheets(){
  const creds=JSON.parse(fs.readFileSync(GC,"utf8"));
  const auth=new google.auth.GoogleAuth({credentials:creds,scopes:["https://www.googleapis.com/auth/spreadsheets.readonly"]});
  sheets=google.sheets({version:"v4",auth:await auth.getClient()});
  log("Sheets","OK");
}

function log(s,m){console.log("["+new Date().toLocaleString("en-GB")+"] ["+s+"] "+m);}
function safe(v){return v==null?"":String(v).trim();}
function filled(r){return(r||[]).filter(c=>safe(c)!=="").length;}

function hdrs(raw){
  const seen={};
  return raw.map(function(h,i){
    var k=safe(h)||("_c"+i);
    if(seen[k]!==undefined){seen[k]++;k=k+"_"+seen[k];}else{seen[k]=0;}
    return k;
  });
}

function did(cfg,row,i){
  if(cfg.idCol!==null){
    var raw=safe(row[cfg.idCol]||"");
    var v=raw.split(" ").join("_").split(".").join("").split("/").join("_").slice(0,80);
    if(v&&v!=="0")return v;
  }
  return "row_"+(i+2);
}

async function syncSheet(key,cfg){
  log(key,"-> "+cfg.collection);
  var rows;
  try{
    var r=await sheets.spreadsheets.values.get({spreadsheetId:cfg.id,range:"'"+cfg.tab+"'!A:ZZ"});
    rows=r.data.values||[];
  }catch(e){log(key,"ERR:"+e.message);return{written:0,skipped:0,error:e.message};}
  if(rows.length<2){log(key,"empty");return{written:0,skipped:0};}
  var hs=hdrs(rows[0]||[]);
  var data=rows.slice(1);
  log(key,data.length+" rows "+hs.length+" cols");
  var w=0,s=0,ce=0,batch=db.batch(),cnt=0;
  for(var i=0;i<data.length;i++){
    var row=data[i]||[];
    var f=filled(row);
    if(f<(cfg.minFields||1)){s++;ce++;if(ce>=MCE){log(key,"stop r"+(i+2));break;}continue;}
    ce=0;
    if(cfg.idCol!==null){var idv=safe(row[cfg.idCol]||"");if(!idv||idv==="0"){s++;continue;}}
    var doc={};
    hs.forEach(function(h,j){var v=safe(row[j]||"");if(v!=="")doc[h]=v;});
    doc._synced_at=String(Date.now());
    doc._source="sheets";
    doc._sheet_key=key;
    doc._row_index=String(i+2);
    batch.set(db.collection(cfg.collection).doc(did(cfg,row,i)),doc,{merge:true});
    cnt++;w++;
    if(cnt>=BSZ){await batch.commit();log(key,"batch "+cnt);batch=db.batch();cnt=0;}
  }
  if(cnt>0)await batch.commit();
  log(key,"w="+w+" s="+s);
  return{written:w,skipped:s};
}

async function main(){
  var t=Date.now();
  console.log("");
  console.log("=== Brothers EGY ERP Sync ===");
  console.log("");
  initFirebase();
  await initSheets();
  var res={};
  for(var e of Object.entries(SHEETS)){res[e[0]]=await syncSheet(e[0],e[1]);console.log("");}
  console.log("=== Done in "+((Date.now()-t)/1000).toFixed(1)+"s ===");
  Object.entries(res).forEach(function(e){
    console.log("  "+(e[1].error?"FAIL":"OK  ")+"  "+e[0].padEnd(14)+" w:"+e[1].written);
  });
  try{await db.collection("_sync_log").add({timestamp:Date.now(),results:JSON.stringify(res)});}catch(e){}
  process.exit(0);
}

main().catch(function(e){console.error("[FATAL]",e.message);process.exit(1);});