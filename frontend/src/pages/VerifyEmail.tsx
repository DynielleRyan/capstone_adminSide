import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../config/supabase'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

const VerifyEmail = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [message, setMessage] = useState('Verifying your email...')

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        console.log('[VERIFY] Starting verification process')
        console.log('[VERIFY] Full URL:', window.location.href)
        console.log('[VERIFY] Hash:', window.location.hash)
        
        // Get the token from URL hash (Supabase puts it there)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const type = hashParams.get('type')

        console.log('[VERIFY] Token type:', type)
        console.log('[VERIFY] Has access token:', !!accessToken)
        console.log('[VERIFY] Has refresh token:', !!refreshToken)

        // Check if this is a magic link verification
        if (type === 'magiclink' && accessToken) {
          console.log('[VERIFY] Processing magic link...')
          
          // Set the session with the token
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          })

          if (error) {
            console.error('[VERIFY] Verification error:', error)
            setStatus('error')
            setMessage(error.message || 'Failed to verify email. The link may have expired.')
            return
          }

          if (data.session) {
            console.log('[VERIFY] Session created successfully, user verified!')
            
            // Get user role from URL parameters
            const userRole = searchParams.get('role')
            console.log('[VERIFY] User role:', userRole)
            
            // Sign out the session since this is just verification
            await supabase.auth.signOut()
            console.log('[VERIFY] Signed out')
            
            setStatus('success')
            setMessage('Your account has been successfully verified.')
          } else {
            console.error('[VERIFY] No session created')
            setStatus('error')
            setMessage('Failed to verify email. Please try again.')
          }
        } else {
          console.error('[VERIFY] Invalid or missing verification parameters')
          setStatus('error')
          setMessage('Invalid verification link. Please check your email for the correct link.')
        }
      } catch (error) {
        console.error('[VERIFY] Exception during verification:', error)
        setStatus('error')
        setMessage('An error occurred during verification. Please try again.')
      }
    }

    verifyEmail()
  }, [navigate, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-10 text-center">
        {status === 'verifying' && (
          <>
            <div className="mb-4">
              <Loader2 className="w-12 h-12 text-blue-600 mx-auto animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifying your email...</h2>
            <p className="text-gray-600 text-sm">Please wait</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Email Verified!</h2>
            <p className="text-gray-600 mb-8">{message}</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Continue to Login
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Go to Login
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default VerifyEmail

