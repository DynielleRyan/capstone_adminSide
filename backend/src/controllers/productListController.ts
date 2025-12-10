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

        // First, get total count from database (for accurate pagination)
        // Use count with the same filters as the main query
        let countQuery = supabase
            .from('Product_Item')
            .select('*', { count: 'exact', head: true });

        if (onlyActive === 'true') {
            countQuery = countQuery.eq('IsActive', true);
        }

        if (minStock !== undefined) {
            countQuery = countQuery.gte('Stock', parseInt(minStock as string));
        }
        if (maxStock !== undefined) {
            countQuery = countQuery.lte('Stock', parseInt(maxStock as string));
        }

        const { count: totalDbCount, error: countError } = await countQuery;
        if (countError) {
            console.error('Count query error:', countError);
            // Fallback: continue without accurate count
        }

        // For client-side filtering (search, category, brand), we need to fetch a larger batch
        // Calculate how many items we need to fetch to cover the requested page after filtering
        const needsClientFiltering = !!(search || category || brand);
        
        let fetchOffset: number;
        let fetchLimit: number;
        
        if (needsClientFiltering) {
            // When filtering, fetch a larger batch from an earlier offset to account for filtered items
            const fetchMultiplier = 5; // Fetch 5x to ensure we have enough after filtering
            fetchLimit = limitNum * fetchMultiplier;
            fetchOffset = Math.max(0, offset - (limitNum * 2)); // Start 2 pages earlier
        } else {
            // No filtering needed - fetch exactly what's requested
            fetchOffset = offset;
            fetchLimit = limitNum;
        }
        
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

        // Fetch data with calculated offset and limit
        const { data, error } = await query.range(fetchOffset, fetchOffset + fetchLimit - 1);
        
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

        // Calculate total count
        // If no client-side filtering, use database count directly
        // If client-side filtering is used, we need to estimate (can't get exact count without fetching all)
        let totalCount = totalDbCount || 0;
        
        // If we have client-side filtering, estimate based on filter ratio
        // This is an approximation - for exact count, we'd need to fetch all items
        if (needsClientFiltering && data && data.length > 0 && totalDbCount) {
            const filterRatio = filteredData.length / data.length;
            totalCount = Math.max(filteredData.length, Math.ceil(totalDbCount * filterRatio));
        } else if (!totalDbCount && filteredData.length > 0) {
            // Fallback: if count query failed, use filtered data length as minimum
            totalCount = filteredData.length;
        }
        
        // Apply pagination to filtered data
        // If we fetched from an earlier offset (due to filtering), adjust the slice
        const sliceOffset = needsClientFiltering ? (offset - fetchOffset) : 0;
        const paginatedData = filteredData.slice(sliceOffset, sliceOffset + limitNum);
        
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