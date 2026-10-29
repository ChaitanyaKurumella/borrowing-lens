var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapPost("/api/compare", (Scenario input) => {
    if (input.Balance <= 0 || input.Balance > 10000000 || input.Apr < 0 || input.Apr > 100 || input.Payment <= 0 || input.Extra < 0 || input.Payment > 10000000 || input.Extra > 10000000)
        return Results.BadRequest(new { error = "Enter a balance above $0, APR from 0–100%, a positive payment and a nonnegative extra payment. Amounts must be at most $10 million." });
    return Results.Ok(new { current = Calculate(input.Balance, input.Apr, input.Payment), increased = Calculate(input.Balance, input.Apr, input.Payment + input.Extra), assumptions = "Monthly estimate: APR ÷ 12, interest rounded to cents each month, payment at month end, fixed rate, no new purchases or fees. Actual issuer calculations and payment dates may differ." });
});
app.MapPost("/api/offer", (Offer o) => {
    if ((o.Kind != "card" && o.Kind != "loan") || o.Amount <= 0 || o.Amount > 10000000 || o.Rate < 0 || o.Rate > 100 || o.IntroRate < 0 || o.IntroRate > 100 || o.FeePercent < 0 || o.FeePercent >= 100 || o.AnnualFee < 0 || o.AnnualFee > 10000 || o.Payment <= 0 || o.Payment > 10000000 || o.Term < 1 || o.Term > 600 || o.IntroMonths < 0 || o.IntroMonths > 120)
        return Results.BadRequest(new { error = "Check all offer fields: positive amount/payment, rates 0–100%, fee below 100%, term 1–600 months, promotion 0–120 months." });
    decimal Round(decimal n) => decimal.Round(n, 2, MidpointRounding.AwayFromZero);
    var upfrontFee = Round(o.Amount * o.FeePercent / 100m);
    if (o.Kind == "loan") {
        var rate = (double)o.Rate / 1200;
        var scheduled = o.Rate == 0 ? o.Amount / o.Term : (decimal)((double)o.Amount * rate / (1 - Math.Pow(1 + rate, -o.Term)));
        var projection = Calculate(o.Amount, o.Rate, Round(scheduled) + .01m);
        var net = o.Amount - upfrontFee;
        return Results.Ok(new { paidOff = projection.PaidOff, warning = projection.Warning, months = projection.Schedule.Count, interest = projection.TotalInterest, fees = upfrontFee, totalPaid = projection.TotalPaid, received = net, cost = projection.TotalPaid - net, monthlyPayment = Round(scheduled) + .01m, promoBalance = (decimal?)null });
    }
    decimal balance = o.Amount + upfrontFee, interestTotal = 0, fees = upfrontFee, paid = 0;
    decimal? promoBalance = o.IntroMonths == 0 ? null : 0m;
    for (int m = 1; m <= 1200; m++) {
        if ((m - 1) % 12 == 0) { balance += o.AnnualFee; fees += o.AnnualFee; }
        var interest = Round(balance * (m <= o.IntroMonths ? o.IntroRate : o.Rate) / 1200m);
        interestTotal += interest;
        var actual = Math.Min(o.Payment, balance + interest);
        balance += interest - actual; paid += actual;
        if (m == o.IntroMonths) promoBalance = balance;
        if (balance == 0) return Results.Ok(new { paidOff = true, warning = (string?)null, months = m, interest = interestTotal, fees, totalPaid = paid, received = o.Amount, cost = interestTotal + fees, monthlyPayment = o.Payment, promoBalance });
    }
    return Results.Ok(new { paidOff = false, warning = "Balance remains after 100 years. Increase the payment; no full repayment total is available.", months = 1200, interest = interestTotal, fees, totalPaid = paid, received = o.Amount, cost = (decimal?)null, monthlyPayment = o.Payment, promoBalance });
});
app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));
app.Run();
static Projection Calculate(decimal balance, decimal apr, decimal payment) {
    var rows = new List<Month>();
    decimal totalInterest = 0, totalPaid = 0;
    for (int month = 1; month <= 1200; month++) {
        var interest = decimal.Round(balance * apr / 1200m, 2, MidpointRounding.AwayFromZero);
        if (payment <= interest) return new(false, "Payment does not cover monthly interest", rows, totalInterest, totalPaid);
        var actual = Math.Min(payment, balance + interest);
        balance = balance + interest - actual;
        totalInterest += interest; totalPaid += actual;
        rows.Add(new(month, actual, interest, actual - interest, balance));
        if (balance == 0) return new(true, null, rows, totalInterest, totalPaid);
    }
    return new(false, "Payoff exceeds the 100-year projection limit", rows, totalInterest, totalPaid);
}
record Scenario(decimal Balance, decimal Apr, decimal Payment, decimal Extra);
record Month(int Number, decimal Payment, decimal Interest, decimal Principal, decimal Balance);
record Projection(bool PaidOff, string? Warning, List<Month> Schedule, decimal TotalInterest, decimal TotalPaid);

record Offer(string Kind, decimal Amount, decimal Rate, decimal IntroRate, int IntroMonths, decimal FeePercent, decimal AnnualFee, decimal Payment, int Term);
