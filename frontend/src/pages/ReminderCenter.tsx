import React,{useEffect,useState} from "react";
import {Bell,AlertTriangle,Info,ShieldAlert,Send,BellRing,Clock} from "lucide-react";
import {Capacitor} from "@capacitor/core";
import {LocalNotifications} from "@capacitor/local-notifications";
import {TopBar} from "@/components/layout/TopBar";
import {ClayCard} from "@/components/ui/ClayCard";
import {ClayButton} from "@/components/ui/ClayButton";
import {ClayInput} from "@/components/ui/ClayInput";
import {useReminderCenter,mutate} from "@/hooks/useData";
import {useApp} from "@/context/AppContext";
import clsx from "clsx";

type PermissionState="granted"|"denied"|"prompt"|"unsupported";
const DAILY_EXPENSE_ID=802023;

export default function ReminderCenter(){
 const {data,loading,reload}=useReminderCenter();
 const {settings,updateSettings}=useApp();
 const [permission,setPermission]=useState<PermissionState>("prompt");
 const [testStatus,setTestStatus]=useState<string|null>(null);
 const [testing,setTesting]=useState(false);
 const [dailyEnabled,setDailyEnabled]=useState(!!settings?.daily_expense_reminder_enabled);
 const [dailyTime,setDailyTime]=useState(settings?.daily_expense_reminder_time||"20:00");
 const isNative=Capacitor.isNativePlatform();
 useEffect(()=>{setDailyEnabled(!!settings?.daily_expense_reminder_enabled);setDailyTime(settings?.daily_expense_reminder_time||"20:00");},[settings?.daily_expense_reminder_enabled,settings?.daily_expense_reminder_time]);
 useEffect(()=>{void checkNotificationPermission();},[]);
 useEffect(()=>{if(!isNative||permission!=="granted")return;void syncDailyReminder(dailyEnabled,dailyTime);},[isNative,permission,dailyEnabled,dailyTime]);

 async function syncDailyReminder(enabled:boolean,time:string){
  try{
   await LocalNotifications.cancel({notifications:[{id:DAILY_EXPENSE_ID}]});
   if(!enabled)return;
   if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))return;
   const parts=time.split(":").map(Number);
   await LocalNotifications.schedule({notifications:[{id:DAILY_EXPENSE_ID,title:"PAYDAY • Daily expense check",body:"Take a moment to record today's expenses and review your spending.",schedule:{on:{hour:parts[0],minute:parts[1]},repeats:true},sound:"default",extra:{source:"payday-daily-expense"}}]});
  }catch(error){console.error("Could not schedule daily reminder",error);setTestStatus(error instanceof Error?error.message:"Could not schedule daily reminder.");}
 }
 async function checkNotificationPermission(){
  try{
   if(isNative){const r=await LocalNotifications.checkPermissions();setPermission(r.display==="granted"?"granted":r.display==="denied"?"denied":"prompt");return;}
   if("Notification" in window){setPermission(Notification.permission==="granted"?"granted":Notification.permission==="denied"?"denied":"prompt");}else setPermission("unsupported");
  }catch{setPermission("unsupported");}
 }
 async function toggle(field:"bills"|"budgets"|"subscriptions"|"debts",current:number){await mutate("/notifications/preferences","PATCH",{[field]:current?0:1});reload();}
 async function saveDailyReminder(enabled:boolean,time=dailyTime){
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)){setTestStatus("Choose a valid reminder time.");return;}
  setDailyEnabled(enabled);setDailyTime(time);
  await updateSettings({daily_expense_reminder_enabled:enabled?1:0,daily_expense_reminder_time:time});
  if(isNative&&permission==="granted")await syncDailyReminder(enabled,time);
  setTestStatus(enabled?"Daily expense reminder set for "+time+".":"Daily expense reminder turned off.");
 }
 async function enableNotifications(){
  setTestStatus(null);
  try{
   if(isNative){const r=await LocalNotifications.requestPermissions();const granted=r.display==="granted";setPermission(granted?"granted":"denied");setTestStatus(granted?"Notifications allowed. Your daily reminder can now be scheduled.":"Please allow notifications from Android App Settings.");return;}
   if(!("Notification" in window)){setPermission("unsupported");setTestStatus("Notifications are not supported in this browser.");return;}
   const r=await Notification.requestPermission();setPermission(r==="granted"?"granted":r==="denied"?"denied":"prompt");setTestStatus(r==="granted"?"Browser notifications allowed. Daily background scheduling is supported only in the Android app.":"Notification permission was not granted.");
  }catch(e){setTestStatus(e instanceof Error?e.message:"Could not enable notifications.");}
 }
 async function testNotification(){
  setTesting(true);setTestStatus(null);
  try{
   if(isNative){
    let r=await LocalNotifications.checkPermissions();if(r.display!=="granted")r=await LocalNotifications.requestPermissions();
    if(r.display!=="granted"){setPermission("denied");setTestStatus("Please allow PAYDAY notification permission first.");return;}
    setPermission("granted");
    await LocalNotifications.schedule({notifications:[{id:Math.floor(Math.random()*1000000)+100000,title:"PAYDAY Test Notification",body:"Native Android notifications are working.",schedule:{at:new Date(Date.now()+2000)},sound:"default"}]});
    setTestStatus("Test notification scheduled for about 2 seconds from now.");return;
   }
   if(!("Notification" in window)){setPermission("unsupported");setTestStatus("Notifications are not supported in this browser.");return;}
   let p=Notification.permission;if(p==="default")p=await Notification.requestPermission();
   if(p!=="granted"){setPermission("denied");setTestStatus("Please allow notification permission first.");return;}
   setPermission("granted");new Notification("PAYDAY Test Notification",{body:"PAYDAY notifications are working.",icon:"/icon-192.png"});setTestStatus("Test notification sent.");
  }catch(e){setTestStatus(e instanceof Error?e.message:"Could not send test notification.");}
  finally{setTesting(false);}
 }
 const prefs=data?.preferences;
 const permissionLabel=permission==="granted"?"Allowed":permission==="denied"?"Blocked":permission==="prompt"?"Permission required":"Unsupported";
 return <div className="pb-28">
  <TopBar title="Reminder Center" subtitle="Bills, budgets, subscriptions & EMIs" back/>
  <div className="px-5 space-y-4">
   <ClayCard>
    <div className="flex items-center gap-3 mb-3"><div className="h-11 w-11 rounded-clay-sm bg-primary-soft text-primary flex items-center justify-center"><Bell size={19}/></div><div><div className="font-semibold">Device notifications</div><div className="text-xs text-ink-faint">{permissionLabel}{isNative?" • Android":" • Browser"}</div></div></div>
    <ClayButton fullWidth variant={permission==="granted"?"neutral":"primary"} onClick={enableNotifications} disabled={permission==="granted"}>{permission==="granted"?"Notifications Allowed":permission==="denied"?"Try Again":"Allow Notifications"}</ClayButton>
    <ClayButton fullWidth variant="neutral" className="mt-3 flex items-center justify-center gap-2" onClick={testNotification} disabled={testing}>{testing?<BellRing size={17} className="animate-pulse"/>:<Send size={17}/>} {testing?"Sending Test…":"Test Notification"}</ClayButton>
    {testStatus&&<div className="clay-inset px-3 py-3 mt-3 text-xs text-ink-soft dark:text-ink-faint">{testStatus}</div>}
    <p className="text-xs text-ink-faint mt-3">{isNative?"Android local notifications can run while PAYDAY is closed, subject to Android permission and battery settings.":"Browser notifications may not run at a reliable scheduled time while the browser is closed. Use the Android app for the daily schedule."}</p>
   </ClayCard>
   <ClayCard>
    <div className="flex items-center gap-2 mb-2"><Clock size={18} className="text-primary"/><h3 className="font-display font-semibold">Daily expense reminder</h3></div>
    <p className="text-xs text-ink-faint mb-3">A gentle daily reminder to record your expenses. It is optional and can be changed anytime.</p>
    <button onClick={()=>void saveDailyReminder(!dailyEnabled)} className="w-full flex items-center justify-between py-3 border-b border-black/5 dark:border-white/5"><span className="text-sm font-medium">Remind me every day</span><span className={clsx("h-6 w-11 rounded-full p-0.5 transition-colors",dailyEnabled?"bg-primary":"clay-inset")}><span className={clsx("block h-5 w-5 rounded-full bg-white transition-transform shadow",dailyEnabled&&"translate-x-5")}/></span></button>
    <div className="pt-3"><ClayInput label="Reminder time" type="time" required value={dailyTime} onChange={e=>setDailyTime(e.target.value)} onBlur={()=>void saveDailyReminder(dailyEnabled,dailyTime)}/></div>
    <p className="text-xs text-ink-faint -mt-2">Default: 8:00 PM. Your phone's local time is used.</p>
   </ClayCard>
   <ClayCard><h3 className="font-display font-semibold mb-3">Reminder types</h3>
    {prefs&&([["bills","Bills"],["budgets","Budget warnings"],["subscriptions","Subscriptions"],["debts","Debt / EMI"]] as const).map(([key,label])=><button key={key} onClick={()=>void toggle(key,prefs[key])} className="w-full flex items-center justify-between py-3 border-b border-black/5 dark:border-white/5 last:border-0"><span className="text-sm font-medium">{label}</span><span className={clsx("h-6 w-11 rounded-full p-0.5 transition-colors",prefs[key]?"bg-primary":"clay-inset")}><span className={clsx("block h-5 w-5 rounded-full bg-white transition-transform shadow",prefs[key]&&"translate-x-5")}/></span></button>)}
   </ClayCard>
   <div><div className="text-xs font-semibold uppercase tracking-wide text-ink-faint px-1 mb-2">Current reminders</div>
    {loading&&<p className="text-sm text-ink-faint">Loading…</p>}
    {!loading&&(data?.reminders.length??0)===0&&<ClayCard><p className="text-sm text-ink-faint text-center py-4">You're clear. Nothing needs attention right now.</p></ClayCard>}
    <div className="space-y-3">{data?.reminders.map(r=><ClayCard key={r.id} className="!p-4"><div className="flex gap-3"><div className={clsx("h-10 w-10 rounded-clay-sm flex items-center justify-center shrink-0",r.severity==="danger"?"bg-coral-soft text-coral":r.severity==="warning"?"bg-amber-soft text-amber":"bg-primary-soft text-primary")}>{r.severity==="danger"?<ShieldAlert size={17}/>:r.severity==="warning"?<AlertTriangle size={17}/>:<Info size={17}/>}</div><div><div className="font-semibold text-sm">{r.title}</div><div className="text-xs text-ink-faint mt-0.5">{r.message}</div></div></div></ClayCard>)}</div>
   </div>
  </div>
 </div>;
}
