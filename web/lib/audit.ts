/**
 * Frontend Audit Event Tracking System
 * 
 * This module provides client-side event tracking for user interface interactions
 * and important user actions to complement server-side audit logging.
 */

// Types for audit events
export interface AuditEvent {
  action: AuditAction;
  entity: AuditEntity;
  entityId?: number | string;
  metadata?: Record<string, any>;
  timestamp?: string;
  sessionId?: string;
}

export enum AuditAction {
  // UI Interactions
  PAGE_VIEW = 'PAGE_VIEW',
  BUTTON_CLICK = 'BUTTON_CLICK',
  FORM_SUBMIT = 'FORM_SUBMIT',
  SEARCH = 'SEARCH',
  FILTER_APPLY = 'FILTER_APPLY',
  
  // Authentication
  LOGIN_ATTEMPT = 'LOGIN_ATTEMPT',
  LOGOUT = 'LOGOUT',
  
  // Shopping Actions
  PRODUCT_VIEW = 'PRODUCT_VIEW',
  CART_ADD = 'CART_ADD',
  CART_REMOVE = 'CART_REMOVE',
  CART_UPDATE = 'CART_UPDATE',
  CHECKOUT_START = 'CHECKOUT_START',
  CHECKOUT_COMPLETE = 'CHECKOUT_COMPLETE',
  
  // User Actions
  PROFILE_UPDATE = 'PROFILE_UPDATE',
  REVIEW_CREATE = 'REVIEW_CREATE',
  REVIEW_UPDATE = 'REVIEW_UPDATE',
  WISHLIST_ADD = 'WISHLIST_ADD',
  WISHLIST_REMOVE = 'WISHLIST_REMOVE',
  
  // Admin Actions
  ORDER_UPDATE = 'ORDER_UPDATE',
  PRODUCT_UPDATE = 'PRODUCT_UPDATE',
  INVENTORY_UPDATE = 'INVENTORY_UPDATE',
  USER_MANAGEMENT = 'USER_MANAGEMENT',
  
  // Errors
  ERROR_OCCURRED = 'ERROR_OCCURRED',
  API_ERROR = 'API_ERROR'
}

export enum AuditEntity {
  USER = 'USER',
  ORDER = 'ORDER',
  PRODUCT = 'PRODUCT',
  CART = 'CART',
  REVIEW = 'REVIEW',
  CATEGORY = 'CATEGORY',
  SYSTEM = 'SYSTEM',
  PAGE = 'PAGE'
}

class AuditTracker {
  private sessionId: string;
  private userId?: number;
  private userRole?: string;
  private eventQueue: AuditEvent[] = [];
  private isOnline: boolean = true;
  private batchSize: number = 10;
  private flushInterval: number = 5000; // 5 seconds
  private flushTimer?: NodeJS.Timeout;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeTracker();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeTracker(): void {
    // Set up periodic flushing
    this.flushTimer = setInterval(() => {
      this.flushEvents();
    }, this.flushInterval);

    // Flush events before page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flushEvents(true);
      });

      // Track online/offline status
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.flushEvents();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  public setUser(userId: number, userRole: string): void {
    this.userId = userId;
    this.userRole = userRole;
  }

  public track(event: Omit<AuditEvent, 'timestamp' | 'sessionId'>): void {
    const auditEvent: AuditEvent = {
      ...event,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      metadata: {
        ...event.metadata,
        userId: this.userId,
        userRole: this.userRole,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
      }
    };

    this.eventQueue.push(auditEvent);

    // Flush immediately for critical events
    if (this.isCriticalEvent(event.action)) {
      this.flushEvents();
    } else if (this.eventQueue.length >= this.batchSize) {
      this.flushEvents();
    }
  }

  private isCriticalEvent(action: AuditAction): boolean {
    const criticalEvents = [
      AuditAction.LOGIN_ATTEMPT,
      AuditAction.CHECKOUT_COMPLETE,
      AuditAction.ERROR_OCCURRED,
      AuditAction.API_ERROR
    ];
    return criticalEvents.includes(action);
  }

  private async flushEvents(isBeforeUnload: boolean = false): Promise<void> {
    if (this.eventQueue.length === 0 || (!this.isOnline && !isBeforeUnload)) {
      return;
    }

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const response = await fetch('/api/audit/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: eventsToSend }),
        // Use sendBeacon for beforeunload if available
        ...(isBeforeUnload && navigator.sendBeacon ? {} : {})
      });

      if (!response.ok) {
        // Re-queue events if send failed
        this.eventQueue.unshift(...eventsToSend);
      }
    } catch (error) {
      console.warn('Failed to send audit events:', error);
      // Re-queue events for retry
      this.eventQueue.unshift(...eventsToSend);
    }
  }

  public destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushEvents(true);
  }
}

// Global tracker instance
const auditTracker = new AuditTracker();

// Convenience functions for common tracking scenarios
export const trackPageView = (pageName: string, metadata?: Record<string, any>) => {
  auditTracker.track({
    action: AuditAction.PAGE_VIEW,
    entity: AuditEntity.PAGE,
    metadata: {
      pageName,
      ...metadata
    }
  });
};

export const trackProductView = (productId: number, productName: string) => {
  auditTracker.track({
    action: AuditAction.PRODUCT_VIEW,
    entity: AuditEntity.PRODUCT,
    entityId: productId,
    metadata: {
      productName
    }
  });
};

export const trackCartAction = (action: 'add' | 'remove' | 'update', productId: number, quantity: number) => {
  const auditAction = action === 'add' ? AuditAction.CART_ADD : 
                     action === 'remove' ? AuditAction.CART_REMOVE : 
                     AuditAction.CART_UPDATE;

  auditTracker.track({
    action: auditAction,
    entity: AuditEntity.CART,
    entityId: productId,
    metadata: {
      quantity,
      cartAction: action
    }
  });
};

export const trackOrderAction = (orderId: number, action: string, metadata?: Record<string, any>) => {
  auditTracker.track({
    action: AuditAction.ORDER_UPDATE,
    entity: AuditEntity.ORDER,
    entityId: orderId,
    metadata: {
      orderAction: action,
      ...metadata
    }
  });
};

export const trackUserAction = (action: string, metadata?: Record<string, any>) => {
  auditTracker.track({
    action: AuditAction.PROFILE_UPDATE,
    entity: AuditEntity.USER,
    metadata: {
      userAction: action,
      ...metadata
    }
  });
};

export const trackError = (error: Error, context?: string) => {
  auditTracker.track({
    action: AuditAction.ERROR_OCCURRED,
    entity: AuditEntity.SYSTEM,
    metadata: {
      errorMessage: error.message,
      errorStack: error.stack,
      context,
      errorType: error.constructor.name
    }
  });
};

export const trackAPIError = (endpoint: string, status: number, error: string) => {
  auditTracker.track({
    action: AuditAction.API_ERROR,
    entity: AuditEntity.SYSTEM,
    metadata: {
      endpoint,
      status,
      error,
      timestamp: new Date().toISOString()
    }
  });
};

export const trackFormSubmission = (formName: string, success: boolean, metadata?: Record<string, any>) => {
  auditTracker.track({
    action: AuditAction.FORM_SUBMIT,
    entity: AuditEntity.SYSTEM,
    metadata: {
      formName,
      success,
      ...metadata
    }
  });
};

export const trackSearch = (query: string, resultsCount: number, filters?: Record<string, any>) => {
  auditTracker.track({
    action: AuditAction.SEARCH,
    entity: AuditEntity.SYSTEM,
    metadata: {
      query,
      resultsCount,
      filters
    }
  });
};

// Set user context
export const setAuditUser = (userId: number, userRole: string) => {
  auditTracker.setUser(userId, userRole);
};

// Export the tracker for advanced usage
export { auditTracker };

// React hook for easy integration
export const useAuditTracker = () => {
  return {
    track: auditTracker.track.bind(auditTracker),
    trackPageView,
    trackProductView,
    trackCartAction,
    trackOrderAction,
    trackUserAction,
    trackError,
    trackAPIError,
    trackFormSubmission,
    trackSearch,
    setUser: setAuditUser
  };
};
