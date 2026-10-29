"""Run against a running API: python3 tests/check_api.py [base URL]."""
import json, sys, urllib.request, urllib.error
from decimal import Decimal
base = sys.argv[1] if len(sys.argv)>1 else 'http://localhost:5098'
def post(balance, apr, payment, extra):
    data=json.dumps(dict(balance=balance,apr=apr,payment=payment,extra=extra)).encode()
    return json.load(urllib.request.urlopen(urllib.request.Request(base+'/api/compare',data=data,headers={'Content-Type':'application/json'})),parse_float=Decimal)
r=post(5000,24,150,50)
a,b=r['current'],r['increased']
assert a['paidOff'] and b['paidOff']
assert a['schedule'][0]['interest']==100
assert a['schedule'][0]['principal']==50
assert a['schedule'][0]['balance']==4950
assert a['totalPaid']==Decimal(5000)+a['totalInterest']
assert b['totalInterest']<a['totalInterest'] and len(b['schedule'])<len(a['schedule'])
for p in [a,b]:
    assert p['schedule'][-1]['balance']==0
    assert sum(x['principal'] for x in p['schedule'])==5000
    assert sum(x['interest'] for x in p['schedule'])==p['totalInterest']
zero=post(1000,0,300,0)['current']
assert len(zero['schedule'])==4 and zero['schedule'][-1]['payment']==100 and zero['totalInterest']==0
assert not post(5000,24,100,0)['current']['paidOff']
assert not post(5000,24,50,0)['current']['paidOff']
small=post(.01,24,10,0)['current']
assert small['totalPaid']==Decimal('.01') and len(small['schedule'])==1
for case in [(-1,24,150,50),(5000,101,150,50),(5000,24,0,50),(5000,24,150,-1)]:
    try: post(*case); raise AssertionError('Invalid input accepted')
    except urllib.error.HTTPError as e: assert e.code==400
print(f'PASS: payoff conservation, zero APR, final partial payment, rounding, non-amortization, and input validation. Example: {len(a["schedule"])} months, ${a["totalInterest"]} interest; extra $50: {len(b["schedule"])} months, ${b["totalInterest"]} interest.')

def offer(**overrides):
    data=dict(kind='card',amount=5000,rate=24,introRate=0,introMonths=12,feePercent=3,annualFee=0,payment=150,term=36)
    data.update(overrides)
    return json.load(urllib.request.urlopen(urllib.request.Request(base+'/api/offer',data=json.dumps(data).encode(),headers={'Content-Type':'application/json'})),parse_float=Decimal)
c=offer()
assert c['promoBalance']==3350 and c['fees']==150
assert c['totalPaid']==c['received']+c['cost']
assert c['cost']==c['interest']+c['fees']
assert offer(amount=1200,payment=100,feePercent=0)['cost']==0
assert offer(amount=1200,payment=100,feePercent=0,annualFee=120)['fees']==240
l=offer(kind='loan',amount=1000,rate=0,feePercent=5,term=10)
assert l['received']==950 and l['totalPaid']==1000 and l['cost']==50 and l['months']==10
assert not offer(payment=1)['paidOff']
try: offer(feePercent=100); raise AssertionError('Invalid fee accepted')
except urllib.error.HTTPError as e: assert e.code==400
print('PASS: promotion expiry, annual fee recurrence, loan net proceeds, total cost conservation, non-payoff and invalid fees.')
