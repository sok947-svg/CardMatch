'use client';
import {useEffect,useMemo,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';

type Card={id:string;player:string;year:number;set_name:string;parallel:string;grade:string;sport:string;target_price:number|null};
type Comp={id:string;source:string;source_url:string|null;sale_price:number;sold_at:string|null;created_at:string};
const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);

export default function PriceResearch({db,userId,cards}:{db:SupabaseClient;userId:string;cards:Card[]}) {
  const [cardId,setCardId]=useState('');
  const [comps,setComps]=useState<Comp[]>([]);
  const [price,setPrice]=useState('');
  const [source,setSource]=useState('eBay');
  const [sourceUrl,setSourceUrl]=useState('');
  const [soldAt,setSoldAt]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const selected=cards.find(c=>c.id===cardId);
  useEffect(()=>{if(!cardId&&cards.length)setCardId(cards[0].id)},[cards,cardId]);
  useEffect(()=>{
    if(!cardId){setComps([]);return}
    let current=true;
    db.from('card_comps').select('id,source,source_url,sale_price,sold_at,created_at').eq('owned_card_id',cardId).order('created_at',{ascending:false})
      .then(({data,error})=>{if(current){setComps(data||[]);if(error)setMessage(error.message)}});
    return ()=>{current=false};
  },[db,cardId]);
  const prices=useMemo(()=>comps.map(c=>Number(c.sale_price)).sort((a,b)=>a-b),[comps]);
  const median=prices.length?prices.length%2?prices[(prices.length-1)/2]:(prices[prices.length/2-1]+prices[prices.length/2])/2:null;
  const query=selected?[selected.year,selected.player,selected.set_name,selected.parallel,selected.grade].filter(Boolean).join(' '):'';
  const ebay='https://www.ebay.com/sch/i.html?_nkw='+encodeURIComponent(query)+'&LH_Sold=1&LH_Complete=1';
  async function addComp(e:React.FormEvent){
    e.preventDefault();setMessage('');
    if(!selected)return;
    const n=Number(price);
    if(!Number.isFinite(n)||n<=0){setMessage('Enter a valid sale price.');return}
    if(sourceUrl && !/^https?:\/\//i.test(sourceUrl)){setMessage('Use a complete http or https source URL.');return}
    setBusy(true);
    const {data,error}=await db.from('card_comps').insert({user_id:userId,owned_card_id:selected.id,source,sale_price:n,source_url:sourceUrl||null,sold_at:soldAt||null}).select('id,source,source_url,sale_price,sold_at,created_at').single();
    setBusy(false);
    if(error){setMessage(error.message);return}
    setComps(prev=>[data,...prev]);setPrice('');setSourceUrl('');setSoldAt('');setMessage('Comp saved to this card.');
  }
  async function removeComp(id:string) {
    const {error}=await db.from('card_comps').delete().eq('id',id);
    if(error)setMessage(error.message);else setComps(prev=>prev.filter(c=>c.id!==id));
  }
  return <div className="stack">
    <section className="panel">
      <div className="eyebrow">CardMarket Research</div>
      <h2>Price comps</h2>
      <p className="muted">Find recent sold listings and track comparable sales for cards in your collection. Prices entered here are your own research, not live API data.</p>
      <label className="stack"><span className="muted">Card to research</span>
        <select className="field" value={cardId} onChange={e=>{setCardId(e.target.value);setMessage('')}}>
          {cards.length===0?<option value="">Add a card to your collection first</option>:cards.map(c=><option key={c.id} value={c.id}>{c.year} {c.player} · {c.set_name} · {c.parallel} · {c.grade}</option>)}
        </select>
      </label>
      {selected&&<div className="tabs">
        <a className="btn primary" href={ebay} target="_blank" rel="noopener noreferrer">Find eBay sold listings ↗</a>
        <a className="btn" href="https://130point.com/" target="_blank" rel="noopener noreferrer">Search 130 Point ↗</a>
        <a className="btn" href="https://www.sportscardspro.com/" target="_blank" rel="noopener noreferrer">Search SportsCardsPro ↗</a>
      </div>}
      <p className="muted">Compare the exact year, set, parallel, card number and grade. Active asking prices are not sold comps.</p>
    </section>
    {selected&&<div className="grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))'}}>
      <div className="panel"><span className="muted">Median saved comp</span><div className="metric gold">{median===null?'—':money(median)}</div></div>
      <div className="panel"><span className="muted">Saved sales</span><div className="metric">{prices.length}</div></div>
      <div className="panel"><span className="muted">Range</span><div style={{marginTop:20,fontWeight:700}}>{prices.length?money(prices[0])+' – '+money(prices[prices.length-1]):'No comps yet'}</div></div>
    </div>}
    {selected&&<section className="panel"><h2>Add a sold comp</h2><form onSubmit={addComp} className="stack">
      <div className="formgrid">
        <label className="stack"><span className="muted">Sold price (USD)</span><input className="field" type="number" step="0.01" min="0.01" required value={price} onChange={e=>setPrice(e.target.value)} placeholder="125.00"/></label>
        <label className="stack"><span className="muted">Source</span><select className="field" value={source} onChange={e=>setSource(e.target.value)}>{['eBay','130 Point','SportsCardsPro','Other'].map(x=><option key={x}>{x}</option>)}</select></label>
        <label className="stack"><span className="muted">Sale date (optional)</span><input className="field" type="date" value={soldAt} onChange={e=>setSoldAt(e.target.value)}/></label>
        <label className="stack"><span className="muted">Sale URL (optional)</span><input className="field" type="url" placeholder="https://..." value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)}/></label>
      </div><button disabled={busy} className="btn primary">{busy?'Saving...':'Save comp'}</button>
    </form></section>}
    {message&&<div className="notice">{message}</div>}
    {selected&&<section className="panel"><h2>Saved comp history</h2>
      {comps.length===0?<p className="muted">No sales recorded yet. Search the sources above, verify the exact card, and add your first sold comp.</p>:comps.map(c=><div className="item row" key={c.id}><div><strong>{money(Number(c.sale_price))}</strong><p className="muted">{c.source} · {c.sold_at||'Date not entered'} {c.source_url&&<> · <a href={c.source_url} target="_blank" rel="noopener noreferrer">View sale ↗</a></>}</p></div><button type="button" className="btn" onClick={()=>removeComp(c.id)}>Remove</button></div>)}
    </section>}
  </div>;
}
