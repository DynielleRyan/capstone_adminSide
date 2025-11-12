import { supabase } from '../config/database';
import { RequestHandler } from 'express';

// get all purchase orders
export const getPurchaseOrders: RequestHandler = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('Purchase_Order')
            .select('*, Product(Name, Image), Supplier(Name)');
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

//get specific purchase oder by its id
export const getPurchaseOrderByID: RequestHandler = async (req, res) => {
    try {
        const id = req.params.id;
        const { data, error } = await supabase
            .from('Purchase_Order')
            .select('*, Product(Name, Image), Supplier(Name)')
            .eq('PurchaseOrderID',id)
            .single();
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });  
}};

// get all existing products to create a purchase order
export const getProducts: RequestHandler = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('Product')
            .select('*, Supplier(Name)');
            if (error) throw error;             
            res.status(200).json(data);
        } catch (error) {   
            console.error('Supabase error:', error);
            res.status(500).json({ message: error }); 
    }
};

// create a new purchase order
export const createPurchaseOrder: RequestHandler = async (req, res) => {
    try {
        const order = req.body;
        const { data, error } = await supabase
            .from('Purchase_Order')
            .insert([order])
        if (error) throw error;
            console.log('Purchase Order created successfully');
            res.status(200).json(data);
         } catch (error) {
            console.error('Error creating purchase order:', error); // Add this
            res.status(500).json({ message: 'Internal Server Error' });
        }
};

// edit a specific purchase order's details
export const updatePurchaseOrder: RequestHandler = async (req, res) => {
    try {
      const id = req.params.id;
      const orderupdate = req.body;
      const {data, error} = await supabase
        .from('Purchase_Order')
        .update([orderupdate])
        .eq('PurchaseOrderID',id);
      if (error) throw error
      console.log('Purchase Order updated successfully');
        res.json(data);
    } catch (error) {
        res.status(500).json({message: "Internal Server Error"});
    }
  }
