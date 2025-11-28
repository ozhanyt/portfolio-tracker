
// Reproduction of PortfolioDetailPage calculation

const multiplier = 0.5494;
const totalValue = 5047746956; // 5 Billion
const totalProfitDisplay = -3000836.24; // -3 Million
const dailyReturnDisplay = -0.06;

// ECILC Data
const ecilcLoss = -65964064.44; // -65 Million
const ecilcChange = -3.19;

// Derived values
// Total Profit = (Stock Profit * Multiplier) + PPF Profit
// We don't know PPF Profit, but it's usually small positive.
// If Total Profit is -3M.
// And Stock Profit (ECILC alone) is -65M.
// Weighted ECILC Profit = -65M * 0.55 = -35.75M.
// So other stocks + PPF must have added +32.75M.

// Impact Calculation
// Impact = (Item Profit * Multiplier / Total Cost) * 100

// We need Total Cost.
// Total Return = (Total Profit / Total Cost) * 100
// -0.06 = (-3,000,836 / Total Cost) * 100
// Total Cost = -3,000,836 / -0.0006 = 5,001,393,333 (5 Billion)

const totalCost = 5001393333;

console.log("Estimated Total Cost:", totalCost);

// Calculate ECILC Impact
const ecilcImpact = (ecilcLoss * multiplier / totalCost) * 100;

console.log("ECILC Loss:", ecilcLoss);
console.log("Multiplier:", multiplier);
console.log("Total Cost:", totalCost);
console.log("Calculated Impact:", ecilcImpact);

// Check if it matches -0.12
console.log("Matches -0.12?", ecilcImpact.toFixed(2) === "-0.12");
