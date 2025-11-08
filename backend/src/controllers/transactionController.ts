import createHttpError from 'http-errors';
import { supabase } from '../config/database';
import { RequestHandler } from 'express';

export const getTransactions: RequestHandler = async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('Transaction')
            .select('*, User (FirstName, LastName)');
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

export const getTransactionAndItemsByID: RequestHandler = async (req, res, next) => {
    try {
        const id = req.params.id;
        const { data: transaction, error: txnError } = await supabase
            .from('Transaction')
            .select('*, User(FirstName, LastName)')
            .eq('TransactionID',id)
            .single();
        if (txnError) {
            throw createHttpError(404,'Transaction Not Found.');
        }
        const { data: items, error: itemsError } = await supabase
            .from('Transaction_Item')
            .select('*, Product(Name, Image, SellingPrice), Discount(DiscountPercent)')
            .eq('TransactionID',id);
        if (itemsError) throw itemsError;
        res.status(200).json({transaction, items});
    } catch (error) {
        next(error);
}};

export const getTransactionQtyMap: RequestHandler = async (req, res, next) => {
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
      next(err);
    }
  };
