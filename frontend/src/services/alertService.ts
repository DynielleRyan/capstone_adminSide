import { toast, ToastOptions, Id } from 'react-toastify'

// Type for confirm dialog handler
type ConfirmDialogHandler = (
  message: string,
  options?: {
    title?: string
    confirmText?: string
    cancelText?: string
    variant?: 'danger' | 'warning' | 'info'
  }
) => Promise<boolean>

class AlertService {
  private defaultOptions: ToastOptions = {
    position: 'top-right',
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  }

  // Will be set by App.tsx with the confirm dialog handler
  private confirmHandler: ConfirmDialogHandler | null = null

  /**
   * Set the confirm dialog handler (called by App.tsx)
   */
  setConfirmHandler(handler: ConfirmDialogHandler) {
    this.confirmHandler = handler
  }

  /**
   * Show success notification
   */
  success(message: string, duration: number = 3000) {
    toast.success(message, {
      ...this.defaultOptions,
      autoClose: duration,
    })
  }

  /**
   * Show error notification
   */
  error(message: string, duration: number = 4000) {
    toast.error(message, {
      ...this.defaultOptions,
      autoClose: duration,
    })
  }

  /**
   * Show info notification (matches your Angular showToast)
   */
  showToast(message: string, duration: number = 3000, position: 'top' | 'middle' | 'bottom' = 'bottom') {
    const positionMap = {
      top: 'top-center' as const,
      middle: 'top-center' as const,
      bottom: 'bottom-center' as const,
    }

    toast.info(message, {
      ...this.defaultOptions,
      autoClose: duration,
      position: positionMap[position],
    })
  }

  /**
   * Show warning notification
   */
  warning(message: string, duration: number = 4000) {
    toast.warning(message, {
      ...this.defaultOptions,
      autoClose: duration,
    })
  }

  /**
   * Show info notification
   */
  info(message: string, duration: number = 3000) {
    toast.info(message, {
      ...this.defaultOptions,
      autoClose: duration,
    })
  }

  /**
   * Promise-based notification (automatic loading/success/error)
   */
  async promise<T>(
    promise: Promise<T>,
    messages: {
      pending: string
      success: string
      error: string
    }
  ): Promise<T> {
    return toast.promise(promise, messages, {
      position: 'top-right',
    })
  }

  /**
   * Show custom confirmation dialog
   * Returns a promise that resolves to true if confirmed, false if cancelled
   */
  async confirm(
    message: string,
    options?: {
      title?: string
      confirmText?: string
      cancelText?: string
      variant?: 'danger' | 'warning' | 'info'
    }
  ): Promise<boolean> {
    // Use custom confirm handler if available, otherwise fallback to native
    if (this.confirmHandler) {
      return this.confirmHandler(message, options)
    }
    // Fallback to native confirm
    return window.confirm(message)
  }

  /**
   * Show delete confirmation dialog
   * Executes the callback if user confirms
   */
  async confirmDelete(
    itemName: string,
    onConfirm: () => void | Promise<void>
  ): Promise<void> {
    const confirmed = await this.confirm(
      `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
      {
        title: 'Confirm Delete',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        variant: 'danger'
      }
    )
    
    if (confirmed) {
      await onConfirm()
    }
  }

  /**
   * Dismiss specific or all toasts
   */
  dismiss(toastId?: Id) {
    if (toastId) {
      toast.dismiss(toastId)
    } else {
      toast.dismiss()
    }
  }

  /**
   * Clear all toasts
   */
  clearAll() {
    toast.dismiss()
  }
}

// Export singleton instance
export const alertService = new AlertService()
export default alertService

