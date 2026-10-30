import { useEffect, useMemo, useState } from 'react';
import { Activity, Atom, Database, FlaskConical, Upload, RefreshCw, Download, AlertTriangle, Thermometer, BrainCircuit, LayoutDashboard, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const API = 'http://127.0.0.1:8001/api';
type Row = {id?:number; sample_id:string; lithology:string; temperature_c:number; ucs_mpa:number|null; porosity_pct:number|null; pwave_km_s:number|null; elastic_modulus_gpa:number|null; strain_pct?:number|null; stress_mpa?:number|null};
const props = [
 {key:'ucs_mpa',label:'UCS (MPa)'}, {key:'porosity_pct',label:'Porosity (%)'},
 {key:'pwave_km_s',label:'P-wave velocity (km/s)'}, {key:'elastic_modulus_gpa',label:'Elastic modulus (GPa)'}
] as const;
type PropKey = typeof props[number]['key'];
type Page = 'overview'|'experiments'|'thermal'|'datasets';

const navItems: {id:Page;label:string;icon:any}[] = [
 {id:'overview',label:'Overview',icon:LayoutDashboard},
 {id:'experiments',label:'Experiments',icon:FlaskConical},
 {id:'thermal',label:'Thermal analysis',icon:Thermometer},
 {id:'datasets',label:'Dataset library',icon:Database}
];

export default function App() {
 const [page,setPage]=useState<Page>('overview');
 const [data,setData]=useState<Row[]>([]), [summary,setSummary]=useState<any>(null);
 const [property,setProperty]=useState<PropKey>('ucs_mpa'), [busy,setBusy]=useState(false);
 const [message,setMessage]=useState(''), [error,setError]=useState('');
 const [lith,setLith]=useState('Sandstone'), [temp,setTemp]=useState(450), [prediction,setPrediction]=useState<any>(null);
 const liths=[...new Set(data.map(x=>x.lithology))];

 async function load() {
  setBusy(true); setError(''); setMessage('');
  try {
   const seed=await fetch(`${API}/seed`,{method:'POST'}); if(!seed.ok) throw new Error(`Seed request failed: ${seed.status}`);
   const [dr,sr]=await Promise.all([fetch(`${API}/experiments`),fetch(`${API}/summary`)]);
   if(!dr.ok||!sr.ok) throw new Error('Could not retrieve experiment data.');
   setData(await dr.json()); setSummary(await sr.json()); setMessage('Experiment dataset loaded.');
  } catch(e:any) { setError(`Cannot connect to backend at ${API}. Keep the backend terminal running. ${e.message||''}`); }
  finally {setBusy(false);}
 }
 useEffect(()=>{void load()},[]);
 async function upload(file?:File) {
  if(!file)return; setBusy(true); setError(''); setMessage('');
  try {const fd=new FormData();fd.append('file',file);const r=await fetch(`${API}/upload`,{method:'POST',body:fd});const j=await r.json();if(!r.ok)throw new Error(j.detail||'Upload failed');setMessage(`Uploaded ${j.inserted_rows} observations.`);await load();}
  catch(e:any){setError(e.message)} finally{setBusy(false)}
 }
 async function predict() {
  setError('');setPrediction(null);
  try {const r=await fetch(`${API}/predict`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lithology:lith,temperature_c:temp,property})});const j=await r.json();if(!r.ok)throw new Error(j.detail||'Prediction failed');setPrediction(j)}
  catch(e:any){setError(e.message)}
 }
 const chart=useMemo(()=>{
  const m=new Map<string,any>();
  data.forEach(r=>{const k=`${r.lithology}-${r.temperature_c}`,v=m.get(k)||{temperature_c:r.temperature_c,lithology:r.lithology,sum:0,n:0};const x=r[property];if(x!=null){v.sum+=Number(x);v.n++}m.set(k,v)});
  return [...m.values()].map(v=>({...v,value:v.n?Number((v.sum/v.n).toFixed(3)):null})).sort((a,b)=>a.temperature_c-b.temperature_c);
 },[data,property]);
 function exportCsv() {
  const cols=['sample_id','lithology','temperature_c',...props.map(p=>p.key)];
  const csv=[cols.join(','),...data.map(r=>cols.map(c=>`"${String((r as any)[c]??'').replaceAll('"','""')}"`).join(','))].join('\n');
  const a=document.createElement('a'),u=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.href=u;a.download='rocklab-experiments.csv';a.click();URL.revokeObjectURL(u);
 }
 const chartBlock = <div className="panel wide">
  <div className="panel-head"><div><small className="eyebrow">PROPERTY RESPONSE</small><h2>Property vs. temperature</h2><p>Mean value by lithology and treatment temperature</p></div>
   <select value={property} onChange={e=>setProperty(e.target.value as PropKey)}>{props.map(p=><option key={p.key} value={p.key}>{p.label}</option>)}</select></div>
  <div className="chart">{data.length?<ResponsiveContainer width="100%" height="100%"><LineChart margin={{top:10,right:15,left:0,bottom:12}}><CartesianGrid stroke="#263449" strokeDasharray="3 3"/><XAxis dataKey="temperature_c" type="number" domain={['dataMin','dataMax']} tick={{fill:'#91a0b5',fontSize:11}} label={{value:'Temperature (°C)',position:'insideBottom',offset:-5,fill:'#91a0b5'}}/><YAxis tick={{fill:'#91a0b5',fontSize:11}}/><Tooltip contentStyle={{background:'#111c2d',border:'1px solid #33445d',borderRadius:9}}/><Legend/>{liths.map((l,i)=><Line key={l} data={chart.filter(x=>x.lithology===l)} dataKey="value" name={l} type="monotone" stroke={i===0?'#73d6c4':'#e7b76b'} strokeWidth={2.5} dot={{r:3}} connectNulls/>)}</LineChart></ResponsiveContainer>:<div className="empty">Load data to view property trends.</div>}</div>
 </div>;
 const tableBlock = <div className="panel wide"><div className="panel-head"><div><small className="eyebrow">DATA MANAGEMENT</small><h2>Experiment observations</h2><p>Uploaded and synthetic measurements</p></div>
  <div className="actions"><label className="upload"><Upload size={15}/> Upload CSV<input type="file" accept=".csv" disabled={busy} onChange={e=>{void upload(e.target.files?.[0]);e.currentTarget.value=''}}/></label><button className="quiet" onClick={exportCsv} disabled={!data.length}><Download size={15}/> Export CSV</button></div></div>
  <div className="table-wrap"><table><thead><tr><th>Sample</th><th>Lithology</th><th>Temp °C</th><th>UCS MPa</th><th>Porosity %</th><th>P-wave km/s</th><th>Modulus GPa</th></tr></thead><tbody>{data.map((r,i)=><tr key={r.id??i}><td>{r.sample_id}</td><td><span className="tag">{r.lithology}</span></td><td>{r.temperature_c}</td><td>{r.ucs_mpa??'—'}</td><td>{r.porosity_pct??'—'}</td><td>{r.pwave_km_s??'—'}</td><td>{r.elastic_modulus_gpa??'—'}</td></tr>)}{!data.length&&<tr><td colSpan={7} className="empty">No observations loaded yet.</td></tr>}</tbody></table></div>
  <small className="table-foot">Showing {data.length} observations</small>
 </div>;

 return <div className="shell">
  <aside className="sidebar"><div className="brand"><div className="mark"><Atom/></div><div><b>ROCKLAB <em>AI</em></b><small>ROCK MECHANICS INTELLIGENCE</small></div></div>
   <div className="nav-title">WORKSPACE</div>
   {navItems.map(item=>{const Icon=item.icon;return <button key={item.id} className={`nav ${page===item.id?'active':''}`} onClick={()=>{setPage(item.id);setMessage('');setError('')}}><Icon/> {item.label}</button>})}
   <div className="side-foot"><span className="dot"/> LOCAL RESEARCH PROTOTYPE · v1.1</div>
  </aside>
  <main><header><div><small className="eyebrow">GEO-SCIENCE / ROCK MECHANICS</small><h1>{page==='overview'?'Thermal Damage Intelligence':page==='experiments'?'Experiment observations':page==='thermal'?'Thermal analysis':'Dataset library'}</h1><p>{page==='overview'?'Explore temperature-dependent changes in rock properties.':page==='experiments'?'Review, upload and export rock experiment measurements.':page==='thermal'?'Compare measured rock properties across treatment temperatures.':'Inspect the datasets currently available in this workspace.'}</p></div>
   <button className="quiet" onClick={()=>void load()} disabled={busy}><RefreshCw size={15}/> {busy?'Refreshing…':'Refresh data'}</button></header>
   {error&&<div className="alert"><AlertTriangle size={17}/>{error}</div>}{message&&<div className="notice">{message}</div>}
   {page==='overview'&&<>
    <section className="metrics">
     <Metric icon={<Database/>} label="Observations" value={summary?.total_observations??'—'} sub="Experimental records"/>
     <Metric icon={<Atom/>} label="Lithologies" value={summary?.lithologies?.length??'—'} sub={(summary?.lithologies||[]).join(' · ')||'Rock groups'}/>
     <Metric icon={<Activity/>} label="Mean UCS" value={summary?.average_ucs_mpa!=null?`${summary.average_ucs_mpa} MPa`:'—'} sub="Across loaded observations"/>
     <Metric icon={<Thermometer/>} label="Max temperature" value={summary?.maximum_temperature_c!=null?`${summary.maximum_temperature_c}°C`:'—'} sub="Highest treatment"/>
    </section>
    <section className="grid">{chartBlock}
     <div className="panel"><div className="panel-head"><div><small className="eyebrow">MACHINE LEARNING</small><h2>AI property estimate</h2><p>Random Forest regression baseline</p></div><BrainCircuit className="brain"/></div>
      <label>Lithology</label><select value={lith} onChange={e=>setLith(e.target.value)}>{(liths.length?liths:['Sandstone','Dolerite']).map(x=><option key={x}>{x}</option>)}</select>
      <label>Target property</label><select value={property} onChange={e=>setProperty(e.target.value as PropKey)}>{props.map(p=><option key={p.key} value={p.key}>{p.label}</option>)}</select>
      <div className="range-label"><label>Temperature</label><b>{temp} °C</b></div><input type="range" min="25" max="700" step="25" value={temp} onChange={e=>setTemp(+e.target.value)}/>
      <button className="primary" onClick={()=>void predict()}><BrainCircuit size={15}/> Run prediction</button>
      {prediction&&<div className="prediction"><small>ESTIMATED {props.find(p=>p.key===property)?.label.toUpperCase()}</small><strong>{prediction.predicted_value}</strong><small>MAE {prediction.mae} · R² {prediction.r2}</small><p>{prediction.warning}</p></div>}
      <p className="hint">Exploratory model estimates do not replace laboratory measurements.</p>
     </div>{tableBlock}</section>
   </>}
   {page==='experiments'&&<section className="grid single">{tableBlock}</section>}
   {page==='thermal'&&<section className="grid single">{chartBlock}<div className="panel"><small className="eyebrow">INTERPRETATION NOTE</small><h2>Reading thermal trends</h2><p className="prose">Compare the direction and magnitude of property changes across lithologies. A decrease in P-wave velocity or UCS may indicate changes in rock integrity, but these trends should be interpreted alongside laboratory methods, sample variability and measurement uncertainty.</p><p className="hint">The displayed values are grouped means. Synthetic observations are illustrative, not experimental evidence.</p></div></section>}
   {page==='datasets'&&<section className="grid single">
    <div className="panel"><div className="panel-head"><div><small className="eyebrow">DATASET LIBRARY</small><h2>Available dataset</h2><p>Data currently loaded into the local RockLab workspace</p></div><FileSpreadsheet className="brain"/></div>
     <div className="dataset-stats"><Metric icon={<Database/>} label="Total observations" value={data.length} sub="Rows currently loaded"/><Metric icon={<Atom/>} label="Lithologies" value={liths.length} sub={liths.join(' · ')||'No lithologies'}/><Metric icon={<Thermometer/>} label="Temperature range" value={data.length?`${Math.min(...data.map(x=>x.temperature_c))}–${Math.max(...data.map(x=>x.temperature_c))}°C`:'—'} sub="Observed treatment range"/></div>
     <div className="dataset-actions"><label className="upload"><Upload size={15}/> Upload CSV<input type="file" accept=".csv" disabled={busy} onChange={e=>{void upload(e.target.files?.[0]);e.currentTarget.value=''}}/></label><button className="quiet" onClick={exportCsv} disabled={!data.length}><Download size={15}/> Export current dataset</button><button className="quiet" onClick={()=>void load()} disabled={busy}><RefreshCw size={15}/> Reload dataset</button></div>
     <p className="prose">Expected CSV columns include sample_id, lithology, temperature_c and rock-property measurements such as ucs_mpa, porosity_pct, pwave_km_s and elastic_modulus_gpa. Missing property values can be left blank if supported by the backend upload schema.</p>
    </div>{tableBlock}
   </section>}
   <footer>ROCKLAB AI · Research decision-support prototype · Synthetic data is illustrative only</footer>
  </main>
 </div>;
}
function Metric({icon,label,value,sub}:any){return <div className="metric"><div className="metric-icon">{icon}</div><div><small>{label}</small><strong>{value}</strong><span>{sub}</span></div></div>}
