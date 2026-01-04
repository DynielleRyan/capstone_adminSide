import { supabase } from '../config/database';
import { RequestHandler } from 'express';


// get all product items with pagination, filtering, and sorting
export const getProductList: RequestHandler = async (req, res) => {
    try {
        const { 
            page = '1', 
            limit = '5', 
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
            .select('*, Product (Name, GenericName, Category, Brand, SellingPrice, Image, IsVATExemptYN, Purchase_Order(OrderPlacedDateTime))');

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

        // Apply search filtering at database level
        // Note: Supabase doesn't support direct text search on nested relations,
        // so we need to filter by ProductID if search is provided
        let matchingProductIds: string[] | undefined = undefined;
        if (search) {
            const searchTerm = (search as string).toLowerCase();
            // First, get ProductIDs that match the search term
            const productSearchQuery = supabase
                .from('Product')
                .select('ProductID')
                .eq('IsActive', true)
                .or(`Name.ilike.%${searchTerm}%,GenericName.ilike.%${searchTerm}%,Category.ilike.%${searchTerm}%,Brand.ilike.%${searchTerm}%`);
            
            const { data: matchingProducts } = await productSearchQuery;
            matchingProductIds = matchingProducts?.map(p => p.ProductID) || [];
            
            if (matchingProductIds.length > 0) {
                // Filter Product_Items by matching ProductIDs
                if (productIdsToFilter && productIdsToFilter.length > 0) {
                    // Intersect with existing productIdsToFilter
                    const intersection = productIdsToFilter.filter(id => matchingProductIds!.includes(id));
                    if (intersection.length > 0) {
                        query = query.in('ProductID', intersection);
                        matchingProductIds = intersection; // Update for count calculation
                    } else {
                        // No matches, return empty result
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
                } else {
                    query = query.in('ProductID', matchingProductIds);
                }
            } else {
                // No matching products, return empty result
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
        
        const { data: queryData, error } = await query.range(offset, offset + limitNum - 1);
            if (error) throw error;
            data = queryData || [];
        

        // No client-side filtering needed - search is handled at database level
        let filteredData = data;


        filteredData = filteredData.map((item: any) => {
        const purchaseOrders = Array.isArray(item.Product?.Purchase_Order)
            ? item.Product.Purchase_Order
            : [];

        const lastPurchase = purchaseOrders.length > 0
            ? purchaseOrders.sort((a: any, b: any) =>
                new Date(b.OrderPlacedDateTime).getTime() -
                new Date(a.OrderPlacedDateTime).getTime()
            )[0]
            : null;

        return {
            ...item,
            LastPurchaseDate: lastPurchase?.OrderPlacedDateTime || null
            };
        });

        // Apply Product Name sorting if needed (client-side for now since we can't sort by nested field in Supabase)
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
            // If search was applied, we need to recalculate the count based on matching products
            if (search && matchingProductIds) {
                // We already have matchingProductIds from the search query above
                // Count Product_Items that match those ProductIDs
                let searchCountQuery = supabase
                    .from('Product_Item')
                    .select('ProductItemID', { count: 'exact', head: true })
                    .eq('IsActive', true)
                    .in('ProductID', matchingProductIds);
                
                // Apply additional filters
                if (minStock !== undefined) {
                    searchCountQuery = searchCountQuery.gte('Stock', parseInt(minStock as string));
                }
                if (maxStock !== undefined) {
                    searchCountQuery = searchCountQuery.lte('Stock', parseInt(maxStock as string));
                }
                
                const { count: searchCount } = await searchCountQuery;
                totalCount = searchCount || 0;
            } else if (!totalDbCount && filteredData.length > 0) {
                totalCount = filteredData.length;
            }
        }
        
        // Use filtered data
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