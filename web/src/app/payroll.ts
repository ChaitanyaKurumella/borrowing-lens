export interface PayrollInput {
 billRate:number; wage:number; hours:number; weeks:number; employees:number;
 cutPercent:number; fee:number; withholding:number; ficaWithheld:number; benefits:number; employerCosts:number;
}
export function calculatePayroll(p:PayrollInput) {
 if(Object.values(p).some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0||v>1e8) || p.hours<=0 || p.weeks<=0 || p.weeks>53 || p.employees<1 || !Number.isInteger(p.employees) || p.cutPercent>100)
  throw new Error('Enter nonnegative, finite amounts, positive hours, 1–53 weeks, a whole employee count, and a cut from 0–100%.');
 const round=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
 const revenue=round(p.billRate*p.hours), gross=round(p.wage*p.hours);
 const cut=round(gross*p.cutPercent/100+p.fee);
 if(cut+p.withholding+p.ficaWithheld+p.benefits>gross)throw new Error('Deductions exceed gross pay. Check the amounts and avoid counting the same deduction twice.');
 const spread=round(revenue-gross), remainder=round(spread+cut-p.employerCosts);
 return {revenue,gross,cut,spread,remainder,net:round(gross-cut-p.withholding-p.ficaWithheld-p.benefits),effective:round((gross-cut)/p.hours),annualCut:round(cut*p.weeks),annualRemainder:round(remainder*p.weeks),teamRemainder:round(remainder*p.weeks*p.employees),share:revenue>0?round(remainder/revenue*100):null};
}
