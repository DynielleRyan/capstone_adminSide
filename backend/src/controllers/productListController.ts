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
        // For category/brand filtering, we need to join with Product table
        let countQuery = supabase
            .from('Product_Item')
            .select('ProductID', { count: 'exact', head: true });

        if (onlyActive === 'true') {
            countQuery = countQuery.eq('IsActive', true);
        }

        if (minStock !== undefined) {
            countQuery = countQuery.gte('Stock', parseInt(minStock as string));
        }
        if (maxStock !== undefined) {
            countQuery = countQuery.lte('Stock', parseInt(maxStock as string));
        }

        // For category/brand, we'll need to fetch and filter (Supabase limitation)
        let totalDbCount = 0;
        if (category || brand) {
            // Fetch ProductIDs that match category/brand, then count matching Product_Items
            let productQuery = supabase
                .from('Product')
                .select('ProductID')
                .eq('IsActive', true);
            
            if (category) {
                productQuery = productQuery.eq('Category', category);
            }
            if (brand) {
                productQuery = productQuery.eq('Brand', brand);
            }
            
            const { data: matchingProducts } = await productQuery;
            const matchingProductIds = matchingProducts?.map(p => p.ProductID) || [];
            
            if (matchingProductIds.length > 0) {
                let itemCountQuery = supabase
                    .from('Product_Item')
                    .select('ProductItemID', { count: 'exact', head: true })
                    .in('ProductID', matchingProductIds)
                    .eq('IsActive', true);
                
                if (minStock !== undefined) {
                    itemCountQuery = itemCountQuery.gte('Stock', parseInt(minStock as string));
                }
                if (maxStock !== undefined) {
                    itemCountQuery = itemCountQuery.lte('Stock', parseInt(maxStock as string));
                }
                
                const { count } = await itemCountQuery;
                totalDbCount = count || 0;
            }
        } else {
            // No category/brand filter - use simple count
            const { count, error: countError } = await countQuery;
            if (countError) {
                console.error('Count query error:', countError);
            } else {
                totalDbCount = count || 0;
            }
        }

        // For category/brand filtering, first get matching ProductIDs, then filter Product_Items
        let productIdsToFilter: string[] | undefined = undefined;
        
        if (category || brand) {
            let productQuery = supabase
                .from('Product')
                .select('ProductID')
                .eq('IsActive', true);
            
            if (category) {
                productQuery = productQuery.eq('Category', category);
            }
            if (brand) {
                productQuery = productQuery.eq('Brand', brand);
            }
            
            const { data: matchingProducts } = await productQuery;
            productIdsToFilter = matchingProducts?.map(p => p.ProductID) || [];
            
            // If no products match, return empty result early
            if (productIdsToFilter.length === 0) {
                res.status(200).json({
                    data: [],
                    pagination: {
                        page: pageNum,
                        limit: limitNum,
                        total: 0,
                        totalPages: 0
                    }
                });
                return;
            }
        }

        // Build query with database-side filtering for better performance
        let query = supabase
            .from('Product_Item')
            .select('*, Product (Name, GenericName, Category, Brand, SellingPrice, Image, IsVATExemptYN)');

        // Filter by active status
        if (onlyActive === 'true') {
            query = query.eq('IsActive', true);
        }

        // Apply ProductID filter if category/brand filtering is active
        if (productIdsToFilter && productIdsToFilter.length > 0) {
            query = query.in('ProductID', productIdsToFilter);
        }

        // Apply stock filters
        if (minStock !== undefined) {
            query = query.gte('Stock', parseInt(minStock as string));
        }
        if (maxStock !== undefined) {
            query = query.lte('Stock', parseInt(maxStock as string));
        }

        // Apply sorting - for Name sorting, we'll need to handle it differently
        if (sortBy === 'Stock') {
            query = query.order('Stock', { ascending: sortOrder === 'asc' });
        } else if (sortBy === 'ExpiryDate') {
            query = query.order('ExpiryDate', { ascending: sortOrder === 'asc' });
        } else {
            // Default: sort by ProductItemID
            query = query.order('ProductItemID', { ascending: true });
        }

        // Fetch ALL products - no pagination limit when limit is very high (10000)
        // This ensures we get all products for the product list
        let data: any[];
        
        if (limitNum >= 10000) {
            // Fetch all products (no range limit)
            const { data: allData, error } = await query;
            if (error) throw error;
            data = allData || [];
        } else {
            // Normal pagination for other use cases
            const { data: paginatedData, error } = await query.range(offset, offset + limitNum - 1);
            if (error) throw error;
            data = paginatedData || [];
        }

        // Apply client-side filtering for search (works across all fetched products)
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

        // Apply Product Name sorting if needed (client-side for now)
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
        let totalCount = totalDbCount || 0;
        
        // If we fetched all products (limit >= 10000), use the actual filtered count
        if (limitNum >= 10000) {
            if (search) {
                // For search, use the filtered count
                totalCount = filteredData.length;
            } else {
                // For no search, use database count or actual data length
                totalCount = totalDbCount || filteredData.length;
            }
        } else {
            // For paginated requests, use database count
            if (search) {
                // Estimate based on filter ratio
                if (data && data.length > 0 && totalDbCount) {
                    const filterRatio = filteredData.length / data.length;
                    totalCount = Math.max(filteredData.length, Math.ceil(totalDbCount * filterRatio));
                } else {
                    totalCount = filteredData.length;
                }
            } else if (!totalDbCount && filteredData.length > 0) {
                totalCount = filteredData.length;
            }
        }
        
        // Use filtered data (no pagination when fetching all)
        const paginatedData = filteredData;
        
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