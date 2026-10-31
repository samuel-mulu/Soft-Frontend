export type SaleFieldErrors={qty:number[];paid:number[];ret:number[];payment:boolean;credit:boolean};

export class ApiRequestError extends Error{
 status:number;
 constructor(message:string,status:number){super(message);this.status=status;this.name='ApiRequestError';}
}

export function parseApiErrorMessage(data:Record<string,unknown>|null,status:number):string{
 if(!data)return status===503?'Could not save the sale. Tap Complete again.':`Request failed (${status})`;
 const raw=data.message??data.error;
 if(typeof raw==='string')return raw;
 if(Array.isArray(raw))return raw.map(x=>typeof x==='string'?x:x?.constraints?Object.values(x.constraints).join(', '):String(x)).join('; ');
 if(raw&&typeof raw==='object'){
  const inner=(raw as Record<string,unknown>).message;
  if(typeof inner==='string')return inner;
  if(Array.isArray(inner))return inner.map(String).join('; ');
 }
 return status===503?'Could not save the sale. Tap Complete again.':`Request failed (${status})`;
}

export function isRetryableSaleError(err:unknown):boolean{
 return err instanceof ApiRequestError&&err.status===503;
}

export async function postSaleWithRetry<T>(request:()=>Promise<T>,onRetry?:(attempt:number)=>void):Promise<T>{
 let last:unknown;
 for(let attempt=1;attempt<=3;attempt++){
  try{return await request();}catch(err){
   last=err;
   if(!isRetryableSaleError(err)||attempt>=3)break;
   onRetry?.(attempt+1);
   await new Promise(r=>setTimeout(r,500*attempt));
  }
 }
 throw last;
}

export function friendlySaleError(message:string,status:number):string{
 const m=message.toLowerCase();
 if(status===503||m.includes('database')||m.includes('transaction')||m.includes('p2028'))return 'Could not save the sale. Tap Complete again.';
 if(m.includes('not enough stock')||m.includes('insufficient stock'))return message;
 if(m.includes('payment exceeds')||m.includes('split payments'))return 'Payment amounts do not match the sale total. Check Paid / Received fields.';
 if(m.includes('registered customer')||m.includes('guest')||m.includes('full payment'))return 'Walk-in sales need full payment. Choose a customer to allow credit or bottle returns.';
 if(m.includes('bottle type is not used'))return 'That bottle type cannot be returned here. Use a type linked to returnable products.';
 if(m.includes('bottle return')||m.includes('outstanding balance'))return 'Could not record bottle return. Check bottle type and quantity.';
 if(m.includes('combine duplicate'))return 'Each product can only appear once. Use one row per product.';
 if(m.includes('discount exceeds'))return 'Discount is higher than the subtotal.';
 return message;
}

export function inferSaleFieldErrors(message:string,items:{productId:string;quantity:number}[],balances:{kind?:string;productId?:string;quantity?:unknown}[]):SaleFieldErrors{
 const err:SaleFieldErrors={qty:[],paid:[],ret:[],payment:false,credit:false};
 const m=message.toLowerCase();
 if(m.includes('stock')){
  items.forEach((line,i)=>{
   if(!line.productId)return;
   const avail=n(balances.find(b=>b.kind==='FULL_DRINK'&&b.productId===line.productId)?.quantity);
   if(line.quantity>avail)err.qty.push(i);
  });
  if(!err.qty.length&&items.length)err.qty.push(0);
 }
 if(m.includes('payment')||m.includes('split'))err.payment=true;
 if(m.includes('credit')||m.includes('guest')||m.includes('registered customer')||m.includes('full payment'))err.credit=true;
 if(m.includes('bottle'))items.forEach((_,i)=>err.ret.push(i));
 return err;
}

function n(v:unknown){return Number(v||0);}

export function stockIssues(items:{productId:string;quantity:number}[],balances:{kind?:string;productId?:string;quantity?:unknown}[],active:{id:string;name:string}[]):{index:number;name:string;need:number;have:number}[]{
 const out:{index:number;name:string;need:number;have:number}[]=[];
 items.forEach((line,i)=>{
  if(!line.productId)return;
  const have=n(balances.find(b=>b.kind==='FULL_DRINK'&&b.productId===line.productId)?.quantity);
  if(line.quantity>have)out.push({index:i,name:active.find(p=>p.id===line.productId)?.name||'Product',need:line.quantity,have});
 });
 return out;
}
