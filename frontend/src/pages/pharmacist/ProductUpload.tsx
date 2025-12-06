import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import alertService from "../../services/alertService";
import { authService } from "../../services/authService";
import {
  productService,
  CreateProductData,
} from "../../services/productService";
import { productItemService } from "../../services/productItemService";
import { searchProductByName } from "../../services/productListService";
import { ProductItem } from "../../types/productItem";
import api from "../../services/api";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface ProductFormData {
  name: string;
  genericName: string;
  brand: string;
  category: string;
  price: string;
  quantity: string;
  expiry: string;
  prescription: string;
  vatExempted: string;
  seniorPWD: string;
  supplierID: string;
  image: File | null;
  imageBase64: string | null;
}

const ProductUpload = () => {
  const [showForm, setShowForm] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState<
    Array<{ SupplierID: string; Name: string }>
  >([]);
  const [searchResults, setSearchResults] = useState<ProductItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [isAddingBatch, setIsAddingBatch] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    genericName: "",
    brand: "",
    category: "--Select--",
    price: "",
    quantity: "",
    expiry: "",
    prescription: "--Select--",
    vatExempted: "--Select--",
    seniorPWD: "--Select--",
    supplierID: "--Select--",
    image: null,
    imageBase64: null,
  });

  // Fetch suppliers on component mount
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const response = await api.get("/suppliers?isActive=true&limit=100");
        if (response.data.success && response.data.data) {
          setSuppliers(response.data.data.suppliers);
        }
      } catch (error) {
        console.error("Error fetching suppliers:", error);
      }
    };
    fetchSuppliers();
  }, []);

  const handleInputChange = (field: keyof ProductFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFieldBlur = (field: string) => {
    setTouchedFields(prev => new Set(prev).add(field));
  };

  const isFieldInvalid = (field: keyof ProductFormData): boolean => {
    if (!touchedFields.has(field)) return false;
    
    const value = formData[field];
    
    // Check if it's empty or default select value
    if (!value || value === "" || value === "--Select--") {
      return true;
    }
    
    return false;
  };

  const getFieldClassName = (field: keyof ProductFormData, baseClass: string): string => {
    if (isFieldInvalid(field)) {
      return `${baseClass} border-red-500 focus:ring-red-500`;
    }
    return baseClass;
  };

  const getMissingFieldsForDisplay = (): string[] => {
    if (isAddingBatch) {
      const missing: string[] = [];
      if (!formData.quantity) missing.push("Quantity");
      if (!formData.expiry) missing.push("Expiry Date");
      return missing;
    }
    
    const missing: string[] = [];
    if (!formData.name) missing.push("Product Name");
    if (!formData.genericName) missing.push("Generic Name");
    if (!formData.brand) missing.push("Brand");
    if (!formData.price) missing.push("Price");
    if (!formData.quantity) missing.push("Quantity");
    if (!formData.expiry) missing.push("Expiry Date");
    if (formData.category === "--Select--") missing.push("Category");
    if (formData.prescription === "--Select--") missing.push("Prescription");
    if (formData.vatExempted === "--Select--") missing.push("VAT Exempted");
    if (formData.seniorPWD === "--Select--") missing.push("Senior/PWD");
    if (formData.supplierID === "--Select--") missing.push("Supplier");
    return missing;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        alertService.error("Please select a valid image file");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alertService.error("Image size should be less than 5MB");
        return;
      }

      // Create preview and store base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        setFormData((prev) => ({
          ...prev,
          image: file,
          imageBase64: base64String,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Comprehensive validation with detailed feedback
    const missingFields: string[] = [];
    
    if (!formData.name) missingFields.push("Product Name");
    if (!formData.genericName) missingFields.push("Generic Name");
    if (!formData.brand) missingFields.push("Brand");
    if (!formData.price) missingFields.push("Price");
    if (!formData.quantity) missingFields.push("Quantity");
    if (!formData.expiry) missingFields.push("Expiry Date");
    if (formData.category === "--Select--") missingFields.push("Category");
    if (formData.prescription === "--Select--") missingFields.push("Prescription");
    if (formData.vatExempted === "--Select--") missingFields.push("VAT Exempted");
    if (formData.seniorPWD === "--Select--") missingFields.push("Senior/PWD");
    if (formData.supplierID === "--Select--") missingFields.push("Supplier");

    // Show all missing fields at once
    if (missingFields.length > 0) {
      const fieldsList = missingFields.join(", ");
      alertService.error(`Please fill in the following required fields: ${fieldsList}`);
      return;
    }

    // Additional validations
    if (parseFloat(formData.price) <= 0) {
      alertService.error("Price must be greater than 0");
      return;
    }

    if (parseInt(formData.quantity) <= 0) {
      alertService.error("Quantity must be greater than 0");
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current user
      const currentUser = authService.getStoredUser();
      if (!currentUser || !currentUser.UserID) {
        alertService.error("User not authenticated");
        setIsSubmitting(false);
        return;
      }

      // Upload image if provided
      let imageUrl = null;
      if (formData.image && formData.imageBase64) {
        try {
          const uploadResponse = await productService.uploadImage(
            formData.image,
            formData.imageBase64
          );
          if (uploadResponse.success && uploadResponse.data) {
            imageUrl = uploadResponse.data.imageUrl;
          } else {
            alertService.warning(
              "Failed to upload image, product will be created without image"
            );
          }
        } catch (error) {
          console.error("Error uploading image:", error);
          alertService.warning(
            "Failed to upload image, product will be created without image"
          );
        }
      }

      // Calculate VAT amount (12% if not VAT exempted)
      const sellingPrice = parseFloat(formData.price);
      const isVATExempt = formData.vatExempted === "Yes";
      const vatAmount = isVATExempt ? 0 : sellingPrice * 0.12;

      // Prepare product data
      const productData: CreateProductData = {
        UserID: currentUser.UserID,
        SupplierID: formData.supplierID,
        Name: formData.name,
        GenericName: formData.genericName,
        Category: formData.category,
        Brand: formData.brand,
        Image: imageUrl,
        SellingPrice: sellingPrice,
        IsVATExemptYN: isVATExempt,
        VATAmount: vatAmount,
        PrescriptionYN: formData.prescription === "Yes",
        IsActive: true,
      };

      // Create product using product service
      const response = await productService.createProduct(productData);

      if (response.success && response.data && response.data.ProductID) {
        // Create Product_Item for inventory tracking
        try {
          const productItemResponse =
            await productItemService.createProductItem({
              ProductID: response.data.ProductID,
              UserID: currentUser.UserID,
              Stock: parseInt(formData.quantity),
              ExpiryDate: formData.expiry,
              IsActive: true,
            });

          if (productItemResponse.success) {
            alertService.success("Product and inventory added successfully!");
          } else {
            alertService.warning(
              "Product created but inventory tracking failed"
            );
          }
        } catch (inventoryError) {
          console.error("Error creating product inventory:", inventoryError);
          alertService.warning("Product created but inventory tracking failed");
        }

        // Reset form
        setFormData({
          name: "",
          genericName: "",
          brand: "",
          category: "--Select--",
          price: "",
          quantity: "",
          expiry: "",
          prescription: "--Select--",
          vatExempted: "--Select--",
          seniorPWD: "--Select--",
          supplierID: "--Select--",
          image: null,
          imageBase64: null,
        });
        setImagePreview(null);
        setTouchedFields(new Set());
        setShowForm(false);
      } else {
        alertService.error(response.message || "Failed to add product");
      }
    } catch (error: any) {
      console.error("Error creating product:", error);
      alertService.error(
        error.response?.data?.message || "Failed to add product"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearch = async () => {
    if (!searchName.trim()) {
      alertService.error("Please enter a product name to search");
      return;
    }

    try {
      const results = await searchProductByName(searchName);
      if (results.length > 0) {
        // Get unique products by ProductID
        const uniqueProducts = results.reduce((acc, item) => {
          if (!acc.find(p => p.ProductID === item.ProductID)) {
            acc.push(item);
          }
          return acc;
        }, [] as ProductItem[]);
        
        setSearchResults(uniqueProducts);
        if (uniqueProducts.length === 1) {
          // If only one product found, auto-select it
          setSelectedProduct(uniqueProducts[0]);
          setIsAddingBatch(true);
        }
      } else {
        alertService.info("No existing product found. You can create a new one.");
        setSearchResults([]);
        setShowForm(true);
        setFormData(prev => ({ ...prev, name: searchName }));
      }
    } catch (error) {
      console.error("Error searching product:", error);
      alertService.error("Failed to search product");
    }
  };

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct) {
      alertService.error("No product selected");
      return;
    }

    // Validation for batch addition
    const missingFields: string[] = [];
    
    if (!formData.quantity) missingFields.push("Quantity");
    if (!formData.expiry) missingFields.push("Expiry Date");

    if (missingFields.length > 0) {
      const fieldsList = missingFields.join(", ");
      alertService.error(`Please fill in the following required fields: ${fieldsList}`);
      return;
    }

    // Additional validations
    if (parseInt(formData.quantity) <= 0) {
      alertService.error("Quantity must be greater than 0");
      return;
    }

    setIsSubmitting(true);

    try {
      const currentUser = authService.getStoredUser();
      if (!currentUser || !currentUser.UserID) {
        alertService.error("User not authenticated");
        setIsSubmitting(false);
        return;
      }

      // Create new batch (Product_Item) for existing product
      const productItemResponse = await productItemService.createProductItem({
        ProductID: selectedProduct.ProductID,
        UserID: currentUser.UserID,
        Stock: parseInt(formData.quantity),
        ExpiryDate: formData.expiry,
        IsActive: true,
      });

      if (productItemResponse.success) {
        alertService.success("New batch added successfully!");
        
        // Reset form and states
        setFormData({
          name: "",
          genericName: "",
          brand: "",
          category: "--Select--",
          price: "",
          quantity: "",
          expiry: "",
          prescription: "--Select--",
          vatExempted: "--Select--",
          seniorPWD: "--Select--",
          supplierID: "--Select--",
          image: null,
          imageBase64: null,
        });
        setSearchName("");
        setSearchResults([]);
        setSelectedProduct(null);
        setIsAddingBatch(false);
        setTouchedFields(new Set());
      } else {
        alertService.error(productItemResponse.message || "Failed to add batch");
      }
    } catch (error: any) {
      console.error("Error adding batch:", error);
      alertService.error(
        error.response?.data?.message || "Failed to add batch"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectProduct = (product: ProductItem) => {
    setSelectedProduct(product);
    setIsAddingBatch(true);
    setSearchResults([]);
    setShowForm(true);
    
    // Pre-fill form with product data (these will be read-only)
    setFormData({
      name: product.Product.Name,
      genericName: product.Product.GenericName,
      brand: product.Product.Brand,
      category: product.Product.Category,
      price: product.Product.SellingPrice.toString(),
      quantity: "",
      expiry: "",
      prescription: "--Select--",
      vatExempted: product.Product.IsVATExemptYN ? "Yes" : "No",
      seniorPWD: "--Select--",
      supplierID: "--Select--",
      image: null,
      imageBase64: null,
    });
    
    // Set image preview if exists
    if (product.Product.Image) {
      setImagePreview(product.Product.Image);
    }
  };

  const handleCancelBatch = () => {
    setIsAddingBatch(false);
    setSelectedProduct(null);
    setSearchResults([]);
    setShowForm(false);
    setImagePreview(null);
    setTouchedFields(new Set());
    setFormData({
      name: "",
      genericName: "",
      brand: "",
      category: "--Select--",
      price: "",
      quantity: "",
      expiry: "",
      prescription: "--Select--",
      vatExempted: "--Select--",
      seniorPWD: "--Select--",
      supplierID: "--Select--",
      image: null,
      imageBase64: null,
    });
  };

  return (
    <div className="p-6 space-y-8">
      <ToastContainer />
      {!showForm ? (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-blue-900">Product Upload</h1>
          </div>

          {/* Search Section */}
          <div className="mb-6">
            <div className="flex items-center gap-4 max-w-2xl">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  NAME
                </label>
                <input
                  type="text"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search product..."
                />
              </div>
              <button
                onClick={handleSearch}
                className="mt-7 bg-blue-900 text-white px-6 py-2 rounded-md hover:bg-blue-500 transition-colors font-medium"
              >
                SEARCH
              </button>
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <>
              {/* Simple Table */}
              <div className="bg-white border border-gray-300">
                {/* Table Headers */}
                <div className="grid grid-cols-7 items-center gap-4 p-3 bg-blue-900 border-b border-blue-900">
                  <div className="text-white font-semibold text-sm text-center">#</div>
                  <div className="text-white font-semibold text-sm text-center">PRODUCT</div>
                  <div className="text-white font-semibold text-sm text-center">CATEGORY</div>
                  <div className="text-white font-semibold text-sm text-center">BRAND</div>
                  <div className="text-white font-semibold text-sm text-center">PRICE</div>
                  <div className="text-white font-semibold text-sm text-center">STOCK</div>
                  <div className="text-white font-semibold text-sm text-center">EXPIRY DATE</div>
                </div>

                {/* Table Rows */}
                {searchResults.map((product, index) => (
                  <div key={product.ProductItemID}>
                    <div className="grid grid-cols-7 items-center gap-4 p-3 border-b border-gray-200">
                      <div className="text-gray-600 text-sm text-center">
                        {(index + 1).toString().padStart(2, '0')}
                      </div>
                      <div className="flex items-center gap-2">
                        {product.Product.Image ? (
                          <img
                            src={product.Product.Image}
                            alt={product.Product.Name}
                            className="w-10 h-10 object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-600 text-xs font-semibold">
                              {product.Product.Name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <span className="text-gray-800 text-sm">{product.Product.Name}</span>
                      </div>
                      <div className="text-gray-600 text-sm text-center">{product.Product.Category}</div>
                      <div className="text-gray-600 text-sm text-center">{product.Product.Brand}</div>
                      <div className="text-gray-800 text-sm text-center">₱{product.Product.SellingPrice.toFixed(2)}</div>
                      <div className="text-gray-600 text-sm text-center">{product.Stock}</div>
                      <div className="text-gray-600 text-sm text-center">
                        {new Date(product.ExpiryDate).toLocaleDateString('en-US', {
                          month: '2-digit',
                          day: '2-digit',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                    
                    {/* Add New Batch Button */}
                    <div className="p-3 bg-gray-50 border-b border-gray-300">
                      <div className="flex justify-center">
                        <button
                          onClick={() => handleSelectProduct(product)}
                          className="px-6 py-2 bg-blue-900 text-white text-sm hover:bg-blue-500 transition-colors font-medium"
                        >
                          Add New Batch
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Item Box After Search Results */}
              <div className="mt-6 border-2 border-dashed border-gray-300 rounded-lg p-12 flex flex-col items-center justify-center hover:border-blue-400 transition-colors">
                <button
                  onClick={() => setShowForm(true)}
                  className="flex flex-col items-center gap-4 text-gray-400 hover:text-blue-600 transition-colors group"
                >
                  <Plus className="w-16 h-16 group-hover:scale-110 transition-transform" />
                  <span className="text-lg font-medium">ADD NEW ITEM</span>
                </button>
              </div>
            </>
          )}

          {/* Add New Item Box */}
          {searchResults.length === 0 && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-24 flex flex-col items-center justify-center hover:border-blue-400 transition-colors">
              <button
                onClick={() => setShowForm(true)}
                className="flex flex-col items-center gap-4 text-gray-400 hover:text-blue-600 transition-colors group"
              >
                <Plus className="w-24 h-24 group-hover:scale-110 transition-transform" />
                <span className="text-xl font-medium">ADD NEW ITEM</span>
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-blue-900">
              {isAddingBatch ? "Add New Batch" : "Product Upload"}
            </h1>
          </div>

          {/* Missing Fields Warning Banner */}
          {touchedFields.size > 0 && getMissingFieldsForDisplay().length > 0 && (
            <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <span className="font-medium">Missing required fields ({getMissingFieldsForDisplay().length}):</span>
                    {" "}{getMissingFieldsForDisplay().join(", ")}
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={isAddingBatch ? handleAddBatch : handleSubmit} className="bg-blue-50 rounded-lg p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-6">
              {/* Image Upload Section */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Upload Image
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload"
                    disabled={isAddingBatch}
                  />
                  <label
                    htmlFor={isAddingBatch ? "" : "image-upload"}
                    className={`block w-full h-64 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden ${
                      isAddingBatch 
                        ? "cursor-default" 
                        : "cursor-pointer hover:border-blue-400 transition-colors"
                    }`}
                  >
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <Plus className="w-16 h-16 mb-2" />
                        <span className="text-sm">
                          {isAddingBatch ? "No Image" : "Click to upload"}
                        </span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Product Name */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Product Name: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  onBlur={() => handleFieldBlur("name")}
                  placeholder="Enter name"
                  className={getFieldClassName("name", "w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed")}
                  disabled={isAddingBatch}
                  required
                />
                {isFieldInvalid("name") && !isAddingBatch && (
                  <p className="mt-1 text-sm text-red-600">Product name is required</p>
                )}
              </div>
            </div>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Generic Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Generic Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.genericName}
                  onChange={(e) =>
                    handleInputChange("genericName", e.target.value)
                  }
                  onBlur={() => handleFieldBlur("genericName")}
                  className={getFieldClassName("genericName", "w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed")}
                  disabled={isAddingBatch}
                  required
                />
                {isFieldInvalid("genericName") && !isAddingBatch && (
                  <p className="mt-1 text-sm text-red-600">Generic name is required</p>
                )}
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Price (₱) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                    ₱
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => handleInputChange("price", e.target.value)}
                    onBlur={() => handleFieldBlur("price")}
                    className={getFieldClassName("price", "w-full pl-8 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed")}
                    placeholder="0.00"
                    disabled={isAddingBatch}
                    required
                  />
                </div>
                {isFieldInvalid("price") && !isAddingBatch && (
                  <p className="mt-1 text-sm text-red-600">Price is required</p>
                )}
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) =>
                    handleInputChange("quantity", e.target.value)
                  }
                  onBlur={() => handleFieldBlur("quantity")}
                  className={getFieldClassName("quantity", "w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500")}
                  required
                />
                {isFieldInvalid("quantity") && (
                  <p className="mt-1 text-sm text-red-600">Quantity is required</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Brand */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Brand <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => handleInputChange("brand", e.target.value)}
                  onBlur={() => handleFieldBlur("brand")}
                  className={getFieldClassName("brand", "w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed")}
                  disabled={isAddingBatch}
                  required
                />
                {isFieldInvalid("brand") && !isAddingBatch && (
                  <p className="mt-1 text-sm text-red-600">Brand is required</p>
                )}
              </div>

              {/* Expiry */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Expiry Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.expiry}
                  onChange={(e) => handleInputChange("expiry", e.target.value)}
                  onBlur={() => handleFieldBlur("expiry")}
                  min={new Date().toISOString().split("T")[0]}
                  className={getFieldClassName("expiry", "w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500")}
                  required
                />
                {isFieldInvalid("expiry") && (
                  <p className="mt-1 text-sm text-red-600">Expiry date is required</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    handleInputChange("category", e.target.value)
                  }
                  onBlur={() => handleFieldBlur("category")}
                  className={getFieldClassName("category", "w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed")}
                  disabled={isAddingBatch}
                  required
                >
                  <option value="--Select--">--Select--</option>
                  <option value="Prescription">Prescription</option>
                  <option value="Over-the-Counter">Over-the-Counter</option>
                  <option value="Vitamins">Vitamins</option>
                  <option value="Supplements">Supplements</option>
                  <option value="First Aid">First Aid</option>
                  <option value="Personal Care">Personal Care</option>
                  <option value="Medical Devices">Medical Devices</option>
                </select>
                {isFieldInvalid("category") && !isAddingBatch && (
                  <p className="mt-1 text-sm text-red-600">Please select a category</p>
                )}
              </div>
            </div>

            {/* Dropdowns Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {/* Supplier */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Supplier {!isAddingBatch && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={formData.supplierID}
                  onChange={(e) =>
                    handleInputChange("supplierID", e.target.value)
                  }
                  onBlur={() => handleFieldBlur("supplierID")}
                  className={getFieldClassName("supplierID", "w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed")}
                  disabled={isAddingBatch}
                  required={!isAddingBatch}
                >
                  <option value="--Select--">--Select--</option>
                  {suppliers.map((supplier) => (
                    <option
                      key={supplier.SupplierID}
                      value={supplier.SupplierID}
                    >
                      {supplier.Name}
                    </option>
                  ))}
                </select>
                {isFieldInvalid("supplierID") && !isAddingBatch && (
                  <p className="mt-1 text-sm text-red-600">Please select a supplier</p>
                )}
              </div>

              {/* Prescription */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Prescription {!isAddingBatch && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={formData.prescription}
                  onChange={(e) =>
                    handleInputChange("prescription", e.target.value)
                  }
                  onBlur={() => handleFieldBlur("prescription")}
                  className={getFieldClassName("prescription", "w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed")}
                  disabled={isAddingBatch}
                  required={!isAddingBatch}
                >
                  <option value="--Select--">--Select--</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
                {isFieldInvalid("prescription") && !isAddingBatch && (
                  <p className="mt-1 text-sm text-red-600">Please select prescription status</p>
                )}
              </div>

              {/* VAT Exempted */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  VAT Exempted {!isAddingBatch && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={formData.vatExempted}
                  onChange={(e) =>
                    handleInputChange("vatExempted", e.target.value)
                  }
                  onBlur={() => handleFieldBlur("vatExempted")}
                  className={getFieldClassName("vatExempted", "w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed")}
                  disabled={isAddingBatch}
                  required={!isAddingBatch}
                >
                  <option value="--Select--">--Select--</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
                {isFieldInvalid("vatExempted") && !isAddingBatch && (
                  <p className="mt-1 text-sm text-red-600">Please select VAT exemption status</p>
                )}
              </div>

              {/* Senior/PWD */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Senior/PWD {!isAddingBatch && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={formData.seniorPWD}
                  onChange={(e) =>
                    handleInputChange("seniorPWD", e.target.value)
                  }
                  onBlur={() => handleFieldBlur("seniorPWD")}
                  className={getFieldClassName("seniorPWD", "w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed")}
                  disabled={isAddingBatch}
                  required={!isAddingBatch}
                >
                  <option value="--Select--">--Select--</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
                {isFieldInvalid("seniorPWD") && !isAddingBatch && (
                  <p className="mt-1 text-sm text-red-600">Please select Senior/PWD discount eligibility</p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <button
                type="button"
                onClick={() => {
                  if (isAddingBatch) {
                    handleCancelBatch();
                  } else {
                    setShowForm(false);
                    setTouchedFields(new Set());
                    setFormData({
                      name: "",
                      genericName: "",
                      brand: "",
                      category: "--Select--",
                      price: "",
                      quantity: "",
                      expiry: "",
                      prescription: "--Select--",
                      vatExempted: "--Select--",
                      seniorPWD: "--Select--",
                      supplierID: "--Select--",
                      image: null,
                      imageBase64: null,
                    });
                    setImagePreview(null);
                  }
                }}
                className="px-12 py-3 border border-gray-400 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
                disabled={isSubmitting}
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="px-12 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting 
                  ? (isAddingBatch ? "ADDING BATCH..." : "ADDING...") 
                  : (isAddingBatch ? "ADD NEW BATCH" : "ADD")}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default ProductUpload;
