import { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, Plus, Edit3, ChevronLeft, ChevronRight } from 'lucide-react'
import AddUserForm from '../components/AddUserForm'
import EditUserForm from '../components/EditUserForm'
import { userService, UserResponse, CreateUser, UpdateUser, UserFilters, UserRole } from '../services/userService'

const RoleManagement = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('none')
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [isEditUserOpen, setIsEditUserOpen] = useState(false)
  const [users, setUsers] = useState<UserResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const [editUsers, setEditUsers] = useState<UserResponse[]>([])

  // Fetch users from API
  const fetchUsers = useCallback(async (page = 1, search = searchTerm) => {
    try {
      setLoading(true)
      setError(null)
      
      const filters: UserFilters = {
        page,
        limit: 50, // Increase limit to reduce API calls
        search: search || undefined
      }
      
      const response = await userService.getUsers(filters)
      
      if (response.success && response.data) {
        setUsers(response.data.users)
        setCurrentPage(response.data.page)
        setTotalPages(response.data.totalPages)
        setTotalUsers(response.data.total)
      } else {
        setError(response.message || 'Failed to fetch users')
      }
    } catch (err) {
      console.error('Error fetching users:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch users')
      // Don't clear users on error unless it's a critical error
      if (!users.length) {
        setUsers([])
      }
    } finally {
      setLoading(false)
    }
  }, [searchTerm])

  // Fetch all users for editing (without pagination)
  const fetchAllUsersForEdit = useCallback(async () => {
    try {
      const filters: UserFilters = {
        limit: 1000, // Large limit to get all users
        page: 1
      }
      
      const response = await userService.getUsers(filters)
      
      if (response.success && response.data) {
        setEditUsers(response.data.users)
      }
    } catch (err) {
      console.error('Error fetching all users for edit:', err)
    }
  }, [])

  // Load users on component mount
  useEffect(() => {
    fetchUsers()
    fetchAllUsersForEdit()
  }, []) // Empty dependency array to run only on mount

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchUsers(1, searchTerm)
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, fetchUsers])

  // Helper function to convert old role format to new Roles format
  const mapStringToRole = (roleString: string): UserRole => {
    switch (roleString?.toUpperCase()) {
      case 'PHARMACIST': return 'Pharmacist'
      case 'CLERK': return 'Clerk'
      case 'STAFF': return 'Clerk' // Map STAFF to Clerk for backwards compatibility
      default: return 'Pharmacist' // Default to Pharmacist instead of Admin
    }
  }

  // Helper function to convert new Roles format to old format for EditUserForm
  const mapRoleToOldFormat = (role: UserRole): 'PHARMACIST' | 'CLERK' => {
    switch (role) {
      case 'Pharmacist': return 'PHARMACIST'
      case 'Clerk': return 'CLERK'
      default: return 'PHARMACIST' // Default to PHARMACIST instead of ADMIN
    }
  }

  // Filter and sort users based on search term and sort criteria
  const filteredUsers = useMemo(() => {
    let filtered = users.filter(user => {
      const fullName = `${user.FirstName} ${user.LastName}`.toLowerCase()
      const searchLower = searchTerm.toLowerCase()
      // Helper function for role filtering
      const roleString = user.Roles === 'Pharmacist' ? 'pharmacist' :
                        user.Roles === 'Clerk' ? 'clerk' : 'pharmacist'
      return (
        fullName.includes(searchLower) ||
        user.Username.toLowerCase().includes(searchLower) ||
        roleString.includes(searchLower)
      )
    })

    if (sortBy !== 'none') {
      filtered = filtered.sort((a, b) => {
        switch (sortBy) {
          case 'name':
            const nameA = `${a.FirstName} ${a.MiddleInitial || ''} ${a.LastName}`.trim().toLowerCase()
            const nameB = `${b.FirstName} ${b.MiddleInitial || ''} ${b.LastName}`.trim().toLowerCase()
            return nameA.localeCompare(nameB)
            
          case 'role':
            return a.Roles.localeCompare(b.Roles)
            
          default:
            return 0
        }
      })
    }

    return filtered
  }, [users, searchTerm, sortBy])

  const handleAddUser = async (userData: any) => {
    try {
      console.log('Raw userData.role:', userData.role);
      const mappedRole = mapStringToRole(userData.role);
      console.log('Mapped role:', mappedRole);
      
      const createUserData: CreateUser = {
        FirstName: userData.firstName,
        MiddleInitial: userData.middleInitial,
        LastName: userData.lastName,
        Username: userData.username,
        Email: userData.email,
        Password: userData.password,
        Address: userData.address,
        ContactNumber: userData.contactNumber,
        Roles: mappedRole,
      }
      
      console.log('Final createUserData:', createUserData);

      const response = await userService.createUser(createUserData)
      
      if (response.success) {
        alert(`User ${userData.firstName} ${userData.lastName} added successfully!`)
        setIsAddUserOpen(false)
        // Refresh both users lists
        fetchUsers()
        fetchAllUsersForEdit()
      } else {
        alert('Failed to create user: ' + response.message)
      }
    } catch (error) {
      alert('Error creating user: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  // Convert UserResponse to the format expected by EditUserForm
  const convertToEditUserFormat = (user: UserResponse) => ({
    userId: user.UserID!,
    name: `${user.FirstName} ${user.MiddleInitial || ''} ${user.LastName}`.trim(),
    contact: user.ContactNumber || '',
    username: user.Username,
    password: '', // Dummy field for EditUserForm compatibility
    role: mapRoleToOldFormat(user.Roles)
  })

  const handleEditUser = async (updatedUsers: any[]) => {
    try {
      const updatePromises = updatedUsers.map(user => {
        const updateData: UpdateUser = {
          UserID: user.userId,
          Roles: mapStringToRole(user.role)
        }
        return userService.updateUser(user.userId, updateData)
      })

      await Promise.all(updatePromises)
      alert('Users updated successfully!')
      setIsEditUserOpen(false)
      // Refresh both users lists
      fetchUsers()
      fetchAllUsersForEdit()
    } catch (error) {
      alert('Error updating users: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        const response = await userService.deleteUser(userId)
        
        if (response.success) {
          alert(`User ${userId} deleted successfully!`)
          // Refresh both users lists
          fetchUsers()
          fetchAllUsersForEdit()
        } else {
          alert('Failed to delete user: ' + response.message)
        }
      } catch (error) {
        alert('Error deleting user: ' + (error instanceof Error ? error.message : 'Unknown error'))
      }
    }
  }


  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-blue-900 mb-2">MANAGE ROLES</h1>
      </div>

      {/* Controls and Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Sort By */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Sort By:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="none">None</option>
              <option value="name">Name</option>
              <option value="role">Role</option>
            </select>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="SEARCH"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button 
            onClick={() => setIsAddUserOpen(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            ADD USER
          </button>
          <button 
            onClick={() => {
              if (loading) {
                alert('Please wait for users to load before editing.')
                return
              }
              if (editUsers.length === 0) {
                alert('No users available to edit. Please add users first.')
                return
              }
              setIsEditUserOpen(true)
            }}
            disabled={loading || editUsers.length === 0}
            className="border border-blue-600 text-blue-600 px-6 py-2 rounded-md hover:bg-blue-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Edit3 className="w-4 h-4" />
            EDIT USER
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Name</th>
                <th className="px-6 py-4 text-left font-semibold">CONTACT</th>
                <th className="px-6 py-4 text-left font-semibold">USERNAME</th>
                <th className="px-6 py-4 text-left font-semibold">ROLE</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    Loading users...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-red-500">
                    Error: {error}
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, index) => (
                  <tr
                    key={user.UserID}
                    className={`${
                      index % 2 === 0 ? 'bg-blue-50' : 'bg-white'
                    } hover:bg-blue-100 transition-colors`}
                  >
                    <td className="px-6 py-4 text-gray-700">
                      {user.FirstName} {user.MiddleInitial} {user.LastName}
                    </td>
                    <td className="px-6 py-4 text-gray-700">{user.ContactNumber || 'N/A'}</td>
                    <td className="px-6 py-4 text-gray-700">{user.Username}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.Roles === 'Pharmacist'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.Roles.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-6">
        <div className="text-sm text-gray-700">
          Showing {filteredUsers.length} of {totalUsers} users
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => fetchUsers(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-4 py-2 text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <button 
            onClick={() => fetchUsers(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Add User Form Modal */}
      <AddUserForm
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        onSubmit={handleAddUser}
      />

      {/* Edit User Form Modal */}
      <EditUserForm
        isOpen={isEditUserOpen}
        onClose={() => setIsEditUserOpen(false)}
        onSubmit={handleEditUser}
        onDelete={handleDeleteUser}
        users={editUsers.map(convertToEditUserFormat)}
        loading={loading}
      />
    </div>
  )
}

export default RoleManagement
