import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { calculatePayroll } from './payroll';
interface Row {number:number; payment:number; interest:number; principal:number; balance:number}
interface Projection {paidOff:boolean; warning:string|null; schedule:Row[]; totalInterest:number; totalPaid:number}
interface Result {current:Projection; increased:Projection; assumptions:string}
@Component({selector:'app-root', imports:[CommonModule,FormsModule], templateUrl:'./app.html', styleUrl:'./app.css'})
export class App {
 payroll={billRate:80,wage:50,hours:40,weeks:52,employees:1,cutPercent:10,fee:0,withholding:300,ficaWithheld:0,benefits:100,employerCosts:200};
 payrollStatus='stem'; ficaStatus='unknown'; payrollError=signal(''); payrollStale=signal(false);
 payrollResult=signal<ReturnType<typeof calculatePayroll>|null>(null);
 payrollSnapshot={...this.payroll};
 payrollChanged(){this.payrollStale.set(true);}
 analyzePayroll(){this.payrollError.set('');this.payrollResult.set(null);try{this.payrollResult.set(calculatePayroll(this.payroll));this.payrollSnapshot={...this.payroll};this.payrollStale.set(false);}catch(e){this.payrollError.set(e instanceof Error?e.message:'Check your inputs.');}}

 offer={kind:'card',amount:5000,rate:24,introRate:0,introMonths:12,feePercent:3,annualFee:0,payment:150,term:36};
 offerResult=signal<any>(null); offerError=signal(''); offerStale=signal(false); offerBusy=signal(false);
 offerChanged(){this.offerStale.set(true);}
 async analyzeOffer(){this.offerBusy.set(true);this.offerError.set('');this.offerResult.set(null);
 try{const response=await fetch('/api/offer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(this.offer)});const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not analyze offer.');this.offerResult.set({...data,kind:this.offer.kind});this.offerStale.set(false);}catch(e){this.offerError.set(e instanceof Error?e.message:'Could not connect.');}finally{this.offerBusy.set(false);}}
 balance=5000; apr=24; payment=150; extra=50;
 result=signal<Result|null>(null); error=signal(''); busy=signal(false); stale=signal(false);
 calculated={balance:5000,payment:150,extra:50}; statement=''; evidence=signal<{label:string;value:string}[]>([]); note=signal('');
 constructor(){this.calculate();this.analyzePayroll();}
 changed(){this.stale.set(true);}
 async calculate(){
 this.error.set('');this.busy.set(true);
 try {const response=await fetch('/api/compare',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({balance:this.balance,apr:this.apr,payment:this.payment,extra:this.extra})});
 const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not calculate. Check your inputs.');this.calculated={balance:this.balance,payment:this.payment,extra:this.extra};this.result.set(data);this.stale.set(false);
 }catch(e){this.error.set(e instanceof Error?e.message:'Could not connect to the calculator.');}finally{this.busy.set(false);}}
 async upload(event:Event){const file=(event.target as HTMLInputElement).files?.[0];if(!file)return;if(file.size>1000000){this.note.set('Use a text file smaller than 1 MB.');return;}this.statement=await file.text();this.extract();}
 extract(){
 const matches:{label:string;value:string}[]=[];
 const terms=[{label:'Balance',pattern:/(?:new balance|statement balance)\s*[:$\s]*([\d,]+\.\d{2})/i,assign:(n:number)=>this.balance=n},{label:'Purchase APR',pattern:/(?:purchase apr|purchases apr|annual percentage rate)\s*[:\s]*([\d.]+)\s*%/i,assign:(n:number)=>this.apr=n},{label:'Minimum payment',pattern:/(?:minimum payment(?: due)?)\s*[:$\s]*([\d,]+\.\d{2})/i,assign:(n:number)=>this.payment=n}];
 for(const term of terms){const found=this.statement.match(term.pattern);if(found){term.assign(Number(found[1].replaceAll(',','')));matches.push({label:term.label,value:found[0]});}}
 this.evidence.set(matches);this.note.set(matches.length?'Review each detected value against your statement before calculating. Unmatched fields keep their previous values.':'No supported labels found. Enter the values manually.');this.changed();
 }
 money(n:number){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);}
}
