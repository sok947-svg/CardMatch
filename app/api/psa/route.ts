import {NextRequest,NextResponse} from 'next/server';
export const runtime='nodejs';
export async function GET(req:NextRequest){
 const cert=req.nextUrl.searchParams.get('cert')?.trim()||'';
 if(!/^\d{5,12}$/.test(cert))return NextResponse.json({error:'Enter a valid PSA certification number.'},{status:400});
 const token=process.env.PSA_API_TOKEN;
 if(!token)return NextResponse.json({error:'PSA API token is not configured on the server.'},{status:503});
 try{
  const headers={Authorization:'Bearer '+token,Accept:'application/json'};
  const res=await fetch('https://api.psacard.com/publicapi/cert/GetByCertNumber/'+cert,{headers,cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!res.ok)return NextResponse.json({error:res.status===404?'PSA certification not found.':res.status===401||res.status===403?'PSA rejected the API token.':'PSA lookup unavailable ('+res.status+').'},{status:res.status===404?404:502});
  const body=await res.json();const x=body.PSACert||body.PsaCert||body.psaCert||body.Cert||body;
  if(body.IsValidRequest===false||!x||typeof x!=='object'||!Object.keys(x).length)return NextResponse.json({error:body.ServerMessage||'No PSA certification details were returned.'},{status:404});
  const val=(...names:string[])=>{for(const name of names){const v=x[name];if(v!==null&&v!==undefined&&String(v).trim())return String(v).trim()}return ''};
  const result={cert,player:val('Subject','subject','Player','PlayerName'),year:val('Year','year'),set_name:val('Brand','SetName','setName','BrandName'),parallel:val('Variety','variety'),grade:val('GradeDescription','gradeDescription','CardGrade','Grade','grade'),sport:val('Category','category'),card_number:val('CardNumber','cardNumber')};
  let images:string[]=[];
  try{const ir=await fetch('https://api.psacard.com/publicapi/cert/GetImagesByCertNumber/'+cert,{headers,cache:'no-store',signal:AbortSignal.timeout(8000)});if(ir.ok){const img=await ir.json();const values:string[]=[];function scan(o:unknown,depth=0){if(depth>4||values.length>8||o==null)return;if(typeof o==='string'){if(/^https:\/\//.test(o)&&/\.(jpg|jpeg|png|webp)(\?|$)/i.test(o))values.push(o);return}if(Array.isArray(o))o.forEach(v=>scan(v,depth+1));else if(typeof o==='object')Object.values(o).forEach(v=>scan(v,depth+1))}scan(img);images=[...new Set(values)].filter(v=>{try{return new URL(v).protocol==='https:'}catch{return false}}).slice(0,2)}}}catch{}
  return NextResponse.json({card:result,images,psaUrl:'https://www.psacard.com/cert/'+cert});
 }catch{return NextResponse.json({error:'Could not reach PSA. Try again shortly.'},{status:502})}
}
