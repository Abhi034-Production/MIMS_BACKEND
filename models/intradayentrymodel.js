const mongoose = require("mongoose");

const tradeRecordSchema = new mongoose.Schema({
	tradeType: { type: String, required: true },
	stockName: { type: String, required: true },
	stockQty: { type: Number, required: true },
	profitLoss: { type: Number, required: true }
});

const intradayEntrySchema = new mongoose.Schema({
	userEmail: { type: String, required: true },
	date: { type: String, required: true },
	day: { type: String, required: true },
	overallProfitLoss: { type: Number, required: true },
	netProfitLoss: { type: Number, required: true },
	govCharges: { type: Number, required: true },
	brokarage: { type: Number, required: true },
	totalTrade: { type: Number, required: true },
	tradeType: { type: String, required: true },
	tradeIndicators: { type: String, required: true },
	tradeRecords: [tradeRecordSchema]
}, { timestamps: true });

module.exports = mongoose.model("IntradayEntry", intradayEntrySchema);
