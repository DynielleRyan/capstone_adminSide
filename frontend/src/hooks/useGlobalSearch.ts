import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import api from '../services/api';

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  path?: string;
  data?: any;
}

const MAX_RESULTS_PER_CATEGORY = 5;
const MAX_TOTAL_RESULTS = 20;

export const useGlobalSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const location = useLocation();
  const navigate = useNavigate();
  const { isPharmacist } = useAuth();

  // Clear search when navigating
  useEffect(() => {
    setSearchQuery('');
    setShowResults(false);
    setSearchResults([]);
    setSelectedIndex(-1);
  }, [location.pathname]);

  // Perform search based on current context
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const performSearch = async () => {
      setIsSearching(true);
      try {
        const query = searchQuery.toLowerCase();
        const results: SearchResult[] = [];

        if (isPharmacist) {
          // Pharmacist searches
          await searchPharmacistData(query, results);
        } else {
          // Admin/Clerk searches
          await searchAdminData(query, results);
        }

        // Limit total results
        const limitedResults = results.slice(0, MAX_TOTAL_RESULTS);
        setSearchResults(limitedResults);
        setShowResults(true);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, isPharmacist]);

  const searchPharmacistData = async (query: string, results: SearchResult[]) => {
    // Search in product list
    try {
      console.log('[SEARCH] Searching pharmacist products for:', query);
      
      const response = await api.get('/product-list');

      if (!response.data.success) {
        console.error('[SEARCH] Product list API error:', response.status);
        return;
      }
      
      const data = response.data.data;
      console.log('[SEARCH] Product list API response:', data);
      console.log('[SEARCH] Is array?', Array.isArray(data));
      
      // The API returns the array directly, not wrapped in {success, data}
      if (Array.isArray(data)) {
        console.log('[SEARCH] Processing', data.length, 'products');
        let count = 0;
        let matchCount = 0;
        data.forEach((item: any) => {
          if (count >= MAX_RESULTS_PER_CATEGORY) return;
          
          // Check if product is active
          if (!item.IsActive) return;
          
          const nameMatch = item.Product?.Name?.toLowerCase().includes(query);
          const brandMatch = item.Product?.Brand?.toLowerCase().includes(query);
          const categoryMatch = item.Product?.Category?.toLowerCase().includes(query);
          const genericMatch = item.Product?.GenericName?.toLowerCase().includes(query);
          const idMatch = item.ProductItemID?.toLowerCase().includes(query);
          
          if (nameMatch || brandMatch || categoryMatch || genericMatch || idMatch) {
            matchCount++;
            console.log('[SEARCH] Match found:', item.Product?.Name, {
              nameMatch, brandMatch, categoryMatch, genericMatch, idMatch
            });
            results.push({
              id: item.ProductItemID,
              title: item.Product?.Name || 'Unknown Product',
              subtitle: `${item.Product?.Brand || 'Unknown'} - ${item.Product?.Category || 'Unknown'} (Stock: ${item.Stock || 0})`,
              category: 'Product',
              path: `/pharmacist/products/list`,
              data: item
            });
            count++;
          }
        });
        console.log('[SEARCH] Found', matchCount, 'matches, added', count, 'results');
      } else {
        console.error('[SEARCH] Data is not an array:', typeof data);
      }
    } catch (error) {
      console.error('[SEARCH] Error searching products:', error);
    }
  };

  const searchAdminData = async (query: string, results: SearchResult[]) => {
    // Search transactions
    try {
      const response = await api.get('/transactions');
      console.log('[SEARCH] Transaction API response:', response.data);
      
      // Transactions API returns array directly
      const data = response.data;
      if (Array.isArray(data)) {
        let count = 0;
        data.forEach((transaction: any) => {
          if (count >= MAX_RESULTS_PER_CATEGORY) return;
          
          if (
            transaction.TransactionID?.toLowerCase().includes(query) ||
            transaction.PaymentMethod?.toLowerCase().includes(query) ||
            transaction.User?.FirstName?.toLowerCase().includes(query) ||
            transaction.User?.LastName?.toLowerCase().includes(query)
          ) {
            results.push({
              id: transaction.TransactionID,
              title: `Transaction ${transaction.TransactionID}`,
              subtitle: `${transaction.PaymentMethod} - ₱${transaction.Total?.toFixed(2) || '0.00'} - ${transaction.User?.FirstName || ''} ${transaction.User?.LastName || ''}`,
              category: 'Transaction',
              path: '/transactions',
              data: transaction
            });
            count++;
          }
        });
      }
    } catch (error) {
      console.error('Error searching transactions:', error);
    }

    // Search suppliers
    try {
      const response = await api.get('/suppliers', {
        params: { limit: 100 }
      });
      
      const data = response.data;
      if (data.success && Array.isArray(data.data?.suppliers)) {
        let count = 0;
        data.data.suppliers.forEach((supplier: any) => {
          if (count >= MAX_RESULTS_PER_CATEGORY) return;
          
          // Only show active suppliers
          if (supplier.IsActiveYN === false) return;
          
          if (
            supplier.Name?.toLowerCase().includes(query) ||
            supplier.ContactPerson?.toLowerCase().includes(query) ||
            supplier.Email?.toLowerCase().includes(query)
          ) {
            results.push({
              id: supplier.SupplierID,
              title: supplier.Name,
              subtitle: `Contact: ${supplier.ContactPerson || 'N/A'} - ${supplier.Email || 'N/A'}`,
              category: 'Supplier',
              path: '/suppliers',
              data: supplier
            });
            count++;
          }
        });
      }
    } catch (error) {
      console.error('Error searching suppliers:', error);
    }

    // Search purchase orders
    try {
      const response = await api.get('/purchase-orders');
      
      // Purchase orders API returns array directly
      const data = response.data;
      if (Array.isArray(data)) {
        let count = 0;
        data.forEach((po: any) => {
          if (count >= MAX_RESULTS_PER_CATEGORY) return;
          
          if (
            po.PurchaseOrderID?.toLowerCase().includes(query) ||
            po.Supplier?.Name?.toLowerCase().includes(query) ||
            po.Product?.Name?.toLowerCase().includes(query)
          ) {
            results.push({
              id: po.PurchaseOrderID,
              title: `PO ${po.PurchaseOrderID}`,
              subtitle: `${po.Supplier?.Name || 'Unknown Supplier'} - ${po.Product?.Name || 'Unknown Product'}`,
              category: 'Purchase Order',
              path: `/purchase-orders/${po.PurchaseOrderID}`,
              data: po
            });
            count++;
          }
        });
      }
    } catch (error) {
      console.error('Error searching purchase orders:', error);
    }

    // Search users
    try {
      const response = await api.get('/users', {
        params: { limit: 100 }
      });
      
      const data = response.data;
      if (data.success && Array.isArray(data.data?.users)) {
        let count = 0;
        data.data.users.forEach((user: any) => {
          if (count >= MAX_RESULTS_PER_CATEGORY) return;
          
          // Only show active users
          if (user.IsActive === false) return;
          
          if (
            user.FirstName?.toLowerCase().includes(query) ||
            user.LastName?.toLowerCase().includes(query) ||
            user.Email?.toLowerCase().includes(query) ||
            user.Username?.toLowerCase().includes(query) ||
            user.Roles?.toLowerCase().includes(query)
          ) {
            results.push({
              id: user.UserID,
              title: `${user.FirstName} ${user.LastName}`,
              subtitle: `${user.Roles} - ${user.Email}`,
              category: 'User',
              path: '/role-management',
              data: user
            });
            count++;
          }
        });
      }
    } catch (error) {
      console.error('Error searching users:', error);
    }

    // Search products
    try {
      const response = await api.get('/products/source-list', {
        params: { limit: 100 }
      });
      
      const data = response.data;
      if (data.success && Array.isArray(data.data?.products)) {
        let count = 0;
        data.data.products.forEach((product: any) => {
          if (count >= MAX_RESULTS_PER_CATEGORY) return;
          
          if (
            product.ProductName?.toLowerCase().includes(query) ||
            product.SupplierName?.toLowerCase().includes(query) ||
            product.ProductID?.toLowerCase().includes(query)
          ) {
            results.push({
              id: product.ProductID,
              title: product.ProductName,
              subtitle: `Supplier: ${product.SupplierName} - Stock: ${product.TotalStock || 0}`,
              category: 'Product',
              path: '/product-source-list',
              data: product
            });
            count++;
          }
        });
      }
    } catch (error) {
      console.error('Error searching products:', error);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    if (result.path) {
      navigate(result.path);
      setSearchQuery('');
      setShowResults(false);
      setSelectedIndex(-1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          handleResultClick(searchResults[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowResults(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchResults]);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    showResults,
    setShowResults,
    selectedIndex,
    handleResultClick,
    handleKeyDown,
  };
};

