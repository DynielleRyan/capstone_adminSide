import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Loader2 } from 'lucide-react'
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
}

const EditUser = () => {
  const navigate = useNavigate()
  const [editedUsers, setEditedUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

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
    
    loadingService.start('edit-user', `Updating ${editedUsers.length} user(s)...`)
    
    try {
      const updatePromises = editedUsers.map(user => {
        const updateData: UpdateUser = {
          UserID: user.userId,
          Roles: mapStringToRole(user.role)
        }
        return userService.updateUser(user.userId, updateData)
      })

      await Promise.all(updatePromises)
      loadingService.success('edit-user', `${editedUsers.length} user(s) updated successfully!`)
      navigate('/role-management')
    } catch (error) {
      loadingService.error('edit-user', 'Error updating users: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleCancel = () => {
    navigate('/role-management')
  }

  const handleDelete = async (userId: string, userName: string) => {
    await alertService.confirmDelete(userName, async () => {
      loadingService.start('delete-user', 'Deleting user...')
      
      try {
        const response = await userService.deleteUser(userId)
        
        if (response.success) {
          loadingService.success('delete-user', 'User deleted successfully!')
          // Remove from local state
          setEditedUsers(prev => prev.filter(user => user.userId !== userId))
        } else {
          loadingService.error('delete-user', 'Failed to delete user: ' + response.message)
        }
      } catch (error) {
        loadingService.error('delete-user', 'Error deleting user: ' + (error instanceof Error ? error.message : 'Unknown error'))
      }
    })
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
        <h1 className="text-3xl font-bold text-blue-900">EDIT USERS</h1>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow p-8">
        <form onSubmit={handleSubmit}>
          <div className="overflow-x-auto mb-6">
            <table className="w-full">
              <thead className="bg-blue-900 text-white">
                <tr>
                  <th className="px-4 py-4 text-center font-semibold w-16">DELETE</th>
                  <th className="px-6 py-4 text-left font-semibold">Name</th>
                  <th className="px-6 py-4 text-left font-semibold">CONTACT</th>
                  <th className="px-6 py-4 text-left font-semibold">USERNAME</th>
                  <th className="px-6 py-4 text-left font-semibold">ROLE</th>
                </tr>
              </thead>
              <tbody>
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
                ) : (
                  editedUsers.map((user, index) => (
                    <tr
                      key={user.userId}
                      className={`${
                        index % 2 === 0 ? 'bg-blue-50' : 'bg-white'
                      } hover:bg-blue-100 transition-colors`}
                    >
                      <td className="px-4 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleDelete(user.userId, user.name)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{user.name}</td>
                      <td className="px-6 py-4 text-gray-700">{user.contact}</td>
                      <td className="px-6 py-4 text-gray-700">{user.username}</td>
                      <td className="px-6 py-4">
                        <select 
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.userId, e.target.value)}
                          className={`px-3 py-1 rounded-full text-xs font-medium border-0 ${
                            user.role === 'PHARMACIST' 
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
                )}
              </tbody>
            </table>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={loading || editedUsers.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              CONFIRM CHANGES
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditUser

