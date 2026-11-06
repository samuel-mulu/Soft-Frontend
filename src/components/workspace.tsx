'use client';
import {useState,useEffect} from 'react';import {createPortal} from 'react-dom';import Link from 'next/link';import {useRouter} from 'next/navigation';import {useQueryClient} from '@tanstack/react-query';
import {ApiRequestError,friendlySaleError,inferSaleFieldErrors,postSaleWithRetry,stockIssues,type SaleFieldErrors} from '@/lib/sale-errors';import {toast} from 'sonner';import {api,post,patch,money,amount,date,getUser} from '@/lib/api';import {printSaleReceipt,downloadSaleReceipt,resolveReceiptLogoUrl,type SaleReceiptData} from '@/lib/sale-receipt';import {printReport} from '@/lib/report-print';import {getBusinessName} from '@/lib/brand';
import {DataLoadSkeleton,LoadError,SkeletonTable,SkeletonStatGrid} from '@/components/ui/skeleton';
import {DesktopTable,ResponsiveList,type ListColumn} from '@/components/responsive-list';import {SalePage} from '@/features/sales/components/sale-page';import {BottleReturnsPage} from '@/components/bottle-returns-page';
import {ProductInitialStockSection,buildProductCreateStockPayload,defaultInitialStockFields,validateInitialStock,type InitialStockFields} from '@/features/products/components/product-initial-stock-section';import {formatDozen,formatDozenValue,formatSignedDozen,isValidDozenField,isValidPackSize,packSizeOrDefault,safeDozenToBottles} from '@/lib/pack-quantity';import {usePackSizes} from '@/hooks/use-pack-sizes';import {BottleBalance,BottleBalanceList,MoneyBalance} from '@/components/balance-display';import {aggregateCustomersBottleBalances,formatDisplayBottle,formatDisplayMoney,presentCustomerBalance,toDisplayBottle,toDisplayMoney} from '@/lib/customer-balance';import {invalidateAfterExpense,invalidateBalanceQueries,queryKeys} from '@/lib/query-keys';import {Plus,Search,ArrowRight,ArrowLeft,Download,RefreshCw,ShoppingBag,PackageCheck,Wallet,GlassWater,TrendingUp,Users,Receipt,ChevronLeft,ChevronRight,ChevronDown,Printer,X} from 'lucide-react';import {useApiQuery} from '@/hooks/use-api-query';import {useDebouncedValue} from '@/hooks/use-debounced-value';import {useCustomers,useSales,useInventoryBalances,useDashboardSummary,useBottleTypes,useProducts,useEmptyBottleSummary,useSuppliers,usePayments,useExpenses,useUsers,useSale,useReportsSummary,useReportsActivity,useCustomerHistory,usePortalHistory} from '@/hooks/queries';import {LoadErrorBanner} from '@/components/shared/load-error';import {SubtleRefreshIndicator} from '@/components/shared/subtle-refresh-indicator';import {QueryRefreshButton} from '@/components/shared/query-refresh-button';import {showInitialSkeleton,showBlockingError,showErrorBanner} from '@/lib/table-query-state';
type R=Record<string,any>;
const n=(v:any)=>Number(v||0);const today=()=>new Date().toISOString().slice(0,10);
function registeredCustomerOptions(rows:R[],activeOnly=false){return (rows||[]).filter((x)=>!activeOnly||x.status==='ACTIVE').map((c)=>({id:c.id,name:c.phone?`${c.name} · ${c.phone}`:String(c.name)}));}
function entityOptions(rows:R[]){return (rows||[]).map((b)=>({id:String(b.id),name:String(b.name)}));}
function useListQuery<T=Record<string,unknown>[]>(path:string,enabled=true){return useApiQuery<T>({path,queryKey:[path],freshness:'list',enabled});}
function Head({title,action,compact}:{title:string;action?:React.ReactNode;compact?:boolean}){return <div className={`page-head flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between ${compact?'mb-3':'mb-5 md:mb-7'}`}><h1 className="page-title min-w-0">{title}</h1>{action&&<div className="page-head-action shrink-0 w-full sm:w-auto">{action}</div>}</div>}
function Loading({loading,error,variant='table'}:{loading:boolean;error:any;variant?:'table'|'stats'|'stats-table'}){if(error)return <LoadError error={error}/>;if(loading)return <DataLoadSkeleton variant={variant}/>;return null}
function Field({label,children}:{label:string,children:React.ReactNode}){return <div><label className="label">{label}</label>{children}</div>}
function Input({label,value,onChange,type='text',placeholder,required=false,minLength}:{label:string,value:any,onChange:(v:string)=>void,type?:string,placeholder?:string,required?:boolean,minLength?:number}){return <Field label={label}><input required={required} minLength={minLength} type={type} className="field" placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)}/></Field>}
function Select({label,value,onChange,options,empty='Select...',disabled}:{label:string,value:string,onChange:(v:string)=>void,options:{id:string,name:string}[],empty?:string,disabled?:boolean}){return <Field label={label}><select disabled={disabled} className="field touch-target" value={value} onChange={e=>onChange(e.target.value)}><option value="">{empty}</option>{options.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>}
function Btn({children,busy=false,form}:{children:React.ReactNode,busy?:boolean,form?:string}){return <button disabled={busy} type="submit" form={form} className="btn btn-primary">{busy?'Saving...':children}</button>}
function Panel({children,title,compact}:{children:React.ReactNode,title?:string,compact?:boolean}){return <div className={`panel ${compact?'p-3 md:p-4':'p-5 md:p-6'}`}>{title&&<h2 className={`font-extrabold ${compact?'text-sm mb-2':'text-base mb-5'}`}>{title}</h2>}{children}</div>}
function Modal({title,onClose,children,footer}:{title:string;onClose:()=>void;children:React.ReactNode;footer?:React.ReactNode}){const [mounted,setMounted]=useState(false);useEffect(()=>{setMounted(true);const prev=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=prev};},[]);if(!mounted)return null;return createPortal(<div className="fixed inset-0 z-[100] isolate" role="dialog" aria-modal="true"><button type="button" className="absolute inset-0 bg-[#102b22]/55" aria-label="Close dialog" onClick={onClose}/><div className="pointer-events-none fixed inset-0 flex flex-col justify-end sm:items-center sm:justify-center sm:p-4"><div className="panel pointer-events-auto flex h-[min(92dvh,100dvh)] max-h-[min(92dvh,100dvh)] w-full min-w-0 max-w-[100vw] flex-col overflow-hidden rounded-t-2xl p-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_20px_50px_rgba(16,43,34,0.18)] sm:h-auto sm:max-h-[min(90vh,820px)] sm:w-full sm:max-w-xl sm:rounded-2xl sm:pb-0 md:max-w-2xl" onClick={e=>e.stopPropagation()}><div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8 sm:pb-4 sm:pt-7"><h2 className="pr-2 text-base font-extrabold tracking-tight sm:text-lg">{title}</h2><button type="button" className="shrink-0 rounded-lg p-1.5 text-[#728078] hover:bg-[#f4f8f5]" onClick={onClose} aria-label="Close"><X size={20}/></button></div><div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4 sm:px-8">{children}</div>{footer&&<div className="modal-footer flex shrink-0 flex-col gap-2 border-t border-border bg-card px-4 py-3 sm:flex-row sm:flex-wrap sm:px-8 sm:py-4">{footer}</div>}</div></div></div>,document.body);}
function Table({columns,rows,emptyMessage}:{columns:{name:string,render:(row:R)=>React.ReactNode}[],rows:R[],emptyMessage?:string}){const empty=emptyMessage||'No records yet. Create your first entry to get started.';return <div className="panel table-wrap max-w-full overflow-x-auto"><table className="data-table"><thead><tr>{columns.map(c=><th key={c.name}>{c.name}</th>)}</tr></thead><tbody>{rows.length?rows.map((r,i)=><tr key={r.id||i}>{columns.map(c=><td key={c.name}>{c.render(r)}</td>)}</tr>):<tr><td colSpan={columns.length} className="text-center muted py-14!">{empty}</td></tr>}</tbody></table></div>}
function Stat({label,value,icon:Icon,small}:{label:string,value:string,icon:any,small?:string}){return <div className="panel stat"><div className="flex items-center justify-between muted text-xs font-bold"><span>{label}</span><span className="bg-[#eaf5ed] p-2 rounded-lg text-primary"><Icon size={18}/></span></div><strong>{value}</strong>{small&&<p className="muted text-xs mt-2">{small}</p>}</div>}
function useSubmit(){const [busy,setBusy]=useState(false);const client=useQueryClient();async function submit(path:string,payload:R,reset?:()=>void,method:'POST'|'PATCH'='POST',customerId?:string){setBusy(true);try{const result=method==='POST'?await post(path,payload):await patch(path,payload);toast.success('Saved successfully');if(path.startsWith('/expenses'))await invalidateAfterExpense(client);else await invalidateBalanceQueries(client,customerId);reset?.();return result}catch(e:any){toast.error(e.message);return null}finally{setBusy(false)}}return {submit,busy}}
function Overview(){const owner=getUser()?.role==='OWNER';const {data:summary,isLoading,error}=useDashboardSummary(owner);const {data:sales,isLoading:salesLoading}=useSales();const {data:stock}=useInventoryBalances();const {data:customers}=useCustomers();const recent=(sales||[]).slice(0,7);const cash=(sales||[]).reduce((s:number,x:R)=>s+(x.payments||[]).reduce((v:number,p:R)=>v+n(p.amount),0),0);return <><Head title={`Good day, ${getUser()?.username || 'there'} 👋`} action={<Link className="btn btn-primary" href="/sell"><Plus size={17}/> New sale</Link>}/>{owner?<><LoadError error={error}/>{isLoading&&!summary?<SkeletonStatGrid count={4}/>:<div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-5 mb-7"><Stat label="Today's sales" value={money(summary?.salesRevenue)} icon={ShoppingBag}/><Stat label="Cash received" value={money(summary?.cashReceived)} icon={Wallet}/><Stat label="Customer credit" value={money(summary?.customerReceivables)} icon={Users}/><Stat label="Net cash flow" value={money(summary?.cashFlow)} icon={TrendingUp}/></div>}</>:<div className="grid grid-cols-2 xl:grid-cols-3 gap-3 md:gap-5 mb-7"><Stat label="Recent receipts" value={money(cash)} icon={Wallet} small="Payments on recently loaded sales"/><Stat label="Customers" value={String((customers||[]).length)} icon={Users}/><Stat label="Recent invoices" value={String((sales||[]).length)} icon={Receipt}/></div>}<div className="grid lg:grid-cols-[1.5fr_1fr] gap-5"><div><h2 className="font-extrabold mb-4">Recent sales</h2>{salesLoading&&!sales?<SkeletonTable rows={5} cols={4}/>:<Table columns={[{name:'Invoice',render:r=><span className="font-bold">{String(r.invoiceNo||r.id).slice(0,20)}</span>},{name:'Date',render:r=>date(r.createdAt)},{name:'Total',render:r=><b>{money(r.total)}</b>},{name:'Status',render:r=><span className="tag">{r.status}</span>}]} rows={recent}/>}</div><div><h2 className="font-extrabold mb-4">Quick actions</h2><Panel><div className="space-y-2">{[['/sell','Create new sale'],['/bottles','Receive empty bottles'],['/payments','Record customer payment'],['/products','Add product stock'],['/customers','View customer balances']].map(([href,label])=><Link key={href} href={href} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl font-semibold hover:bg-[#eaf5ed]">{label}<ChevronRight size={17}/></Link>)}</div></Panel><div className="mt-5 panel p-5"><div className="muted text-xs font-bold mb-2">INVENTORY SNAPSHOT</div><div className="font-extrabold text-2xl">{(stock||[]).filter((x:R)=>x.kind==='FULL_DRINK').length} <span className="text-sm font-medium muted">tracked products</span></div></div></div></div></>}
function GenericCrud({title,path,fields,columns,ownerOnly=false}:{title:string,path:string,fields:{key:string,label:string,type?:string,options?:string}[],columns:{name:string,render:(r:R)=>React.ReactNode}[],ownerOnly?:boolean}){const {data,isLoading,error,isFetching}=useListQuery(path);const {submit,busy}=useSubmit();const [open,setOpen]=useState(false);const [form,setForm]=useState<R>({});const [search,setSearch]=useState('');const [edit,setEdit]=useState('');const owner=getUser()?.role==='OWNER';const canEdit=!ownerOnly||owner;const rows=(data||[]).filter((r:R)=>JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));async function save(e:React.FormEvent){e.preventDefault();const payload:R={};for(const f of fields){if(form[f.key]!==undefined&&form[f.key]!=='')payload[f.key]=f.type==='number'?Number(form[f.key]):String(form[f.key])}const result=await submit(edit?`${path}/${edit}`:path,payload,()=>{setOpen(false);setForm({});setEdit('')},edit?'PATCH':'POST');if(result)setSearch('')}return <><Head title={title} action={canEdit?<button className="btn btn-primary" onClick={()=>{setOpen(!open);setForm({});setEdit('')}}><Plus size={16}/> Add new</button>:undefined}/>{open&&<Panel title={edit?'Edit record':'Create new'}><form onSubmit={save} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{fields.map(f=><div key={f.key}>{f.options?<Select label={f.label} value={String(form[f.key]||'')} onChange={v=>setForm(x=>({...x,[f.key]:v}))} options={f.options.split('|').map(v=>({id:v,name:v}))}/>:<Input label={f.label} value={form[f.key]??''} onChange={v=>setForm(x=>({...x,[f.key]:v}))} type={f.type==='number'?'number':f.type==='password'?'password':'text'}/>}</div>)}<div className="sm:col-span-2 lg:col-span-3 flex gap-2"><Btn busy={busy}>Save changes</Btn><button type="button" className="btn btn-ghost" onClick={()=>setOpen(false)}>Cancel</button></div></form></Panel>}<div className="flex items-center gap-3 my-5"><div className="relative flex-1 max-w-sm"><Search size={16} className="absolute left-3 top-3.5 muted"/><input className="field pl-10!" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search records..."/></div><span className="muted text-xs">{rows.length} records</span><SubtleRefreshIndicator active={isFetching&&!!data}/></div>{showBlockingError(!!error,data)?<LoadError error={error}/>:showErrorBanner(!!error,data)?<LoadErrorBanner error={error}/>:null}{isLoading&&!data?<SkeletonTable/>:<Table rows={rows} columns={[...columns,...(canEdit?[{name:'',render:(r:R)=><button className="text-primary font-bold text-xs" onClick={()=>{setForm(r);setEdit(r.id);setOpen(true);window.scrollTo({top:0,behavior:'smooth'})}}>Edit</button>}]:[])]}/>}</>}
function signedMoney(v:unknown){const amt=n(v);if(amt===0)return '—';return `-${amount(Math.abs(amt))} ETB`}
function PaymentBalanceInline({value,large}:{value:unknown,large?:boolean}){const presented=presentCustomerBalance(n(value),'money','staff');return <span className="inline-flex flex-col items-start leading-tight"><MoneyBalance internal={n(value)} size={large?'lg':'sm'}/><span className="text-[10px] font-semibold text-muted-foreground">{presented.label}</span></span>;}
function moneyCreditCell(v:unknown){const amt=n(v);if(amt===0)return <span className="bal-zero">—</span>;return <span className={amt>0?'bal-money':'bal-money-ok'}>{signedMoney(v)}</span>}
function customerHasPaymentBalance(r:R){return Math.abs(n(r.moneyOutstanding))>0.001;}
function customerHasBottleBalance(r:R){return (r.bottleBalances||[]).some((b:R)=>n(b.outstanding)!==0);}
function bottleBalanceList(bal:R[],bottleName:(id:string)=>string){if(!bal?.length)return <span className="balance-neutral font-bold text-sm">0</span>;return <BottleBalanceList rows={bal as {bottleTypeId:string;outstanding:number}[]} bottleName={bottleName}/>;}
function shortInvoice(no:unknown){const s=String(no||'');if(!s)return '—';if(s.startsWith('INV-'))return `#${s.slice(4,12)}`;return s.length>14?`${s.slice(0,14)}…`:s}
function payMethodLabel(m:unknown){const x=String(m||'CASH').toUpperCase();if(x==='CASH')return 'Cash';if(x==='BANK')return 'Bank';if(x==='MOBILE')return 'Mobile';return String(m||'—')}
function invoiceStatus(total:number,paid:number){const rem=Math.max(0,total-paid);if(rem<=0.001)return 'Paid';if(paid>0.001)return 'Partial';return 'Unpaid'}
function invoicePaidMap(sales:R[],payments:R[]){const ordered=[...sales].sort((a,b)=>new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime());const paid=new Map<string,number>();for(const s of ordered)paid.set(s.id,0);for(const p of payments){if(p.saleId&&paid.has(p.saleId))paid.set(p.saleId,(paid.get(p.saleId)||0)+n(p.amount))}const general=payments.filter((x:R)=>!x.saleId).sort((a,b)=>new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime());for(const p of general){let left=n(p.amount);for(const s of ordered){if(left<=0)break;const total=n(s.total);const on=paid.get(s.id)||0;const rem=total-on;if(rem<=0)continue;const use=Math.min(rem,left);paid.set(s.id,on+use);left-=use}}return paid}
function customerMoneyRows(history:R|undefined){const sales=history?.sales||[];const payments=history?.payments||[];const paidMap=invoicePaidMap(sales,payments);const rows:R[]=[];for(const sale of sales){const total=n(sale.total);const paid=paidMap.get(sale.id)||0;const remaining=Math.max(0,total-paid);rows.push({id:`inv-${sale.id}`,rowDate:sale.createdAt,invoiceLabel:shortInvoice(sale.invoiceNo),total,paid,remaining,status:invoiceStatus(total,paid),note:''})}for(const p of payments.filter((x:R)=>!x.saleId)){rows.push({id:`pay-${p.id}`,rowDate:p.createdAt,invoiceLabel:'Balance payment',total:null,paid:n(p.amount),remaining:null,status:'Payment',note:[payMethodLabel(p.method),p.note].filter(Boolean).join(' · ')||'—'})}return rows.sort((a,b)=>new Date(b.rowDate).getTime()-new Date(a.rowDate).getTime())}
type CustomerHistoryTab='money'|'bottles';
function CustomerHistoryTabs({tab,onTab}:{tab:CustomerHistoryTab;onTab:(t:CustomerHistoryTab)=>void}){const items:[CustomerHistoryTab,string][]=[['money','Payments'],['bottles','Bottles']];return <div className="flex justify-start gap-1.5 mb-4">{items.map(([id,label])=><button key={id} type="button" className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${tab===id?'bg-primary text-white':'bg-muted text-muted-foreground hover:bg-accent hover:text-primary'}`} onClick={()=>onTab(id)}>{label}</button>)}</div>}
function customerMoneyBalanceSummary(v:unknown,portal?:boolean){const amt=n(v);if(Math.abs(amt)<0.001)return <span className="text-2xl font-extrabold tabular-nums text-primary">0</span>;if(amt>0)return portal?<span className="text-2xl font-extrabold tabular-nums text-[#a8662b]">{money(amt)}</span>:<span className="text-2xl font-extrabold tabular-nums text-[#a8662b]">-{money(amt)}</span>;return <span className="text-2xl font-extrabold tabular-nums text-primary">{money(Math.abs(amt))}</span>}
function customerMoneyBalanceLabel(v:unknown,portal?:boolean){const amt=n(v);if(Math.abs(amt)<0.001)return 'Balance';if(amt>0)return portal?'Amount you owe':'They owe you';return 'Credit balance'}
export { CustomerHistoryPage } from '@/features/customers/components/customer-detail-page';
type CustomerBalanceFilter='all'|'payment'|'bottle';
type CustomerBottleSummaryView='full'|'stock-in'|'out';
function CustomerFilterTabs({tab,onTab}:{tab:CustomerBalanceFilter;onTab:(t:CustomerBalanceFilter)=>void}){const items:[CustomerBalanceFilter,string][]=[['all','All'],['payment','Payment balance'],['bottle','Bottle balance']];return <div className="flex flex-wrap gap-1.5">{items.map(([id,label])=><button key={id} type="button" className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${tab===id?'bg-primary text-white':'bg-muted text-muted-foreground hover:bg-accent hover:text-primary'}`} onClick={()=>onTab(id)}>{label}</button>)}</div>;}
function CustomerBottleSummaryTabs({tab,onTab}:{tab:CustomerBottleSummaryView;onTab:(t:CustomerBottleSummaryView)=>void}){const items:[CustomerBottleSummaryView,string][]=[['full','All lines'],['stock-in','Added to stock'],['out','With customers']];return <div className="mb-2 flex flex-wrap gap-1">{items.map(([id,label])=><button key={id} type="button" className={`rounded-md px-2 py-1 text-[10px] font-bold transition-colors ${tab===id?'bg-secondary text-primary border border-border':'text-muted-foreground hover:bg-muted/80'}`} onClick={()=>onTab(id)}>{label}</button>)}</div>;}
function Customers(){
 const router=useRouter();
 const {data:customers,isLoading:customersLoading,isFetching:customersFetching}=useCustomers();
 const {data:bottles=[]}=useBottleTypes();
 const {submit,busy}=useSubmit();
 const [search,setSearch]=useState('');
 const debouncedSearch=useDebouncedValue(search,300);
 const [balanceFilter,setBalanceFilter]=useState<CustomerBalanceFilter>('all');
 const [bottleSummaryView,setBottleSummaryView]=useState<CustomerBottleSummaryView>('full');
 const [form,setForm]=useState<R>({});
 const [open,setOpen]=useState(false);
 const bottleName=(id:string)=>String(bottles.find((b:R)=>b.id===id)?.name||'Bottle');
 const list=customers||[];
 const q=debouncedSearch.trim().toLowerCase();
 const searched=list.filter((x:R)=>!q||String(x.name||'').toLowerCase().includes(q)||String(x.phone||'').includes(q));
 const rows=searched.filter((x:R)=>balanceFilter==='all'||(balanceFilter==='payment'?customerHasPaymentBalance(x):customerHasBottleBalance(x)));
 const netPayment=rows.reduce((s:number,r:R)=>s+n(r.moneyOutstanding),0);
 const paymentOwedTotal=rows.reduce((s:number,r:R)=>s+Math.max(0,n(r.moneyOutstanding)),0);
 const paymentCreditTotal=rows.reduce((s:number,r:R)=>s+Math.max(0,-n(r.moneyOutstanding)),0);
 const withBottles=rows.filter(customerHasBottleBalance).length;
 const packSizes=usePackSizes();
 const bottleAgg=aggregateCustomersBottleBalances(rows,packSizes.bottle);
 /** Mixed bottle sizes: totals are summed in dozens, shown on a 12-per-dozen scale. */
 const bottleNetDisplay=toDisplayBottle(bottleAgg.netDozen*12);
 const columns:ListColumn<R>[]=[
  {name:'Customer',primary:true,render:r=><Link href={`/customers/${r.id}`} className="font-bold text-primary hover:underline">{r.name}</Link>},
  {name:'Phone',hideOnMobile:true,render:r=>r.phone||'—'},
  {name:'Payment balance',mobileLabel:'Payment',render:r=><PaymentBalanceInline value={r.moneyOutstanding}/>},
  {name:'Bottle balance',mobileLabel:'Bottles',render:r=>customerHasBottleBalance(r)?bottleBalanceList(r.bottleBalances||[],bottleName):<span className="font-bold text-primary text-sm">0</span>},
  {name:'Status',hideOnMobile:true,render:r=><span className="tag">{r.status}</span>},
 ];
 return <>
  <Head title="Customers" action={<div className="flex flex-wrap gap-2"><QueryRefreshButton queryKey={queryKeys.customers.all()}/><button className="btn btn-primary" onClick={()=>{setOpen(!open);setForm({})}}><Plus size={16}/> Add customer</button></div>}/>
  {open&&<Panel title="Customer profile"><form className="grid sm:grid-cols-2 gap-3" onSubmit={async e=>{e.preventDefault();await submit(form.id?`/customers/${form.id}`:'/customers',{name:form.name,phone:form.phone||undefined,address:form.address||undefined,notes:form.notes||undefined,...(form.id?{status:form.status}: {})},()=>{setOpen(false);setForm({})},form.id?'PATCH':'POST')}}><Input label="Name" value={form.name||''} onChange={v=>setForm(x=>({...x,name:v}))} required={false}/><Input label="Phone (09 / 10 — for sales & portal login)" value={form.phone||''} onChange={v=>setForm(x=>({...x,phone:v}))} placeholder="09xxxxxxxx" required={false}/><Input label="Address" value={form.address||''} onChange={v=>setForm(x=>({...x,address:v}))} required={false}/><Input label="Notes" value={form.notes||''} onChange={v=>setForm(x=>({...x,notes:v}))} required={false}/>{form.id&&<Select label="Status" value={form.status||'ACTIVE'} onChange={v=>setForm(x=>({...x,status:v}))} options={[{id:'ACTIVE',name:'Active'},{id:'INACTIVE',name:'Inactive'}]}/>}<div className="sm:col-span-2"><Btn busy={busy}>Save customer</Btn></div></form></Panel>}
  <Panel compact title="Summary">
   <p className="muted text-xs mb-3">Payment and bottle totals for the list below (search + filter).</p>
   <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
    <div className="rounded-xl bg-muted/50 p-3"><p className="label mb-1">Customers</p><p className="text-xl font-extrabold tabular-nums">{rows.length}</p><p className="muted text-[11px] mt-1">{list.length} total · {withBottles} with bottles</p></div>
    <div className="rounded-xl bg-muted/50 p-3"><p className="label mb-1">Payment (net)</p><PaymentBalanceInline value={netPayment} large/></div>
    <div className="rounded-xl bg-muted/50 p-3"><p className="label mb-1">Payment (+ / −)</p><p className="text-sm font-bold text-[#DC2626] tabular-nums">{formatDisplayMoney(toDisplayMoney(paymentOwedTotal))} owed</p><p className="text-sm font-bold text-[#15803D] tabular-nums mt-0.5">{formatDisplayMoney(toDisplayMoney(-paymentCreditTotal))} credit</p></div>
    <div className="rounded-xl bg-muted/50 p-3"><CustomerBottleSummaryTabs tab={bottleSummaryView} onTab={setBottleSummaryView}/>{bottleSummaryView==='full'?(<><p className="label mb-1">Bottles (+ / − / net)</p><p className="text-sm font-bold balance-success tabular-nums">+{formatDozenValue(bottleAgg.fromCustomerDozen)} from customer</p><p className="text-sm font-bold balance-danger tabular-nums mt-0.5">{formatDozenValue(bottleAgg.withCustomerDozen)} out with customers</p><p className={`text-lg font-extrabold tabular-nums mt-1 ${bottleNetDisplay<0?'balance-danger':bottleNetDisplay>0?'balance-success':'balance-neutral'}`}>{formatDisplayBottle(bottleNetDisplay)} net</p><p className="muted text-[11px] mt-1">customer ledger · dozen</p></>):bottleSummaryView==='stock-in'?(<><p className="label mb-1">Added to stock</p><p className="text-2xl font-extrabold balance-success tabular-nums">+{formatDozenValue(bottleAgg.fromCustomerDozen)}</p><p className="muted text-[11px] mt-1">empties returned from customers (filtered list)</p></>):(<><p className="label mb-1">Out with customers</p><p className="text-2xl font-extrabold balance-danger tabular-nums">{formatDozenValue(bottleAgg.withCustomerDozen)}</p><p className="muted text-[11px] mt-1">still with customers (filtered list)</p></>)}</div>
   </div>
  </Panel>
  <div className="my-4 flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-center">
   <div className="relative flex-1 min-w-[200px] max-w-md"><Search size={16} className="absolute left-3 top-3.5 muted"/><input className="field pl-10!" placeholder="Search by name or phone…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
   <CustomerFilterTabs tab={balanceFilter} onTab={setBalanceFilter}/>
   <SubtleRefreshIndicator active={customersFetching&&!!customers}/>
  </div>
  {customersLoading&&!customers?(<><div className="md:hidden"><SkeletonTable rows={5} cols={1}/></div><div className="hidden md:block"><SkeletonTable rows={8} cols={6}/></div></>):(<>
   <ResponsiveList rows={rows} columns={columns} emptyMessage="No customers match your search or filter." onRowClick={r=>router.push(`/customers/${r.id}`)}/>
   <DesktopTable rows={rows} columns={[...columns,{name:'Actions',render:r=><div className="flex gap-3 whitespace-nowrap"><Link href={`/customers/${r.id}`} className="text-primary font-bold text-sm">History</Link><button type="button" className="muted text-sm" onClick={()=>{setForm(r);setOpen(true)}}>Edit</button></div>}]}/>
  </>)}
 </>;
}
function Products(){
 const {data:bottles=[]}=useBottleTypes();
 const {data:products,isLoading:productsLoading,isFetching:productsFetching,error:productsError,isSuccess:productsSuccess}=useProducts();
 const {data:emptySummary}=useEmptyBottleSummary(getUser()?.role==='OWNER');
 const {data:suppliers=[]}=useSuppliers(getUser()?.role==='OWNER');
 const {submit,busy}=useSubmit();
 const owner=getUser()?.role==='OWNER';
 const [open,setOpen]=useState(false);
 const [form,setForm]=useState<R>({packagingKind:'RETURNABLE',unitsPerCase:12,active:true,bottleMode:'existing',addStock:'0',...defaultInitialStockFields()});
 const activeBottles=bottles.filter((b:R)=>b.active!==false);
 /** Own dozen size only for non-returnable products or a brand-new bottle; otherwise the bottle type's size. */
 const ownPackSize=()=>form.packagingKind==='NONE'||(!form.id&&form.bottleMode==='new');
 const formPackSize=()=>ownPackSize()?packSizeOrDefault(Number(form.unitsPerCase)):packSizeOrDefault((bottles.find((b:R)=>b.id===form.bottleTypeId) as R|undefined)?.bottlesPerDozen);
 const rowPackSize=(r:R)=>packSizeOrDefault(r.bottleType?.bottlesPerDozen??r.unitsPerCase);
 const productPackagingKind=(row?:R)=>'NONE'===row?.packagingKind?'NONE':'RETURNABLE';
 const emptyRows=(emptySummary?.rows as R[])||[];
 const availableEmptyForForm=()=>{if(form.bottleMode!=='existing'||!form.bottleTypeId)return 0;const row=emptyRows.find(r=>String(r.bottleTypeId)===String(form.bottleTypeId));return n(row?.warehouse);};
 const patchInitialStock=(patch:Partial<InitialStockFields>)=>setForm(x=>({...x,...patch}));
 const openForm=(row?:R)=>{const kind=productPackagingKind(row);setForm(row?{id:row.id,name:row.name,packagingKind:kind,bottleTypeId:row.bottleTypeId||'',bottleMode:'existing',bottleName:'',sellingPrice:String(row.sellingPrice),defaultCost:String(row.defaultCost),unitsPerCase:row.unitsPerCase,active:row.active!==false,addStock:'0',removeStock:'0',stock:n(row.stock),...defaultInitialStockFields()}:{name:'',packagingKind:'RETURNABLE',bottleMode:'existing',bottleName:'',bottleTypeId:'',sellingPrice:'',defaultCost:'',unitsPerCase:12,active:true,addStock:'0',...defaultInitialStockFields()});setOpen(true);};
 async function deactivate(id:string,label:string){if(!confirm(`Remove "${label}"? It will be hidden from sales.`))return;await submit(`/products/${id}`,{active:false},undefined,'PATCH');}
 async function saveProduct(e:React.FormEvent){e.preventDefault();if(!form.name?.trim())return toast.error('Product name is required');const kind=form.packagingKind==='NONE'?'NONE':'RETURNABLE';if(kind==='RETURNABLE'){if(form.bottleMode==='existing'&&!form.bottleTypeId)return toast.error('Choose a bottle type');if(form.bottleMode==='new'&&!form.bottleName?.trim())return toast.error('Enter bottle packaging name')}if(ownPackSize()&&!isValidPackSize(Number(form.unitsPerCase)))return toast.error('Bottles per dozen must be an even whole number (e.g. 12 or 24)');const base={name:String(form.name).trim(),sellingPrice:String(form.sellingPrice),defaultCost:String(form.defaultCost),unitsPerCase:formPackSize()};if(form.id){const patch:R={...base,packagingKind:kind,active:form.active!==false};if(kind==='RETURNABLE'){patch.bottleTypeId=form.bottleTypeId;const fields={...(form as InitialStockFields),enableInitialStock:true};const stockErr=validateInitialStock(fields,true,availableEmptyForForm(),{allowZero:true,perDozen:formPackSize()});if(stockErr)return toast.error(stockErr);const stock=buildProductCreateStockPayload(fields,true,formPackSize());const adding=(stock.initialQuantity||0)+(stock.initialFromExistingEmpties||0)>0;if(!isValidDozenField(form.removeStock||'0'))return toast.error('Remove stock must be whole or half dozens (e.g. 1, 1.5, 2)');const remove=safeDozenToBottles(form.removeStock||'0',formPackSize());if(adding&&remove>0)return toast.error('Save an add and a removal separately');if(adding)Object.assign(patch,stock);else if(remove>0){patch.addStock=-remove;if(fields.stockNote.trim())patch.stockNote=fields.stockNote.trim();if(fields.supplierName.trim())patch.supplierName=fields.supplierName.trim()}}else{const rawDelta=String(form.addStock||'0').trim();const neg=rawDelta.startsWith('-');if(!isValidDozenField(neg?rawDelta.slice(1):rawDelta))return toast.error('Stock change must be whole or half dozens (e.g. 1, -1.5)');const delta=(neg?-1:1)*safeDozenToBottles(neg?rawDelta.slice(1):rawDelta,formPackSize());if(delta!==0){patch.addStock=delta;if(form.stockNote?.trim())patch.stockNote=String(form.stockNote).trim();if(form.supplierName?.trim())patch.supplierName=String(form.supplierName).trim()}}await submit(`/products/${form.id}`,patch,()=>setOpen(false),'PATCH');return}const stockErr=validateInitialStock(form as InitialStockFields,kind==='RETURNABLE',availableEmptyForForm(),{perDozen:formPackSize()});if(stockErr)return toast.error(stockErr);const payload:R={...base,packagingKind:kind,...buildProductCreateStockPayload(form as InitialStockFields,kind==='RETURNABLE',formPackSize())};if(kind==='RETURNABLE'){if(form.bottleMode==='existing')payload.bottleTypeId=form.bottleTypeId;else payload.bottleName=String(form.bottleName).trim()}await submit('/products',payload,()=>setOpen(false),'POST');}
 const productRows=products||[];
 return <>
  <Head title="Products & stock" action={<div className="flex flex-wrap gap-2">{owner?<><QueryRefreshButton queryKey={queryKeys.products.all()}/><button type="button" className="btn btn-primary" onClick={()=>openForm()}><Plus size={16}/> Add drink product</button></>:<QueryRefreshButton queryKey={queryKeys.products.all()}/>}</div>}/>
  <div className="flex items-center gap-2 mb-2">{showErrorBanner(!!productsError,products)?<LoadErrorBanner error={productsError}/>:null}<SubtleRefreshIndicator active={productsFetching&&!!products}/></div>
  {showInitialSkeleton(productsLoading,products)?<SkeletonTable rows={8} cols={6}/>:showBlockingError(!!productsError,products)?<LoadError error={productsError}/>:<Table rows={productRows} emptyMessage={productsSuccess&&!productRows.length?'No products found.':undefined} columns={[{name:'Drink',render:r=><b>{r.name}</b>},{name:'Bottle',render:r=>r.packagingKind==='NONE'?<span className="text-xs muted">Non-returnable</span>:r.bottleType?.name||'—'},{name:'In stock',render:r=><span><span className="font-extrabold text-primary">{formatDozen(n(r.stock),rowPackSize(r))}</span><span className="block text-[10px] muted">1 dz = {rowPackSize(r)}</span></span>},{name:'Price / dz',render:r=>money(r.sellingPrice)},{name:'Cost / dz',render:r=>money(r.defaultCost)},{name:'Status',render:r=><span className={`tag ${r.active===false?'opacity-60':''}`}>{r.active?'Active':'Inactive'}</span>},...(owner?[{name:'Actions',render:(r:R)=><div className="flex gap-3"><button type="button" className="text-primary font-bold text-xs" onClick={()=>openForm(r)}>Edit</button>{r.active&&<button type="button" className="text-[#c45444] font-bold text-xs" onClick={()=>deactivate(r.id,r.name)}>Delete</button>}</div>}]:[])]}/>}
  {open&&<Modal title={form.id?'Edit drink product':'Add drink product'} onClose={()=>setOpen(false)} footer={<><Btn busy={busy} form="product-form">{form.id?'Save':'Add product'}</Btn><button type="button" className="btn btn-ghost" onClick={()=>setOpen(false)}>Cancel</button></>}><form id="product-form" className="space-y-4" onSubmit={saveProduct}>
   <Input label="Drink name" value={form.name||''} onChange={v=>setForm(x=>({...x,name:v}))} placeholder="e.g. Coca 300ml" required/>
   <div className="space-y-2"><p className="text-xs font-bold text-muted-foreground">Packaging type</p><div className="flex flex-col gap-2 sm:flex-row"><button type="button" className={`flex-1 rounded-lg border px-3 py-2.5 text-xs font-bold ${form.packagingKind!=='NONE'?'border-primary bg-primary text-white':'border-[#e0e7e0] bg-white'}`} onClick={()=>setForm(x=>({...x,packagingKind:'RETURNABLE'}))}>Returnable glass bottle</button><button type="button" className={`flex-1 rounded-lg border px-3 py-2.5 text-xs font-bold ${form.packagingKind==='NONE'?'border-primary bg-primary text-white':'border-[#e0e7e0] bg-white'}`} onClick={()=>setForm(x=>({...x,packagingKind:'NONE',bottleTypeId:'',bottleName:'',syncEmptyBottleStock:false}))}>Non-returnable (water / plastic)</button></div><p className="text-xs muted">{form.packagingKind==='NONE'?'No bottle returns on sales — unit-only product.':'Tracks returnable bottles on sales.'}</p></div>
   {form.packagingKind!=='NONE'&&!form.id&&<div className="space-y-3 rounded-xl border border-border bg-[#fafcfb] p-4"><p className="text-xs font-bold text-muted-foreground">Bottle packaging</p><div className="flex gap-2"><button type="button" className={`flex-1 rounded-lg py-2 text-xs font-bold ${form.bottleMode==='existing'?'bg-primary text-white':'border border-[#e0e7e0] bg-white'}`} onClick={()=>setForm(x=>({...x,bottleMode:'existing',bottleName:''}))}>Existing bottle</button><button type="button" className={`flex-1 rounded-lg py-2 text-xs font-bold ${form.bottleMode==='new'?'bg-primary text-white':'border border-[#e0e7e0] bg-white'}`} onClick={()=>setForm(x=>({...x,bottleMode:'new',bottleTypeId:''}))}>New bottle</button></div>{form.bottleMode==='new'?<Input label="Bottle name" value={form.bottleName||''} onChange={v=>setForm(x=>({...x,bottleName:v}))} placeholder="e.g. Glass 300ml" required/>:<Select label="Bottle type" value={form.bottleTypeId||''} onChange={v=>setForm(x=>({...x,bottleTypeId:v}))} options={entityOptions(activeBottles.length?activeBottles:bottles)}/>}</div>}
   {form.packagingKind!=='NONE'&&form.id&&<Select label="Bottle type" value={form.bottleTypeId||''} onChange={v=>setForm(x=>({...x,bottleTypeId:v}))} options={entityOptions(activeBottles.length?activeBottles:bottles)}/>}
   {form.packagingKind==='NONE'&&form.id&&<p className="rounded-xl border border-border bg-[#fafcfb] p-3 text-xs muted">Non-returnable product — bottle returns are not tracked.</p>}
   <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Input label="Selling price per dozen (ETB)" type="number" value={form.sellingPrice||''} onChange={v=>setForm(x=>({...x,sellingPrice:v}))} required/><Input label="Purchase cost per dozen (ETB)" type="number" value={form.defaultCost||''} onChange={v=>setForm(x=>({...x,defaultCost:v}))} required/></div>
   {ownPackSize()?<Input label="Bottles per dozen (crate size)" type="number" value={form.unitsPerCase??12} onChange={v=>setForm(x=>({...x,unitsPerCase:v}))} placeholder="12"/>:form.bottleTypeId?<p className="text-xs muted">1 dz = {formPackSize()} bottles — set on the bottle type (Inventory → Bottle settings).</p>:null}
   {!form.id?<ProductInitialStockSection perDozen={formPackSize()} returnable={form.packagingKind!=='NONE'} availableEmpty={availableEmptyForForm()} fields={form as InitialStockFields} onChange={patchInitialStock} suppliers={(suppliers as R[]).map(s=>({id:String(s.id),name:String(s.name)}))} owner={owner}/>:<><p className="text-xs font-bold text-muted-foreground">Current stock: {formatDozen(n(form.stock),formPackSize())}</p>{form.packagingKind!=='NONE'?<>
    <ProductInitialStockSection perDozen={formPackSize()} purpose="edit" returnable availableEmpty={availableEmptyForForm()} fields={form as InitialStockFields} onChange={patchInitialStock} suppliers={(suppliers as R[]).map(s=>({id:String(s.id),name:String(s.name)}))} owner={owner}/>
    <Input label="Remove stock (dozen)" type="number" value={form.removeStock||'0'} onChange={v=>setForm(x=>({...x,removeStock:v}))} placeholder="0"/>
    <p className="text-xs muted">Enter how many dozen full drinks to take out. Warehouse empty bottles stay the same. Leave this at 0 when adding stock above.</p>
   </>:<>
    <Input label="Add or remove stock in dozen (+ / −)" type="number" value={form.addStock} onChange={v=>setForm(x=>({...x,addStock:v}))} placeholder="0"/>
    <Input label="Stock note (optional)" value={form.stockNote||''} onChange={v=>setForm(x=>({...x,stockNote:v}))} placeholder="Invoice no., delivery date, etc."/>
    <Input label="Supplier name for note (optional)" value={form.supplierName||''} onChange={v=>setForm(x=>({...x,supplierName:v}))} placeholder="Who you bought from"/>
   </>}</>}
   {form.id&&<label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.active!==false} onChange={e=>setForm(x=>({...x,active:e.target.checked}))}/> Active</label>}
   {form.packagingKind!=='NONE'&&!form.id&&<p className="text-xs muted rounded-lg border border-border bg-muted/40 px-3 py-2">You can also receive stock later from <Link href="/inventory" className="text-primary font-bold">Bottle warehouse</Link>.</p>}
  </form></Modal>}
 </>;
}
function Bottles(){return <BottleReturnsPage/>;}
function PaymentBalanceBig({value}:{value:unknown}){return <PaymentBalanceInline value={value} large/>;}
function Finance(){const {data:expenses,isLoading:expensesLoading,isSuccess:expensesSuccess,error:expensesError,isFetching:expensesFetching}=useExpenses();const {submit,busy}=useSubmit();const [category,setCategory]=useState('Transport');const [description,setDescription]=useState('');const [amount,setAmount]=useState('');const expenseRows=expenses||[];return <><Head title="Expenses"/><Panel title="New expense"><form className="space-y-3 max-w-lg" onSubmit={async e=>{e.preventDefault();await submit('/expenses',{category,description,amount,method:'CASH'},()=>{setDescription('');setAmount('')})}}><Input label="Category" value={category} onChange={setCategory}/><Input label="Description" value={description} onChange={setDescription}/><Input label="Amount (ETB)" type="number" value={amount} onChange={setAmount}/><Btn busy={busy}>Save expense</Btn></form></Panel><h2 className="font-extrabold my-5">Expense history</h2>{showErrorBanner(!!expensesError,expenses)?<LoadErrorBanner error={expensesError}/>:null}<SubtleRefreshIndicator active={expensesFetching&&!!expenses}/>{showInitialSkeleton(expensesLoading,expenses)?<SkeletonTable rows={5} cols={4}/>:showBlockingError(!!expensesError,expenses)?<LoadError error={expensesError}/>:<Table rows={expenseRows} emptyMessage={expensesSuccess&&!expenseRows.length?'No expenses recorded yet.':undefined} columns={[{name:'Date',render:r=>date(r.createdAt)},{name:'Category',render:r=>r.category},{name:'Description',render:r=>r.description},{name:'Amount',render:r=><b>{money(r.amount)}</b>}]}/>}</>}
type ReportPeriodMode='day'|'month'|'range';
function isoAddDays(iso:string,delta:number){const d=new Date(`${iso}T12:00:00.000Z`);d.setUTCDate(d.getUTCDate()+delta);return d.toISOString().slice(0,10);}
function isoAddMonths(iso:string,delta:number){const d=new Date(`${iso}T12:00:00.000Z`);d.setUTCMonth(d.getUTCMonth()+delta);return d.toISOString().slice(0,10);}
function monthRange(iso:string){const d=new Date(`${iso}T12:00:00.000Z`);const y=d.getUTCFullYear();const m=d.getUTCMonth();return {from:new Date(Date.UTC(y,m,1)).toISOString().slice(0,10),to:new Date(Date.UTC(y,m+1,0)).toISOString().slice(0,10)};}
function formatReportDay(iso:string){return new Date(`${iso}T12:00:00.000Z`).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});}
function formatReportMonth(iso:string){return new Date(`${iso}T12:00:00.000Z`).toLocaleDateString('en-GB',{month:'long',year:'numeric',timeZone:'UTC'});}
function ReportPeriodTabs({tab,onTab}:{tab:ReportPeriodMode;onTab:(t:ReportPeriodMode)=>void}){const items:[ReportPeriodMode,string][]=[['day','Daily'],['month','Monthly'],['range','Date range']];return <div className="flex flex-wrap gap-1.5">{items.map(([id,label])=><button key={id} type="button" className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${tab===id?'bg-primary text-white':'bg-muted text-muted-foreground hover:bg-accent hover:text-primary'}`} onClick={()=>onTab(id)}>{label}</button>)}</div>;}
type ReportViewTab='summary'|'payment'|'bottle';
function ReportViewTabs({tab,onTab}:{tab:ReportViewTab;onTab:(t:ReportViewTab)=>void}){const items:[ReportViewTab,string][]=[['summary','Summary'],['payment','Payments'],['bottle','Bottles']];return <div className="flex flex-wrap gap-1.5">{items.map(([id,label])=><button key={id} type="button" className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${tab===id?'bg-primary text-white':'bg-muted text-muted-foreground hover:bg-accent hover:text-primary'}`} onClick={()=>onTab(id)}>{label}</button>)}</div>;}
type ReportPayMethodFilter='all'|'CASH'|'BANK'|'MOBILE';
function ReportMethodTabs({tab,onTab,disabled}:{tab:ReportPayMethodFilter;onTab:(t:ReportPayMethodFilter)=>void;disabled?:boolean}){const items:[ReportPayMethodFilter,string][]=[['all','All methods'],['CASH','Cash'],['BANK','Bank'],['MOBILE','Mobile']];return <div className={`flex flex-wrap gap-1.5 ${disabled?'opacity-50 pointer-events-none':''}`}>{items.map(([id,label])=><button key={id} type="button" className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${tab===id?'bg-secondary text-primary border border-border':'bg-muted text-muted-foreground hover:bg-accent hover:text-primary'}`} onClick={()=>onTab(id)}>{label}</button>)}</div>;}
function reportPayMethodLabel(m:ReportPayMethodFilter){return m==='all'?'':m==='CASH'?'Cash':m==='BANK'?'Bank':'Mobile';}
function reportSumReceived(lines:R[]){return lines.reduce((s,r)=>s+(r.received!=null?n(r.received):0),0);}
function reportSumCredited(lines:R[]){return lines.reduce((s,r)=>s+(r.credited!=null?n(r.credited):0),0);}
/** Bottle totals in dozens (each line uses its bottle type's dozen size). */
function reportBottleTotals(lines:R[]){let out=0,in_=0;for(const r of lines){const d=n(r.bottleDelta)/packSizeOrDefault(r.bottlesPerDozen);if(d>0)out+=d;else if(d<0)in_+=-d;}return {out,in:in_};}
function Reports(){
 const me=getUser();
 const owner=me?.role==='OWNER';
 const {data:staff=[]}=useUsers(owner);
 const [cashierId,setCashierId]=useState('all');
 const [mode,setMode]=useState<ReportPeriodMode>('day');
 const [focusDate,setFocusDate]=useState(today);
 const [rangeFrom,setRangeFrom]=useState(today);
 const [rangeTo,setRangeTo]=useState(today);
 const t=today();
 const {from,to}=mode==='day'?{from:focusDate,to:focusDate}:mode==='month'?monthRange(focusDate):{from:rangeFrom,to:rangeTo};
 const [reportPayMethod,setReportPayMethod]=useState<ReportPayMethodFilter>('all');
 const cashiers=[...(staff as R[])].filter((u)=>u.role==='CASHIER'||u.role==='OWNER').sort((a,b)=>Number(a.active===false)-Number(b.active===false)||String(a.username).localeCompare(String(b.username)));
 const selectedCashier=owner&&cashierId!=='all'?cashiers.find((u)=>String(u.id)===cashierId):null;
 const reportWho=owner?(selectedCashier?String(selectedCashier.username):'All cashiers'):String(me?.username||'You');
 const showCashier=owner&&cashierId==='all';
 const reportFilters={from,to,payMethod:reportPayMethod,cashierId:owner?(cashierId==='all'?'':cashierId):String(me?.id||'')};
 const {data:s,isLoading,error,isFetching:summaryFetching}=useReportsSummary(reportFilters);
 const {data:activity,isLoading:activityLoading,isFetching:activityFetching}=useReportsActivity(reportFilters);
 const [reportSearch,setReportSearch]=useState('');
 const [reportView,setReportView]=useState<ReportViewTab>('summary');
 const periodTitle=mode==='day'?formatReportDay(focusDate):mode==='month'?formatReportMonth(focusDate):`${formatReportDay(from)} – ${formatReportDay(to)}`;
 const isToday=mode==='day'&&focusDate===t;
 const isCurrentMonth=mode==='month'&&monthRange(focusDate).from===monthRange(t).from;
 function goPrev(){if(mode==='day')setFocusDate(isoAddDays(focusDate,-1));else if(mode==='month')setFocusDate(isoAddMonths(focusDate,-1));}
 function goNext(){if(mode==='day')setFocusDate(isoAddDays(focusDate,1));else if(mode==='month')setFocusDate(isoAddMonths(focusDate,1));}
 function goToday(){setFocusDate(t);if(mode==='range'){setRangeFrom(t);setRangeTo(t);}}
 const activityR=activity as R|undefined;
 const activityLines=(activityR?.lines||[]) as R[];
 const q=reportSearch.trim().toLowerCase();
 const searchedLines=q?activityLines.filter((r:R)=>String(r.customerName||'').toLowerCase().includes(q)||String(r.label||'').toLowerCase().includes(q)||String(r.cashierName||'').toLowerCase().includes(q)):activityLines;
 const paymentLines=searchedLines.filter((r:R)=>(r.kind==='payment'||r.kind==='credit')&&(reportPayMethod==='all'||r.kind==='payment'));
 const bottleLines=searchedLines.filter((r:R)=>r.kind==='bottle');
 const tabLines=reportView==='payment'?paymentLines:reportView==='bottle'?bottleLines:searchedLines;
 const receivedFromLines=reportSumReceived(paymentLines);
 const tabReceived=q?receivedFromLines:n((s as R|undefined)?.cashReceived??(activityR?.totals as R|undefined)?.received??receivedFromLines);
 const tabCredited=q?reportSumCredited(paymentLines):reportPayMethod==='all'?n((activityR?.totals as R|undefined)?.credited??reportSumCredited(paymentLines)):0;
 const reportTotalsFetching=summaryFetching||activityFetching;
 const tabBottles=reportBottleTotals(bottleLines);
 const linesForExport=reportView==='summary'?searchedLines:tabLines;
 const printLines=linesForExport.map((r:R)=>({date:r.date,customerName:r.customerName,label:r.label,received:r.received,credited:r.credited,bottleDelta:r.bottleDelta,bottleTypeName:r.bottleTypeName,bottlesPerDozen:r.bottlesPerDozen}));
 function exportCSV(){
  const cols=reportView==='payment'?['Date','Customer',...(showCashier?['Cashier']:[]),'Method','Detail','Received','Credited']:reportView==='bottle'?['Date','Customer',...(showCashier?['Cashier']:[]),'Detail','Bottles']:['Date','Customer',...(showCashier?['Cashier']:[]),'Detail','Received','Credited','Bottles (dz)'];
  const rows=[cols.join(','),...linesForExport.map((r:R)=>{const bot=r.bottleDelta!=null?`${formatSignedDozen(n(r.bottleDelta),r.bottlesPerDozen)} ${r.bottleTypeName||''}`.trim():'';const meth=r.kind==='payment'?payMethodLabel(r.paymentMethod):'';const who=showCashier?[r.cashierName||'']:[];const cells=reportView==='payment'?[r.date,r.customerName,...who,meth,r.label,r.received??'',r.credited??'']:reportView==='bottle'?[r.date,r.customerName,...who,r.label,bot]:[r.date,r.customerName,...who,r.label,r.received??'',r.credited??'',bot];return cells.map((c:string)=>`"${String(c).replace(/"/g,'""')}"`).join(',');})];
  const blob=new Blob([rows.join('\n')],{type:'text/csv'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`report-${reportView}-${reportWho.replace(/\s+/g,'-')}-${from}-${to}.csv`;a.click();URL.revokeObjectURL(url);
 }
 function printPdf(){
  if(!s)return;
  const periodWithMethod=[periodTitle,reportWho,reportPayMethod==='all'?'':reportPayMethodLabel(reportPayMethod)].filter(Boolean).join(' · ');
  printReport({view:reportView,periodLabel:periodWithMethod,from,to,salesRevenue:String((s as R).salesRevenue??0),cashReceived:String(reportView==='bottle'?0:tabReceived),credited:String(reportView==='bottle'||reportPayMethod!=='all'?0:tabCredited),bottlesOut:reportView==='payment'?0:tabBottles.out,bottlesIn:reportView==='payment'?0:tabBottles.in,expenses:String((s as R).expenses??0),estimatedNetProfit:String((s as R).estimatedNetProfit??0),salesCount:(s as R).salesCount as number|undefined,lines:printLines});
  toast.message('Choose “Save as PDF” in the print dialog if you want a PDF file.');
 }
 return <div className="report-screen">
  <Head title={owner?`Reports · ${reportWho}`:'My report'} action={<div className="flex flex-wrap gap-2 no-print"><QueryRefreshButton queryKey={queryKeys.reports.summaryRoot()}/><button type="button" className="btn btn-ghost" disabled={!s} onClick={printPdf}><Printer size={16}/> Print / PDF</button><button type="button" className="btn btn-ghost" onClick={exportCSV}><Download size={16}/> CSV</button></div>}/>
  <Panel compact>
   <div className="flex flex-col gap-3">
    <ReportPeriodTabs tab={mode} onTab={m=>{setMode(m);if(m!=='range')setFocusDate(m==='day'?focusDate:rangeFrom||focusDate);if(m==='range'&&!rangeFrom){setRangeFrom(focusDate);setRangeTo(focusDate);}}}/>
    {owner?<div className="flex flex-wrap gap-1.5"><button type="button" className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${cashierId==='all'?'bg-primary text-white':'bg-muted text-muted-foreground hover:bg-accent hover:text-primary'}`} onClick={()=>setCashierId('all')}>All cashiers</button>{cashiers.map((u)=><button key={String(u.id)} type="button" className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${cashierId===String(u.id)?'bg-primary text-white':'bg-muted text-muted-foreground hover:bg-accent hover:text-primary'} ${u.active===false?'opacity-60':''}`} onClick={()=>setCashierId(String(u.id))}>{u.username}{u.role==='OWNER'?' · owner':''}{u.active===false?' · removed':''}</button>)}</div>:<p className="text-xs text-muted-foreground">Sales, payments, and bottles you recorded.</p>}
    {mode!=='range'?(<div className="flex items-center justify-between gap-2 flex-wrap">
     <button type="button" className="sidebar-toggle" aria-label="Previous" onClick={goPrev}><ChevronLeft size={18}/></button>
     <span className="font-extrabold text-base text-center flex-1 min-w-[8rem]">{periodTitle}</span>
     <button type="button" className="sidebar-toggle" aria-label="Next" onClick={goNext}><ChevronRight size={18}/></button>
     {((mode==='day'&&!isToday)||(mode==='month'&&!isCurrentMonth))&&<button type="button" className="btn btn-ghost text-xs py-2 min-h-[38px] w-full sm:w-auto sm:ml-auto" onClick={goToday}>Jump to today</button>}
    </div>):(<div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end"><Input label="From" type="date" value={rangeFrom} onChange={setRangeFrom}/><Input label="To" type="date" value={rangeTo} onChange={setRangeTo}/><button type="button" className="btn btn-ghost text-sm min-h-[43px] col-span-2 sm:col-span-1" onClick={goToday}>Today</button></div>)}
   </div>
  </Panel>
  {showBlockingError(!!error,s)?<LoadError error={error}/>:showErrorBanner(!!error,s)?<LoadErrorBanner error={error}/>:null}
  {(summaryFetching||activityFetching)&&s?<p className="text-xs muted mb-2">Updating report for selected period…</p>:null}
  {showInitialSkeleton(isLoading||activityLoading,s)?<DataLoadSkeleton variant="stats-table"/>:<>
   <div id="report-print-area" className="mt-5">
    <div className="flex flex-col gap-3 mb-4 no-print">
     <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3"><ReportViewTabs tab={reportView} onTab={setReportView}/><div className="relative flex-1 min-w-[200px] max-w-md sm:ml-auto"><Search size={16} className="absolute left-3 top-3.5 muted"/><input className="field pl-10!" placeholder="Search customer…" value={reportSearch} onChange={e=>setReportSearch(e.target.value)}/></div></div>
     <div className="flex flex-col sm:flex-row sm:items-center gap-2"><span className="text-xs font-semibold text-muted-foreground shrink-0">Payment method</span><ReportMethodTabs tab={reportPayMethod} onTab={setReportPayMethod} disabled={reportView==='bottle'}/>{reportPayMethod!=='all'&&reportView!=='bottle'&&<span className="text-xs muted">Received totals · {reportPayMethodLabel(reportPayMethod)} only</span>}</div>
    </div>
    {reportView==='summary'&&<div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5"><Stat label="Sales" value={money(s?.salesRevenue)} icon={ShoppingBag} small={s?.salesCount!=null?`${s.salesCount} invoice(s)`:undefined}/><Stat label="Received" value={money(tabReceived)} icon={Wallet} small={reportPayMethod!=='all'?`${reportPayMethodLabel(reportPayMethod)}${reportTotalsFetching?' · updating…':''}`:q?'Search filtered':reportTotalsFetching?'Updating…':undefined}/><Stat label="Credit (sales)" value={money(tabCredited)} icon={Receipt} small={reportPayMethod!=='all'?'Sale credit · all methods':undefined}/><Stat label="Bottles out / in" value={`+${formatDozenValue(tabBottles.out)} / −${formatDozenValue(tabBottles.in)}`} icon={GlassWater}/><Stat label="Expenses" value={money(s?.expenses)} icon={Receipt}/><Stat label="Net profit (est.)" value={money(s?.estimatedNetProfit)} icon={TrendingUp}/></div>}
    {reportView==='payment'&&<div className="grid grid-cols-2 gap-3 mb-5 max-w-lg"><Stat label="Received" value={money(tabReceived)} icon={Wallet} small={reportPayMethod!=='all'?`${reportPayMethodLabel(reportPayMethod)}${reportTotalsFetching?' · updating…':''}`:reportTotalsFetching?'Updating…':undefined}/><Stat label="Credit (sales)" value={money(tabCredited)} icon={Receipt} small={reportPayMethod==='all'?`${paymentLines.length} row(s)`:undefined}/></div>}
    {reportView==='bottle'&&<div className="grid grid-cols-2 gap-3 mb-5 max-w-lg"><Stat label="Bottles out" value={`+${formatDozenValue(tabBottles.out)}`} icon={GlassWater}/><Stat label="Bottles in" value={`−${formatDozenValue(tabBottles.in)}`} icon={GlassWater} small={`${bottleLines.length} row(s)`}/></div>}
    {reportView!=='summary'&&<>
     <h2 className="font-extrabold mb-3 text-base">{reportView==='payment'?'Payment activity':'Bottle activity'}</h2>
     <Table rows={tabLines} emptyMessage={reportView==='payment'?'No payments for this period and method.':'No bottle movements in this period.'} columns={reportView==='payment'?[
      {name:'Date',render:r=><span className="whitespace-nowrap">{date(r.at||r.date)}</span>},
      {name:'Customer',render:r=><b>{r.customerName}</b>},
      ...(showCashier?[{name:'Cashier',render:(r:R)=><span className="text-sm font-semibold">{r.cashierName||'—'}</span>}]:[]),
      {name:'Method',render:r=>r.kind==='payment'?<span className="tag text-[10px] py-0.5">{payMethodLabel(r.paymentMethod)}</span>:<span className="muted">—</span>},
      {name:'Detail',render:r=><span className="text-sm text-[#4a5c54]">{r.label}</span>},
      {name:'Received',render:r=>r.received!=null?<b className="text-primary tabular-nums">{money(r.received)}</b>:<span className="muted">—</span>},
      {name:'Credited',render:r=>r.credited!=null?<b className="text-[#a8662b] tabular-nums">{money(r.credited)}</b>:<span className="muted">—</span>},
     ]:[
      {name:'Date',render:r=><span className="whitespace-nowrap">{date(r.at||r.date)}</span>},
      {name:'Customer',render:r=><b>{r.customerName}</b>},
      ...(showCashier?[{name:'Cashier',render:(r:R)=><span className="text-sm font-semibold">{r.cashierName||'—'}</span>}]:[]),
      {name:'Detail',render:r=><span className="text-sm text-[#4a5c54]">{r.label}</span>},
      {name:'Bottles',render:r=><span className="text-sm flex items-baseline gap-1.5 flex-wrap"><BottleBalance internal={n(r.bottleDelta)} size="sm" perDozen={r.bottlesPerDozen}/><span className="font-medium text-[#4a5c54]">{r.bottleTypeName}</span></span>},
     ]}/>
    </>}
   </div>
  </>}
 </div>;
}
function Settings(){
 const client=useQueryClient();
 const me=getUser();
 const {data:users=[]}=useUsers();
 const {submit,busy}=useSubmit();
 const [username,setUsername]=useState('');
 const [password,setPassword]=useState('');
 const [role,setRole]=useState('CASHIER');
 const [resetUser,setResetUser]=useState<R|null>(null);
 const [newPassword,setNewPassword]=useState('');
 async function refreshUsers(){await client.invalidateQueries({queryKey:queryKeys.users.all()});}
 async function disableCashier(row:R){
  if(row.role!=='CASHIER')return;
  if(!window.confirm(`Remove cashier "${row.username}"? They will not be able to sign in.`))return;
  const ok=await submit(`/users/${row.id}`,{active:false},refreshUsers,'PATCH');
  if(ok)await refreshUsers();
 }
 async function restoreCashier(row:R){
  const ok=await submit(`/users/${row.id}`,{active:true},refreshUsers,'PATCH');
  if(ok)await refreshUsers();
 }
 async function saveNewPassword(e:React.FormEvent){
  e.preventDefault();
  if(!resetUser||newPassword.length<4)return toast.error('Password must be at least 4 characters');
  const ok=await submit(`/users/${resetUser.id}`,{password:newPassword},()=>{setResetUser(null);setNewPassword('');},'PATCH');
  if(ok)await refreshUsers();
 }
 return <>
  <Head title="Staff & settings"/>
  <Panel title="Create staff account">
   <form className="grid sm:grid-cols-3 gap-3" onSubmit={async e=>{e.preventDefault();const ok=await submit('/users',{username,password,role},()=>{setUsername('');setPassword('')});if(ok)await refreshUsers();}}>
    <Input label="Username" value={username} onChange={setUsername}/>
    <Input label="Password (at least 4 characters)" type="password" minLength={4} value={password} onChange={setPassword}/>
    <Select label="Role" value={role} onChange={setRole} options={[{id:'CASHIER',name:'Cashier'},{id:'OWNER',name:'Owner'}]}/>
    <div className="sm:col-span-3"><Btn busy={busy}>Create account</Btn></div>
   </form>
  </Panel>
  <h2 className="font-extrabold my-5">Staff members</h2>
  <Table rows={users} columns={[
   {name:'Username',render:r=><b>{r.username}</b>},
   {name:'Role',render:r=>r.role},
   {name:'Status',render:r=><span className={`tag ${r.active?'':'opacity-60'}`}>{r.active?'Active':'Removed'}</span>},
   {name:'Created',render:r=>date(r.createdAt)},
   {name:'Actions',render:r=><div className="flex flex-wrap gap-2 whitespace-nowrap">{r.active&&<button type="button" className="text-primary font-bold text-xs" onClick={()=>{setResetUser(r);setNewPassword('');}}>Reset password</button>}{r.role==='CASHIER'&&r.active&&r.id!==me?.id&&<button type="button" className="text-[#c45444] font-bold text-xs" onClick={()=>void disableCashier(r)}>Remove</button>}{r.role==='CASHIER'&&!r.active&&<button type="button" className="muted font-bold text-xs" onClick={()=>void restoreCashier(r)}>Restore</button>}</div>},
  ]}/>
  {resetUser&&<Modal title={`Reset password · ${resetUser.username}`} onClose={()=>{setResetUser(null);setNewPassword('');}} footer={<><Btn busy={busy} form="reset-staff-password">Save password</Btn><button type="button" className="btn btn-ghost" onClick={()=>{setResetUser(null);setNewPassword('');}}>Cancel</button></>}>
   <form id="reset-staff-password" className="space-y-4" onSubmit={e=>void saveNewPassword(e)}>
    <Input label="New password (at least 4 characters)" type="password" minLength={4} value={newPassword} onChange={setNewPassword}/>
   </form>
  </Modal>}
 </>;
}
function Sales(){
 const {data:sales,isLoading,error,isFetching:salesFetching}=useSales();
 const [selected,setSelected]=useState('');
 const {data:detail,isLoading:detailLoading}=useSale(selected||undefined,!!selected);
 const list=sales||[];
 const customerLabel=(r:R)=>r.guestName||(r.customerId?'Registered customer':'Walk-in');
 const paidOf=(r:R)=>money((r.payments||[]).reduce((s:number,p:R)=>s+n(p.amount),0));
 const columns:ListColumn<R>[]=[
  {name:'Invoice',primary:true,render:r=><b className="break-all">{String(r.invoiceNo).slice(0,24)}</b>},
  {name:'Date',mobileLabel:'Date',render:r=>date(r.createdAt)},
  {name:'Customer',mobileLabel:'Customer',render:r=><span className="text-right max-w-[52vw] truncate inline-block">{customerLabel(r)}</span>},
  {name:'Total',mobileLabel:'Total',render:r=><b>{money(r.total)}</b>},
  {name:'Paid',mobileLabel:'Paid',render:r=>paidOf(r)},
  {name:'Action',hideOnMobile:true,render:r=><button type="button" className="text-primary font-bold" onClick={()=>setSelected(r.id)}>Details</button>},
 ];
 return <>
  <Head title="Sales & invoices" action={<div className="flex flex-wrap gap-2"><QueryRefreshButton queryKey={queryKeys.sales.all()}/><Link className="btn btn-primary" href="/sell"><Plus size={16}/> New sale</Link></div>}/>
  {showBlockingError(!!error,sales)?<LoadError error={error}/>:showErrorBanner(!!error,sales)?<LoadErrorBanner error={error}/>:null}
  <SubtleRefreshIndicator active={salesFetching&&!!sales}/>
  {showInitialSkeleton(isLoading,sales)?(<><div className="md:hidden"><SkeletonTable rows={5} cols={1}/></div><div className="hidden md:block"><SkeletonTable rows={8} cols={6}/></div></>):(<>
   <ResponsiveList rows={list} columns={columns} onRowClick={r=>setSelected(String(r.id))} emptyMessage="No sales yet. Create your first sale."/>
   <DesktopTable rows={list} columns={columns}/>
  </>)}
  {selected&&<Modal title={`Invoice ${(detail as R|undefined)?.invoiceNo||'…'}`} onClose={()=>setSelected('')} footer={<><button type="button" className="btn btn-ghost no-print" onClick={()=>window.print()}><Printer size={16}/> Print</button><button type="button" className="btn btn-primary" onClick={()=>setSelected('')}>Close</button></>}>
   {detailLoading&&!detail?<SkeletonTable rows={4} cols={2}/>:<>
    <p className="muted text-sm mb-4">{date((detail as R|undefined)?.createdAt)} · {customerLabel((detail as R)||{})}</p>
    <div className="md:hidden space-y-2 mb-4">{(((detail as R|undefined)?.items as R[])||[]).map((r:R)=><div key={String(r.id||r.productId)} className="rounded-xl border border-[#edf1ed] p-3 flex justify-between gap-3 text-sm"><div className="min-w-0"><b className="block truncate">{String((r.product as R|undefined)?.name||r.productId)}</b><span className="muted">{formatDozen(n(r.quantity),(r.product as R|undefined)?.unitsPerCase)} × {money(r.unitPrice)} / dz</span></div><b className="shrink-0 tabular-nums">{money(r.lineTotal)}</b></div>)}</div>
    <div className="hidden md:block"><Table rows={((detail as R|undefined)?.items as R[])||[]} columns={[{name:'Product',render:r=>String((r.product as R|undefined)?.name||r.productId)},{name:'Qty (dz)',render:r=>formatDozen(n(r.quantity),(r.product as R|undefined)?.unitsPerCase)},{name:'Price / dz',render:r=>money(r.unitPrice)},{name:'Total',render:r=>money(r.lineTotal)}]}/></div>
    <div className="flex flex-wrap justify-between items-center gap-2 mt-4 pt-4 border-t border-[#edf1ed]"><span className="muted text-sm">Paid {paidOf((detail as R)||{})}</span><span className="font-extrabold text-xl tabular-nums">Total {money((detail as R|undefined)?.total)}</span></div>
   </>}
  </Modal>}
 </>;
}
export function OwnerOnly({ children }: { children: React.ReactNode }) {
  const owner = getUser()?.role === 'OWNER';
  if (!owner) {
    return (
      <div className="rounded-xl border bg-card p-8 text-sm text-muted-foreground">
        Owner access required.
      </div>
    );
  }
  return <>{children}</>;
}

export function DashboardPage() {
  return <Overview />;
}
export function SellPage() {
  return <SalePage />;
}
export function SalesListPage() {
  return <Sales />;
}
export function CustomersPage() {
  return <Customers />;
}
export function ProductsPage() {
  return <Products />;
}
export function BottleReturnsPageRoute() {
  return <Bottles />;
}
export { PaymentsPage } from '@/features/payments/components/payments-page';
export function FinancePage() {
  return <Finance />;
}
export function ReportsPage() {
  return <Reports />;
}
export function SettingsPage() {
  return (
    <OwnerOnly>
      <Settings />
    </OwnerOnly>
  );
}

