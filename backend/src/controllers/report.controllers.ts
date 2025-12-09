import { RequestHandler } from "express";
import { supabase } from "../config/database";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
//Table Names
const T_TABLE = "Transaction";
const TI_TABLE= "Transaction_Item";
// Fields to select
const TransFIELDS = `TransactionID, OrderDateTime, Total`; // we only need an ID + date
const ItemFIELDS = 
  `Quantity,
  Product:ProductID (
    ProductID,
    Name,
    Category
  ),
  Transaction:TransactionID (
    OrderDateTime
  )`; // need qty, product details, and transaction date

type TxRow = {
  TransactionID: string;
  OrderDateTime: string | null;
  Total?: number | null;  
};

// Get monthly transaction totals + sales + units + best product
export const getMonthlyTransactionTotals: RequestHandler = async (req, res) => {
  try {
    const now = new Date();
    const year = Number(req.query.year ?? now.getFullYear());

    const start = new Date(year, 0, 1).toISOString();
    const end   = new Date(year + 1, 0, 1).toISOString();

    // 1️⃣ Transactions for counts + sales
    const { data: txData, error: txErr } = await supabase
      .from(T_TABLE)
      .select(TransFIELDS)
      .gte("OrderDateTime", start)
      .lt("OrderDateTime", end);

    if (txErr) {
      return res.status(500).json({ error: txErr.message });
    }

    const txRows = (txData ?? []) as TxRow[];

    // 2️⃣ Transaction items for units + best product
    const { data: itemData, error: iErr } = await supabase
      .from(TI_TABLE)
      .select(`
        Quantity,
        Product:ProductID ( Name ),
        Transaction:TransactionID ( OrderDateTime )
      `);

    if (iErr) {
      return res.status(500).json({ error: iErr.message });
    }

    // Monthly aggregates
    const monthly = MONTHS.map(() => ({
      transactions: 0,
      sales: 0,
      units: 0,
      productQty: {} as Record<string, number>,
    }));

    // 2.1 count transactions + sales per month
    for (const row of txRows) {
      if (!row.OrderDateTime) continue;
      const d = new Date(row.OrderDateTime);
      if (d < new Date(start) || d >= new Date(end)) continue;
      const m = d.getMonth(); // 0..11
      monthly[m].transactions += 1;
      monthly[m].sales += Number(row.Total ?? 0);
    }

    // 2.2 units + per-product qty per month
    for (const r of (itemData as any[]) ?? []) {
      const tx = Array.isArray(r.Transaction) ? r.Transaction[0] : r.Transaction;
      const whenStr = tx?.OrderDateTime as string | undefined;
      if (!whenStr) continue;
      const when = new Date(whenStr);
      if (when < new Date(start) || when >= new Date(end)) continue;

      const m = when.getMonth();
      const qty = Number(r.Quantity ?? 0);
      if (isNaN(qty)) continue;

      monthly[m].units += qty;

      const name = r.Product?.Name ?? "Unknown Product";
      monthly[m].productQty[name] = (monthly[m].productQty[name] || 0) + qty;
    }

    // 3️⃣ Build final series
    const series = MONTHS.map((label, i) => {
      const agg = monthly[i];
      let bestProduct: string | null = null;
      let maxQty = 0;
      for (const [name, qty] of Object.entries(agg.productQty)) {
        if (qty > maxQty) {
          maxQty = qty;
          bestProduct = name;
        }
      }

      return {
        month: label,
        totalTransactions: agg.transactions,
        totalSales: Number(agg.sales.toFixed(2)),
        totalUnitsSold: agg.units,
        bestProduct,
      };
    });

    return res.json({ year, series });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Something went wrong" });
  }
};

// Get yearly transaction totals + sales + units + best product
export const getYearlyTransactionTotals: RequestHandler = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const fromYear = Number(req.query.from ?? currentYear - 4);
    const toYear   = Number(req.query.to ?? currentYear);

    const startYear = Math.min(fromYear, toYear);
    const endYear   = Math.max(fromYear, toYear);

    const start = new Date(startYear, 0, 1).toISOString();
    const end   = new Date(endYear + 1, 0, 1).toISOString();

    // 1️⃣ Transactions for counts + sales
    const { data: txData, error: txErr } = await supabase
      .from(T_TABLE)
      .select(TransFIELDS)
      .gte("OrderDateTime", start)
      .lt("OrderDateTime", end);

    if (txErr) {
      return res.status(500).json({ error: txErr.message });
    }

    const txRows = (txData ?? []) as TxRow[];

    // 2️⃣ Items for units + best product
    const { data: itemData, error: iErr } = await supabase
      .from(TI_TABLE)
      .select(`
        Quantity,
        Product:ProductID ( Name ),
        Transaction:TransactionID ( OrderDateTime )
      `);

    if (iErr) {
      return res.status(500).json({ error: iErr.message });
    }

    // Yearly aggregates
    const years: number[] = [];
    const yearly: Record<number, {
      transactions: number;
      sales: number;
      units: number;
      productQty: Record<string, number>;
    }> = {};

    for (let y = startYear; y <= endYear; y++) {
      years.push(y);
      yearly[y] = {
        transactions: 0,
        sales: 0,
        units: 0,
        productQty: {},
      };
    }

    // 2.1 transactions + sales
    for (const row of txRows) {
      if (!row.OrderDateTime) continue;
      const d = new Date(row.OrderDateTime);
      const y = d.getFullYear();
      if (y < startYear || y > endYear) continue;
      yearly[y].transactions += 1;
      yearly[y].sales += Number(row.Total ?? 0);
    }

    // 2.2 units + per-product qty per year
    for (const r of (itemData as any[]) ?? []) {
      const tx = Array.isArray(r.Transaction) ? r.Transaction[0] : r.Transaction;
      const whenStr = tx?.OrderDateTime as string | undefined;
      if (!whenStr) continue;
      const when = new Date(whenStr);
      const y = when.getFullYear();
      if (y < startYear || y > endYear) continue;

      const qty = Number(r.Quantity ?? 0);
      if (isNaN(qty)) continue;

      yearly[y].units += qty;

      const name = r.Product?.Name ?? "Unknown Product";
      yearly[y].productQty[name] = (yearly[y].productQty[name] || 0) + qty;
    }

    // 3️⃣ Build series
    const series = years.map((y) => {
      const agg = yearly[y];
      let bestProduct: string | null = null;
      let maxQty = 0;
      for (const [name, qty] of Object.entries(agg.productQty)) {
        if (qty > maxQty) {
          maxQty = qty;
          bestProduct = name;
        }
      }

      return {
        year: y,
        totalTransactions: agg.transactions,
        totalSales: Number(agg.sales.toFixed(2)),
        totalUnitsSold: agg.units,
        bestProduct,
      };
    });

    return res.json({ series });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Something went wrong" });
  }
};

// Get daily transaction totals + sales + units + best product
export const getDailyTransactionTotals: RequestHandler = async (req, res) => {
  try {
    const daysLimit = Number(req.query.days ?? 60); // default 60 days
    const now = new Date();
    const from = new Date();
    from.setDate(now.getDate() - daysLimit);

    // 1️⃣ Transactions for counts + sales
    const { data: txData, error: txErr } = await supabase
      .from(T_TABLE)
      .select(TransFIELDS)
      .gte("OrderDateTime", from.toISOString())
      .lte("OrderDateTime", now.toISOString());

    if (txErr) {
      return res.status(500).json({ error: txErr.message });
    }

    const txRows = (txData ?? []) as TxRow[];

    // 2️⃣ Transaction items for units + best product
    const { data: itemData, error: iErr } = await supabase
      .from(TI_TABLE)
      .select(`
        Quantity,
        Product:ProductID ( Name ),
        Transaction:TransactionID ( OrderDateTime )
      `);

    if (iErr) {
      return res.status(500).json({ error: iErr.message });
    }

    // Daily aggregates
    const dayTotals: Record<string, {
      transactions: number;
      sales: number;
      units: number;
      productQty: Record<string, number>;
    }> = {};

    // 2.1 count transactions + sales per day
    for (const row of txRows) {
      if (!row.OrderDateTime) continue;
      const d = new Date(row.OrderDateTime);
      if (d < from || d > now) continue;
      const dayKey = d.toISOString().slice(0, 10); // "YYYY-MM-DD"
      
      if (!dayTotals[dayKey]) {
        dayTotals[dayKey] = {
          transactions: 0,
          sales: 0,
          units: 0,
          productQty: {},
        };
      }
      
      dayTotals[dayKey].transactions += 1;
      dayTotals[dayKey].sales += Number(row.Total ?? 0);
    }

    // 2.2 units + per-product qty per day
    for (const r of (itemData as any[]) ?? []) {
      const tx = Array.isArray(r.Transaction) ? r.Transaction[0] : r.Transaction;
      const whenStr = tx?.OrderDateTime as string | undefined;
      if (!whenStr) continue;
      const when = new Date(whenStr);
      if (when < from || when > now) continue;

      const dayKey = when.toISOString().slice(0, 10);
      if (!dayTotals[dayKey]) {
        dayTotals[dayKey] = {
          transactions: 0,
          sales: 0,
          units: 0,
          productQty: {},
        };
      }

      const qty = Number(r.Quantity ?? 0);
      if (isNaN(qty)) continue;

      dayTotals[dayKey].units += qty;

      const name = r.Product?.Name ?? "Unknown Product";
      dayTotals[dayKey].productQty[name] = (dayTotals[dayKey].productQty[name] || 0) + qty;
    }

    // 3️⃣ Build final series
    const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const series = Object.entries(dayTotals)
      .map(([day, agg]) => {
        let bestProduct: string | null = null;
        let maxQty = 0;
        for (const [name, qty] of Object.entries(agg.productQty)) {
          if (qty > maxQty) {
            maxQty = qty;
            bestProduct = name;
          }
        }

        const date = new Date(day);
        const dayName = DAY_NAMES[date.getDay()];
        const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        return {
          day,
          dayName,
          dayLabel: `${dayName}, ${formattedDate}`, // e.g., "Mon, Dec 9"
          totalTransactions: agg.transactions,
          totalSales: Number(agg.sales.toFixed(2)),
          totalUnitsSold: agg.units,
          bestProduct,
        };
      })
      .sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime());

    return res.json({ from: from.toISOString(), to: now.toISOString(), series });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Something went wrong" });
  }
};

// Get weekly transaction totals + sales + units + best product
export const getWeeklyTransactionTotals: RequestHandler = async (req, res) => {
  try {
    const now = new Date();
    // Default to current month if no date range specified
    const month = req.query.month ? Number(req.query.month) : now.getMonth();
    const year = req.query.year ? Number(req.query.year) : now.getFullYear();
    
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

    // 1️⃣ Transactions for counts + sales
    const { data: txData, error: txErr } = await supabase
      .from(T_TABLE)
      .select(TransFIELDS)
      .gte("OrderDateTime", monthStart.toISOString())
      .lte("OrderDateTime", monthEnd.toISOString());

    if (txErr) {
      return res.status(500).json({ error: txErr.message });
    }

    const txRows = (txData ?? []) as TxRow[];

    // 2️⃣ Items for units + best product
    const { data: itemData, error: iErr } = await supabase
      .from(TI_TABLE)
      .select(`
        Quantity,
        Product:ProductID ( Name ),
        Transaction:TransactionID ( OrderDateTime )
      `);

    if (iErr) {
      return res.status(500).json({ error: iErr.message });
    }

    // Helper to get start of week (Monday)
    const getWeekStart = (d: Date): Date => {
      const date = new Date(d);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
      return new Date(date.setDate(diff));
    };

    // Helper to get end of week (Sunday)
    const getWeekEnd = (d: Date): Date => {
      const weekStart = getWeekStart(d);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      return weekEnd;
    };

    // Helper to get week number within month (1-5)
    const getWeekInMonth = (d: Date): number => {
      const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
      const weekStart = getWeekStart(d);
      const daysDiff = Math.floor((weekStart.getTime() - firstDay.getTime()) / (1000 * 60 * 60 * 24));
      return Math.floor(daysDiff / 7) + 1;
    };

    // Weekly aggregates - key by month-week
    const weekly: Record<string, {
      transactions: number;
      sales: number;
      units: number;
      productQty: Record<string, number>;
      weekStart: Date;
      weekEnd: Date;
      weekNum: number;
      month: number;
      year: number;
    }> = {};

    // 2.1 transactions + sales
    for (const row of txRows) {
      if (!row.OrderDateTime) continue;
      const d = new Date(row.OrderDateTime);
      if (d < monthStart || d > monthEnd) continue;
      
      const weekStart = getWeekStart(d);
      const weekNum = getWeekInMonth(d);
      const weekKey = `${d.getFullYear()}-${d.getMonth()}-W${weekNum}`;
      
      if (!weekly[weekKey]) {
        weekly[weekKey] = {
          transactions: 0,
          sales: 0,
          units: 0,
          productQty: {},
          weekStart: getWeekStart(d),
          weekEnd: getWeekEnd(d),
          weekNum,
          month: d.getMonth(),
          year: d.getFullYear(),
        };
      }
      
      weekly[weekKey].transactions += 1;
      weekly[weekKey].sales += Number(row.Total ?? 0);
    }

    // 2.2 units + per-product qty per week
    for (const r of (itemData as any[]) ?? []) {
      const tx = Array.isArray(r.Transaction) ? r.Transaction[0] : r.Transaction;
      const whenStr = tx?.OrderDateTime as string | undefined;
      if (!whenStr) continue;
      const when = new Date(whenStr);
      if (when < monthStart || when > monthEnd) continue;

      const weekStart = getWeekStart(when);
      const weekNum = getWeekInMonth(when);
      const weekKey = `${when.getFullYear()}-${when.getMonth()}-W${weekNum}`;
      
      if (!weekly[weekKey]) {
        weekly[weekKey] = {
          transactions: 0,
          sales: 0,
          units: 0,
          productQty: {},
          weekStart: getWeekStart(when),
          weekEnd: getWeekEnd(when),
          weekNum,
          month: when.getMonth(),
          year: when.getFullYear(),
        };
      }

      const qty = Number(r.Quantity ?? 0);
      if (isNaN(qty)) continue;

      weekly[weekKey].units += qty;

      const name = r.Product?.Name ?? "Unknown Product";
      weekly[weekKey].productQty[name] = (weekly[weekKey].productQty[name] || 0) + qty;
    }

    // 3️⃣ Build series with all weeks of the month
    const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthName = MONTH_NAMES[month];
    
    // Generate all possible weeks in the month
    const allWeeks: number[] = [];
    for (let day = 1; day <= monthEnd.getDate(); day++) {
      const testDate = new Date(year, month, day);
      const weekNum = getWeekInMonth(testDate);
      if (!allWeeks.includes(weekNum)) {
        allWeeks.push(weekNum);
      }
    }
    allWeeks.sort((a, b) => a - b);

    const series = allWeeks.map((weekNum) => {
      const weekKey = Object.keys(weekly).find(k => {
        const parts = k.split('-');
        return parseInt(parts[2].replace('W', '')) === weekNum && 
               parseInt(parts[1]) === month && 
               parseInt(parts[0]) === year;
      });

      if (weekKey && weekly[weekKey]) {
        const agg = weekly[weekKey];
        let bestProduct: string | null = null;
        let maxQty = 0;
        for (const [name, qty] of Object.entries(agg.productQty)) {
          if (qty > maxQty) {
            maxQty = qty;
            bestProduct = name;
          }
        }

        const startDate = agg.weekStart;
        const endDate = agg.weekEnd;
        const startStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        return {
          week: `Week ${weekNum}`,
          weekLabel: `${monthName} W${weekNum}`,
          weekRange: `${startStr} - ${endStr}`,
          weekTooltip: `Week ${weekNum} (${startStr} - ${endStr})`,
          totalTransactions: agg.transactions,
          totalSales: Number(agg.sales.toFixed(2)),
          totalUnitsSold: agg.units,
          bestProduct,
        };
      } else {
        // Week with no data
        const firstDayOfWeek = new Date(year, month, 1);
        firstDayOfWeek.setDate(firstDayOfWeek.getDate() + (weekNum - 1) * 7 - (firstDayOfWeek.getDay() || 7) + 1);
        const weekStart = getWeekStart(firstDayOfWeek);
        const weekEnd = getWeekEnd(weekStart);
        const startStr = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const endStr = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        return {
          week: `Week ${weekNum}`,
          weekLabel: `${monthName} W${weekNum}`,
          weekRange: `${startStr} - ${endStr}`,
          weekTooltip: `Week ${weekNum} (${startStr} - ${endStr})`,
          totalTransactions: 0,
          totalSales: 0,
          totalUnitsSold: 0,
          bestProduct: null,
        };
      }
    });

    return res.json({ month, year, series });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Something went wrong" });
  }
};


// Get top 5 & 10 selling products or category
export const getTopItems: RequestHandler = async (req, res) => {
  try {
    // read choices from query
    const typeRaw  = String(req.query.type || "product").toLowerCase();
    const limitRaw = Number(req.query.limit || 5);
    const periodType = String(req.query.periodType || "month").toLowerCase();
    const date = req.query.date as string | undefined;
    const week = Number(req.query.week);
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    const fromYear = Number(req.query.fromYear);
    const toYear   = Number(req.query.toYear);

    // Calculate date range based on period type
    let startDate: Date;
    let endDate: Date;
    const now = new Date();
    
    if (periodType === 'day' && date) {
      startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
    } else if (periodType === 'week' && week && month && year) {
      const monthNum = month - 1;
      const firstDay = new Date(year, monthNum, 1);
      const firstMonday = new Date(firstDay);
      const dayOfWeek = firstDay.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      firstMonday.setDate(firstDay.getDate() + daysToMonday);
      startDate = new Date(firstMonday);
      startDate.setDate(firstMonday.getDate() + (week - 1) * 7);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else if (periodType === 'month' && month && year) {
      const monthNum = month - 1;
      startDate = new Date(year, monthNum, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(year, monthNum + 1, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (periodType === 'year' && year) {
      startDate = new Date(year, 0, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(year, 11, 31);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Default to current month
      const nowY = now.getFullYear();
      const nowM = now.getMonth();
      startDate = new Date(nowY, nowM, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(nowY, nowM + 1, 0);
      endDate.setHours(23, 59, 59, 999);
    }

    // only allow 5 or 10
    const limit = limitRaw === 10 ? 10 : 5;

    // only allow product or category
    const type = typeRaw === "category" ? "category" : "product";

    // Get transaction items with joined product, transaction date, and subtotal
    const { data, error } = await supabase
      .from(TI_TABLE)
      .select(`
        Quantity,
        Subtotal,
        Product:ProductID (
          ProductID,
          Name,
          Category,
          SellingPrice
        ),
        Transaction:TransactionID (
          OrderDateTime,
          TransactionID
        )
      `);

    if (error) return res.status(500).json({ error: error.message });

    // filter by date range using the joined Transaction.OrderDateTime
    const rows = (data ?? []).filter((r: any) => {
      const when = r?.Transaction?.OrderDateTime ? new Date(r.Transaction.OrderDateTime) : null;
      if (!when || isNaN(when.getTime())) return false;
      return when >= startDate && when <= endDate;
    });

    // Calculate total sales for percentage calculation
    const totalSales = rows.reduce((sum: number, r: any) => sum + (Number(r.Subtotal ?? 0)), 0);
    const totalTransactions = new Set(rows.map((r: any) => r.Transaction?.TransactionID).filter(Boolean)).size;

    // By PRODUCT mode
    if (type === "product") {
      //e.g Record <productId, { productId, name, category, sold, revenue, avgPrice, transactions }>
      const byProduct: Record <string, {
        productId: string;
        name: string;
        category: string | null;
        sold: number;
        revenue: number;
        avgPrice: number;
        transactions: Set<string>;
      }> = {};

      // cast to any[] to keep it simple 
      for (const { Product: p, Quantity, Subtotal, Transaction: txn } of rows as any[]) {
        const qty = Number(Quantity ?? 0);
        const subtotal = Number(Subtotal ?? 0);
        if (!p?.ProductID) continue;

        if (!byProduct[p.ProductID]) { 
          byProduct[p.ProductID] = {
            productId: p.ProductID,
            name: p.Name ?? "Unknown Product",
            category: p.Category ?? null,
            sold: 0,
            revenue: 0,
            avgPrice: 0,
            transactions: new Set(),
          };
        }

        byProduct[p.ProductID].sold += isNaN(qty) ? 0 : qty;
        byProduct[p.ProductID].revenue += isNaN(subtotal) ? 0 : subtotal;
        if (txn?.TransactionID) {
          byProduct[p.ProductID].transactions.add(txn.TransactionID);
        }
      }

      // Calculate averages and percentages
      const items = Object.values(byProduct).map(item => ({
        productId: item.productId,
        name: item.name,
        category: item.category,
        sold: item.sold,
        revenue: item.revenue,
        avgPrice: item.sold > 0 ? item.revenue / item.sold : 0,
        transactions: item.transactions.size,
        percentageOfSales: totalSales > 0 ? (item.revenue / totalSales) * 100 : 0,
      }))
        .sort((a, b) => b.revenue - a.revenue) // sort by revenue (industry standard)
        .slice(0, limit);

      return res.json({
        type: "product",
        periodType,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        limit,
        totalSales,
        totalTransactions,
        items,
      });
    }
    else {

      // By CATEGORY mode
      const byCategory: Record<string, { 
        category: string; 
        sold: number; 
        revenue: number;
        transactions: Set<string>;
      }> = {};

      for (const r of rows as any[]) {
        const qty = Number(r.Quantity ?? 0);
        const subtotal = Number(r.Subtotal ?? 0);
        const cat = r?.Product?.Category ?? "Uncategorized";
        if (!byCategory[cat]) {
          byCategory[cat] = { 
            category: cat, 
            sold: 0,
            revenue: 0,
            transactions: new Set(),
          };
        }
        byCategory[cat].sold += isNaN(qty) ? 0 : qty;
        byCategory[cat].revenue += isNaN(subtotal) ? 0 : subtotal;
        if (r.Transaction?.TransactionID) {
          byCategory[cat].transactions.add(r.Transaction.TransactionID);
        }
      }

      // Calculate percentages
      const items = Object.values(byCategory).map(item => ({
        category: item.category,
        sold: item.sold,
        revenue: item.revenue,
        avgPrice: item.sold > 0 ? item.revenue / item.sold : 0,
        transactions: item.transactions.size,
        percentageOfSales: totalSales > 0 ? (item.revenue / totalSales) * 100 : 0,
      }))
        .sort((a, b) => b.revenue - a.revenue) // sort by revenue
        .slice(0, limit);

      return res.json({
        type: "category",
        periodType,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        limit,
        totalSales,
        totalTransactions,
        items,
      });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Something went wrong" });
  }
};


export const getReorderLevelFromItems: RequestHandler = async (req, res) => {
  try {
    const threshold = Number(req.query.threshold ?? 20);

    // 1️⃣ Get all active product items (batches)
    const { data: items, error: itemErr } = await supabase
      .from("Product_Item")
      .select("ProductID, Stock, IsActive")
      .eq("IsActive", true);

    if (itemErr) return res.status(500).json({ error: itemErr.message });

    // 2️⃣ Group by product, track lowest batch stock
    const lowestBatchStock: Record<string, number> = {};

    for (const it of items ?? []) {
      const pid = it.ProductID;
      const stock = Number(it.Stock) || 0;

      if (!(pid in lowestBatchStock)) {
        lowestBatchStock[pid] = stock;
      } else {
        lowestBatchStock[pid] = Math.min(lowestBatchStock[pid], stock);
      }
    }

    // 3️⃣ Load product names
    const productIds = Object.keys(lowestBatchStock);

    const { data: products, error: prodErr } = await supabase
      .from("Product")
      .select("ProductID, Name, IsActive")
      .eq("IsActive", true)
      .in("ProductID", productIds);

    if (prodErr) return res.status(500).json({ error: prodErr.message });

    // Map for lookup
    const pMap = Object.fromEntries(
      products.map((p) => [p.ProductID, p])
    );

    // 4️⃣ Build final reorder list
    const results = productIds
      .map((pid) => {
        const lowest = lowestBatchStock[pid];
        const product = pMap[pid];

        if (!product) return null;

        const suggestedQty = Math.max(threshold - lowest, 0);

        return {
          productId: pid,
          name: product.Name,
          lowestBatchStock: lowest,
          reorderLevel: threshold,
          suggestedReorderQty: suggestedQty,
          status: lowest <= threshold ? "LOW STOCK" : "OK",
        };
      })
      .filter((r) => r && r.status === "LOW STOCK");

    return res.json(results);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Something went wrong" });
  }
};
