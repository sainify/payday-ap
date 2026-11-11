export interface SalaryCycle {
  start: string;
  end: string;
  cycleDay: number;
  totalDays: number;
  daysRemaining: number;
}

function indiaDateParts(d: Date): {year:number;month:number;day:number} {
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(d);
  const get=(type:string)=>Number(parts.find(p=>p.type===type)?.value);
  return {year:get("year"),month:get("month")-1,day:get("day")};
}

export function toISODate(d: Date): string {
  const p=indiaDateParts(d);
  return `${p.year}-${String(p.month+1).padStart(2,"0")}-${String(p.day).padStart(2,"0")}`;
}

/** Fixed PAYDAY salary period: 24th through 23rd, inclusive, using India local dates. */
export function getSalaryCycle(_salaryCycleDay: number, today: Date = new Date()): SalaryCycle {
  const p=indiaDateParts(today);
  const current=new Date(Date.UTC(p.year,p.month,p.day));
  const start=current.getUTCDate()>=24
    ?new Date(Date.UTC(current.getUTCFullYear(),current.getUTCMonth(),24))
    :new Date(Date.UTC(current.getUTCFullYear(),current.getUTCMonth()-1,24));
  const nextStart=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+1,24));
  const end=new Date(Date.UTC(nextStart.getUTCFullYear(),nextStart.getUTCMonth(),23));
  const msPerDay=86400000;
  const totalDays=Math.round((nextStart.getTime()-start.getTime())/msPerDay);
  const elapsed=Math.max(0,Math.floor((current.getTime()-start.getTime())/msPerDay));
  return {
    start:toISODate(start),
    end:toISODate(end),
    cycleDay:Math.min(totalDays,elapsed+1),
    totalDays,
    daysRemaining:Math.max(0,Math.floor((end.getTime()-current.getTime())/msPerDay)+1)
  };
}

export function calcSafeToSpend(availableBalance:number,upcomingBillsTotal:number,daysRemaining:number):number {
  return Math.max(0,availableBalance-upcomingBillsTotal)/Math.max(1,daysRemaining);
}

export function predictCycleEndBalance(availableBalance:number,spentThisCycle:number,cycleDay:number,totalDays:number):{predicted:number;avgDailySpend:number} {
  const avgDailySpend=cycleDay>0?spentThisCycle/cycleDay:0;
  return {predicted:availableBalance-avgDailySpend*Math.max(0,totalDays-cycleDay),avgDailySpend};
}
