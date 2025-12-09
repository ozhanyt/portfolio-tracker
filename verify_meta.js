
// Verification for META
// User Data:
const shares = 54893;
const currentPrice = 664.38;
const prevClose = 664.72;
const reportedProfit = 1813460;

// Assumption: Current USD Rate is around 34.50 (Standard assumption or pulled from API)
const currentRate = 34.50;

// Profit = (Value) - (Cost)
// Profit = (Shares * CurrentPrice * CurrentRate) - (Shares * PrevClose * PrevRate)
// 1,813,460 = (54893 * 664.38 * 34.50) - (54893 * 664.72 * PrevRate)

const currentValueTL = shares * currentPrice * currentRate;
console.log("Current Value (TL):", currentValueTL.toLocaleString());

const requiredCostTL = currentValueTL - reportedProfit;
console.log("Required Cost (TL):", requiredCostTL.toLocaleString());

// Cost = shares * prevClose * PrevRate
// PrevRate = Cost / (shares * prevClose)
const impliedPrevRate = requiredCostTL / (shares * prevClose);

console.log("Implied Prev USD Rate:", impliedPrevRate.toFixed(4));
console.log("Current USD Rate:", currentRate.toFixed(4));

const rateChange = ((currentRate - impliedPrevRate) / impliedPrevRate) * 100;
console.log("Implied USD/TRY Change %:", rateChange.toFixed(3) + "%");

const stockChange = ((currentPrice - prevClose) / prevClose) * 100;
console.log("Stock Price Change %:", stockChange.toFixed(3) + "%");

const netReturn = rateChange + stockChange;
console.log("Approx Net Return %:", netReturn.toFixed(3) + "%");
