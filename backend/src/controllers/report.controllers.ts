import { RequestHandler } from "express";
import { supabase } from "../config/database";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const TABLE = "Transaction";
const FIELDS = "TransactionID, OrderDateTime"; // we only need an ID + date

type TxRow = {
  TransactionID: string;
  OrderDateTime: string | null;
};

export const getMonthlyTransactionTotals: RequestHandler = async (req, res) => {
  try {
    const now = new Date();
    const year = Number(req.query.year ?? now.getFullYear());

    const start = new Date(year, 0, 1).toISOString();
    const end   = new Date(year + 1, 0, 1).toISOString();

    const { data, error } = await supabase
      .from(TABLE)
      .select(FIELDS)
      .gte("OrderDateTime", start)
      .lt("OrderDateTime", end);

    if (error) { 
        return res.status(500).json({ error: error.message });
    }
    
    const rows = (data ?? []) as TxRow[];  // data gathered to TxRow type
    const monthlyCount = new Array(12).fill(0); // index 0=Jan, 11=Dec

    for (const row of rows) {
      if (!row.OrderDateTime) continue;
      const m = new Date(row.OrderDateTime).getMonth(); // 0..11
      monthlyCount[m] += 1; // count, not sum
    }

    const series = monthlyCount.map((count, i) => ({
      month: MONTHS[i],
      totalTransactions: count,
    }));

    return res.json({ year, series });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Something went wrong" });
  }
};

export const getYearlyTransactionTotals: RequestHandler = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const fromYear = Number(req.query.from ?? currentYear - 4);
    const toYear   = Number(req.query.to ?? currentYear);

    const startYear = Math.min(fromYear, toYear);
    const endYear   = Math.max(fromYear, toYear);

    const start = new Date(startYear, 0, 1).toISOString();
    const end   = new Date(endYear + 1, 0, 1).toISOString();

    const { data, error } = await supabase
      .from(TABLE)
      .select(FIELDS)
      .gte("OrderDateTime", start)
      .lt("OrderDateTime", end);

    if (error){
        return res.status(500).json({ error: error.message });
    } 

    const rows = (data ?? []) as TxRow[];

    const totals: Record<number, number> = {};
    for (let y = startYear; y <= endYear; y++) totals[y] = 0;

    for (const row of rows) {
      if (!row.OrderDateTime) continue;
      const y = new Date(row.OrderDateTime).getFullYear();
      totals[y] = (totals[y] || 0) + 1; // just count
    }

    const series = Object.keys(totals).map((y) => ({
      year: Number(y),
      totalTransactions: totals[Number(y)] || 0,
    }));

    return res.json({ series });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Something went wrong" });
  }
};
