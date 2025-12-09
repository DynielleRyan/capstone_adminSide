/**
 * Activity Service
 * Tracks user activity and handles automatic logout after inactivity period
 */

const ACTIVITY_KEY = 'last_activity'
const INACTIVITY_TIMEOUT = 4 * 60 * 60 * 1000 // 4 hours in milliseconds
const CHECK_INTERVAL = 60 * 1000 // Check every minute

class ActivityService {
  private checkInterval: number | null = null
  private onInactivityCallback: (() => void) | null = null
  private isInitialized: boolean = false

  /**
   * Helper to get the appropriate storage (same logic as authService)
   */
  private getStorage(): Storage {
    const rememberMe = localStorage.getItem('rememberMe') === 'true'
    return rememberMe ? localStorage : sessionStorage
  }

  /**
   * Initialize activity tracking
   * Sets up event listeners and periodic inactivity checks
   */
  public initialize(onInactivity: () => void): void {
    // Prevent double initialization
    if (this.isInitialized) {
      console.log('[ActivityService] Already initialized, skipping...')
      return
    }

    console.log('[ActivityService] Initializing activity tracking')
    this.isInitialized = true
    this.onInactivityCallback = onInactivity
    
    // Record initial activity
    this.recordActivity()
    
    // Set up event listeners for user activity
    this.setupActivityListeners()
    
    // Start periodic inactivity check
    this.startInactivityCheck()
  }

  /**
   * Clean up activity tracking
   * Removes event listeners and stops inactivity checks
   */
  public cleanup(): void {
    if (!this.isInitialized) {
      return
    }

    console.log('[ActivityService] Cleaning up activity tracking')
    this.removeActivityListeners()
    this.stopInactivityCheck()
    this.onInactivityCallback = null
    this.isInitialized = false
  }

  /**
   * Record user activity with current timestamp
   */
  private recordActivity = (): void => {
    const now = Date.now()
    const storage = this.getStorage()
    storage.setItem(ACTIVITY_KEY, now.toString())
  }

  /**
   * Get the last recorded activity timestamp
   */
  private getLastActivity(): number {
    const storage = this.getStorage()
    const lastActivity = storage.getItem(ACTIVITY_KEY)
    if (!lastActivity) {
      // If no activity recorded, record current time and return it
      this.recordActivity()
      return Date.now()
    }
    return parseInt(lastActivity, 10)
  }

  /**
   * Check if user has been inactive for too long
   */
  private checkInactivity = (): void => {
    const lastActivity = this.getLastActivity()
    const now = Date.now()
    const inactiveTime = now - lastActivity

    if (inactiveTime >= INACTIVITY_TIMEOUT) {
      // User has been inactive for too long
      console.warn(
        '[ActivityService] User inactive for', 
        Math.floor(inactiveTime / 1000 / 60), 
        'minutes. Triggering auto-logout...',
        {
          lastActivity: new Date(lastActivity).toISOString(),
          now: new Date(now).toISOString(),
          inactiveMinutes: Math.floor(inactiveTime / 1000 / 60)
        }
      )
      
      if (this.onInactivityCallback) {
        this.onInactivityCallback()
      }
      
      this.cleanup()
    }
  }

  /**
   * Start periodic inactivity checks
   */
  private startInactivityCheck(): void {
    // Clear any existing interval
    this.stopInactivityCheck()
    
    // Check immediately
    this.checkInactivity()
    
    // Set up periodic check
    this.checkInterval = window.setInterval(() => {
      this.checkInactivity()
    }, CHECK_INTERVAL)
  }

  /**
   * Stop periodic inactivity checks
   */
  private stopInactivityCheck(): void {
    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  /**
   * Set up event listeners for user activity
   */
  private setupActivityListeners(): void {
    // Mouse events
    document.addEventListener('mousemove', this.recordActivity, { passive: true })
    document.addEventListener('mousedown', this.recordActivity, { passive: true })
    document.addEventListener('click', this.recordActivity, { passive: true })
    
    // Keyboard events
    document.addEventListener('keydown', this.recordActivity, { passive: true })
    document.addEventListener('keypress', this.recordActivity, { passive: true })
    
    // Touch events (for mobile/tablet)
    document.addEventListener('touchstart', this.recordActivity, { passive: true })
    document.addEventListener('touchmove', this.recordActivity, { passive: true })
    
    // Scroll events
    document.addEventListener('scroll', this.recordActivity, { passive: true })
    
    // Focus/visibility events
    window.addEventListener('focus', this.recordActivity, { passive: true })
    document.addEventListener('visibilitychange', this.handleVisibilityChange, { passive: true })
  }

  /**
   * Remove event listeners for user activity
   */
  private removeActivityListeners(): void {
    document.removeEventListener('mousemove', this.recordActivity)
    document.removeEventListener('mousedown', this.recordActivity)
    document.removeEventListener('click', this.recordActivity)
    document.removeEventListener('keydown', this.recordActivity)
    document.removeEventListener('keypress', this.recordActivity)
    document.removeEventListener('touchstart', this.recordActivity)
    document.removeEventListener('touchmove', this.recordActivity)
    document.removeEventListener('scroll', this.recordActivity)
    window.removeEventListener('focus', this.recordActivity)
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
  }

  /**
   * Handle visibility change (tab switching, minimizing, etc.)
   */
  private handleVisibilityChange = (): void => {
    if (!document.hidden) {
      // Tab/window became visible again
      this.recordActivity()
      // Check if user was inactive while away
      this.checkInactivity()
    }
  }

  /**
   * Clear activity data (call on logout)
   */
  public clearActivity(): void {
    // Clear from both storages to be safe
    localStorage.removeItem(ACTIVITY_KEY)
    sessionStorage.removeItem(ACTIVITY_KEY)
  }

  /**
   * Get the remaining time before auto-logout (in milliseconds)
   */
  public getRemainingTime(): number {
    const lastActivity = this.getLastActivity()
    const now = Date.now()
    const inactiveTime = now - lastActivity
    const remaining = INACTIVITY_TIMEOUT - inactiveTime
    return Math.max(0, remaining)
  }

  /**
   * Check if user is currently considered inactive
   */
  public isInactive(): boolean {
    return this.getRemainingTime() === 0
  }
}

// Export singleton instance
export const activityService = new ActivityService()
export default activityService

