import { supabase } from '../config/database';
import { RequestHandler } from 'express';

export const getTransactions: RequestHandler = async (req, res) => {
    try {
        const { data, error } = await supabase.from('Transaction').select('*');
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({message: "Internal Server Error"});
    }
};

export const getTransactionAndItemsByID: RequestHandler = async (req, res) => {
    try {
        const id = '4a94f05e-0d45-44ef-b244-d0ddffc2deb8';
        const { data: transaction, error: txnError } = await supabase.from('Transaction').select('*').eq('TransactionID',id).single();
        if (txnError) throw txnError;
        const { data: items, error: itemsError } = await supabase.from('Transaction_Item').select('*').eq('TransactionID',id);
        if (itemsError) throw itemsError;
        res.status(200).json({transaction, items});
    } catch (error) {
        res.status(500).json({message: "Internal Server Error"});
}};

// export const getTransactionItemsByID: RequestHandler = async (req, res) => {
//     try {
//         const id = '4a94f05e-0d45-44ef-b244-d0ddffc2deb8';
//         const { data, error } = await supabase.from('Transaction_Item').select('*').eq('TransactionID',id);
//         if (error) throw error;
//         res.status(200).json(data);
//     } catch (error) {
//         res.status(500).json({message: "Internal Server Error"});
//     }
// };

