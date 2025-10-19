import { Menu, Bell, User, Search } from 'lucide-react'

const Header = () => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Pharmacy Name */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-blue-600">Jambo's Pharmacy</h1>
        </div>
        
        {/* Search Bar */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search here..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        {/* Right side icons */}
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <Bell className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <div className="p-2 hover:bg-gray-100 rounded-full">
              <User className="w-6 h-6 text-gray-600" />
            </div>
            <span className="text-gray-700 font-medium">User</span>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
