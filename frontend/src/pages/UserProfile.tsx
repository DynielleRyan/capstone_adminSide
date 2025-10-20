import { useState, useEffect } from 'react'
import { User, Mail, Phone, MapPin, Calendar, Edit2, Save, X } from 'lucide-react'
import loadingService from '../services/loadingService'
import { userService, UserResponse } from '../services/userService'
import { authService } from '../services/authService'

const UserProfile = () => {
  const [user, setUser] = useState<UserResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContactNumber, setEditedContactNumber] = useState('')
  const [saving, setSaving] = useState(false)

  // Fetch current authenticated user
  const fetchCurrentUser = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Try to get current user from API
      const response = await authService.getCurrentUser()
      
      if (response.success && response.data) {
        setUser(response.data)
        setEditedContactNumber(response.data.ContactNumber || '')
      } else {
        // If API call fails, try to get stored user
        const storedUser = authService.getStoredUser()
        if (storedUser) {
          setUser(storedUser)
          setEditedContactNumber(storedUser.ContactNumber || '')
        } else {
          setError('User not found. Please log in.')
        }
      }
    } catch (err) {
      console.error('Error fetching user profile:', err)
      // Try to get stored user as fallback
      const storedUser = authService.getStoredUser()
      if (storedUser) {
        setUser(storedUser)
        setEditedContactNumber(storedUser.ContactNumber || '')
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch user profile')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing - reset to original value
      setEditedContactNumber(user?.ContactNumber || '')
    }
    setIsEditing(!isEditing)
  }

  const handleSave = async () => {
    if (!user?.UserID) return

    loadingService.start('update-profile', 'Updating contact number...')

    try {
      setSaving(true)
      
      const response = await userService.updateProfile(user.UserID, {
        UserID: user.UserID,
        ContactNumber: editedContactNumber
      })

      if (response.success && response.data) {
        setUser(response.data)
        setIsEditing(false)
        loadingService.success('update-profile', 'Contact number updated successfully!')
      } else {
        loadingService.error('update-profile', 'Failed to update contact number: ' + response.message)
      }
    } catch (err) {
      console.error('Error updating contact number:', err)
      loadingService.error('update-profile', 'Error updating contact number: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (date?: Date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 text-lg">{error || 'User not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-blue-900">User Profile</h1>
          <p className="text-gray-600 mt-2">View and manage your profile information</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header Section with Avatar */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-8">
            <div className="flex items-center gap-6">
              <div className="bg-white rounded-full p-4">
                <User className="w-16 h-16 text-blue-600" />
              </div>
              <div className="text-white">
                <h2 className="text-3xl font-bold">
                  {user.FirstName} {user.MiddleInitial} {user.LastName}
                </h2>
                <p className="text-blue-100 text-lg mt-1">@{user.Username}</p>
                <div className="mt-2">
                  <span className={`px-4 py-1 rounded-full text-sm font-medium ${
                    user.Roles === 'Pharmacist'
                      ? 'bg-green-500 text-white'
                      : user.Roles === 'Clerk'
                      ? 'bg-blue-500 text-white'
                      : 'bg-purple-500 text-white'
                  }`}>
                    {user.Roles.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Email */}
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Mail className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500 mb-1">Email Address</p>
                  <p className="text-gray-900 font-medium">{user.Email}</p>
                </div>
              </div>

              {/* Contact Number - Editable */}
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="bg-green-100 p-3 rounded-lg">
                  <Phone className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-500">Contact Number</p>
                    {!isEditing && (
                      <button
                        onClick={handleEditToggle}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="Edit contact number"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editedContactNumber}
                        onChange={(e) => setEditedContactNumber(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter contact number"
                      />
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-green-600 text-white p-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                        title="Save"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleEditToggle}
                        disabled={saving}
                        className="bg-red-600 text-white p-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-900 font-medium">
                      {user.ContactNumber || 'Not provided'}
                    </p>
                  )}
                </div>
              </div>

              {/* Address */}
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <MapPin className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500 mb-1">Address</p>
                  <p className="text-gray-900 font-medium">
                    {user.Address || 'Not provided'}
                  </p>
                </div>
              </div>

              {/* Last Login */}
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="bg-orange-100 p-3 rounded-lg">
                  <Calendar className="w-6 h-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500 mb-1">Last Login</p>
                  <p className="text-gray-900 font-medium">
                    {formatDate(user.DateTimeLastLoggedIn)}
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Account Created</p>
                  <p className="text-gray-900 font-medium">{formatDate(user.CreatedAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last Updated</p>
                  <p className="text-gray-900 font-medium">{formatDate(user.UpdatedAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserProfile

