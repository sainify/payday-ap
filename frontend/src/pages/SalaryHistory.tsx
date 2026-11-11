import React,{useState} from "react";
import {Landmark,PlusCircle} from "lucide-react";
import {TopBar} from "@/components/layout/TopBar";
import {ClayCard} from "@/components/ui/ClayCard";
import {ClayButton} from "@/components/ui/ClayButton";
import {ClayInput} from "@/components/ui/ClayInput";
import {Amount} from "@/components/ui/Amount";
import {useSalaryHistory,mutate} from "@/hooks/useData";

function todayLocal(){const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}

export default function SalaryHistory(){
 const {data,loading,reload}=useSalaryHistory();
 const [amount,setAmount]=useState("");const [date,setDate]=useState(todayLocal());const [note,setNote]=useState("");
 const [saving,setSaving]=useState(false);const [error,setError]=useState<string|null>(null);
 async function addCredit(e:React.FormEvent){
  e.preventDefault();setError(null);const value=Number(amount);
  if(!Number.isFinite(value)||value<=0){setError("Enter a salary amount greater than zero.");return;}
  setSaving(true);
  try{await mutate("/salary","POST",{amount:value,salary_date:date,note:note.trim()||null});setAmount("");setNote("");await reload();}
  catch(err){setError(err instanceof Error?err.message:"Could not save salary credit.");}
  finally{setSaving(false);}
 }
 const totalReceived=(data||[]).reduce((sum,row)=>sum+Number(row.amount||0),0);
 return <div className="pb-28"><TopBar title="Salary History" subtitle="Every actual salary credit" back/><div className="px-5 space-y-4">
  <ClayCard><div className="text-xs text-ink-faint mb-1">Total recorded salary credits</div><Amount value={totalReceived} size="xl"/><p className="text-xs text-ink-faint mt-2">Each entry is money actually received. Add separate entries for partial payments.</p></ClayCard>
  <ClayCard><div className="flex items-center gap-2 mb-3"><PlusCircle size={18} className="text-primary"/><h3 className="font-display font-semibold">Record salary received</h3></div>
   <form onSubmit={addCredit}><ClayInput label="Amount received" type="number" min="0.01" step="0.01" placeholder="e.g. 8000" value={amount} onChange={e=>setAmount(e.target.value)} required/><ClayInput label="Actual credit date" type="date" value={date} onChange={e=>setDate(e.target.value)} required/><ClayInput label="Note (optional)" placeholder="e.g. First part / remaining salary" value={note} onChange={e=>setNote(e.target.value)}/>{error&&<p className="text-sm text-coral mb-2">{error}</p>}<ClayButton fullWidth type="submit" disabled={saving}>{saving?"Saving…":"Save salary credit"}</ClayButton></form>
  </ClayCard>
  {loading&&<p className="text-sm text-ink-faint">Loading…</p>}
  {!loading&&(data?.length??0)===0&&<ClayCard><p className="text-sm text-ink-faint text-center py-4">No salary entries yet.</p></ClayCard>}
  {data?.map(s=><ClayCard key={s.id} className="!p-4 flex items-center justify-between"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-clay-sm bg-primary-soft text-primary flex items-center justify-center"><Landmark size={18}/></div><div><div className="font-medium text-sm">{new Date(s.salary_date+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}</div>{s.note&&<div className="text-xs text-ink-faint">{s.note}</div>}</div></div><Amount value={s.amount} size="lg"/></ClayCard>)}
 </div></div>;
}
