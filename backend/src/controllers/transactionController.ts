import { supabase } from '../config/database';
import { RequestHandler } from 'express';


// get all transactions
export const getTransactions: RequestHandler = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('Transaction')
            .select('*, User (FirstName, LastName)');
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// get specific transaction by its id and all transaction items under it
export const getTransactionAndItemsByID: RequestHandler = async (req, res) => {
    try {
        const id = req.params.id;
        const { data: transaction, error: txnError } = await supabase
            .from('Transaction')
            .select('*, User(FirstName, LastName)')
            .eq('TransactionID',id)
            .single();
        if (txnError) {
            res.status(404).json({success: false, message: 'Transaction Not Found.'});
        }
        const { data: items, error: itemsError } = await supabase
            .from('Transaction_Item')
            .select('*, Product(Name, Image, SellingPrice, IsVATExemptYN, VATAmount), Discount(DiscountPercent, Name)')
            .eq('TransactionID',id);
        if (itemsError) throw itemsError;
        res.status(200).json({transaction, items});
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }};


// get quantity of all transaction items per transaction
export const getTransactionQtyMap: RequestHandler = async (req, res) => {
    try {
      const ids = (req.query.ids as string | undefined)?.split(','); // optional filter
  
      let query = supabase
        .from('Transaction_Item')
        .select('TransactionID, Quantity');
  
      if (ids?.length) query = query.in('TransactionID', ids);
  
      const { data, error } = await query;
      if (error) throw error;
  
      const qtyMap = data.reduce<Record<string, number>>((acc, row) => {
        acc[row.TransactionID] = (acc[row.TransactionID] ?? 0) + row.Quantity;
        return acc;
      }, {});
  
      res.status(200).json(qtyMap);
    } catch (err) {
        res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Get detailed transactions for report generation (day/week/month/year)
export const getDetailedTransactionsForReport: RequestHandler = async (req, res) => {
  try {
    const { period, periodType, date, week, month, year } = req.query;
    
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    
    // Determine date range based on period type
    if (periodType === 'day' && date) {
      startDate = new Date(date as string);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(date as string);
      endDate.setHours(23, 59, 59, 999);
    } else if (periodType === 'week' && week && month && year) {
      // Calculate week start (Monday) and end (Sunday)
      const monthNum = Number(month) - 1; // 0-indexed
      const weekNum = Number(week);
      const yearNum = Number(year);
      
      // Get first day of month
      const firstDay = new Date(yearNum, monthNum, 1);
      const firstMonday = new Date(firstDay);
      const dayOfWeek = firstDay.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      firstMonday.setDate(firstDay.getDate() + daysToMonday);
      
      // Calculate start of requested week
      startDate = new Date(firstMonday);
      startDate.setDate(firstMonday.getDate() + (weekNum - 1) * 7);
      startDate.setHours(0, 0, 0, 0);
      
      // End of week (Sunday)
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else if (periodType === 'month' && month && year) {
      const monthNum = Number(month) - 1; // 0-indexed
      const yearNum = Number(year);
      startDate = new Date(yearNum, monthNum, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(yearNum, monthNum + 1, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (periodType === 'year' && year) {
      const yearNum = Number(year);
      startDate = new Date(yearNum, 0, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(yearNum, 11, 31);
      endDate.setHours(23, 59, 59, 999);
    }
    
    // Validate that dates were set
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Invalid parameters for report generation' });
    }

    // Get all transactions for the period
    const { data: transactions, error: txnError } = await supabase
      .from('Transaction')
      .select('*, User(FirstName, LastName)')
      .gte('OrderDateTime', startDate.toISOString())
      .lte('OrderDateTime', endDate.toISOString())
      .order('OrderDateTime', { ascending: true });

    if (txnError) throw txnError;

    if (!transactions || transactions.length === 0) {
      return res.status(200).json({ transactions: [], items: [] });
    }

    // Get all transaction IDs
    const transactionIds = transactions.map(t => t.TransactionID);

    // Get all items for these transactions
    const { data: items, error: itemsError } = await supabase
      .from('Transaction_Item')
      .select('*, Product(Name, Category, Brand, SellingPrice), Discount(DiscountPercent, Name)')
      .in('TransactionID', transactionIds)
      .order('TransactionID', { ascending: true });

    if (itemsError) throw itemsError;

    return res.status(200).json({ 
      transactions, 
      items: items || [],
      period: {
        type: periodType,
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || 'Internal Server Error' });
  }
};
