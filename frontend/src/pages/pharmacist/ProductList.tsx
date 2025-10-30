const ProductList = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Product List</h1>
        <p className="text-gray-600 mt-1">View and manage all pharmacy products</p>
      </div>

      {/* Placeholder Content */}
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="max-w-md mx-auto">
          <div className="mb-4">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Product List Coming Soon
          </h2>
          <p className="text-gray-500">
            This page will display all available products in the pharmacy inventory.
            You'll be able to search, filter, and view detailed information about each product.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProductList;

