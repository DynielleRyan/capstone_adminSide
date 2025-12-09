import { Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../config/database';
import { sendOTPEmail } from '../services/email';

/**
 * Generate a 6-digit OTP
 */
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Check if user requires OTP verification for this device
 */
export const checkDeviceVerification = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'No valid authorization token provided'
      });
      return;
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
      return;
    }

    // Get device identifier from request body
    const { deviceFingerprintHash, deviceId } = req.body;
    const deviceIdentifier = deviceFingerprintHash || deviceId;

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('User')
      .select('UserID, HasCompletedFirstLogin, FirstName, LastName')
      .eq('AuthUserID', user.id)
      .single();

    if (profileError || !userProfile) {
      console.log('User profile error:', profileError);
      res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
      return;
    }

    console.log('User profile found:', {
      UserID: userProfile.UserID,
      HasCompletedFirstLogin: userProfile.HasCompletedFirstLogin
    });

    // Check if this device has been trusted before
    let isDeviceTrusted = false;
    if (deviceIdentifier) {
      try {
        const { data: trustedDevice, error: deviceError } = await supabase
          .from('TrustedDevices')
          .select('DeviceID')
          .eq('UserID', userProfile.UserID)
          .eq('DeviceIdentifier', deviceIdentifier)
          .eq('IsTrusted', true)
          .single();

        if (!deviceError && trustedDevice) {
          isDeviceTrusted = true;
          console.log('Device is trusted:', deviceIdentifier);
          
          // Update last used time
          await supabase
            .from('TrustedDevices')
            .update({ LastUsedAt: new Date().toISOString() })
            .eq('DeviceID', trustedDevice.DeviceID);
        } else {
          console.log('Device not found or not trusted:', deviceIdentifier);
        }
      } catch (deviceCheckError) {
        console.log('Error checking trusted device:', deviceCheckError);
      }
    }

    // Check if HasCompletedFirstLogin field exists
    const hasCompletedFirstLogin = userProfile.HasCompletedFirstLogin !== undefined 
      ? (userProfile.HasCompletedFirstLogin ?? false)
      : false;

    // Require OTP if:
    // 1. User hasn't completed first login globally, OR
    // 2. This specific device hasn't been trusted
    const requiresOTP = !hasCompletedFirstLogin || !isDeviceTrusted;

    console.log('Device verification check result:', {
      hasCompletedFirstLogin,
      isDeviceTrusted,
      requiresOTP,
      deviceIdentifier: deviceIdentifier ? 'provided' : 'not provided'
    });

    res.json({
      success: true,
      data: {
        requiresOTP,
        hasCompletedFirstLogin,
        isDeviceTrusted
      }
    });
  } catch (error) {
    console.error('Check device verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
};

/**
 * Send OTP to user's email
 */
export const sendOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'No valid authorization token provided'
      });
      return;
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
      return;
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('User')
      .select('UserID, FirstName, LastName, Email')
      .eq('AuthUserID', user.id)
      .single();

    if (profileError || !userProfile) {
      res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
      return;
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in user metadata (using Supabase Admin)
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...user.user_metadata,
          otp: otp,
          otpExpiry: otpExpiry.toISOString()
        }
      }
    );

    if (updateError) {
      console.error('Error storing OTP:', updateError);
      res.status(500).json({
        success: false,
        message: 'Failed to generate OTP'
      });
      return;
    }

    // Send OTP email
    const fullName = `${userProfile.FirstName} ${userProfile.LastName}`;
    const emailResult = await sendOTPEmail(
      userProfile.Email,
      fullName,
      otp
    );

    if (!emailResult.success) {
      console.error('Failed to send OTP email:', emailResult.error);
      res.status(500).json({
        success: false,
        message: 'Failed to send OTP email'
      });
      return;
    }

    console.log(`OTP sent successfully to: ${userProfile.Email}`);
    res.json({
      success: true,
      message: 'OTP sent to your email address'
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
};

/**
 * Verify OTP and trust the device
 */
export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { otp, deviceFingerprintHash, deviceId, deviceFingerprint } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'No valid authorization token provided'
      });
      return;
    }

    if (!otp) {
      res.status(400).json({
        success: false,
        message: 'OTP is required'
      });
      return;
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
      return;
    }

    // Get stored OTP from user metadata
    const storedOTP = user.user_metadata?.otp;
    const otpExpiry = user.user_metadata?.otpExpiry;

    if (!storedOTP || !otpExpiry) {
      res.status(400).json({
        success: false,
        message: 'No OTP found. Please request a new one.'
      });
      return;
    }

    // Check if OTP is expired
    if (new Date(otpExpiry) < new Date()) {
      res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
      return;
    }

    // Verify OTP
    if (otp !== storedOTP) {
      res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please try again.'
      });
      return;
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('User')
      .select('UserID')
      .eq('AuthUserID', user.id)
      .single();

    if (profileError || !userProfile) {
      res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
      return;
    }

    // Update user to mark first login as complete
    await supabase
      .from('User')
      .update({ 
        HasCompletedFirstLogin: true,
        UpdatedAt: new Date().toISOString()
      })
      .eq('UserID', userProfile.UserID);

    // Store this device as trusted
    const deviceIdentifier = deviceFingerprintHash || deviceId;
    if (deviceIdentifier) {
      try {
        // Check if device already exists
        const { data: existingDevice, error: checkError } = await supabase
          .from('TrustedDevices')
          .select('DeviceID')
          .eq('UserID', userProfile.UserID)
          .eq('DeviceIdentifier', deviceIdentifier)
          .single();

        if (checkError && checkError.code === 'PGRST116') {
          // Device doesn't exist, create new trusted device record
          const deviceInfo = deviceFingerprint ? JSON.stringify(deviceFingerprint) : null;
          const { error: insertError } = await supabase
            .from('TrustedDevices')
            .insert({
              UserID: userProfile.UserID,
              DeviceIdentifier: deviceIdentifier,
              DeviceInfo: deviceInfo,
              IsTrusted: true,
              TrustedAt: new Date().toISOString(),
              LastUsedAt: new Date().toISOString()
            });

          if (insertError) {
            console.error('Error storing trusted device:', insertError);
          } else {
            console.log('Device stored as trusted:', deviceIdentifier);
          }
        } else if (!checkError && existingDevice) {
          // Device exists, update it to be trusted and update last used time
          const { error: updateError } = await supabase
            .from('TrustedDevices')
            .update({
              IsTrusted: true,
              LastUsedAt: new Date().toISOString()
            })
            .eq('DeviceID', existingDevice.DeviceID);

          if (updateError) {
            console.error('Error updating trusted device:', updateError);
          } else {
            console.log('Device updated as trusted:', deviceIdentifier);
          }
        }
      } catch (deviceError) {
        console.log('Error storing trusted device:', deviceError);
        // Don't fail OTP verification if device storage fails
      }
    }

    // Clear OTP from metadata
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        otp: null,
        otpExpiry: null
      }
    });

    res.json({
      success: true,
      message: 'Verification successful. Device trusted.'
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
};

