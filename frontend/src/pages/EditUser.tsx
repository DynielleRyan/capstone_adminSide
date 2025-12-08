import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Loader2, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import alertService from '../services/alertService'
import loadingService from '../services/loadingService'
import { userService, UserResponse, UpdateUser, UserFilters, UserRole } from '../services/userService'

interface User {
  userId: string
  name: string
  contact: string
  username: string
  password: string
  role: 'PHARMACIST' | 'CLERK'
  markedForDeletion?: boolean // Track if user is marked for deletion
}

type SortField = 'name' | 'contact' | 'username' | 'role'
type SortDirection = 'asc' | 'desc' | null

const EditUser = () => {
  const navigate = useNavigate()
  const [editedUsers, setEditedUsers] = useState<User[]>([])
  const [originalUsers, setOriginalUsers] = useState<User[]>([]) // Track original state
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  // Helper function to convert new Roles format to old format for EditUserForm
  const mapRoleToOldFormat = (role: UserRole): 'PHARMACIST' | 'CLERK' => {
    switch (role) {
      case 'Pharmacist': return 'PHARMACIST'
      case 'Clerk': return 'CLERK'
      default: return 'PHARMACIST'
    }
  }

  // Helper function to convert old role format to new Roles format
  const mapStringToRole = (roleString: string): UserRole => {
    switch (roleString?.toUpperCase()) {
      case 'PHARMACIST': return 'Pharmacist'
      case 'CLERK': return 'Clerk'
      default: return 'Pharmacist'
    }
  }

  // Convert UserResponse to the format expected by the component
  const convertToEditUserFormat = (user: UserResponse) => ({
    userId: user.UserID!,
    name: `${user.FirstName} ${user.MiddleInitial || ''} ${user.LastName}`.trim(),
    contact: user.ContactNumber || '',
    username: user.Username,
    password: '',
    role: mapRoleToOldFormat(user.Roles)
  })

  // Fetch all users for editing
  useEffect(() => {
    const fetchAllUsersForEdit = async () => {
      try {
        setLoading(true)
        const filters: UserFilters = {
          limit: 1000,
          page: 1
        }
        
        const response = await userService.getUsers(filters)
        
        if (response.success && response.data) {
          const formattedUsers = response.data.users.map(convertToEditUserFormat)
          setEditedUsers(formattedUsers)
          setOriginalUsers(formattedUsers) // Save original state for comparison
        }
      } catch (err) {
        console.error('Error fetching users:', err)
        alertService.error('Failed to load users')
      } finally {
        setLoading(false)
      }
    }

    fetchAllUsersForEdit()
  }, [])

  const handleRoleChange = (userId: string, newRole: string) => {
    setEditedUsers(prev => 
      prev.map(user => 
        user.userId === userId 
          ? { ...user, role: newRole as 'PHARMACIST' | 'CLERK' }
          : user
      )
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Find users marked for deletion
    const usersToDelete = editedUsers.filter(user => user.markedForDeletion)
    
    // Find users with role changes (excluding those marked for deletion)
    const changedUsers = editedUsers.filter(editedUser => {
      if (editedUser.markedForDeletion) return false // Skip deleted users
      const originalUser = originalUsers.find(u => u.userId === editedUser.userId)
      return originalUser && originalUser.role !== editedUser.role
    })

    if (changedUsers.length === 0 && usersToDelete.length === 0) {
      alertService.info('No changes detected')
      return
    }
    
    const totalChanges = changedUsers.length + usersToDelete.length
    loadingService.start('edit-user', `Processing ${totalChanges} change(s)...`)
    
    try {
      const promises: Promise<any>[] = []
      
      // Add update promises
      changedUsers.forEach(user => {
        const updateData: UpdateUser = {
          UserID: user.userId,
          Roles: mapStringToRole(user.role)
        }
        promises.push(userService.updateUser(user.userId, updateData))
      })
      
      // Add delete promises
      usersToDelete.forEach(user => {
        promises.push(userService.deleteUser(user.userId))
      })

      await Promise.all(promises)
      
      // Create detailed success message
      const messages: string[] = []
      
      if (changedUsers.length === 1) {
        messages.push(`Updated role for ${changedUsers[0].name}`)
      } else if (changedUsers.length > 1) {
        messages.push(`Updated ${changedUsers.length} user roles`)
      }
      
      if (usersToDelete.length === 1) {
        messages.push(`Deleted ${usersToDelete[0].name}`)
      } else if (usersToDelete.length > 1) {
        messages.push(`Deleted ${usersToDelete.length} users`)
      }
      
      const message = messages.join(' and ')
      
      loadingService.success('edit-user', message)
      navigate('/role-management')
    } catch (error) {
      loadingService.error('edit-user', 'Error processing changes: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleCancel = () => {
    navigate('/role-management')
  }

  const handleDelete = (userId: string, userName: string) => {
    setEditedUsers(prev => 
      prev.map(user => {
        if (user.userId === userId) {
          // Toggle deletion mark
          const newMarkedState = !user.markedForDeletion
          if (newMarkedState) {
            alertService.info(`${userName} marked for deletion. Click CONFIRM to apply.`)
          } else {
            alertService.info(`${userName} unmarked for deletion.`)
          }
          return { ...user, markedForDeletion: newMarkedState }
        }
        return user
      })
    )
  }

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle sort direction
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortDirection(null)
        setSortField(null)
      } else {
        setSortDirection('asc')
      }
    } else {
      // Set new field
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Filter and sort users
  const getFilteredAndSortedUsers = () => {
    let filtered = [...editedUsers]

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(query) ||
        user.username.toLowerCase().includes(query) ||
        user.contact.toLowerCase().includes(query)
      )
    }

    // Apply sorting
    if (sortField && sortDirection) {
      filtered.sort((a, b) => {
        let aValue = a[sortField]
        let bValue = b[sortField]

        // Convert to lowercase for string comparison
        if (typeof aValue === 'string') aValue = aValue.toLowerCase()
        if (typeof bValue === 'string') bValue = bValue.toLowerCase()

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }

  const filteredUsers = getFilteredAndSortedUsers()

  // Render sort icon
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 inline opacity-50" />
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="w-4 h-4 ml-1 inline text-white" />
    }
    if (sortDirection === 'desc') {
      return <ArrowDown className="w-4 h-4 ml-1 inline text-white" />
    }
    return <ArrowUpDown className="w-4 h-4 ml-1 inline opacity-50" />
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="mb-6">
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Role Management</span>
        </button>
        
      </div>
      {/* Blue background div */}
      <div className="p-6 bg-blue-50 rounded-lg">
        <h1 className="text-3xl font-bold text-blue-900">EDIT USERS</h1>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow p-8">
        <form onSubmit={handleSubmit}>
          {/* Search and Action Buttons */}
          <div className="flex justify-between items-center mb-6 gap-4">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, username, or contact..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading || editedUsers.length === 0}
                className="px-6 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                CONFIRM
              </button>

              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 border border-blue-900 text-blue-900 rounded-md hover:bg-blue-50 transition-colors"
              >
                CANCEL
              </button>
            </div>
          </div>

          {/* Results count */}
          {searchQuery && !loading && (
            <div className="mb-4 text-sm text-gray-600">
              Found {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} matching "{searchQuery}"
            </div>
          )}

          <div className="overflow-x-auto mb-6">
            <table className="w-full">
              <thead className="bg-blue-900 text-white">
                <tr>
                  <th className="px-4 py-4 text-center font-semibold w-16 border-r border-white">DELETE</th>
                  <th 
                    className="px-6 py-4 text-center font-semibold border-r border-white cursor-pointer hover:bg-blue-800 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center justify-center">
                      NAME
                      {renderSortIcon('name')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-center font-semibold border-r border-white cursor-pointer hover:bg-blue-800 transition-colors"
                    onClick={() => handleSort('contact')}
                  >
                    <div className="flex items-center justify-center">
                      CONTACT
                      {renderSortIcon('contact')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-center font-semibold border-r border-white cursor-pointer hover:bg-blue-800 transition-colors"
                    onClick={() => handleSort('username')}
                  >
                    <div className="flex items-center justify-center">
                      USERNAME
                      {renderSortIcon('username')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-center font-semibold border-r border-white cursor-pointer hover:bg-blue-800 transition-colors"
                    onClick={() => handleSort('role')}
                  >
                    <div className="flex items-center justify-center">
                      ROLE
                      {renderSortIcon('role')}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className=" bg-blue-50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading users...
                      </div>
                    </td>
                  </tr>
                ) : editedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No users available to edit. Make sure users are loaded first.
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No users found matching your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user => (
                    <tr
                      key={user.userId}
                      className={user.markedForDeletion ? 'bg-red-50 opacity-60' : ''}
                      >
                      <td className="px-4 py-4 text-center border border-white">
                        <button
                          type="button"
                          onClick={() => handleDelete(user.userId, user.name)}
                          className={user.markedForDeletion 
                            ? "text-gray-500 hover:text-gray-700 transition-colors" 
                            : "text-red-500 hover:text-red-700 transition-colors"
                          }
                          title={user.markedForDeletion ? "Undo delete" : "Mark for deletion"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                      <td className={`px-6 py-4 text-gray-700 text-center border border-white ${user.markedForDeletion ? 'line-through' : ''}`}>
                        {user.name}
                        {user.markedForDeletion && <span className="ml-2 text-xs text-red-600 font-semibold">(TO BE DELETED)</span>}
                      </td>
                      <td className={`px-6 py-4 text-gray-700 text-center border border-white ${user.markedForDeletion ? 'line-through' : ''}`}>{user.contact}</td>
                      <td className={`px-6 py-4 text-gray-700 text-center border border-white ${user.markedForDeletion ? 'line-through' : ''}`}>{user.username}</td>
                      <td className="px-6 py-4 text-center border border-white">
                        <select 
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.userId, e.target.value)}
                          disabled={user.markedForDeletion}
                          className={`px-3 py-1 rounded-full text-xs font-medium border-0 ${
                            user.markedForDeletion 
                              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                              : user.role === 'PHARMACIST' 
                                ? 'bg-green-100 text-green-800'
                                : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          <option value="PHARMACIST">PHARMACIST</option>
                          <option value="CLERK">CLERK</option>
                        </select>
                      </td>
                    </tr>
                  ))
                ))}
              </tbody>
            </table>
          </div>

        </form>
      </div>
      </div>
    </div>
  )
}

export default EditUser

