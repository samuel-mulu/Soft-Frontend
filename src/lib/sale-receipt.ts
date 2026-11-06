import { getLogoUrl } from '@/lib/brand';
import { formatDozen, formatDozenValue, formatSignedDozen } from '@/lib/pack-quantity';

export type SaleReceiptData={
 businessName:string;
 logoUrl?:string;
 dateLabel:string;
 customerLabel:string;
 customerPhone?:string;
 paymentMode:'total'|'detail';
 paymentMethodLabel?:string;
 /** qty / sold / returned / withCustomer / balance are single-bottle counts; printed in dozens. */
 moneyLines:{name:string;qty:number;perDozen?:number;qtyLabel?:string;unitPrice:string;lineTotal:string;paid?:string;method?:string;credit?:string}[];
 subtotal:string;
 discount:string;
 total:string;
 received:string;
 remaining:string;
 bottleLines?:{product:string;sold:number;perDozen?:number;soldLabel?:string;returned:number;returnedLabel?:string;withCustomer:number}[];
 bottleBalances?:{name:string;balance:number;perDozen?:number}[];
 note?:string;
 receiptRef?:string;
};

const esc=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function fmtBal(n:number,perDozen?:number){
 return formatSignedDozen(n,perDozen);
}

function moneyRow(cells:string[],head=false){
 const tag=head?'th':'td';
 return `<tr>${cells.map(c=>`<${tag}>${c}</${tag}>`).join('')}</tr>`;
}

function receiptFileName(ref:string){
 return `receipt-${ref.replace(/[^\w.-]+/g,'_').slice(0,40)}.html`;
}

export function resolveReceiptLogoUrl(){
 return getLogoUrl();
}

export function buildSaleReceiptHtml(d:SaleReceiptData,opts?:{autoPrint?:boolean}){
 const moneyHead=d.paymentMode==='detail'
  ?['Product','Qty (dz)','Price / dz','Line','Paid','Method','Credit']
  :['Product','Qty (dz)','Price / dz','Line'];
 const moneyBody=d.moneyLines.map(l=>{
  const qtyCell=formatDozen(l.qty,l.perDozen);
  const base=[esc(l.name),qtyCell,esc(l.unitPrice),esc(l.lineTotal)];
  if(d.paymentMode==='detail')base.push(esc(l.paid||'—'),esc(l.method||'—'),esc(l.credit||'—'));
  return moneyRow(base);
 }).join('');

 const bottleBlock=d.bottleLines?.length?`
  <h2 class="section">Bottles · this sale</h2>
  <table class="tbl compact"><thead>${moneyRow(['Product','Sold','Returned','Kept'],true)}</thead>
  <tbody>${d.bottleLines.map(b=>{return moneyRow([esc(b.product),formatDozen(b.sold,b.perDozen),formatDozen(b.returned,b.perDozen),formatDozen(b.withCustomer,b.perDozen)]);}).join('')}</tbody></table>`:'';

 const balanceRows:string[]=[];
 const creditWarn=!/^0\.00 ETB$/i.test(d.remaining.trim());
 balanceRows.push(`<div class="bal-row"><span>Money credit (this sale)</span><strong class="${creditWarn?'warn':'ok'}">${esc(d.remaining)}</strong></div>`);
 if(d.bottleBalances?.length){
  for(const b of d.bottleBalances){
   const cls=b.balance<0?'warn':b.balance>0?'ok':'';
   balanceRows.push(`<div class="bal-row"><span>Bottles · ${esc(b.name)}</span><strong class="${cls}">${fmtBal(b.balance,b.perDozen)}</strong></div>`);
  }
 }else if(d.bottleLines?.length){
  const kept=d.bottleLines.reduce((s,x)=>s+x.withCustomer/(x.perDozen||12),0);
  balanceRows.push(`<div class="bal-row"><span>Bottles kept (this sale)</span><strong class="${kept>0?'warn':''}">${kept>0?'+':''}${formatDozenValue(kept)}</strong></div>`);
 }

 const logo=d.logoUrl?`<img class="logo" src="${esc(d.logoUrl)}" alt=""/>`:'';
 const payNote=d.paymentMode==='total'&&d.paymentMethodLabel?`<p class="pay-line">Paid ${esc(d.received)} · ${esc(d.paymentMethodLabel)}</p>`:'';

 const autoPrint=!!opts?.autoPrint;
 const tail=`
  <div class="toolbar no-print"><button type="button" onclick="window.print()">Print / Save as PDF</button></div>
  ${autoPrint?`<script>window.addEventListener('load',function(){setTimeout(function(){window.focus();window.print();},200);});<\/script>`:''}
 </body></html>`;

 return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${esc(d.businessName)} · ${esc(d.dateLabel)}</title>
<style>
  @page{size:A4;margin:10mm}
  *{box-sizing:border-box}
  body{font-family:Segoe UI,Arial,sans-serif;color:#192821;margin:0;padding:14px 16px;font-size:12px;line-height:1.35}
  .toolbar{position:fixed;top:8px;right:8px;z-index:10}
  .toolbar button{font:inherit;font-weight:700;padding:8px 14px;border-radius:8px;border:none;background:#177554;color:#fff;cursor:pointer}
  .top{display:flex;align-items:center;gap:12px;background:linear-gradient(135deg,#177554 0%,#1e9a6e 100%);color:#fff;padding:14px 16px;border-radius:12px;margin-bottom:12px}
  .logo{width:48px;height:48px;border-radius:10px;background:#fff;padding:4px;object-fit:contain}
  .top-text{flex:1;min-width:0}
  .top-text h1{margin:0;font-size:20px;font-weight:800;letter-spacing:-.3px}
  .top-text p{margin:2px 0 0;font-size:11px;opacity:.92}
  .top-date{text-align:right;font-size:11px;font-weight:700;opacity:.95;white-space:nowrap}
  .customer-head{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px 12px;margin:0 0 12px;padding:10px 12px;background:#f8faf9;border:1px solid #e5eae5;border-radius:10px}
  .customer-head .lbl{display:block;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#728078;margin-bottom:2px}
  .customer-head .val{font-size:12px;font-weight:700;color:#192821;word-break:break-word}
  .section{margin:10px 0 4px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:#68776e}
  .tbl{width:100%;border-collapse:collapse;margin:0 0 8px;font-size:11px}
  .tbl th,.tbl td{border:1px solid #dfe7df;padding:5px 7px;text-align:left;vertical-align:top}
  .muted{color:#728078;font-size:10px;font-weight:600}
  .tbl th{background:#eef6f1;color:#3d5c4f;font-size:9px;text-transform:uppercase;letter-spacing:.04em}
  .tbl.compact td,.tbl.compact th{padding:4px 6px}
  .sum{display:grid;grid-template-columns:1fr auto;gap:2px 12px;max-width:280px;margin-left:auto;font-size:11px;margin-bottom:8px}
  .sum span{color:#728078}
  .sum .grand{font-size:14px;font-weight:800;color:#177554;padding-top:4px}
  .pay-line{margin:0 0 8px;font-size:11px;color:#52645a;text-align:right}
  .balance{background:#f4f8f5;border:1px solid #d8e8de;border-radius:10px;padding:10px 12px;margin-top:10px}
  .balance h3{margin:0 0 6px;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#52645a}
  .bal-row{display:flex;justify-content:space-between;gap:8px;padding:4px 0;border-bottom:1px solid #e5eae5;font-size:12px}
  .bal-row:last-child{border-bottom:none}
  .bal-row strong{font-variant-numeric:tabular-nums}
  .bal-row strong.warn{color:#a8662b}
  .bal-row strong.ok{color:#177554}
  .note{margin:8px 0 0;font-size:11px;color:#728078}
  .ref{margin-top:10px;font-size:9px;color:#94a49a;text-align:center}
  .foot{margin-top:8px;font-size:10px;color:#94a49a;text-align:center}
  @media print{
    .no-print{display:none!important}
    body{padding:0}
    .top{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .balance{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  }
</style></head><body>
  <div class="top">${logo}<div class="top-text"><h1>${esc(d.businessName)}</h1><p>Sales receipt</p></div></div>
  <div class="customer-head"><div><span class="lbl">Customer</span><span class="val">${esc(d.customerLabel)}</span></div><div><span class="lbl">Phone</span><span class="val">${esc(d.customerPhone||'—')}</span></div><div><span class="lbl">Date</span><span class="val">${esc(d.dateLabel)}</span></div></div>
  <table class="tbl"><thead>${moneyRow(moneyHead,true)}</thead><tbody>${moneyBody}</tbody></table>
  <div class="sum">
    <span>Subtotal</span><b>${esc(d.subtotal)}</b>
    <span>Discount</span><b>${esc(d.discount)}</b>
    <span class="grand">Total due</span><b class="grand">${esc(d.total)}</b>
    <span>Received</span><b>${esc(d.received)}</b>
  </div>
  ${payNote}
  ${bottleBlock}
  <div class="balance"><h3>Balance summary</h3>${balanceRows.join('')}</div>
  ${d.note?`<p class="note"><b>Note:</b> ${esc(d.note)}</p>`:''}
  ${d.receiptRef?`<p class="ref">${esc(d.receiptRef)}</p>`:''}
  <p class="foot">Thank you</p>
  ${tail}`;
}

function openReceiptInNewTab(html:string){
 const blob=new Blob([html],{type:'text/html;charset=utf-8'});
 const url=URL.createObjectURL(blob);
 const win=window.open(url,'_blank');
 if(win){
  win.addEventListener('load',()=>URL.revokeObjectURL(url),{once:true});
  return true;
 }
 URL.revokeObjectURL(url);
 return false;
}

function printReceiptInIframe(html:string,autoPrint:boolean){
 const iframe=document.createElement('iframe');
 iframe.setAttribute('style','position:fixed;right:0;bottom:0;width:0;height:0;border:0');
 document.body.appendChild(iframe);
 const win=iframe.contentWindow;
 const doc=iframe.contentDocument||win?.document;
 if(!doc||!win){iframe.remove();return false}
 doc.open();doc.write(html);doc.close();
 const run=()=>{win.focus();win.print();setTimeout(()=>iframe.remove(),2000)};
 if(autoPrint)setTimeout(run,350);
 else run();
 return true;
}

export function printSaleReceipt(data:SaleReceiptData,opts?:{autoPrint?:boolean}){
 const autoPrint=opts?.autoPrint!==false;
 const html=buildSaleReceiptHtml(data,{autoPrint});
 if(openReceiptInNewTab(html))return true;
 return printReceiptInIframe(html,autoPrint);
}

export function downloadSaleReceipt(data:SaleReceiptData){
 const html=buildSaleReceiptHtml(data,{autoPrint:false});
 const blob=new Blob([html],{type:'text/html;charset=utf-8'});
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');
 a.href=url;
 a.download=receiptFileName(data.receiptRef||data.dateLabel);
 a.rel='noopener';
 document.body.appendChild(a);
 a.click();
 a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
 return true;
}
