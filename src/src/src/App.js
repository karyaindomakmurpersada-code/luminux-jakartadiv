import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════════════════════
// SUPABASE CONFIG — FROM YOUR .env.local
// ═══════════════════════════════════════════════════════════════════════════

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase config in .env.local');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const PROJECT_CATEGORIES = [
  { id:'upcoming',    label:'Upcoming Project',    icon:'🕐', color:'#3B82F6', bg:'#EFF6FF', border:'#BFDBFE', badge:{bg:'#DBEAFE',text:'#1D4ED8'} },
  { id:'progressing', label:'Progressing Project', icon:'⚡', color:'#F59E0B', bg:'#FFFBEB', border:'#FDE68A', badge:{bg:'#FEF3C7',text:'#B45309'} },
  { id:'completed',   label:'Completed Project',   icon:'✅', color:'#10B981', bg:'#ECFDF5', border:'#A7F3D0', badge:{bg:'#D1FAE5',text:'#065F46'} },
  { id:'cancelled',   label:'Cancelled Project',   icon:'🚫', color:'#EF4444', bg:'#FEF2F2', border:'#FECACA', badge:{bg:'#FEE2E2',text:'#991B1B'} },
];

const TECHNICIANS = [
  { name:'Wawan',    startDate:'2025-10-08', note:'' },
  { name:'Omen',     startDate:'2025-10-27', note:'Surabaya' },
  { name:'Dani',     startDate:'2026-01-05', note:'' },
  { name:'Bang Sem', startDate:'2026-01-03', note:'' },
  { name:'Yani',     startDate:'2026-03-02', note:'' },
  { name:'Gilang',   startDate:'2026-04-07', note:'Probation' },
  { name:'Marianus', startDate:'2026-06-01', note:'Probation · Surabaya' },
  { name:'Eeng',     startDate:'2026-06-01', note:'Probation' },
  { name:'Hadi',     startDate:'2026-06-01', note:'Probation' },
];

const COST_CATEGORIES = [
  'Material - Membrane','Material - LED','Material - Aluminium Profile',
  'Material - Aksesoris','Jasa Instalasi / Labor','Transportasi / Logistik',
  'Sewa Peralatan','Akomodasi Tim','Lain-lain / Overhead',
];

const STATUS_CFG = {
  'Quotation Sent': { bg:'#FFF8E7', border:'#F5C842', text:'#92650A', dot:'#F5A623' },
  'DP Received':    { bg:'#E8F5E9', border:'#66BB6A', text:'#1B5E20', dot:'#43A047' },
  'In Production':  { bg:'#E3F2FD', border:'#64B5F6', text:'#0D47A1', dot:'#1E88E5' },
  'On Site':        { bg:'#F3E5F5', border:'#CE93D8', text:'#4A148C', dot:'#8E24AA' },
  'Completed':      { bg:'#F0FDF4', border:'#86EFAC', text:'#14532D', dot:'#22C55E' },
  'Cancelled':      { bg:'#FEF2F2', border:'#FECACA', text:'#991B1B', dot:'#EF4444' },
  'Overdue':        { bg:'#FFEBEE', border:'#EF9A9A', text:'#B71C1C', dot:'#E53935' },
};

// ─── HELPERS ────────────────────────────────────────────────────────────────

const rp = v => 'Rp ' + Math.abs(Math.round(v)).toLocaleString('id-ID');
const rpS = v => { const a=Math.abs(v); if(a>=1e9) return `Rp${(v/1e9).toFixed(1)}M`; if(a>=1e6) return `Rp${(v/1e6).toFixed(0)}jt`; return rp(v); };
const daysLeft = d => Math.ceil((new Date(d)-new Date())/86400000);
const todayStr = () => new Date().toISOString().split('T')[0];
const uid = () => Math.random().toString(36).slice(2,9);
const avColor = n => ['#F5841F','#0EA5E9','#10B981','#8B5CF6','#EF4444','#F59E0B','#06B6D4','#EC4899','#84CC16'][n.charCodeAt(0)%9];

// ─── UI ATOMS ───────────────────────────────────────────────────────────────

function Bar({pct,color='#F5A623',thin=false}){
  const h=thin?5:8;
  const c=pct>100?'#EF4444':pct>85?'#F97316':color;
  return <div style={{background:'#E5E7EB',borderRadius:99,height:h,overflow:'hidden'}}>
    <div style={{width:`${Math.min(pct,100)}%`,height:'100%',background:c,borderRadius:99,transition:'width .4s'}}/>
  </div>;
}

function StatusBadge({status}){
  const c=STATUS_CFG[status]||STATUS_CFG['Quotation Sent'];
  return <span style={{background:c.bg,border:`1.5px solid ${c.border}`,color:c.text,borderRadius:99,
    fontSize:10,fontWeight:700,padding:'3px 9px',display:'inline-flex',alignItems:'center',gap:4,whiteSpace:'nowrap'}}>
    <span style={{width:5,height:5,borderRadius:'50%',background:c.dot,flexShrink:0}}/>
    {status}
  </span>;
}

function CategoryBadge({catId}){
  const cat=PROJECT_CATEGORIES.find(c=>c.id===catId);
  if(!cat) return null;
  return <span style={{background:cat.badge.bg,color:cat.badge.text,border:`1px solid ${cat.border}`,
    borderRadius:99,fontSize:10,fontWeight:700,padding:'2px 9px',display:'inline-flex',alignItems:'center',gap:4,whiteSpace:'nowrap'}}>
    {cat.icon} {cat.label}
  </span>;
}

const inputSt = {width:'100%',border:'1.5px solid #E5E7EB',borderRadius:9,padding:'9px 12px',
  fontSize:13,boxSizing:'border-box',outline:'none',color:'#111827',background:'#FFFFFF',fontFamily:'inherit'};

// ─── PROJECT CARD ───────────────────────────────────────────────────────────

function ProjectCard({p,active,onClick}){
  const cat=PROJECT_CATEGORIES.find(c=>c.id===p.category)||PROJECT_CATEGORIES[0];
  const dl=daysLeft(p.deadline);
  const dlColor=dl<0?'#EF4444':dl<14?'#F97316':'#059669';
  const tech=TECHNICIANS.find(t=>t.name===p.technician);
  const isCancelled=p.category==='cancelled';

  return(
    <div onClick={onClick} style={{
      background:active?'#FFFBF0':'#FFFFFF',
      border:`2px solid ${active?'#F5A623':'#E5E7EB'}`,
      borderLeft:`4px solid ${active?cat.color:cat.color+'66'}`,
      borderRadius:12,padding:'13px 14px',cursor:'pointer',
      transition:'all .2s',
      opacity:isCancelled?0.65:1,
      boxShadow:active?'0 4px 14px rgba(245,166,35,.15)':'0 1px 3px rgba(0,0,0,.05)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:5,gap:6}}>
        <div style={{fontSize:10,fontWeight:700,color:'#F5A623',letterSpacing:1.2,fontFamily:"'DM Mono',monospace"}}>
          {p.quote_ref}
        </div>
        <StatusBadge status={p.status}/>
      </div>
      <div style={{fontSize:14,fontWeight:800,color:'#111827',fontFamily:"'Syne',sans-serif",lineHeight:1.2,marginBottom:2}}>
        {p.client}
      </div>
      <div style={{fontSize:11,color:'#9CA3AF',marginBottom:10}}>📍 {p.location}</div>
      {!isCancelled&&(
        <div style={{marginBottom:8}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
            <span style={{fontSize:11,color:'#6B7280'}}>Progress</span>
            <span style={{fontSize:11,fontWeight:700,color:'#F5A623',fontFamily:"'DM Mono',monospace"}}>{p.progress}%</span>
          </div>
          <Bar pct={p.progress}/>
        </div>
      )}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        {tech?(
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <div style={{width:22,height:22,borderRadius:'50%',background:avColor(tech.name),
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:9,color:'#FFF',fontWeight:800,flexShrink:0}}>{tech.name.charAt(0)}</div>
            <span style={{fontSize:11,fontWeight:600,color:'#374151'}}>{tech.name}</span>
          </div>
        ):(
          <span style={{fontSize:10,color:'#D1D5DB',fontStyle:'italic'}}>Unassigned</span>
        )}
        {!isCancelled&&(
          <span style={{fontSize:11,fontWeight:700,color:dlColor,fontFamily:"'DM Mono',monospace"}}>
            {dl<0?`${Math.abs(dl)}d OVER`:`${dl}d left`}
          </span>
        )}
      </div>
    </div>
  );
}

< truncated lines 152-305 >
            const totalVal=list.reduce((s,p)=>s+(p.total_value||0),0);
            return(
              <div key={cat.id} style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:700,color:cat.color,marginBottom:8}}>
                  {cat.icon} {cat.label} ({list.length}) • {rpS(totalVal)}
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {list.map(p=><ProjectCard key={p.id} p={p} active={p.id===selectedId} onClick={()=>setSelectedId(p.id)}/>)}
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT */}
        <div style={{flex:1,padding:'20px 24px',overflowY:'auto'}}>
          {error&&<div style={{background:'#FEF2F2',border:'1px solid #FECACA',color:'#B91C1C',borderRadius:8,padding:12,marginBottom:16}}>⚠ {error}</div>}
          {sel?(
            <DetailPanel p={sel} costs={selCosts} logs={selLogs}
              onUpdate={updateProject} onAddCost={addCost} onDeleteCost={deleteCost} onAddLog={addLog}/>
          ):(
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',flexDirection:'column',gap:12}}>
              <div style={{fontSize:40}}>✦</div>
              <div style={{fontSize:16,fontWeight:700,color:'#9CA3AF'}}>Select a project</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── DETAIL PANEL (stub for now, will expand) ───────────────────────────────

function DetailPanel({p,costs,logs,onUpdate,onAddCost,onDeleteCost,onAddLog}){
  const [tab,setTab]=useState('overview');
  const cat=PROJECT_CATEGORIES.find(c=>c.id===p.category)||PROJECT_CATEGORIES[0];
  
  return(
    <div>
      <div style={{background:`linear-gradient(135deg, ${cat.bg}, #FFFFFF)`,border:`1.5px solid ${cat.border}`,borderRadius:16,padding:'18px 22px',marginBottom:18,boxShadow:`0 2px 12px ${cat.color}18`}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10,flexWrap:'wrap',gap:8}}>
          <CategoryBadge catId={p.category}/>
          <StatusBadge status={p.status}/>
        </div>
        <div style={{fontSize:10,fontWeight:700,color:'#9CA3AF',letterSpacing:1.5,fontFamily:"'DM Mono',monospace",marginBottom:4}}>
          {p.invoice_type?.toUpperCase()} · {p.quote_ref}
        </div>
        <div style={{fontSize:22,fontWeight:800,color:'#111827',fontFamily:"'Syne',sans-serif",lineHeight:1.2,marginBottom:4}}>
          {p.client}
        </div>
        <div style={{fontSize:12,color:'#6B7280',marginBottom:12}}>📍 {p.location}</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
          {[['Progress',`${p.progress}%`,'#F5A623'],['Deadline',`${Math.ceil((new Date(p.deadline)-new Date())/86400000)}d`,'#059669'],
            ['Status',p.status,'#374151'],['Value',rpS(p.total_value),'#1E40AF']].map(([l,v,c])=>(
            <div key={l} style={{background:'rgba(255,255,255,.8)',borderRadius:10,padding:8,textAlign:'center',border:'1px solid #E5E7EB'}}>
              <div style={{fontSize:9,fontWeight:600,color:'#9CA3AF',marginBottom:3}}>{l}</div>
              <div style={{fontSize:13,fontWeight:800,color:c,fontFamily:"'Syne',sans-serif"}}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{display:'flex',gap:3,background:'#F3F4F6',borderRadius:12,padding:4,marginBottom:16}}>
        {['overview','costs','logs'].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{flex:1,background:tab===t?'#FFFFFF':'transparent',border:'none',borderRadius:9,padding:8,fontSize:11,fontWeight:700,color:tab===t?cat.color:'#9CA3AF',cursor:'pointer',textTransform:'capitalize'}}>
            {t}
          </button>
        ))}
      </div>

      {tab==='overview'&&(
        <div style={{background:'#FFFFFF',border:'1px solid #E5E7EB',borderRadius:14,padding:18}}>
          <div style={{marginBottom:12}}>
            <label style={{display:'block',fontSize:11,fontWeight:700,color:'#9CA3AF',marginBottom:6,textTransform:'uppercase'}}>Status</label>
            <select value={p.status} onChange={e=>onUpdate(p.id,{status:e.target.value})} style={inputSt}>
              {['Quotation Sent','DP Received','In Production','On Site','Completed','Overdue'].map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{display:'block',fontSize:11,fontWeight:700,color:'#9CA3AF',marginBottom:6,textTransform:'uppercase'}}>Progress</label>
            <input type="range" min="0" max="100" value={p.progress} onChange={e=>onUpdate(p.id,{progress:Number(e.target.value)})} style={{width:'100%',accentColor:'#F5A623'}}/>
            <div style={{marginTop:6,fontSize:12,fontWeight:600,color:'#F5A623'}}>{p.progress}%</div>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{display:'block',fontSize:11,fontWeight:700,color:'#9CA3AF',marginBottom:6,textTransform:'uppercase'}}>Category</label>
            <select value={p.category} onChange={e=>onUpdate(p.id,{category:e.target.value})} style={inputSt}>
              {PROJECT_CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{display:'block',fontSize:11,fontWeight:700,color:'#9CA3AF',marginBottom:6,textTransform:'uppercase'}}>Technician</label>
            <select value={p.technician||''} onChange={e=>onUpdate(p.id,{technician:e.target.value})} style={inputSt}>
              <option value="">— Assign —</option>
              {TECHNICIANS.map(t=><option key={t.name} value={t.name}>{t.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {tab==='costs'&&(
        <div style={{background:'#FFFFFF',border:'1px solid #E5E7EB',borderRadius:14,padding:18}}>
          <div style={{fontSize:12,fontWeight:700,color:'#374151',marginBottom:12}}>
            Total Spent: {rpS(costs.reduce((s,c)=>s+(c.amount||0),0))}
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {costs.map(c=>(
              <div key={c.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 10px',background:'#F9FAFB',borderRadius:8,fontSize:11}}>
                <div>
                  <div style={{fontWeight:600,color:'#111827'}}>{c.description}</div>
                  <div style={{color:'#9CA3AF',fontSize:10}}>{c.category}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontWeight:700,color:'#1F2937',fontFamily:"'DM Mono',monospace"}}>{rp(c.amount)}</span>
                  <button onClick={()=>onDeleteCost(c.id)} style={{background:'#FEE2E2',border:'1px solid #FECACA',color:'#EF4444',borderRadius:6,padding:'2px 6px',cursor:'pointer',fontSize:10,fontWeight:700}}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==='logs'&&(
        <div style={{background:'#FFFFFF',border:'1px solid #E5E7EB',borderRadius:14,padding:18}}>
          <div style={{display:'flex',gap:8,marginBottom:12}}>
            <LogInput onAdd={note=>onAddLog(p.id,note)}/>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {logs.map(l=>(
              <div key={l.id} style={{padding:'10px 14px',background:'#F9FAFB',borderRadius:8}}>
                <div style={{fontWeight:600,color:'#9CA3AF',fontSize:10,marginBottom:4}}>{l.log_date}</div>
                <div style={{color:'#374151',fontSize:12}}>{l.note}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LogInput({onAdd}){
  const [text,setText]=useState('');
  return(
    <>
      <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&text.trim()){onAdd(text.trim());setText('');}}}
        placeholder="Update..." style={{...inputSt,flex:1}}/>
      <button onClick={()=>{if(text.trim()){onAdd(text.trim());setText('');}}} style={{background:'linear-gradient(135deg,#F5A623,#F5C842)',border:'none',borderRadius:10,color:'#7B3F00',fontWeight:700,cursor:'pointer',padding:'9px 16px',whiteSpace:'nowrap'}}>Log</button>
    </>
  );
}