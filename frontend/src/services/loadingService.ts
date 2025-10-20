import { toast, Id } from 'react-toastify'

interface LoadingState {
  id: Id
  message: string
  startTime: number
}

class LoadingService {
  private activeLoadings: Map<string, LoadingState> = new Map()

  /**
   * Start a loading operation with a unique key
   * If already loading with this key, returns existing toast ID
   */
  start(key: string, message: string = 'Loading...'): Id {
    // If already loading with this key, return existing
    if (this.activeLoadings.has(key)) {
      return this.activeLoadings.get(key)!.id
    }

    const toastId = toast.loading(message, {
      position: 'top-right',
      closeButton: false,
    })
    
    this.activeLoadings.set(key, {
      id: toastId,
      message,
      startTime: Date.now(),
    })

    return toastId
  }

  /**
   * Update the loading message for a specific key
   */
  update(key: string, message: string): void {
    const loading = this.activeLoadings.get(key)
    if (loading) {
      toast.update(loading.id, {
        render: message,
        type: 'info',
        isLoading: true,
      })
      loading.message = message
    }
  }

  /**
   * Stop loading with success message
   */
  success(key: string, message: string): void {
    const loading = this.activeLoadings.get(key)
    if (loading) {
      toast.update(loading.id, {
        render: message,
        type: 'success',
        isLoading: false,
        autoClose: 3000,
        closeButton: true,
      })
      this.activeLoadings.delete(key)
    }
  }

  /**
   * Stop loading with error message
   */
  error(key: string, message: string): void {
    const loading = this.activeLoadings.get(key)
    if (loading) {
      toast.update(loading.id, {
        render: message,
        type: 'error',
        isLoading: false,
        autoClose: 4000,
        closeButton: true,
      })
      this.activeLoadings.delete(key)
    }
  }

  /**
   * Stop loading without showing any message (just dismiss)
   */
  stop(key: string): void {
    const loading = this.activeLoadings.get(key)
    if (loading) {
      toast.dismiss(loading.id)
      this.activeLoadings.delete(key)
    }
  }

  /**
   * Check if a specific operation is currently loading
   */
  isLoading(key: string): boolean {
    return this.activeLoadings.has(key)
  }

  /**
   * Get the loading message for a specific key
   */
  getMessage(key: string): string | null {
    const loading = this.activeLoadings.get(key)
    return loading ? loading.message : null
  }

  /**
   * Get how long a loading operation has been running (in milliseconds)
   */
  getDuration(key: string): number | null {
    const loading = this.activeLoadings.get(key)
    if (loading) {
      return Date.now() - loading.startTime
    }
    return null
  }

  /**
   * Get all active loading keys
   */
  getActiveKeys(): string[] {
    return Array.from(this.activeLoadings.keys())
  }

  /**
   * Get count of active loadings
   */
  getActiveCount(): number {
    return this.activeLoadings.size
  }

  /**
   * Stop all active loadings
   */
  stopAll(): void {
    this.activeLoadings.forEach((loading) => {
      toast.dismiss(loading.id)
    })
    this.activeLoadings.clear()
  }

  /**
   * Stop all loadings and show a success message
   */
  successAll(message: string): void {
    if (this.activeLoadings.size > 0) {
      this.stopAll()
      toast.success(message, {
        position: 'top-right',
        autoClose: 3000,
      })
    }
  }

  /**
   * Stop all loadings and show an error message
   */
  errorAll(message: string): void {
    if (this.activeLoadings.size > 0) {
      this.stopAll()
      toast.error(message, {
        position: 'top-right',
        autoClose: 4000,
      })
    }
  }
}

// Export singleton instance
export const loadingService = new LoadingService()
export default loadingService

