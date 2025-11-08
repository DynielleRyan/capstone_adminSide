import { supabase } from '../config/database';
import { RequestHandler } from 'express';


export const getProductItems: RequestHandler = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('Product_Item')
            .select('*, Product (Name, Category, Brand, SellingPrice, Image)');
            if (error) throw error;             
            res.status(200).json(data);
        } catch (error) {   
            console.error('Supabase error:', error);
            res.status(500).json({ message: error }); 
    }
};

export const getProductItemByID: RequestHandler = async (req, res) => {
    try {
        const id = req.params.id;
        const { data, error } = await supabase
            .from('Product_Item')
            .select('*, Product(Name, GenericName, Category, Brand, Image, SellingPrice, IsVATExemptYN)')
            .eq('ProductItemID',id)
            .single();
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });  
}};

