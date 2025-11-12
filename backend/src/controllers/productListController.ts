import { supabase } from '../config/database';
import { RequestHandler } from 'express';


// get all product items
export const getProductList: RequestHandler = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('Product_Item')
            .select('*, Product (Name, Category, Brand, SellingPrice, Image)');
            if (error) throw error;             
            res.status(200).json(data);
        } catch (error) {   
            res.status(500).json({ message: 'Internal Server Error' });
    }
};

// get specific product item by its id
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

export const deleteProductItemByID: RequestHandler = async (req, res) => {
    try {
      const id = req.params.id;
      const {data, error} = await supabase
        .from('Product_Item')
        .update({ IsActive: false })
        .eq('ProductItemID',id);
      if (error) throw error
      console.log('Product deleted successfully');
      res.status(200).json({message:"Product deleted successfully", data});
    } catch (error) {
        res.status(500).json({message: "Internal Server Error"});
    }
  }