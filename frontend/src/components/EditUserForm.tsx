import { useState, useEffect } from 'react'
import { X, Trash2, Loader2 } from 'lucide-react'
import alertService from '../services/alertService'

interface User {
  userId: string
  name: string
  contact: string
  username: string
  password: string
  role: 'PHARMACIST' | 'CLERK'
}

interface EditUserFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (updatedUsers: User[]) => void
  onDelete: (userId: string) => void
  users: User[]
  loading?: boolean
}

const EditUserForm = ({ isOpen, onClose, onSubmit, onDelete, users, loading = false }: EditUserFormProps) => {
  const [editedUsers, setEditedUsers] = useState<User[]>([])

  // Sync editedUsers with users prop when it changes
  useEffect(() => {
    if (users && users.length > 0) {
      setEditedUsers(users)
    } else {
      setEditedUsers([])
    }
  }, [users])

  const handleRoleChange = (userId: string, newRole: string) => {
    setEditedUsers(prev => 
      prev.map(user => 
        user.userId === userId 
          ? { ...user, role: newRole as 'PHARMACIST' | 'CLERK' }
          : user
      )
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(editedUsers)
    onClose()
  }

  const handleCancel = () => {
    setEditedUsers(users) // Reset changes
    onClose()
  }

  const handleDelete = async (userId: string, userName: string) => {
    await alertService.confirmDelete(userName, () => {
      onDelete(userId)
      // Remove from local state as well
      setEditedUsers(prev => prev.filter(user => user.userId !== userId))
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-blue-900">EDIT USERS</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Users Table */}
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
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              CONFIRM CHANGES
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditUserForm
