import { supabase } from '../config/database';
import { RequestHandler } from 'express';


// get all product items with pagination, filtering, and sorting
export const getProductList: RequestHandler = async (req, res) => {
    try {
        const { 
            page = '1', 
            limit = '50', 
            search, 
            category, 
            brand,
            minStock,
            maxStock,
            sortBy = 'Name',
            sortOrder = 'asc',
            onlyActive = 'true'
        } = req.query;

        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const offset = (pageNum - 1) * limitNum;

        // Build base query - fetch more items if filtering is needed (to account for post-filtering)
        const fetchLimit = (search || category || brand) ? limitNum * 3 : limitNum; // Fetch 3x if filtering to account for post-filtering
        
        let query = supabase
            .from('Product_Item')
            .select('*, Product (Name, GenericName, Category, Brand, SellingPrice, Image, IsVATExemptYN)');

        // Filter by active status
        if (onlyActive === 'true') {
            query = query.eq('IsActive', true);
        }

        // Apply stock filters
        if (minStock !== undefined) {
            query = query.gte('Stock', parseInt(minStock as string));
        }
        if (maxStock !== undefined) {
            query = query.lte('Stock', parseInt(maxStock as string));
        }

        // Apply sorting
        if (sortBy === 'Stock') {
            query = query.order('Stock', { ascending: sortOrder === 'asc' });
        } else if (sortBy === 'ExpiryDate') {
            query = query.order('ExpiryDate', { ascending: sortOrder === 'asc' });
        } else {
            // Default: sort by ProductItemID
            query = query.order('ProductItemID', { ascending: true });
        }

        // Fetch data (with larger limit if filtering)
        const { data, error } = await query.range(0, fetchLimit - 1);
        
        if (error) throw error;

        // Apply client-side filtering for search, category, brand (due to Supabase nested query limitations)
        let filteredData = data || [];
        
        if (search) {
            const searchTerm = (search as string).toLowerCase();
            filteredData = filteredData.filter((item: any) => {
                const product = item.Product;
                if (!product) return false;
                return (
                    product.Name?.toLowerCase().includes(searchTerm) ||
                    product.GenericName?.toLowerCase().includes(searchTerm) ||
                    product.Category?.toLowerCase().includes(searchTerm) ||
                    product.Brand?.toLowerCase().includes(searchTerm)
                );
            });
        }

        if (category) {
            filteredData = filteredData.filter((item: any) => 
                item.Product?.Category === category
            );
        }

        if (brand) {
            filteredData = filteredData.filter((item: any) => 
                item.Product?.Brand === brand
            );
        }

        // Apply Product Name sorting if needed
        if (sortBy === 'Name') {
            filteredData.sort((a: any, b: any) => {
                const nameA = a.Product?.Name || '';
                const nameB = b.Product?.Name || '';
                return sortOrder === 'asc' 
                    ? nameA.localeCompare(nameB)
                    : nameB.localeCompare(nameA);
            });
        }

        // Get total count for pagination (before applying pagination slice)
        const totalCount = filteredData.length;
        
        // Apply pagination to filtered data
        const paginatedData = filteredData.slice(offset, offset + limitNum);
        
        res.status(200).json({
            data: paginatedData,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitNum)
            }
        });
    } catch (error: any) {
        console.error('Error fetching product list:', error);
        res.status(500).json({ message: error?.message || 'Internal Server Error' });
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