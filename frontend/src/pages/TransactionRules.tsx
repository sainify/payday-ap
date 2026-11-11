import React, { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2, WandSparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/layout/TopBar";
import { ClayCard } from "@/components/ui/ClayCard";
import { ClayButton } from "@/components/ui/ClayButton";
import { ClayInput, ClaySelect } from "@/components/ui/ClayInput";
import { api } from "@/lib/api";
import { useCategories } from "@/hooks/useData";

type Rule={id:string;match_text:string;category_id:string;category_name:string;category_icon:string;transaction_type:"expense"|"income";priority:number;is_enabled:number};

export default function TransactionRules(){
 const navigate=useNavigate();
 const [rules,setRules]=useState<Rule[]>([]);
 const [type,setType]=useState<"expense"|"income">("expense");
 const [phrase,setPhrase]=useState("");
 const [category,setCategory]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const {data:categories}=useCategories(type);
 const load=useCallback(async()=>{try{setRules(await api.get<Rule[]>("/transaction-rules"));}catch(e){setError(e instanceof Error?e.message:"Could not load rules.");}},[]);
 useEffect(()=>{void load();},[load]);
 useEffect(()=>{setCategory(categories?.[0]?.id||"");},[categories]);
 async function add(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");try{await api.post("/transaction-rules",{match_text:phrase,category_id:category,transaction_type:type});setPhrase("");await load();}catch(e){setError(e instanceof Error?e.message:"Could not save rule.");}finally{setBusy(false);}}
 async function remove(id:string){try{await api.del("/transaction-rules/"+id);await load();}catch(e){setError(e instanceof Error?e.message:"Could not delete rule.");}}
 return <div className="pb-32"><TopBar title="Smart Rules" subtitle="Automatically categorize transactions" back/><div className="px-5 space-y-4">
  <ClayCard><div className="flex items-center gap-2 mb-2 text-primary"><WandSparkles size={19}/><h3 className="font-display font-semibold text-ink dark:text-ink-inverted">Create an auto-category rule</h3></div><p className="text-xs text-ink-faint mb-4">When a new transaction note contains your phrase, PAYDAY will choose the category automatically. You can still change it later.</p>
   <form onSubmit={add}><ClaySelect label="Transaction type" value={type} onChange={e=>setType(e.target.value as "expense"|"income")}><option value="expense">Expense</option><option value="income">Income</option></ClaySelect><ClayInput label="Description contains" placeholder="e.g. swiggy, petrol, salary" value={phrase} onChange={e=>setPhrase(e.target.value)} minLength={2} maxLength={60} required/><ClaySelect label="Set category to" value={category} onChange={e=>setCategory(e.target.value)}>{(categories||[]).map(x=><option key={x.id} value={x.id}>{x.icon} {x.name}</option>)}</ClaySelect><ClayButton fullWidth disabled={busy||!category}><Plus size={16} className="inline mr-2"/>{busy?"Saving…":"Add rule"}</ClayButton></form>
  </ClayCard>
  {error&&<ClayCard className="text-sm text-coral">{error}</ClayCard>}
  <div><h3 className="font-display font-semibold mb-2">Your rules ({rules.length})</h3>{rules.length===0?<ClayCard><p className="text-sm text-ink-faint">No rules yet. Add one above to start automatic categorization.</p></ClayCard>:<div className="space-y-2">{rules.map(r=><ClayCard key={r.id} className="flex items-center gap-3"><div className="min-w-0 flex-1"><div className="font-semibold text-sm">If note contains “{r.match_text}”</div><div className="text-xs text-ink-faint mt-1 capitalize">{r.transaction_type} · {r.category_icon} {r.category_name}</div></div><button onClick={()=>void remove(r.id)} aria-label="Delete rule" className="p-2 text-coral"><Trash2 size={17}/></button></ClayCard>)}</div>}</div>
 </div></div>;
}
