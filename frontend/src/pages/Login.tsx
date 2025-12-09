import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { authService } from '../services/authService'
import api from '../services/api'
import { getDeviceIdentifier } from '../utils/deviceFingerprint'

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [usernameOrEmail, setUsernameOrEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  // OTP verification states
  const [showOTPDialog, setShowOTPDialog] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [tempSession, setTempSession] = useState<any>(null)
  const [deviceInfo, setDeviceInfo] = useState<any>(null)
  const [resendingOTP, setResendingOTP] = useState(false)

  // Check for success message from navigation state
  useEffect(() => {
    const state = location.state as any
    if (state?.message) {
      setSuccessMessage(state.message)
      // Clear the state
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!usernameOrEmail || !password) {
      setError('Please fill in all fields')
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Step 1: Sign in with credentials
      const response = await authService.signIn({
        usernameOrEmail,
        password,
        rememberMe
      })

      if (!response.success || !response.data?.user) {
        setError(response.message || 'Login failed')
        setLoading(false)
        return
      }

      // Step 2: Get device identifier
      const device = getDeviceIdentifier()
      setDeviceInfo(device)
      console.log('Device identifier generated:', device.fingerprintHash)

      // Step 3: Check if OTP is required for this device
      try {
        const otpCheckResponse = await api.post('/auth/check-device', {
          deviceFingerprintHash: device.fingerprintHash,
          deviceId: device.deviceId,
          deviceFingerprint: device.fingerprint
        }, {
          headers: {
            Authorization: `Bearer ${response.data.session.access_token}`
          }
        })

        console.log('Device check response:', otpCheckResponse.data)

        if (otpCheckResponse.data?.data?.requiresOTP) {
          // OTP is required - show OTP dialog
          console.log('OTP verification required')
          setTempSession(response.data.session)
          setShowOTPDialog(true)
          
          // Automatically send OTP
          await handleSendOTP(response.data.session.access_token)
        } else {
          // No OTP required - proceed to dashboard
          console.log('Device is trusted, no OTP required')
          redirectToDashboard(response.data.user.Roles)
        }
      } catch (otpCheckError: any) {
        console.error('Error checking device verification:', otpCheckError)
        // If check fails, proceed to dashboard (fail open for better UX)
        redirectToDashboard(response.data.user.Roles)
      }
    } catch (err) {
      console.error('Login error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  const handleSendOTP = async (accessToken?: string) => {
    try {
      setResendingOTP(true)
      setOtpError(null)
      
      const token = accessToken || tempSession?.access_token
      
      const response = await api.post('/auth/send-otp', {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.data.success) {
        console.log('OTP sent successfully')
        setSuccessMessage('OTP has been sent to your email')
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
        setOtpError(response.data.message || 'Failed to send OTP')
      }
    } catch (error: any) {
      console.error('Error sending OTP:', error)
      setOtpError(error.response?.data?.message || 'Failed to send OTP')
    } finally {
      setResendingOTP(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!otp || otp.length !== 6) {
      setOtpError('Please enter a valid 6-digit OTP')
      return
    }

    try {
      setOtpLoading(true)
      setOtpError(null)

      const response = await api.post('/auth/verify-otp', {
        otp,
        deviceFingerprintHash: deviceInfo.fingerprintHash,
        deviceId: deviceInfo.deviceId,
        deviceFingerprint: deviceInfo.fingerprint
      }, {
        headers: {
          Authorization: `Bearer ${tempSession.access_token}`
        }
      })

      if (response.data.success) {
        console.log('OTP verified successfully')
        setShowOTPDialog(false)
        
        // Get user role and redirect
        const userResponse = await api.get('/auth/me', {
          headers: {
            Authorization: `Bearer ${tempSession.access_token}`
          }
        })
        
        if (userResponse.data.success && userResponse.data.data) {
          redirectToDashboard(userResponse.data.data.Roles)
        } else {
          // Fallback to default dashboard
          navigate('/', { replace: true })
        }
      } else {
        setOtpError(response.data.message || 'Invalid OTP')
      }
    } catch (error: any) {
      console.error('OTP verification error:', error)
      setOtpError(error.response?.data?.message || 'OTP verification failed')
    } finally {
      setOtpLoading(false)
    }
  }

  const redirectToDashboard = (userRole: string) => {
    if (userRole === 'Pharmacist') {
      navigate('/pharmacist/dashboard', { replace: true })
    } else if (userRole === 'Admin') {
      const from = (location.state as any)?.from?.pathname || '/'
      navigate(from, { replace: true })
    } else {
      navigate('/', { replace: true })
    }
  }

  const handleOTPInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setOtp(value)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Pharmacy Name */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-600 mb-2">Jambo's Pharmacy</h1>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-lg p-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Login</h2>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-600 text-sm">{successMessage}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Username or Email */}
            <div className="mb-4">
              <label htmlFor="usernameOrEmail" className="block text-sm font-medium text-gray-700 mb-2">
                Username or Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="usernameOrEmail"
                type="text"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter username or email"
                required
              />
            </div>

            {/* Password */}
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between mb-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Remember me</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Logging in...
                </span>
              ) : (
                'LOGIN'
              )}
            </button>
          </form>
        </div>
      </div>

      {/* OTP Verification Dialog */}
      {showOTPDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Device Verification</h3>
              <p className="text-gray-600">
                We've sent a 6-digit verification code to your email address. Please enter it below to continue.
              </p>
            </div>

            {/* Success Message in OTP Dialog */}
            {successMessage && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-600 text-sm">{successMessage}</p>
              </div>
            )}

            {/* OTP Error */}
            {otpError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600 text-sm">{otpError}</p>
              </div>
            )}

            <form onSubmit={handleVerifyOTP}>
              <div className="mb-6">
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                  Enter OTP Code
                </label>
                <input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={handleOTPInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl font-mono tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={otpLoading || otp.length !== 6}
                className="w-full bg-blue-600 text-white font-semibold py-3 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-3"
              >
                {otpLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying...
                  </span>
                ) : (
                  'Verify OTP'
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => handleSendOTP()}
                  disabled={resendingOTP}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                >
                  {resendingOTP ? 'Sending...' : 'Resend OTP'}
                </button>
              </div>
            </form>

            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-xs text-yellow-800">
                <strong>Security Notice:</strong> This code will expire in 10 minutes. Check your email inbox and spam folder.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Login
