# Borrowing Lens
.NET 10 API and Angular 21 credit-card cost explainer.

## Run
1. `cd web && npm ci && npm run build`
2. Copy `web/dist/borrowing-lens-web/browser/` contents into `api/wwwroot/`.
3. `dotnet run --project api --urls http://localhost:5098`
4. Open http://localhost:5098.

API checks: `python3 tests/check_api.py` while the app runs.

## Scope
- Fixed dollar monthly payments, fixed purchase APR, no additional purchases or fees.
- Compare current payment against extra monthly payments; inspect amortization schedule.
- Import plain text statements or paste text; find explicitly labeled balance, purchase APR and minimum payment, show matching source snippets, then require review and calculation. Missing fields retain previous inputs.
- Statement text stays in browser memory; calculator API receives only numeric scenario inputs. No persistence, analytics or account connection.
- Offer analyzer: true introductory card APR, post-promotion rate, percentage transfer fee, recurring annual fee, and fixed-rate loans with origination fees withheld from proceeds. Numeric terms are entered manually; defaults are illustrative, not live lender offers.
- PDF/OCR, multiple APR buckets, deferred-interest calculations, variable rates, live lender feeds and daily ledger reconciliation are not implemented.
- Monthly approximation using APR/12 and decimal arithmetic, rounding half up to cents. Not an issuer-exact daily calculation. No claim of product novelty.

## Architecture and deployment
The ASP.NET application serves Angular's production files and the same-origin API. Deploy together to a .NET 10 capable host. Sites uses Cloudflare Workers and cannot host this .NET process; no nonfunctional static-only deployment is supplied.

## Source
CFPB: https://www.consumerfinance.gov/ask-cfpb/how-does-my-credit-card-company-calculate-the-amount-of-interest-i-owe-en-51/

## Payroll transparency
Compare client billing, promised gross pay, retained salary cuts, employee deductions, take-home pay and employer remainder. Payroll inputs are calculated locally in browser memory. Employer remainder is not verified profit. Annual estimates use the entered paid weeks and identical employee scenarios.

Restored from the October 28 session on October 29, 2026.
