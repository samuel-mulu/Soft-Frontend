'use client';
import {useState} from 'react';import Link from 'next/link';import {useRouter} from 'next/navigation';import {useQuery,useQueryClient} from '@tanstack/react-query';
import {ApiRequestError,friendlySaleError,inferSaleFieldErrors,postSaleWithRetry,stockIssues,type SaleFieldErrors} from '@/lib/sale-errors';import {toast} from 'sonner';import {api,post,patch,money,amount,date,getUser} from '@/lib/api';import {printSaleReceipt,downloadSaleReceipt,resolveReceiptLogoUrl,type SaleReceiptData} from '@/lib/sale-receipt';import {printReport} from '@/lib/report-print';import {getBusinessName} from '@/lib/brand';
import {DataLoadSkeleton,LoadError,SkeletonTable,SkeletonStatGrid} from '@/components/ui/skeleton';
import {DesktopTable,ResponsiveList,type ListColumn} from '@/components/responsive-list';import {Plus,Search,ArrowRight,ArrowLeft,Download,RefreshCw,ShoppingBag,PackageCheck,Wallet,GlassWater,TrendingUp,Users,Receipt,ChevronLeft,ChevronRight,ChevronDown,Printer,X} from 'lucide-react';
type R=Record<string,any>;
const n=(v:any)=>Number(v||0);const today=()=>new Date().toISOString().slice(0,10);
function registeredCustomerOptions(rows:R[],activeOnly=false){return (rows||[]).filter((x)=>!activeOnly||x.status==='ACTIVE').map((c)=>({id:c.id,name:c.phone?`${c.name} · ${c.phone}`:String(c.name)}));}
function useData(path:string,enabled=true){return useQuery({queryKey:[path],queryFn:()=>api<any>(path),enabled,placeholderData:(prev)=>prev});}
function Head({title,action,compact}:{title:string;action?:React.ReactNode;compact?:boolean}){return <div className={`page-head flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between ${compact?'mb-3':'mb-5 md:mb-7'}`}><h1 className="page-title min-w-0">{title}</h1>{action&&<div className="page-head-action shrink-0 w-full sm:w-auto">{action}</div>}</div>}
function Loading({loading,error,variant='table'}:{loading:boolean;error:any;variant?:'table'|'stats'|'stats-table'}){if(error)return <LoadError error={error}/>;if(loading)return <DataLoadSkeleton variant={variant}/>;return null}
function Field({label,children}:{label:string,children:React.ReactNode}){return <div><label className="label">{label}</label>{children}</div>}
function Input({label,value,onChange,type='text',placeholder,required=false,minLength}:{label:string,value:any,onChange:(v:string)=>void,type?:string,placeholder?:string,required?:boolean,minLength?:number}){return <Field label={label}><input required={required} minLength={minLength} type={type} className="field" placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)}/></Field>}
function Select({label,value,onChange,options,empty='Select...',disabled}:{label:string,value:string,onChange:(v:string)=>void,options:{id:string,name:string}[],empty?:string,disabled?:boolean}){return <Field label={label}><select disabled={disabled} className="field touch-target" value={value} onChange={e=>onChange(e.target.value)}><option value="">{empty}</option>{options.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>}
function Btn({children,busy=false,form}:{children:React.ReactNode,busy?:boolean,form?:string}){return <button disabled={busy} type="submit" form={form} className="btn btn-primary">{busy?'Saving...':children}</button>}
function Panel({children,title,compact}:{children:React.ReactNode,title?:string,compact?:boolean}){return <div className={`panel ${compact?'p-3 md:p-4':'p-5 md:p-6'}`}>{title&&<h2 className={`font-extrabold ${compact?'text-sm mb-2':'text-base mb-5'}`}>{title}</h2>}{children}</div>}
function Modal({title,onClose,children,footer}:{title:string;onClose:()=>void;children:React.ReactNode;footer?:React.ReactNode}){return <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#102b22]/55" onClick={onClose}><div className="panel w-full sm:max-w-xl md:max-w-2xl max-h-[92vh] sm:max-h-[min(90vh,820px)] flex flex-col p-0 shadow-[0_20px_50px_rgba(16,43,34,0.18)] rounded-t-2xl sm:rounded-2xl overflow-hidden" onClick={e=>e.stopPropagation()}><div className="shrink-0 flex justify-between items-start gap-3 px-5 md:px-8 pt-5 md:pt-7 pb-4 border-b border-[#e5eae5]"><h2 className="font-extrabold text-lg tracking-tight pr-2">{title}</h2><button type="button" className="rounded-lg p-1.5 text-[#728078] hover:bg-[#f4f8f5] shrink-0" onClick={onClose} aria-label="Close"><X size={20}/></button></div><div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 md:px-8 py-4">{children}</div>{footer&&<div className="shrink-0 flex flex-wrap gap-2 px-5 md:px-8 py-4 border-t border-[#e5eae5] bg-white">{footer}</div>}</div></div>}
function Table({columns,rows,emptyMessage}:{columns:{name:string,render:(row:R)=>React.ReactNode}[],rows:R[],emptyMessage?:string}){const empty=emptyMessage||'No records yet. Create your first entry to get started.';return <div className="panel table-wrap"><table className="data-table"><thead><tr>{columns.map(c=><th key={c.name}>{c.name}</th>)}</tr></thead><tbody>{rows.length?rows.map((r,i)=><tr key={r.id||i}>{columns.map(c=><td key={c.name}>{c.render(r)}</td>)}</tr>):<tr><td colSpan={columns.length} className="text-center muted py-14!">{empty}</td></tr>}</tbody></table></div>}
function Stat({label,value,icon:Icon,small}:{label:string,value:string,icon:any,small?:string}){return <div className="panel stat"><div className="flex items-center justify-between muted text-xs font-bold"><span>{label}</span><span className="bg-[#eaf5ed] p-2 rounded-lg text-[#177554]"><Icon size={18}/></span></div><strong>{value}</strong>{small&&<p className="muted text-xs mt-2">{small}</p>}</div>}
function useSubmit(){const [busy,setBusy]=useState(false);const client=useQueryClient();async function submit(path:string,payload:R,reset?:()=>void,method:'POST'|'PATCH'='POST'){setBusy(true);try{const result=method==='POST'?await post(path,payload):await patch(path,payload);toast.success('Saved successfully');await client.invalidateQueries();reset?.();return result}catch(e:any){toast.error(e.message);return null}finally{setBusy(false)}}return {submit,busy}}
function Overview(){const owner=getUser()?.role==='OWNER';const {data:summary,isLoading,error}=useData('/reports/summary',owner);const {data:sales,isLoading:salesLoading}=useData('/sales');const {data:stock}=useData('/inventory/balances');const {data:customers}=useData('/customers');const recent=(sales||[]).slice(0,7);const cash=(sales||[]).reduce((s:number,x:R)=>s+(x.payments||[]).reduce((v:number,p:R)=>v+n(p.amount),0),0);return <><Head title={`Good day, ${getUser()?.username || 'there'} 👋`} action={<Link className="btn btn-primary" href="/sell"><Plus size={17}/> New sale</Link>}/>{owner?<><LoadError error={error}/>{isLoading&&!summary?<SkeletonStatGrid count={4}/>:<div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-5 mb-7"><Stat label="Today's sales" value={money(summary?.salesRevenue)} icon={ShoppingBag}/><Stat label="Cash received" value={money(summary?.cashReceived)} icon={Wallet}/><Stat label="Customer credit" value={money(summary?.customerReceivables)} icon={Users}/><Stat label="Net cash flow" value={money(summary?.cashFlow)} icon={TrendingUp}/></div>}</>:<div className="grid grid-cols-2 xl:grid-cols-3 gap-3 md:gap-5 mb-7"><Stat label="Recent receipts" value={money(cash)} icon={Wallet} small="Payments on recently loaded sales"/><Stat label="Customers" value={String((customers||[]).length)} icon={Users}/><Stat label="Recent invoices" value={String((sales||[]).length)} icon={Receipt}/></div>}<div className="grid lg:grid-cols-[1.5fr_1fr] gap-5"><div><h2 className="font-extrabold mb-4">Recent sales</h2>{salesLoading&&!sales?<SkeletonTable rows={5} cols={4}/>:<Table columns={[{name:'Invoice',render:r=><span className="font-bold">{String(r.invoiceNo||r.id).slice(0,20)}</span>},{name:'Date',render:r=>date(r.createdAt)},{name:'Total',render:r=><b>{money(r.total)}</b>},{name:'Status',render:r=><span className="tag">{r.status}</span>}]} rows={recent}/>}</div><div><h2 className="font-extrabold mb-4">Quick actions</h2><Panel><div className="space-y-2">{[['/sell','Create new sale'],['/bottles','Receive empty bottles'],['/payments','Record customer payment'],['/products','Add product stock'],['/customers','View customer balances']].map(([href,label])=><Link key={href} href={href} className="flex items-center justify-between p-3 bg-[#f8faf8] rounded-xl font-semibold hover:bg-[#eaf5ed]">{label}<ChevronRight size={17}/></Link>)}</div></Panel><div className="mt-5 panel p-5"><div className="muted text-xs font-bold mb-2">INVENTORY SNAPSHOT</div><div className="font-extrabold text-2xl">{(stock||[]).filter((x:R)=>x.kind==='FULL_DRINK').length} <span className="text-sm font-medium muted">tracked products</span></div></div></div></div></>}
type SaleLine={productId:string;quantity:number;bottleReturn?:string;bottleReturnEdited?:boolean;linePaid?:string;lineMethod?:string;linePaidEdited?:boolean};
type PaymentMode='total'|'detail';
const PAY_METHODS=[{id:'CASH',name:'Cash'},{id:'BANK',name:'Bank'},{id:'MOBILE',name:'Mobile'}];
const EMPTY_SALE_FIELDS:SaleFieldErrors={qty:[],paid:[],ret:[],payment:false,credit:false};
function SaleForm(){
 const client=useQueryClient();
 const {data:products=[]}=useData('/products');
 const {data:customers=[]}=useData('/customers');
 const {data:bottles=[]}=useData('/bottle-types');
 const {data:balances=[]}=useData('/inventory/balances');
 const [saving,setSaving]=useState(false);
 const [saleError,setSaleError]=useState<string|null>(null);
 const [fieldErrors,setFieldErrors]=useState<SaleFieldErrors>(EMPTY_SALE_FIELDS);
 const [customerId,setCustomerId]=useState('');
 const [accountOpen,setAccountOpen]=useState(false);
 const {data:customerLedger}=useData(customerId?`/customer-bottles/${customerId}`:'',!!customerId);
 const [guestName,setGuestName]=useState('');
 const [items,setItems]=useState<SaleLine[]>([{productId:'',quantity:1}]);
 const [discount,setDiscount]=useState('0');
 const [payment,setPayment]=useState('');
 const [method,setMethod]=useState('CASH');
 const [paymentMode,setPaymentMode]=useState<PaymentMode>('detail');
 const [note,setNote]=useState('');
 const [last,setLast]=useState<R|null>(null);
 const [lastReceipt,setLastReceipt]=useState<SaleReceiptData|null>(null);
 const active=products.filter((p:R)=>p.active);
 const sellField='field h-[42px] min-h-[42px] py-2 px-3 text-[15px]';
 const lineTotal=(line:SaleLine)=>{const p=active.find((pr:R)=>pr.id===line.productId);return n(p?.sellingPrice)*line.quantity;};
 const linePaidAmt=(line:SaleLine)=>paymentMode==='detail'?n(line.linePaid??lineTotal(line)):0;
 const cartLines=items.map((line,i)=>{const p=active.find((pr:R)=>pr.id===line.productId);const lineAmt=lineTotal(line);return {i,productId:line.productId,name:p?.name||'Product',quantity:line.quantity,line:lineAmt,paid:linePaidAmt(line),method:line.lineMethod||'CASH',bottleTypeId:p?.bottleTypeId};}).filter(x=>x.productId);
 const subtotal=cartLines.reduce((s,x)=>s+x.line,0);
 const total=Math.max(0,subtotal-n(discount));
 const paymentReceived=paymentMode==='detail'?cartLines.reduce((s,x)=>s+x.paid,0):n(payment);
 const saleCredit=Math.max(0,paymentReceived-total);
 const remaining=Math.max(0,total-paymentReceived);
 const lineBottleReturn=(line:SaleLine)=>customerId?n(line.bottleReturn??'0'):0;
 const selectedCustomer=customerId?customers.find((c:R)=>c.id===customerId):null;
 const customerBottleHeld=()=>{const map=new Map<string,number>();for(const t of customerLedger?.totals||[])map.set(t.bottleTypeId,n(t.outstanding));if(!map.size)for(const b of selectedCustomer?.bottleBalances||[])map.set(b.bottleTypeId,n(b.outstanding));return map;};
 const projectedBottleBalances=()=>{if(!customerId)return [];const map=new Map(customerBottleHeld());for(const line of items.filter(x=>x.productId)){const bt=active.find((p:R)=>p.id===line.productId)?.bottleTypeId;if(!bt)continue;map.set(bt,(map.get(bt)||0)+line.quantity-lineBottleReturn(line));}return [...map.entries()].map(([bottleTypeId,outstanding])=>({bottleTypeId,outstanding})).filter(x=>x.outstanding!==0);};
 const lineGrid=paymentMode==='detail'?'sale-line-grid sale-line-grid--detail-customer':'sale-line-grid sale-line-grid--total-customer';
 const customerMoneyOwed=()=>n(selectedCustomer?.moneyOutstanding);
 const accountPanelSummary=()=>{if(!customerId)return 'Full payment required';const bits:string[]=[];const owed=customerMoneyOwed();if(owed>0.001)bits.push(`Owes ${money(owed)}`);else if(owed<-0.001)bits.push('Credit on account');else bits.push('Paid up');const held=[...customerBottleHeld()].filter(([,q])=>q!==0);if(held.length)bits.push(`${held.length} bottle type${held.length===1?'':'s'} out`);return bits.join(' · ');};
 function syncDetailPaid(a:SaleLine[]){return a.map(x=>{if(!x.productId)return x;const t=lineTotal(x);return {...x,linePaidEdited:false,linePaid:String(t),lineMethod:x.lineMethod||'CASH'};});}
 function applyLinePatch(line:SaleLine,patch:Partial<SaleLine>):SaleLine{
  const next={...line,...patch};
  if(customerId&&(patch.quantity!==undefined||patch.productId!==undefined)&&!next.bottleReturnEdited){next.bottleReturnEdited=false;next.bottleReturn='0';}
  if(paymentMode==='detail'){
   if((patch.quantity!==undefined||patch.productId!==undefined)&&!next.linePaidEdited)next.linePaid=String(lineTotal(next));
   if(patch.productId!==undefined&&!next.linePaidEdited){next.linePaidEdited=false;next.lineMethod=next.lineMethod||'CASH';}
  }
  return next;
 }
 function clearSaleErrors(){setSaleError(null);setFieldErrors(EMPTY_SALE_FIELDS);}
 function patchLine(i:number,patch:Partial<SaleLine>){
  clearSaleErrors();
  setItems(a=>{
   const pid=patch.productId;
   if(pid){
    const top=a.findIndex((x,j)=>x.productId===pid&&j!==i);
    if(top!==-1){
     const trimmed=a.filter((_,j)=>j!==i);
     return trimmed.length?trimmed:[{productId:'',quantity:1}];
    }
   }
   return a.map((x,j)=>j===i?applyLinePatch(x,patch):x);
  });
 }
 function aggregateBottleReturns(){
  const agg=new Map<string,number>();
  for(const line of items){
   if(!line.productId||!customerId)continue;
   const bt=active.find((p:R)=>p.id===line.productId)?.bottleTypeId;
   if(!bt)continue;
   const ret=lineBottleReturn(line);
   if(ret<0)return {error:'Return quantity cannot be negative'};
   if(ret>0)agg.set(bt,(agg.get(bt)||0)+ret);
  }
  return {bottles:[...agg.entries()].map(([bottleTypeId,quantity])=>({bottleTypeId,quantity}))};
 }
 function buildReceiptSnapshot(invoiceNo:string,createdAt?:string):SaleReceiptData{
  const businessName=getBusinessName();
  const cust=customerId?customers.find((c:R)=>c.id===customerId):null;
  const customerLabel=cust?.name||(guestName?.trim()||'Walk-in guest');
  const customerPhone=cust?.phone?.trim()||undefined;
  const payName=(id:string)=>PAY_METHODS.find(m=>m.id===id)?.name||id;
  const moneyLines=items.filter(x=>x.productId).map(line=>{const p=active.find((pr:R)=>pr.id===line.productId)!;const lt=lineTotal(line);const paid=linePaidAmt(line);return {name:p.name,qty:line.quantity,unitPrice:money(p.sellingPrice),lineTotal:money(lt),...(paymentMode==='detail'?{paid:money(paid),method:payName(line.lineMethod||'CASH'),credit:money(Math.max(0,lt-paid))}: {})};});
  const bottleLines=customerId?items.filter(x=>x.productId).map(line=>{const p=active.find((pr:R)=>pr.id===line.productId)!;const ret=lineBottleReturn(line);return {product:p.name,sold:line.quantity,returned:ret,withCustomer:line.quantity-ret};}):undefined;
  const bottleBalMap=new Map<string,number>();
  const touchedBottleTypes=new Set<string>();
  if(customerId){
   for(const [id,qty] of customerBottleHeld())bottleBalMap.set(id,qty);
   for(const line of items.filter(x=>x.productId)){
    const bt=active.find((p:R)=>p.id===line.productId)?.bottleTypeId;
    if(!bt)continue;
    touchedBottleTypes.add(bt);
    bottleBalMap.set(bt,(bottleBalMap.get(bt)||0)+line.quantity-lineBottleReturn(line));
   }
  }
  const bottleBalances=customerId?[...bottleBalMap.entries()].filter(([id,balance])=>balance!==0||touchedBottleTypes.has(id)).map(([id,balance])=>({name:bottles.find((b:R)=>b.id===id)?.name||'Bottle',balance})):undefined;
  const dateLabel=createdAt?new Date(createdAt).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):new Date().toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  return {businessName,logoUrl:resolveReceiptLogoUrl(),dateLabel,customerLabel,customerPhone,paymentMode,paymentMethodLabel:paymentMode==='total'?payName(method):undefined,moneyLines,subtotal:money(subtotal),discount:money(n(discount)),total:money(total),received:money(paymentReceived),remaining:saleCredit>0?`Credit ${money(saleCredit)}`:money(remaining),bottleLines,bottleBalances:bottleBalances?.length?bottleBalances:undefined,note:note.trim()||undefined,receiptRef:`Ref ${invoiceNo.slice(0,24)}`};
 }
 async function finalize(printAfter:boolean){
  clearSaleErrors();
  if(items.some(x=>!x.productId||x.quantity<1)||new Set(items.map(x=>x.productId)).size!==items.length){const msg='Add at least one product with quantity.';setSaleError(msg);toast.error(msg);return;}
  if(paymentMode==='detail'){for(const line of items){if(!line.productId)continue;if(!customerId&&linePaidAmt(line)>lineTotal(line)){const msg='Walk-in: paid amount cannot exceed the line total.';setSaleError(msg);setFieldErrors({...EMPTY_SALE_FIELDS,paid:items.map((x,j)=>x.productId?j:-1).filter(j=>j>=0),payment:true});toast.error(msg);return;}}}
  if(!customerId&&paymentReceived>total){const msg='Walk-in: payment cannot exceed the sale total.';setSaleError(msg);setFieldErrors({...EMPTY_SALE_FIELDS,payment:true,credit:true});toast.error(msg);return;}
  const bottleAgg=aggregateBottleReturns();
  if(bottleAgg.error){setSaleError(bottleAgg.error);setFieldErrors({...EMPTY_SALE_FIELDS,ret:items.map((_,j)=>j)});toast.error(bottleAgg.error);return;}
  if(!customerId&&(paymentReceived<total||(bottleAgg.bottles?.length??0)>0)){const msg='Walk-in guest must pay in full. Pick a customer for credit or bottle returns.';setSaleError(msg);setFieldErrors({...EMPTY_SALE_FIELDS,credit:true,payment:true});toast.error(msg);return;}
  const stockProblems=stockIssues(items,balances,active);
  if(stockProblems.length){const msg=stockProblems.map(s=>`${s.name}: only ${s.have} in stock (need ${s.need})`).join(' · ');setSaleError(msg);setFieldErrors({...EMPTY_SALE_FIELDS,qty:stockProblems.map(s=>s.index)});toast.error(msg);return;}
  const payload:R={items:items.map(({productId,quantity})=>({productId,quantity})),discount:String(n(discount)),payment:String(paymentReceived)};
  if(paymentMode==='total'){payload.paymentMethod=method;}else{payload.paymentParts=items.filter(x=>x.productId).map(x=>({amount:String(linePaidAmt(x)),method:x.lineMethod||'CASH'})).filter(x=>n(x.amount)>0);}
  if(customerId)payload.customerId=customerId;else if(guestName)payload.guestName=guestName;
  if(note)payload.note=note;
  if(bottleAgg.bottles?.length)payload.bottlesReturned=bottleAgg.bottles;
  setSaving(true);
  try{
   const result=await postSaleWithRetry(()=>post('/sales',payload),n=>toast.message(`Saving… (try ${n}/3)`));
   toast.success('Sale saved');
   await client.invalidateQueries();
   clearSaleErrors();
   const receipt=buildReceiptSnapshot(String(result.invoiceNo),result.createdAt);
   setLastReceipt(receipt);
   setLast(result);
   setItems([{productId:'',quantity:1}]);setPayment('');setDiscount('0');setPaymentMode('detail');setCustomerId('');setGuestName('');setNote('');
   if(printAfter){
    printSaleReceipt(receipt,{autoPrint:true});
   }
  }catch(e:unknown){
   const err=e instanceof ApiRequestError?e:new ApiRequestError(e instanceof Error?e.message:'Sale failed',0);
   const msg=friendlySaleError(err.message,err.status);
   setSaleError(msg);
   setFieldErrors(inferSaleFieldErrors(err.message,items,balances));
   toast.error(msg);
  }finally{setSaving(false);}
 }
 const pending=saving;
 return <div className="-mt-2 md:-mt-3">
  {saleError&&<div className="sale-error-banner" role="alert">{saleError}</div>}
  {last&&lastReceipt&&<div className="panel p-4 mb-3 border-green-300! bg-green-50! flex flex-wrap items-center justify-between gap-2"><div><b>Sale completed</b><p className="text-sm muted mt-0.5">{lastReceipt.receiptRef||last.invoiceNo} · {money(last.total)}</p></div><div className="flex flex-wrap gap-2"><button type="button" className="btn btn-ghost" onClick={()=>printSaleReceipt(lastReceipt,{autoPrint:true})}><Printer size={16}/> Print</button><button type="button" className="btn btn-ghost" onClick={()=>{downloadSaleReceipt(lastReceipt);toast.message('Receipt downloaded — open it and choose Print → Save as PDF')}}><Download size={16}/> Download</button></div></div>}
  <form onSubmit={e=>{e.preventDefault();void finalize(false)}} className="grid gap-4 items-start lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
   <div className="panel p-4 md:p-5">
     <div className="mb-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
       <div className="flex-1 min-w-0"><Select label="Registered customer" value={customerId} onChange={v=>{setCustomerId(v);setPayment('');setAccountOpen(false);setItems(a=>a.map(x=>({...x,bottleReturnEdited:false,bottleReturn:v?'0':undefined})));}} options={registeredCustomerOptions(customers,true)} empty="Walk-in guest (no account)"/></div>
       {!customerId&&<div className="flex-1 min-w-0"><Input label="Walk-in name" value={guestName} onChange={setGuestName} placeholder="Optional name for receipt"/></div>}
       {customerId&&<div className="flex-1 min-w-0 flex flex-col">
        <label className="label max-sm:sr-only">Customer account</label>
        <button type="button" className={`${sellField} w-full flex items-center gap-2 rounded-xl border border-[#e5eae5] bg-[#fafcfb] px-3 text-left hover:bg-[#f4f8f5] transition-colors`} onClick={()=>setAccountOpen(o=>!o)} aria-expanded={accountOpen}>
         <span className="bg-[#eaf5ed] p-1.5 rounded-md text-[#177554] shrink-0"><GlassWater size={16}/></span>
         <span className="flex-1 min-w-0"><span className="block text-sm font-bold text-[#1a2e24] truncate">Customer account</span><span className="block text-[11px] muted truncate">{accountPanelSummary()}</span></span>
         <ChevronDown size={16} className={`shrink-0 text-[#68776e] transition-transform ${accountOpen?'rotate-180':''}`}/>
        </button>
       </div>}
      </div>
      {customerId&&accountOpen&&<div className="mt-2 rounded-xl border border-[#e5eae5] bg-white p-4 space-y-4">
       <div className="grid sm:grid-cols-2 gap-3"><div className="rounded-lg bg-[#f8faf8] p-3"><p className="label mb-1">Money balance</p>{customerMoneyOwed()<=0?<p className="font-extrabold text-[#177554]">{customerMoneyOwed()<-0.001?`Credit −${money(Math.abs(customerMoneyOwed()))}`:'0'}</p>:<p className="font-extrabold text-[#a8662b]">{money(customerMoneyOwed())}</p>}</div><div className="rounded-lg bg-[#f8faf8] p-3"><p className="label mb-1">Bottles now (+ with customer)</p>{customerBottleHeld().size?bottleBalancePlain([...customerBottleHeld()].map(([bottleTypeId,outstanding])=>({bottleTypeId,outstanding})),(id:string)=>bottles.find((b:R)=>b.id===id)?.name||'Bottle'):<p className="font-extrabold text-[#177554]">0</p>}</div></div>
       <div className="rounded-lg bg-[#f4f8f5] p-3"><p className="label mb-1">After this sale (bottles)</p>{projectedBottleBalances().length?bottleBalancePlain(projectedBottleBalances(),(id:string)=>bottles.find((b:R)=>b.id===id)?.name||'Bottle'):<p className="font-extrabold text-[#177554]">0</p>}</div>
       <p className="text-xs muted">Use the Return column on each product row. Balance = with customer now + sold − returned (can go negative).</p>
      </div>}
     </div>
     <div className="sale-lines-scroll md:overflow-x-auto md:-mx-1 md:px-1">
      <div className="md:min-w-[640px]">
       <div className={`${lineGrid} sale-line-head max-md:hidden`}><span>Product</span><span className="text-center">Qty</span><span className="text-center">Return</span>{paymentMode==='detail'&&<><span className="text-center">Paid</span><span>Method</span></>}<span className="text-right">Line</span></div>
       {items.map((line,i)=>{const product=active.find((p:R)=>p.id===line.productId);const lt=lineTotal(line);const badQty=fieldErrors.qty.includes(i);const badPaid=fieldErrors.paid.includes(i)||fieldErrors.payment;const badRet=fieldErrors.ret.includes(i);return <div key={i} className="sale-line-card"><div className={lineGrid}><div className="sale-line-product"><span className="sale-line-mobile-label">Product</span><select className={`${sellField} touch-target${badQty?' field-invalid':''} w-full min-w-0`} title={product?.name||''} value={line.productId} onChange={e=>patchLine(i,{productId:e.target.value})}><option value="">Choose product…</option>{active.map((o:R)=><option key={o.id} value={o.id}>{o.name}</option>)}</select></div><div className="sale-line-qty"><span className="sale-line-mobile-label">Qty</span><input type="number" inputMode="numeric" className={`${sellField}${badQty?' field-invalid':''} w-full text-center`} value={line.quantity} onChange={e=>patchLine(i,{quantity:Math.max(1,Math.floor(n(e.target.value)))})}/></div><div className="sale-line-return"><span className="sale-line-mobile-label">Return</span><input type="number" inputMode="numeric" min={0} className={`${sellField}${badRet?' field-invalid':''} w-full text-center${!customerId?' opacity-60':''}`} title={!customerId?'Select a customer to record returns':'Empty bottles returned on this visit'} value={customerId?(line.bottleReturn??'0'):'0'} disabled={!product||!customerId} onChange={e=>patchLine(i,{bottleReturn:e.target.value,bottleReturnEdited:true})}/></div>{paymentMode==='detail'&&<><div className="sale-line-paid"><span className="sale-line-mobile-label">Paid</span><input type="number" inputMode="decimal" className={`${sellField}${badPaid?' field-invalid':''} w-full`} value={line.linePaid??(product?String(lt):'')} disabled={!product} onChange={e=>patchLine(i,{linePaid:e.target.value,linePaidEdited:true})}/></div><div className="sale-line-method"><span className="sale-line-mobile-label">Method</span><select className={`${sellField} touch-target w-full`} value={line.lineMethod||'CASH'} disabled={!product} onChange={e=>patchLine(i,{lineMethod:e.target.value,linePaidEdited:true})}>{PAY_METHODS.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></div></>}<div className="sale-line-total"><span className="sale-line-mobile-label">Line total</span><span className="text-[15px] font-extrabold text-[#177554] tabular-nums">{product?amount(lt):'—'}</span><button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 border-[#e8b4ab] bg-[#fff5f3] text-[#c45444] hover:bg-[#fde8e5] hover:border-[#d98980] disabled:opacity-40 disabled:border-[#e5eae5] disabled:bg-[#f6f8f6] disabled:text-[#94a3b8]" onClick={()=>setItems(a=>a.filter((_,j)=>j!==i))} disabled={items.length===1} aria-label="Remove line"><X size={20} strokeWidth={2.25}/></button></div></div></div>;})}
      </div>
     </div>
     <button type="button" onClick={()=>setItems(a=>[...a,{productId:'',quantity:1,...(customerId?{bottleReturn:'0'}:{})}])} className="btn btn-ghost mt-4"><Plus size={16}/> Add product</button>
   </div>
   <div className="sale-checkout-sticky"><div className="panel p-4 md:p-5 space-y-4">
    <div className="rounded-xl border border-[#eef2ee] divide-y divide-[#eef2ee]">{cartLines.length?cartLines.map(x=><div key={`${x.productId}-${x.i}`} className="flex justify-between gap-3 px-3 py-2.5 text-sm"><span className="min-w-0 truncate font-semibold">{x.name} <span className="font-normal muted">×{x.quantity}</span></span><span className="font-bold tabular-nums shrink-0">{money(x.line)}</span></div>):<p className="muted text-sm px-3 py-4 text-center">Add a product to begin</p>}</div>
    <div className="flex justify-between text-[15px]"><span className="muted">Subtotal</span><b className="tabular-nums">{money(subtotal)}</b></div>
    <div><label className="label">Discount (ETB)</label><input type="number" className="field" value={discount} onChange={e=>setDiscount(e.target.value)}/></div>
    <div className={`grid grid-cols-2 gap-3 rounded-xl p-4 ${fieldErrors.credit||fieldErrors.payment?'bg-[#fff5f3] border-2 border-[#e8b4ab]':'bg-[#f4f8f5]'}`}><div><p className="text-xs font-bold muted mb-1">Total due</p><p className="text-xl font-extrabold tabular-nums">{money(total)}</p></div><div className="text-right"><p className="text-xs font-bold muted mb-1">{saleCredit>0&&customerId?'Credit this sale':customerId?'Remaining (credit)':'To receive'}</p><p className={`text-xl font-extrabold tabular-nums ${remaining>0||fieldErrors.credit?'text-[#a8662b]':saleCredit>0&&customerId?'text-[#177554]':'text-[#177554]'}`}>{!customerId?money(total):saleCredit>0?`−${money(saleCredit)}`:money(remaining)}</p></div></div>
    <div className="space-y-3 border-t border-[#eef2ee] pt-4"><p className="text-xs font-bold text-[#52645a]">Payment</p>{!customerId&&<p className="text-xs muted">Walk-in must pay the full amount.</p>}<div className="flex gap-2 p-1 rounded-xl bg-[#f4f8f5]"><button type="button" className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${paymentMode==='total'?'bg-white text-[#177554] shadow-sm':'text-[#68776e]'}`} onClick={()=>setPaymentMode('total')}>Pay total</button><button type="button" className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${paymentMode==='detail'?'bg-white text-[#177554] shadow-sm':'text-[#68776e]'}`} onClick={()=>{setPaymentMode('detail');setItems(a=>syncDetailPaid(a));}}>Pay per line</button></div>
    {paymentMode==='total'&&<div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="label">Received</label><input type="number" inputMode="decimal" className={`field touch-target${fieldErrors.payment?' field-invalid':''}`} value={payment} onChange={e=>{clearSaleErrors();setPayment(e.target.value)}} placeholder={customerId?'Less = credit · more = prepay':'Must match total'}/></div><div><label className="label">Method</label><select className="field touch-target" value={method} onChange={e=>setMethod(e.target.value)}>{PAY_METHODS.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></div></div>}
    {paymentMode==='detail'&&<><p className="text-xs muted">Paid amount on each product row{customerId?' (can exceed line for prepay)':''}.</p><div className={`flex justify-between items-center rounded-xl border px-4 py-3 ${fieldErrors.payment?'border-[#e8b4ab] bg-[#fff5f3]':'border-[#e5eae5]'}`}><span className="muted text-sm">Received (sum)</span><b className="text-lg tabular-nums">{money(paymentReceived)}</b></div></>}
    </div>
    {customerId&&!accountOpen&&<button type="button" className="text-xs font-bold text-[#177554] text-left w-full" onClick={()=>setAccountOpen(true)}>Open customer account (bottles) →</button>}
    <div><label className="label">Note</label><input className="field touch-target" value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional"/></div>
    <div className="sale-form-actions grid gap-3 pt-1"><button disabled={pending||!items[0]?.productId} type="submit" className="btn btn-primary min-h-[46px] text-[15px]">{pending?'Processing…':'Complete sale'}</button><button disabled={pending||!items[0]?.productId} type="button" className="btn btn-ghost min-h-[46px] text-[15px] border border-[#e0e7e0]" onClick={()=>void finalize(true)}><Printer size={17}/> Complete & print</button></div>
   </div></div>
  </form>
 </div>;
}
function GenericCrud({title,path,fields,columns,ownerOnly=false}:{title:string,path:string,fields:{key:string,label:string,type?:string,options?:string}[],columns:{name:string,render:(r:R)=>React.ReactNode}[],ownerOnly?:boolean}){const {data,isLoading,error}=useData(path);const {submit,busy}=useSubmit();const [open,setOpen]=useState(false);const [form,setForm]=useState<R>({});const [search,setSearch]=useState('');const [edit,setEdit]=useState('');const owner=getUser()?.role==='OWNER';const canEdit=!ownerOnly||owner;const rows=(data||[]).filter((r:R)=>JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));async function save(e:React.FormEvent){e.preventDefault();const payload:R={};for(const f of fields){if(form[f.key]!==undefined&&form[f.key]!=='')payload[f.key]=f.type==='number'?Number(form[f.key]):String(form[f.key])}const result=await submit(edit?`${path}/${edit}`:path,payload,()=>{setOpen(false);setForm({});setEdit('')},edit?'PATCH':'POST');if(result)setSearch('')}return <><Head title={title} action={canEdit?<button className="btn btn-primary" onClick={()=>{setOpen(!open);setForm({});setEdit('')}}><Plus size={16}/> Add new</button>:undefined}/>{open&&<Panel title={edit?'Edit record':'Create new'}><form onSubmit={save} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{fields.map(f=><div key={f.key}>{f.options?<Select label={f.label} value={String(form[f.key]||'')} onChange={v=>setForm(x=>({...x,[f.key]:v}))} options={f.options.split('|').map(v=>({id:v,name:v}))}/>:<Input label={f.label} value={form[f.key]??''} onChange={v=>setForm(x=>({...x,[f.key]:v}))} type={f.type==='number'?'number':f.type==='password'?'password':'text'}/>}</div>)}<div className="sm:col-span-2 lg:col-span-3 flex gap-2"><Btn busy={busy}>Save changes</Btn><button type="button" className="btn btn-ghost" onClick={()=>setOpen(false)}>Cancel</button></div></form></Panel>}<div className="flex items-center gap-3 my-5"><div className="relative flex-1 max-w-sm"><Search size={16} className="absolute left-3 top-3.5 muted"/><input className="field pl-10!" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search records..."/></div><span className="muted text-xs">{rows.length} records</span></div><LoadError error={error}/>{isLoading&&!data?<SkeletonTable/>:<Table rows={rows} columns={[...columns,...(canEdit?[{name:'',render:(r:R)=><button className="text-[#177554] font-bold text-xs" onClick={()=>{setForm(r);setEdit(r.id);setOpen(true);window.scrollTo({top:0,behavior:'smooth'})}}>Edit</button>}]:[])]}/>}</>}
function signedQty(q:number){if(q===0)return <span className="bal-zero">0</span>;const text=q>0?`+${q}`:String(q);return <span className={q>0?'bal-plus':'bal-minus'}>{text}</span>}
function signedMoney(v:unknown){const amt=n(v);if(amt===0)return '—';return `-${amount(Math.abs(amt))} ETB`}
function paymentBalanceSigned(v:unknown){const amt=n(v);if(Math.abs(amt)<0.001)return '0';const fig=amount(Math.abs(amt));return amt>0?`+${fig} ETB`:`-${fig} ETB`;}
function PaymentBalanceInline({value,large}:{value:unknown,large?:boolean}){const amt=n(value);if(Math.abs(amt)<0.001)return <span className={`font-bold tabular-nums text-[#177554] ${large?'text-xl':'text-sm'}`}>0</span>;const cls=amt>0?'text-[#a8662b]':'text-[#177554]';return <span className={`font-bold tabular-nums ${cls} ${large?'text-xl':'text-sm'}`}>{paymentBalanceSigned(value)}</span>;}
function moneyCreditCell(v:unknown){const amt=n(v);if(amt===0)return <span className="bal-zero">—</span>;return <span className={amt>0?'bal-money':'bal-money-ok'}>{signedMoney(v)}</span>}
function customerHasPaymentBalance(r:R){return Math.abs(n(r.moneyOutstanding))>0.001;}
function customerHasBottleBalance(r:R){return (r.bottleBalances||[]).some((b:R)=>n(b.outstanding)!==0);}
function customerBottleUnitsOut(r:R){return (r.bottleBalances||[]).reduce((s:number,b:R)=>s+n(b.outstanding),0);}
function bottleBalanceList(bal:R[],bottleName:(id:string)=>string){if(!bal?.length)return <span className="bal-zero">—</span>;return <div className="flex flex-col gap-1 min-w-[120px]">{bal.map(b=><div key={b.bottleTypeId} className="text-sm leading-tight"><span className="mr-1.5">{signedQty(n(b.outstanding))}</span><span className="text-[#4a5c54] font-medium">{bottleName(b.bottleTypeId)}</span></div>)}</div>}
function bottleBalancePlain(bal:R[],bottleName:(id:string)=>string){if(!bal?.length)return null;return <div className="flex flex-col gap-1">{bal.map(b=><div key={b.bottleTypeId} className="text-lg font-extrabold tabular-nums flex items-baseline gap-2">{signedQty(n(b.outstanding))}<span className="text-base font-semibold text-[#4a5c54]">{bottleName(b.bottleTypeId)}</span></div>)}</div>}
function bottleMovementAction(m:R){const d=n(m.delta);const qty=Math.abs(d);if(d>0)return `+${qty} with customer`;if(d<0)return `−${qty} in your stock`;return '—'}
function bottleBalanceQty(q:number){return signedQty(q)}
function bottleHistoryTableRows(movements:R[]){const asc=[...movements].sort((a,b)=>new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime());const run=new Map<string,number>();const after=new Map<string,number>();for(const m of asc){const bt=String(m.bottleTypeId);const next=(run.get(bt)||0)+n(m.delta);run.set(bt,next);after.set(m.id,next)}return [...movements].sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()).map(m=>({...m,balanceAfter:after.get(m.id)??0}))}
function shortInvoice(no:unknown){const s=String(no||'');if(!s)return '—';if(s.startsWith('INV-'))return `#${s.slice(4,12)}`;return s.length>14?`${s.slice(0,14)}…`:s}
function payMethodLabel(m:unknown){const x=String(m||'CASH').toUpperCase();if(x==='CASH')return 'Cash';if(x==='BANK')return 'Bank';if(x==='MOBILE')return 'Mobile';return String(m||'—')}
function historyBottleTotalsFrom(history:R|undefined){const m=new Map<string,number>();for(const x of history?.bottles||[])m.set(x.bottleTypeId,(m.get(x.bottleTypeId)||0)+n(x.delta));return [...m.entries()].map(([id,qty])=>({bottleTypeId:id,outstanding:qty})).filter(x=>x.outstanding!==0)}
function invoiceStatus(total:number,paid:number){const rem=Math.max(0,total-paid);if(rem<=0.001)return 'Paid';if(paid>0.001)return 'Partial';return 'Unpaid'}
function invoicePaidMap(sales:R[],payments:R[]){const ordered=[...sales].sort((a,b)=>new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime());const paid=new Map<string,number>();for(const s of ordered)paid.set(s.id,0);for(const p of payments){if(p.saleId&&paid.has(p.saleId))paid.set(p.saleId,(paid.get(p.saleId)||0)+n(p.amount))}const general=payments.filter((x:R)=>!x.saleId).sort((a,b)=>new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime());for(const p of general){let left=n(p.amount);for(const s of ordered){if(left<=0)break;const total=n(s.total);const on=paid.get(s.id)||0;const rem=total-on;if(rem<=0)continue;const use=Math.min(rem,left);paid.set(s.id,on+use);left-=use}}return paid}
function customerMoneyRows(history:R|undefined){const sales=history?.sales||[];const payments=history?.payments||[];const paidMap=invoicePaidMap(sales,payments);const rows:R[]=[];for(const sale of sales){const total=n(sale.total);const paid=paidMap.get(sale.id)||0;const remaining=Math.max(0,total-paid);rows.push({id:`inv-${sale.id}`,rowDate:sale.createdAt,invoiceLabel:shortInvoice(sale.invoiceNo),total,paid,remaining,status:invoiceStatus(total,paid),note:''})}for(const p of payments.filter((x:R)=>!x.saleId)){rows.push({id:`pay-${p.id}`,rowDate:p.createdAt,invoiceLabel:'Balance payment',total:null,paid:n(p.amount),remaining:null,status:'Payment',note:[payMethodLabel(p.method),p.note].filter(Boolean).join(' · ')||'—'})}return rows.sort((a,b)=>new Date(b.rowDate).getTime()-new Date(a.rowDate).getTime())}
type CustomerHistoryTab='money'|'bottles';
function CustomerHistoryTabs({tab,onTab}:{tab:CustomerHistoryTab;onTab:(t:CustomerHistoryTab)=>void}){const items:[CustomerHistoryTab,string][]=[['money','Payments'],['bottles','Bottles']];return <div className="flex justify-start gap-1.5 mb-4">{items.map(([id,label])=><button key={id} type="button" className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${tab===id?'bg-[#177554] text-white':'bg-[#eef2ee] text-[#68776e] hover:bg-[#e7f4ed] hover:text-[#126a4c]'}`} onClick={()=>onTab(id)}>{label}</button>)}</div>}
function customerMoneyBalanceSummary(v:unknown,portal?:boolean){const amt=n(v);if(Math.abs(amt)<0.001)return <span className="text-2xl font-extrabold tabular-nums text-[#177554]">0</span>;if(amt>0)return portal?<span className="text-2xl font-extrabold tabular-nums text-[#a8662b]">{money(amt)}</span>:<span className="text-2xl font-extrabold tabular-nums text-[#a8662b]">-{money(amt)}</span>;return <span className="text-2xl font-extrabold tabular-nums text-[#177554]">{money(Math.abs(amt))}</span>}
function customerMoneyBalanceLabel(v:unknown,portal?:boolean){const amt=n(v);if(Math.abs(amt)<0.001)return 'Balance';if(amt>0)return portal?'Amount you owe':'They owe you';return 'Credit balance'}
export function CustomerHistoryPage({customerId,portal}:{customerId?:string;portal?:boolean}){
 const [tab,setTab]=useState<CustomerHistoryTab>('money');
 const historyPath=portal?'/portal/history':`/customers/${customerId}/history`;
 const {data:history,isLoading,error}=useData(historyPath,portal||!!customerId);
 const {data:bottlesFromApi=[]}=useData('/bottle-types',!portal);
 const bottles=(portal?history?.bottleTypes:bottlesFromApi)||[];
 const bottleName=(id:string)=>bottles.find((b:R)=>b.id===id)?.name||'Bottle';
 const customer=history?.customer;
 const bottleTotals=(history?.bottleBalances?.length?history.bottleBalances:historyBottleTotalsFrom(history)) as R[];
 const moneyRows=customerMoneyRows(history);
 const bottleRows=bottleHistoryTableRows(history?.bottles||[]);
 const title=portal?'Your account':(customer?.name||'Customer');
 return <>
  {!portal&&<Head title={title} compact action={<Link href="/customers" className="btn btn-ghost"><ArrowLeft size={16}/> All customers</Link>}/>}
  {portal&&<Head title={title} compact/>}
  <LoadError error={error}/>
  {isLoading&&!history?(<><SkeletonStatGrid count={1}/><SkeletonTable rows={5} cols={5}/></>):<>
   <div className="flex flex-wrap items-center gap-3 -mt-2 mb-1">
    <CustomerHistoryTabs tab={tab} onTab={setTab}/>
    {!portal&&customer?.phone&&<p className="muted text-sm">{customer.phone}</p>}
   </div>
   {tab==='money'?(<>
    <div className="panel p-4 mb-5 max-w-sm">
     <p className="label mb-1">{customerMoneyBalanceLabel(history?.moneyOutstanding,portal)}</p>
     {customerMoneyBalanceSummary(history?.moneyOutstanding,portal)}
     {n(history?.moneyOutstanding)<-0.001&&<p className="muted text-xs mt-2">{portal?'You have credit on your account.':'Customer paid ahead — credit on account'}</p>}
    </div>
    <Table rows={moneyRows} emptyMessage="No invoices or payments yet." columns={[
     {name:'Date',render:r=><span className="whitespace-nowrap">{date(r.rowDate)}</span>},
     {name:'Invoice',render:r=><span className="font-semibold">{r.invoiceLabel}</span>},
     {name:'Total (ETB)',render:r=>r.total==null?<span className="muted">—</span>:<b className="tabular-nums">{money(r.total)}</b>},
     {name:'Paid (ETB)',render:r=><b className="tabular-nums text-[#177554]">{money(r.paid)}</b>},
     {name:'Remaining (ETB)',render:r=>r.remaining==null?<span className="muted">—</span>:r.remaining<=0.001?<span className="text-[#177554] font-bold">0</span>:<b className="tabular-nums text-[#a8662b]">{money(r.remaining)}</b>},
     {name:'Status',render:r=>{const s=String(r.status);const cls=s==='Paid'||s==='Payment'?'tag bg-[#eaf5ed] text-[#126a4c]':s==='Partial'?'tag bg-[#fff4e8] text-[#a8662b]':'tag';return <span className={cls}>{s}</span>}},
     {name:'Note',render:r=><span className="text-sm text-[#4a5c54]">{r.note||'—'}</span>},
    ]}/>
   </>):(<>
    <div className="panel p-4 mb-5 max-w-md">
     <p className="label mb-1">{portal?'Your bottles with us':'Bottle balance'}</p>
     {bottleTotals.length?bottleBalancePlain(bottleTotals,bottleName):<p className="text-2xl font-extrabold text-[#177554]">0</p>}
    </div>
    <Table rows={bottleRows} emptyMessage="No bottle movements yet." columns={[
     {name:'Date',render:r=><span className="whitespace-nowrap">{date(r.createdAt)}</span>},
     {name:'Bottle type',render:r=><b>{r.bottleType?.name||bottleName(r.bottleTypeId)}</b>},
     {name:'Change',render:r=>{const d=n(r.delta);const text=bottleMovementAction(r);return <span className={`text-sm font-semibold ${d>0?'text-[#a8662b]':d<0?'text-[#177554]':''}`}>{text}</span>}},
     {name:'Balance',render:r=>bottleBalanceQty(n(r.balanceAfter))},
    ]}/>
   </>)}
  </>}
 </>;
}
type CustomerBalanceFilter='all'|'payment'|'bottle';
function CustomerFilterTabs({tab,onTab}:{tab:CustomerBalanceFilter;onTab:(t:CustomerBalanceFilter)=>void}){const items:[CustomerBalanceFilter,string][]=[['all','All'],['payment','Payment balance'],['bottle','Bottle balance']];return <div className="flex flex-wrap gap-1.5">{items.map(([id,label])=><button key={id} type="button" className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${tab===id?'bg-[#177554] text-white':'bg-[#eef2ee] text-[#68776e] hover:bg-[#e7f4ed] hover:text-[#126a4c]'}`} onClick={()=>onTab(id)}>{label}</button>)}</div>;}
function Customers(){
 const router=useRouter();
 const {data:customers,isLoading:customersLoading}=useData('/customers');
 const {data:bottles=[]}=useData('/bottle-types');
 const {submit,busy}=useSubmit();
 const [search,setSearch]=useState('');
 const [balanceFilter,setBalanceFilter]=useState<CustomerBalanceFilter>('all');
 const [form,setForm]=useState<R>({});
 const [open,setOpen]=useState(false);
 const bottleName=(id:string)=>bottles.find((b:R)=>b.id===id)?.name||'Bottle';
 const list=customers||[];
 const q=search.trim().toLowerCase();
 const searched=list.filter((x:R)=>!q||String(x.name||'').toLowerCase().includes(q)||String(x.phone||'').includes(q));
 const rows=searched.filter((x:R)=>balanceFilter==='all'||(balanceFilter==='payment'?customerHasPaymentBalance(x):customerHasBottleBalance(x)));
 const netPayment=rows.reduce((s:number,r:R)=>s+n(r.moneyOutstanding),0);
 const paymentOwedTotal=rows.reduce((s:number,r:R)=>s+Math.max(0,n(r.moneyOutstanding)),0);
 const paymentCreditTotal=rows.reduce((s:number,r:R)=>s+Math.max(0,-n(r.moneyOutstanding)),0);
 const withBottles=rows.filter(customerHasBottleBalance).length;
 const bottleUnitsTotal=rows.reduce((s:number,r:R)=>s+customerBottleUnitsOut(r),0);
 const columns:ListColumn<R>[]=[
  {name:'Customer',primary:true,render:r=><Link href={`/customers/${r.id}`} className="font-bold text-[#177554] hover:underline">{r.name}</Link>},
  {name:'Phone',hideOnMobile:true,render:r=>r.phone||'—'},
  {name:'Payment balance',mobileLabel:'Payment',render:r=><PaymentBalanceInline value={r.moneyOutstanding}/>},
  {name:'Bottle balance',mobileLabel:'Bottles',render:r=>customerHasBottleBalance(r)?bottleBalanceList(r.bottleBalances||[],bottleName):<span className="font-bold text-[#177554] text-sm">0</span>},
  {name:'Status',hideOnMobile:true,render:r=><span className="tag">{r.status}</span>},
 ];
 return <>
  <Head title="Customers" action={<button className="btn btn-primary" onClick={()=>{setOpen(!open);setForm({})}}><Plus size={16}/> Add customer</button>}/>
  {open&&<Panel title="Customer profile"><form className="grid sm:grid-cols-2 gap-3" onSubmit={async e=>{e.preventDefault();await submit(form.id?`/customers/${form.id}`:'/customers',{name:form.name,phone:form.phone||undefined,address:form.address||undefined,notes:form.notes||undefined,...(form.id?{status:form.status}: {})},()=>{setOpen(false);setForm({})},form.id?'PATCH':'POST')}}><Input label="Name" value={form.name||''} onChange={v=>setForm(x=>({...x,name:v}))} required={false}/><Input label="Phone (09 / 10 — for sales & portal login)" value={form.phone||''} onChange={v=>setForm(x=>({...x,phone:v}))} placeholder="09xxxxxxxx" required={false}/><Input label="Address" value={form.address||''} onChange={v=>setForm(x=>({...x,address:v}))} required={false}/><Input label="Notes" value={form.notes||''} onChange={v=>setForm(x=>({...x,notes:v}))} required={false}/>{form.id&&<Select label="Status" value={form.status||'ACTIVE'} onChange={v=>setForm(x=>({...x,status:v}))} options={[{id:'ACTIVE',name:'Active'},{id:'INACTIVE',name:'Inactive'}]}/>}<div className="sm:col-span-2"><Btn busy={busy}>Save customer</Btn></div></form></Panel>}
  <Panel compact title="Summary">
   <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
    <div className="rounded-xl bg-[#f8faf8] p-3"><p className="label mb-1">Customers</p><p className="text-xl font-extrabold tabular-nums">{rows.length}</p><p className="muted text-[11px] mt-1">{list.length} total · {withBottles} with bottles</p></div>
    <div className="rounded-xl bg-[#f8faf8] p-3"><p className="label mb-1">Payment (net)</p><PaymentBalanceInline value={netPayment} large/></div>
    <div className="rounded-xl bg-[#f8faf8] p-3"><p className="label mb-1">Payment (+ / −)</p><p className="text-sm font-bold text-[#a8662b] tabular-nums">+{amount(paymentOwedTotal)} ETB</p><p className="text-sm font-bold text-[#177554] tabular-nums mt-0.5">−{amount(paymentCreditTotal)} ETB</p></div>
    <div className="rounded-xl bg-[#f8faf8] p-3"><p className="label mb-1">Bottles out</p><p className="text-xl font-extrabold tabular-nums">{bottleUnitsTotal}</p><p className="muted text-[11px] mt-1">units with customers</p></div>
   </div>
  </Panel>
  <div className="my-4 flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-center">
   <div className="relative flex-1 min-w-[200px] max-w-md"><Search size={16} className="absolute left-3 top-3.5 muted"/><input className="field pl-10!" placeholder="Search by name or phone…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
   <CustomerFilterTabs tab={balanceFilter} onTab={setBalanceFilter}/>
  </div>
  {customersLoading&&!customers?(<><div className="md:hidden"><SkeletonTable rows={5} cols={1}/></div><div className="hidden md:block"><SkeletonTable rows={8} cols={6}/></div></>):(<>
   <ResponsiveList rows={rows} columns={columns} emptyMessage="No customers match your search or filter." onRowClick={r=>router.push(`/customers/${r.id}`)}/>
   <DesktopTable rows={rows} columns={[...columns,{name:'Actions',render:r=><div className="flex gap-3 whitespace-nowrap"><Link href={`/customers/${r.id}`} className="text-[#177554] font-bold text-sm">History</Link><button type="button" className="muted text-sm" onClick={()=>{setForm(r);setOpen(true)}}>Edit</button></div>}]}/>
  </>)}
 </>;
}
function Products(){
 const {data:bottles=[]}=useData('/bottle-types');
 const {data:products=[]}=useData('/products');
 const {submit,busy}=useSubmit();
 const owner=getUser()?.role==='OWNER';
 const [open,setOpen]=useState(false);
 const [form,setForm]=useState<R>({unitsPerCase:12,active:true,bottleMode:'existing',initialQuantity:'0',addStock:'0',syncEmptyBottleStock:false,supplierName:'',stockNote:''});
 const activeBottles=bottles.filter((b:R)=>b.active!==false);
 const openForm=(row?:R)=>{setForm(row?{id:row.id,name:row.name,bottleTypeId:row.bottleTypeId,bottleMode:'existing',bottleName:'',sellingPrice:String(row.sellingPrice),defaultCost:String(row.defaultCost),unitsPerCase:row.unitsPerCase,active:row.active!==false,initialQuantity:'0',addStock:'0',stock:n(row.stock),syncEmptyBottleStock:false,supplierName:'',stockNote:''}:{name:'',bottleMode:'existing',bottleName:'',bottleTypeId:'',sellingPrice:'',defaultCost:'',unitsPerCase:12,active:true,initialQuantity:'0',addStock:'0',syncEmptyBottleStock:false,supplierName:'',stockNote:''});setOpen(true);};
 async function deactivate(id:string,label:string){if(!confirm(`Remove "${label}"? It will be hidden from sales.`))return;await submit(`/products/${id}`,{active:false},undefined,'PATCH');}
 return <>
  <Head title="Products & stock" action={owner?<button type="button" className="btn btn-primary" onClick={()=>openForm()}><Plus size={16}/> Add drink product</button>:undefined}/>
  <Table rows={products} columns={[{name:'Drink',render:r=><b>{r.name}</b>},{name:'Bottle',render:r=>r.bottleType?.name||'—'},{name:'In stock',render:r=><span className="font-extrabold text-[#177554]">{n(r.stock)}</span>},{name:'Price',render:r=>money(r.sellingPrice)},{name:'Cost',render:r=>money(r.defaultCost)},{name:'Status',render:r=><span className={`tag ${r.active===false?'opacity-60':''}`}>{r.active?'Active':'Inactive'}</span>},...(owner?[{name:'Actions',render:(r:R)=><div className="flex gap-3"><button type="button" className="text-[#177554] font-bold text-xs" onClick={()=>openForm(r)}>Edit</button>{r.active&&<button type="button" className="text-[#c45444] font-bold text-xs" onClick={()=>deactivate(r.id,r.name)}>Delete</button>}</div>}]:[])]}/>
  {open&&<Modal title={form.id?'Edit drink product':'Add drink product'} onClose={()=>setOpen(false)} footer={<><Btn busy={busy} form="product-form">{form.id?'Save':'Add product & stock'}</Btn><button type="button" className="btn btn-ghost" onClick={()=>setOpen(false)}>Cancel</button></>}><form id="product-form" className="space-y-4" onSubmit={async e=>{e.preventDefault();if(!form.name?.trim())return toast.error('Product name is required');if(form.bottleMode==='existing'&&!form.bottleTypeId)return toast.error('Choose a bottle type');if(form.bottleMode==='new'&&!form.bottleName?.trim())return toast.error('Enter bottle packaging name');const base={name:String(form.name).trim(),sellingPrice:String(form.sellingPrice),defaultCost:String(form.defaultCost),unitsPerCase:n(form.unitsPerCase)||12};if(form.id){const patch:R={...base,bottleTypeId:form.bottleTypeId,active:form.active!==false};const delta=n(form.addStock);if(delta!==0){patch.addStock=delta;if(form.stockNote?.trim())patch.stockNote=String(form.stockNote).trim();if(form.supplierName?.trim())patch.supplierName=String(form.supplierName).trim();if(form.syncEmptyBottleStock)patch.syncEmptyBottleStock=true}await submit(`/products/${form.id}`,patch,()=>setOpen(false),'PATCH');return}const payload:R={...base,initialQuantity:n(form.initialQuantity)};if(form.bottleMode==='existing')payload.bottleTypeId=form.bottleTypeId;else payload.bottleName=String(form.bottleName).trim();if(n(form.initialQuantity)!==0){if(form.stockNote?.trim())payload.stockNote=String(form.stockNote).trim();if(form.supplierName?.trim())payload.supplierName=String(form.supplierName).trim();if(form.syncEmptyBottleStock)payload.syncEmptyBottleStock=true}await submit('/products',payload,()=>setOpen(false),'POST');}}>
   <Input label="Drink name" value={form.name||''} onChange={v=>setForm(x=>({...x,name:v}))} placeholder="e.g. Coca 300ml" required/>
   {!form.id&&<div className="space-y-3 rounded-xl border border-[#e5eae5] p-4 bg-[#fafcfb]"><p className="text-xs font-bold text-[#52645a]">Bottle packaging</p><div className="flex gap-2"><button type="button" className={`flex-1 py-2 rounded-lg text-xs font-bold ${form.bottleMode==='existing'?'bg-[#177554] text-white':'bg-white border border-[#e0e7e0]'}`} onClick={()=>setForm(x=>({...x,bottleMode:'existing',bottleName:''}))}>Existing bottle</button><button type="button" className={`flex-1 py-2 rounded-lg text-xs font-bold ${form.bottleMode==='new'?'bg-[#177554] text-white':'bg-white border border-[#e0e7e0]'}`} onClick={()=>setForm(x=>({...x,bottleMode:'new',bottleTypeId:''}))}>New bottle</button></div>{form.bottleMode==='new'?<Input label="Bottle name" value={form.bottleName||''} onChange={v=>setForm(x=>({...x,bottleName:v}))} placeholder="e.g. Glass 300ml" required/>:<Select label="Bottle type" value={form.bottleTypeId||''} onChange={v=>setForm(x=>({...x,bottleTypeId:v}))} options={activeBottles.length?activeBottles:bottles}/>}</div>}
   {form.id&&<Select label="Bottle type" value={form.bottleTypeId||''} onChange={v=>setForm(x=>({...x,bottleTypeId:v}))} options={activeBottles.length?activeBottles:bottles}/>}
   <div className="grid grid-cols-2 gap-3"><Input label="Selling price (ETB)" type="number" value={form.sellingPrice||''} onChange={v=>setForm(x=>({...x,sellingPrice:v}))} required/><Input label="Purchase cost (ETB)" type="number" value={form.defaultCost||''} onChange={v=>setForm(x=>({...x,defaultCost:v}))} required/></div>
   <Input label="Units per case" type="number" value={form.unitsPerCase} onChange={v=>setForm(x=>({...x,unitsPerCase:v}))}/>
   {!form.id?<Input label="Starting stock quantity" type="number" value={form.initialQuantity} onChange={v=>setForm(x=>({...x,initialQuantity:v}))} placeholder="0"/>:<><p className="text-xs font-bold text-[#52645a]">Current stock: {n(form.stock)} units</p><Input label="Add or remove stock (+ / −)" type="number" value={form.addStock} onChange={v=>setForm(x=>({...x,addStock:v}))} placeholder="0"/></>}
   <Input label="Supplier name (optional)" value={form.supplierName||''} onChange={v=>setForm(x=>({...x,supplierName:v}))} placeholder="Who you bought from"/>
   <Input label="Stock note (optional)" value={form.stockNote||''} onChange={v=>setForm(x=>({...x,stockNote:v}))} placeholder="Invoice no., delivery date, etc."/>
   {form.id&&<label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.active!==false} onChange={e=>setForm(x=>({...x,active:e.target.checked}))}/> Active</label>}
   <label className="flex items-start gap-2 text-sm font-semibold"><input type="checkbox" checked={!!form.syncEmptyBottleStock} onChange={e=>setForm(x=>({...x,syncEmptyBottleStock:e.target.checked}))}/><span>Also update empty bottle warehouse stock by the same amount</span></label>
  </form></Modal>}
 </>;
}
function Inventory(){
 const {data:summary,isLoading,error}=useData('/inventory/empty-bottle-summary');
 const {data:bottles=[]}=useData('/bottle-types');
 const {submit,busy}=useSubmit();
 const owner=getUser()?.role==='OWNER';
 const [open,setOpen]=useState(false);
 const [form,setForm]=useState<R>({warehouseQty:'',note:''});
 const rows=summary?.rows||[];
 const activeBottles=bottles.filter((b:R)=>b.active!==false);
 const pickBottle=(id:string)=>{const row=rows.find((x:R)=>x.bottleTypeId===id);setForm(x=>({...x,bottleTypeId:id,warehouse:n(row?.warehouse),withCustomers:n(row?.withCustomers),warehouseQty:String(row?.warehouse??0)}));};
 const openForm=(row?:R)=>{setForm(row?{edit:true,bottleTypeId:row.bottleTypeId,warehouse:n(row.warehouse),withCustomers:n(row.withCustomers),warehouseQty:String(row.warehouse),note:''}:{edit:false,bottleMode:'existing',bottleName:'',bottleTypeId:'',warehouse:0,withCustomers:0,warehouseQty:'0',note:''});setOpen(true);};
 return <>
  <Head title="Empty bottles" action={owner?<button type="button" className="btn btn-primary" onClick={()=>openForm()}><Plus size={16}/> Add empty bottle</button>:undefined}/>
  <LoadError error={error}/>
  {isLoading&&!summary?(<><SkeletonStatGrid count={3}/><SkeletonTable rows={6} cols={4}/></>):(<><div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
   <Stat label="In warehouse" value={String(summary?.totals?.warehouse??0)} icon={GlassWater} small="Physical empties you hold"/>
   <Stat label="With customers" value={String(summary?.totals?.withCustomers??0)} icon={Users} small="From sales & returns (ledger)"/>
   <Stat label="Bottle types" value={String(rows.length)} icon={PackageCheck}/>
  </div>
  <Table rows={rows} columns={[{name:'Bottle type',render:r=><b>{r.name}</b>},{name:'In warehouse',render:r=><span className="font-extrabold text-[#177554]">{r.warehouse}</span>},{name:'With customers',render:r=><span className={`font-extrabold ${n(r.withCustomers)>0?'text-[#a8662b]':'muted'}`}>{n(r.withCustomers)>0?`+${r.withCustomers}`:r.withCustomers}</span>},...(owner?[{name:'Actions',render:(r:R)=><button type="button" className="text-[#177554] font-bold text-xs" onClick={()=>openForm(r)}>Edit stock</button>}]:[])]}/>
  {open&&owner&&<Modal title={form.edit?'Warehouse empty stock':'Add empty bottle'} onClose={()=>setOpen(false)} footer={<><Btn busy={busy} form="empty-bottle-form">{form.edit?'Save':'Add bottle & stock'}</Btn><button type="button" className="btn btn-ghost" onClick={()=>setOpen(false)}>Cancel</button></>}><form id="empty-bottle-form" className="space-y-4" onSubmit={async e=>{e.preventDefault();const target=n(form.warehouseQty);if(target<0)return toast.error('Quantity cannot be negative');const note=String(form.note||'').trim();if(!form.edit&&form.bottleMode==='new'){if(!form.bottleName?.trim())return toast.error('Enter bottle name');if(target>0&&!note)return toast.error('Reason is required when setting warehouse stock');const payload:R={name:String(form.bottleName).trim()};if(target>0){payload.initialWarehouseQuantity=target;payload.note=note}await submit('/bottle-types',payload,()=>setOpen(false));return}const bottleTypeId=form.bottleTypeId;if(!bottleTypeId)return toast.error('Choose a bottle type');if(!note)return toast.error('Reason is required');const delta=target-n(form.warehouse);if(delta===0)return toast.info('No change to save');await submit('/inventory/adjustments',{kind:'EMPTY_BOTTLE',bottleTypeId,delta,note},()=>setOpen(false))}}>
   {form.edit?<Select label="Bottle type" value={form.bottleTypeId||''} onChange={pickBottle} options={activeBottles.length?activeBottles:bottles}/>:<div className="space-y-3 rounded-xl border border-[#e5eae5] p-4 bg-[#fafcfb]"><p className="text-xs font-bold text-[#52645a]">Bottle type</p><div className="flex gap-2"><button type="button" className={`flex-1 py-2 rounded-lg text-xs font-bold ${form.bottleMode==='existing'?'bg-[#177554] text-white':'bg-white border border-[#e0e7e0]'}`} onClick={()=>setForm(x=>({...x,bottleMode:'existing',bottleName:''}))}>Existing bottle</button><button type="button" className={`flex-1 py-2 rounded-lg text-xs font-bold ${form.bottleMode==='new'?'bg-[#177554] text-white':'bg-white border border-[#e0e7e0]'}`} onClick={()=>setForm(x=>({...x,bottleMode:'new',bottleTypeId:''}))}>New bottle</button></div>{form.bottleMode==='new'?<Input label="Bottle name" value={form.bottleName||''} onChange={v=>setForm(x=>({...x,bottleName:v}))} placeholder="e.g. Glass 300ml" required/>:<Select label="Bottle type" value={form.bottleTypeId||''} onChange={pickBottle} options={activeBottles.length?activeBottles:bottles}/>}</div>}
   {(form.edit||form.bottleMode==='existing')&&form.bottleTypeId&&<div className="rounded-xl bg-[#f8faf8] p-4 text-sm space-y-1"><p><span className="muted">With customers (ledger):</span> <b className="text-[#a8662b]">+{n(form.withCustomers)}</b></p></div>}
   <Input label="Warehouse quantity (total on hand)" type="number" value={form.warehouseQty} onChange={v=>setForm(x=>({...x,warehouseQty:v}))} required/>
   <Input label="Reason" value={form.note||''} onChange={v=>setForm(x=>({...x,note:v}))} placeholder="e.g. Opening count, stock count" required={form.edit||n(form.warehouseQty)>0||form.bottleMode==='existing'}/>
  </form></Modal>}</>)}
 </>;
}
function Bottles(){const {data:customers=[]}=useData('/customers');const {data:bottles=[]}=useData('/bottle-types');const {submit,busy}=useSubmit();const [customerId,setCustomerId]=useState('');const [bottleTypeId,setBottleTypeId]=useState('');const [quantity,setQuantity]=useState('');const [note,setNote]=useState('');const {data:ledger}=useData(customerId?`/customer-bottles/${customerId}`:'',!!customerId);return <><Head title="Bottle returns"/><div className="grid lg:grid-cols-[1fr_1fr] gap-5"><Panel title="Receive bottles"><form className="space-y-4" onSubmit={async e=>{e.preventDefault();await submit('/customer-bottles/returns',{customerId,bottleTypeId,quantity:n(quantity),note:note||undefined},()=>{setQuantity('');setNote('')})}}><Select label="Registered customer" value={customerId} onChange={setCustomerId} options={registeredCustomerOptions(customers,true)}/><Select label="Bottle type" value={bottleTypeId} onChange={setBottleTypeId} options={bottles}/><Input label="Returned quantity" type="number" value={quantity} onChange={setQuantity}/><Input label="Note (optional)" value={note} onChange={setNote}/><Btn busy={busy}>Record bottle return</Btn></form></Panel><Panel title="Customer outstanding bottles">{!customerId?<p className="muted">Select a customer to see their bottle balances.</p>:<><div className="space-y-3">{(ledger?.totals||[]).map((x:R)=><div key={x.bottleTypeId} className="bg-[#f8faf8] rounded-xl p-4 flex justify-between"><b>{bottles.find((b:R)=>b.id===x.bottleTypeId)?.name||'Bottle'}</b><span className="font-extrabold">{x.outstanding} owed</span></div>)}</div>{!ledger?.totals?.length&&<p className="muted">No outstanding bottles.</p>}</>}</Panel></div>{customerId&&<><h2 className="font-extrabold my-5">Bottle movement history</h2><Table rows={ledger?.movements||[]} columns={[{name:'Date',render:r=>date(r.createdAt)},{name:'Bottle type',render:r=>r.bottleType?.name},{name:'Movement',render:r=><b className={r.delta>0?'danger':'text-[#177554]'}>{r.delta>0?'+':''}{r.delta}</b>},{name:'Reason',render:r=>r.reason}]}/></>}</>}
function invoiceRemaining(sale:R){const paid=(sale.payments||[]).reduce((v:number,p:R)=>v+n(p.amount),0);return Math.max(0,n(sale.total)-paid);}
function PaymentBalanceBig({value}:{value:unknown}){return <PaymentBalanceInline value={value} large/>;}
function Payments(){
 const {data:customers=[]}=useData('/customers');
 const {data:payments=[]}=useData('/payments');
 const {data:sales=[]}=useData('/sales');
 const {submit,busy}=useSubmit();
 const [customerId,setCustomerId]=useState('');
 const [saleId,setSaleId]=useState('');
 const [amount,setAmount]=useState('');
 const [method,setMethod]=useState('CASH');
 const [note,setNote]=useState('');
 const selected=customerId?customers.find((c:R)=>c.id===customerId):null;
 const selectedSale=saleId?sales.find((s:R)=>s.id===saleId):null;
 const accountOwed=n(selected?.moneyOutstanding);
 const invoiceOwed=selectedSale?invoiceRemaining(selectedSale):null;
 const displayBalance=saleId&&selectedSale!=null?invoiceOwed!:accountOwed;
 const payAmountDue=displayBalance>0.001?displayBalance:0;
 return <>
  <Head title="Customer payments"/>
  <Panel title="Record payment">
   <form onSubmit={async e=>{e.preventDefault();await submit('/payments',{customerId,saleId:saleId||undefined,amount,method,note:note||undefined},()=>{setAmount('');setSaleId('');setNote('')})}} className="space-y-4">
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
     <Select label="Registered customer" value={customerId} onChange={v=>{setCustomerId(v);setSaleId('');setAmount('')}} options={registeredCustomerOptions(customers,true)}/>
     <Select label="Specific invoice (optional)" value={saleId} onChange={setSaleId} options={sales.filter((s:R)=>s.customerId===customerId).map((s:R)=>{const rem=invoiceRemaining(s);return {id:s.id,name:`${String(s.invoiceNo).slice(0,15)} · ${paymentBalanceSigned(rem>0.001?rem:0)}`}})} empty="All invoices (total balance)" disabled={!customerId}/>
     <Input label="Amount (ETB)" type="number" value={amount} onChange={setAmount} placeholder={customerId&&payAmountDue>0.001?String(payAmountDue.toFixed(2)):undefined}/>
     <Select label="Method" value={method} onChange={setMethod} options={[{id:'CASH',name:'Cash'},{id:'BANK',name:'Bank'},{id:'MOBILE',name:'Mobile'}]}/>
     <Input label="Note" value={note} onChange={setNote}/>
    </div>
    {customerId&&<div className={`rounded-xl border px-4 py-4 flex flex-wrap items-center justify-between gap-3 ${Math.abs(displayBalance)<0.001?'border-[#cfe0d4] bg-[#f0f9f4]':displayBalance>0?'border-[#f5e0d4] bg-[#fff9f5]':'border-[#cfe0d4] bg-[#f0f9f4]'}`}>
     <div>
      <p className="label mb-1">{saleId&&selectedSale?'This invoice':'Balance'}</p>
      <PaymentBalanceBig value={displayBalance}/>
      {saleId&&selectedSale&&<p className="muted text-xs mt-1">All invoices: {paymentBalanceSigned(accountOwed)}</p>}
      {!saleId&&selected?.name&&<p className="muted text-xs mt-1">{selected.name}{selected.phone?` · ${selected.phone}`:''}</p>}
     </div>
     {payAmountDue>0.001&&<button type="button" className="btn btn-ghost text-sm shrink-0" onClick={()=>setAmount(String(payAmountDue.toFixed(2)))}>Use full amount</button>}
    </div>}
    {!customerId&&<p className="muted text-sm">Choose a customer to see balance (+ owed, − credit).</p>}
    <div className="flex justify-end"><Btn busy={busy}>Record payment</Btn></div>
   </form>
  </Panel>
  <h2 className="font-extrabold my-5">Payment history</h2>
  <Table rows={payments} columns={[{name:'Date',render:r=>date(r.createdAt)},{name:'Customer',render:r=>customers.find((x:R)=>x.id===r.customerId)?.name||'Guest'},{name:'Amount',render:r=><b>{money(r.amount)}</b>},{name:'Method',render:r=>r.method},{name:'Note',render:r=>r.note||'—'}]}/>
 </>;
}
function Finance(){const {data:expenses=[]}=useData('/expenses');const {submit,busy}=useSubmit();const [category,setCategory]=useState('Transport');const [description,setDescription]=useState('');const [amount,setAmount]=useState('');return <><Head title="Expenses"/><Panel title="New expense"><form className="space-y-3 max-w-lg" onSubmit={async e=>{e.preventDefault();await submit('/expenses',{category,description,amount,method:'CASH'},()=>{setDescription('');setAmount('')})}}><Input label="Category" value={category} onChange={setCategory}/><Input label="Description" value={description} onChange={setDescription}/><Input label="Amount (ETB)" type="number" value={amount} onChange={setAmount}/><Btn busy={busy}>Save expense</Btn></form></Panel><h2 className="font-extrabold my-5">Expense history</h2><Table rows={expenses} columns={[{name:'Date',render:r=>date(r.createdAt)},{name:'Category',render:r=>r.category},{name:'Description',render:r=>r.description},{name:'Amount',render:r=><b>{money(r.amount)}</b>}]}/></>}
type ReportPeriodMode='day'|'month'|'range';
function isoAddDays(iso:string,delta:number){const d=new Date(`${iso}T12:00:00.000Z`);d.setUTCDate(d.getUTCDate()+delta);return d.toISOString().slice(0,10);}
function isoAddMonths(iso:string,delta:number){const d=new Date(`${iso}T12:00:00.000Z`);d.setUTCMonth(d.getUTCMonth()+delta);return d.toISOString().slice(0,10);}
function monthRange(iso:string){const d=new Date(`${iso}T12:00:00.000Z`);const y=d.getUTCFullYear();const m=d.getUTCMonth();return {from:new Date(Date.UTC(y,m,1)).toISOString().slice(0,10),to:new Date(Date.UTC(y,m+1,0)).toISOString().slice(0,10)};}
function formatReportDay(iso:string){return new Date(`${iso}T12:00:00.000Z`).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});}
function formatReportMonth(iso:string){return new Date(`${iso}T12:00:00.000Z`).toLocaleDateString('en-GB',{month:'long',year:'numeric',timeZone:'UTC'});}
function ReportPeriodTabs({tab,onTab}:{tab:ReportPeriodMode;onTab:(t:ReportPeriodMode)=>void}){const items:[ReportPeriodMode,string][]=[['day','Daily'],['month','Monthly'],['range','Date range']];return <div className="flex flex-wrap gap-1.5">{items.map(([id,label])=><button key={id} type="button" className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${tab===id?'bg-[#177554] text-white':'bg-[#eef2ee] text-[#68776e] hover:bg-[#e7f4ed] hover:text-[#126a4c]'}`} onClick={()=>onTab(id)}>{label}</button>)}</div>;}
type ReportViewTab='summary'|'payment'|'bottle';
function ReportViewTabs({tab,onTab}:{tab:ReportViewTab;onTab:(t:ReportViewTab)=>void}){const items:[ReportViewTab,string][]=[['summary','Summary'],['payment','Payments'],['bottle','Bottles']];return <div className="flex flex-wrap gap-1.5">{items.map(([id,label])=><button key={id} type="button" className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${tab===id?'bg-[#177554] text-white':'bg-[#eef2ee] text-[#68776e] hover:bg-[#e7f4ed] hover:text-[#126a4c]'}`} onClick={()=>onTab(id)}>{label}</button>)}</div>;}
function reportSumReceived(lines:R[]){return lines.reduce((s,r)=>s+(r.received!=null?n(r.received):0),0);}
function reportSumCredited(lines:R[]){return lines.reduce((s,r)=>s+(r.credited!=null?n(r.credited):0),0);}
function reportBottleTotals(lines:R[]){let out=0,in_=0;for(const r of lines){const d=n(r.bottleDelta);if(d>0)out+=d;else if(d<0)in_+=-d;}return {out,in:in_};}
function Reports(){
 const [mode,setMode]=useState<ReportPeriodMode>('day');
 const [focusDate,setFocusDate]=useState(today);
 const [rangeFrom,setRangeFrom]=useState(today);
 const [rangeTo,setRangeTo]=useState(today);
 const t=today();
 const {from,to}=mode==='day'?{from:focusDate,to:focusDate}:mode==='month'?monthRange(focusDate):{from:rangeFrom,to:rangeTo};
 const query=`?from=${from}&to=${to}`;
 const {data:s,isLoading,error}=useData(`/reports/summary${query}`);
 const {data:activity,isLoading:activityLoading}=useData(`/reports/activity${query}`);
 const [reportSearch,setReportSearch]=useState('');
 const [reportView,setReportView]=useState<ReportViewTab>('summary');
 const periodTitle=mode==='day'?formatReportDay(focusDate):mode==='month'?formatReportMonth(focusDate):`${formatReportDay(from)} – ${formatReportDay(to)}`;
 const isToday=mode==='day'&&focusDate===t;
 const isCurrentMonth=mode==='month'&&monthRange(focusDate).from===monthRange(t).from;
 function goPrev(){if(mode==='day')setFocusDate(isoAddDays(focusDate,-1));else if(mode==='month')setFocusDate(isoAddMonths(focusDate,-1));}
 function goNext(){if(mode==='day')setFocusDate(isoAddDays(focusDate,1));else if(mode==='month')setFocusDate(isoAddMonths(focusDate,1));}
 function goToday(){setFocusDate(t);if(mode==='range'){setRangeFrom(t);setRangeTo(t);}}
 const activityLines=(activity?.lines||[]) as R[];
 const q=reportSearch.trim().toLowerCase();
 const searchedLines=q?activityLines.filter((r:R)=>String(r.customerName||'').toLowerCase().includes(q)||String(r.label||'').toLowerCase().includes(q)):activityLines;
 const paymentLines=searchedLines.filter((r:R)=>r.kind==='payment'||r.kind==='credit');
 const bottleLines=searchedLines.filter((r:R)=>r.kind==='bottle');
 const tabLines=reportView==='payment'?paymentLines:reportView==='bottle'?bottleLines:searchedLines;
 const tabReceived=reportSumReceived(paymentLines);
 const tabCredited=reportSumCredited(paymentLines);
 const tabBottles=reportBottleTotals(bottleLines);
 const linesForExport=reportView==='summary'?searchedLines:tabLines;
 const printLines=linesForExport.map((r:R)=>({date:r.date,customerName:r.customerName,label:r.label,received:r.received,credited:r.credited,bottleDelta:r.bottleDelta,bottleTypeName:r.bottleTypeName}));
 function exportCSV(){
  const cols=reportView==='payment'?['Date','Customer','Detail','Received','Credited']:reportView==='bottle'?['Date','Customer','Detail','Bottles']:['Date','Customer','Detail','Received','Credited','Bottles'];
  const rows=[cols.join(','),...linesForExport.map((r:R)=>{const bot=r.bottleDelta!=null?`${r.bottleDelta} ${r.bottleTypeName||''}`.trim():'';const cells=reportView==='payment'?[r.date,r.customerName,r.label,r.received??'',r.credited??'']:reportView==='bottle'?[r.date,r.customerName,r.label,bot]:[r.date,r.customerName,r.label,r.received??'',r.credited??'',bot];return cells.map((c:string)=>`"${String(c).replace(/"/g,'""')}"`).join(',');})];
  const blob=new Blob([rows.join('\n')],{type:'text/csv'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`report-${reportView}-${from}-${to}.csv`;a.click();URL.revokeObjectURL(url);
 }
 function printPdf(){
  if(!s)return;
  printReport({view:reportView,periodLabel:periodTitle,from,to,salesRevenue:String(s.salesRevenue??0),cashReceived:String(reportView==='bottle'?0:reportView==='summary'?tabReceived:tabReceived),credited:String(reportView==='bottle'?0:tabCredited),bottlesOut:reportView==='payment'?0:tabBottles.out,bottlesIn:reportView==='payment'?0:tabBottles.in,expenses:String(s.expenses??0),estimatedNetProfit:String(s.estimatedNetProfit??0),salesCount:s.salesCount,lines:printLines});
  toast.message('Choose “Save as PDF” in the print dialog if you want a PDF file.');
 }
 return <div className="report-screen">
  <Head title="Reports" action={<div className="flex flex-wrap gap-2 no-print"><button type="button" className="btn btn-ghost" disabled={!s} onClick={printPdf}><Printer size={16}/> Print / PDF</button><button type="button" className="btn btn-ghost" onClick={exportCSV}><Download size={16}/> CSV</button></div>}/>
  <Panel compact>
   <div className="flex flex-col gap-3">
    <ReportPeriodTabs tab={mode} onTab={m=>{setMode(m);if(m!=='range')setFocusDate(m==='day'?focusDate:rangeFrom||focusDate);if(m==='range'&&!rangeFrom){setRangeFrom(focusDate);setRangeTo(focusDate);}}}/>
    {mode!=='range'?(<div className="flex items-center justify-between gap-2 flex-wrap">
     <button type="button" className="sidebar-toggle" aria-label="Previous" onClick={goPrev}><ChevronLeft size={18}/></button>
     <span className="font-extrabold text-base text-center flex-1 min-w-[8rem]">{periodTitle}</span>
     <button type="button" className="sidebar-toggle" aria-label="Next" onClick={goNext}><ChevronRight size={18}/></button>
     {((mode==='day'&&!isToday)||(mode==='month'&&!isCurrentMonth))&&<button type="button" className="btn btn-ghost text-xs py-2 min-h-[38px] w-full sm:w-auto sm:ml-auto" onClick={goToday}>Jump to today</button>}
    </div>):(<div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end"><Input label="From" type="date" value={rangeFrom} onChange={setRangeFrom}/><Input label="To" type="date" value={rangeTo} onChange={setRangeTo}/><button type="button" className="btn btn-ghost text-sm min-h-[43px] col-span-2 sm:col-span-1" onClick={goToday}>Today</button></div>)}
   </div>
  </Panel>
  <LoadError error={error}/>
  {(isLoading||activityLoading)&&!s?<DataLoadSkeleton variant="stats-table"/>:<>
   <div id="report-print-area" className="mt-5">
    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 mb-4 no-print"><ReportViewTabs tab={reportView} onTab={setReportView}/><div className="relative flex-1 min-w-[200px] max-w-md sm:ml-auto"><Search size={16} className="absolute left-3 top-3.5 muted"/><input className="field pl-10!" placeholder="Search customer…" value={reportSearch} onChange={e=>setReportSearch(e.target.value)}/></div></div>
    {reportView==='summary'&&<div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5"><Stat label="Sales" value={money(s?.salesRevenue)} icon={ShoppingBag} small={s?.salesCount!=null?`${s.salesCount} invoice(s)`:undefined}/><Stat label="Received" value={money(tabReceived)} icon={Wallet} small={q?'Filtered':undefined}/><Stat label="Credit (sales)" value={money(tabCredited)} icon={Receipt}/><Stat label="Bottles out / in" value={`+${tabBottles.out} / −${tabBottles.in}`} icon={GlassWater}/><Stat label="Expenses" value={money(s?.expenses)} icon={Receipt}/><Stat label="Net profit (est.)" value={money(s?.estimatedNetProfit)} icon={TrendingUp}/></div>}
    {reportView==='payment'&&<div className="grid grid-cols-2 gap-3 mb-5 max-w-lg"><Stat label="Received" value={money(tabReceived)} icon={Wallet}/><Stat label="Credit (sales)" value={money(tabCredited)} icon={Receipt} small={`${paymentLines.length} row(s)`}/></div>}
    {reportView==='bottle'&&<div className="grid grid-cols-2 gap-3 mb-5 max-w-lg"><Stat label="Bottles out" value={`+${tabBottles.out}`} icon={GlassWater}/><Stat label="Bottles in" value={`−${tabBottles.in}`} icon={GlassWater} small={`${bottleLines.length} row(s)`}/></div>}
    {reportView!=='summary'&&<>
     <h2 className="font-extrabold mb-3 text-base">{reportView==='payment'?'Payment activity':'Bottle activity'}</h2>
     <Table rows={tabLines} emptyMessage={reportView==='payment'?'No payments in this period.':'No bottle movements in this period.'} columns={reportView==='payment'?[
      {name:'Date',render:r=><span className="whitespace-nowrap">{date(r.at||r.date)}</span>},
      {name:'Customer',render:r=><b>{r.customerName}</b>},
      {name:'Detail',render:r=><span className="text-sm text-[#4a5c54]">{r.label}</span>},
      {name:'Received',render:r=>r.received!=null?<b className="text-[#177554] tabular-nums">{money(r.received)}</b>:<span className="muted">—</span>},
      {name:'Credited',render:r=>r.credited!=null?<b className="text-[#a8662b] tabular-nums">{money(r.credited)}</b>:<span className="muted">—</span>},
     ]:[
      {name:'Date',render:r=><span className="whitespace-nowrap">{date(r.at||r.date)}</span>},
      {name:'Customer',render:r=><b>{r.customerName}</b>},
      {name:'Detail',render:r=><span className="text-sm text-[#4a5c54]">{r.label}</span>},
      {name:'Bottles',render:r=><span className={`text-sm font-bold ${n(r.bottleDelta)>0?'text-[#a8662b]':'text-[#177554]'}`}>{signedQty(n(r.bottleDelta))} <span className="font-medium text-[#4a5c54]">{r.bottleTypeName}</span></span>},
     ]}/>
    </>}
   </div>
  </>}
 </div>;
}
function Settings(){const {data:users=[]}=useData('/users');const {submit,busy}=useSubmit();const [username,setUsername]=useState('');const [password,setPassword]=useState('');const [role,setRole]=useState('CASHIER');return <><Head title="Staff & settings"/><Panel title="Create staff account"><form className="grid sm:grid-cols-3 gap-3" onSubmit={async e=>{e.preventDefault();await submit('/users',{username,password,role},()=>{setUsername('');setPassword('')})}}><Input label="Username" value={username} onChange={setUsername}/><Input label="Password (at least 4 characters)" type="password" minLength={4} value={password} onChange={setPassword}/><Select label="Role" value={role} onChange={setRole} options={[{id:'CASHIER',name:'Cashier'},{id:'OWNER',name:'Owner'}]}/><div className="sm:col-span-3"><Btn busy={busy}>Create account</Btn></div></form></Panel><h2 className="font-extrabold my-5">Staff members</h2><Table rows={users} columns={[{name:'Username',render:r=><b>{r.username}</b>},{name:'Role',render:r=>r.role},{name:'Status',render:r=><span className="tag">{r.active?'Active':'Disabled'}</span>},{name:'Created',render:r=>date(r.createdAt)}]}/></>}
function Sales(){
 const {data:sales,isLoading,error}=useData('/sales');
 const [selected,setSelected]=useState('');
 const {data:detail,isLoading:detailLoading}=useData(selected?`/sales/${selected}`:'',!!selected);
 const list=sales||[];
 const customerLabel=(r:R)=>r.guestName||(r.customerId?'Registered customer':'Walk-in');
 const paidOf=(r:R)=>money((r.payments||[]).reduce((s:number,p:R)=>s+n(p.amount),0));
 const columns:ListColumn<R>[]=[
  {name:'Invoice',primary:true,render:r=><b className="break-all">{String(r.invoiceNo).slice(0,24)}</b>},
  {name:'Date',mobileLabel:'Date',render:r=>date(r.createdAt)},
  {name:'Customer',mobileLabel:'Customer',render:r=><span className="text-right max-w-[52vw] truncate inline-block">{customerLabel(r)}</span>},
  {name:'Total',mobileLabel:'Total',render:r=><b>{money(r.total)}</b>},
  {name:'Paid',mobileLabel:'Paid',render:r=>paidOf(r)},
  {name:'Action',hideOnMobile:true,render:r=><button type="button" className="text-[#177554] font-bold" onClick={()=>setSelected(r.id)}>Details</button>},
 ];
 return <>
  <Head title="Sales & invoices" action={<Link className="btn btn-primary" href="/sell"><Plus size={16}/> New sale</Link>}/>
  <LoadError error={error}/>
  {isLoading&&!sales?(<><div className="md:hidden"><SkeletonTable rows={5} cols={1}/></div><div className="hidden md:block"><SkeletonTable rows={8} cols={6}/></div></>):(<>
   <ResponsiveList rows={list} columns={columns} onRowClick={r=>setSelected(r.id)} emptyMessage="No sales yet. Create your first sale."/>
   <DesktopTable rows={list} columns={columns}/>
  </>)}
  {selected&&<Modal title={`Invoice ${detail?.invoiceNo||'…'}`} onClose={()=>setSelected('')} footer={<><button type="button" className="btn btn-ghost no-print" onClick={()=>window.print()}><Printer size={16}/> Print</button><button type="button" className="btn btn-primary" onClick={()=>setSelected('')}>Close</button></>}>
   {detailLoading&&!detail?<SkeletonTable rows={4} cols={2}/>:<>
    <p className="muted text-sm mb-4">{date(detail?.createdAt)} · {customerLabel(detail||{})}</p>
    <div className="md:hidden space-y-2 mb-4">{(detail?.items||[]).map((r:R)=><div key={r.id||r.productId} className="rounded-xl border border-[#edf1ed] p-3 flex justify-between gap-3 text-sm"><div className="min-w-0"><b className="block truncate">{r.product?.name||r.productId}</b><span className="muted">{r.quantity} × {money(r.unitPrice)}</span></div><b className="shrink-0 tabular-nums">{money(r.lineTotal)}</b></div>)}</div>
    <div className="hidden md:block"><Table rows={detail?.items||[]} columns={[{name:'Product',render:r=>r.product?.name||r.productId},{name:'Qty',render:r=>r.quantity},{name:'Unit price',render:r=>money(r.unitPrice)},{name:'Total',render:r=>money(r.lineTotal)}]}/></div>
    <div className="flex flex-wrap justify-between items-center gap-2 mt-4 pt-4 border-t border-[#edf1ed]"><span className="muted text-sm">Paid {paidOf(detail||{})}</span><span className="font-extrabold text-xl tabular-nums">Total {money(detail?.total)}</span></div>
   </>}
  </Modal>}
 </>;
}
export function Workspace({section}:{section:string}){const owner=getUser()?.role==='OWNER';if(['reports','settings'].includes(section)&&!owner)return <div className="panel p-8">Owner access required.</div>;switch(section){case'dashboard':return <Overview/>;case'sell':return <SaleForm/>;case'sales':return <Sales/>;case'customers':return <Customers/>;case'products':return <Products/>;case'inventory':return <Inventory/>;case'bottles':return <Bottles/>;case'payments':return <Payments/>;case'finance':return <Finance/>;case'reports':return <Reports/>;case'settings':return <Settings/>;default:return <div className="panel p-8">Page not found. <Link className="text-[#177554]" href="/dashboard">Back to dashboard</Link></div>}}

