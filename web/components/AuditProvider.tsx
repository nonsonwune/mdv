/**
 * React Context Provider for Audit Tracking
 * 
 * Provides audit tracking functionality throughout the React application
 * and automatically tracks common user interactions.
 */

'use client';

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { auditTracker, trackPageView, setAuditUser, AuditAction, AuditEntity } from '@/lib/audit';

interface AuditContextType {
  track: typeof auditTracker.track;
  trackPageView: typeof trackPageView;
  trackButtonClick: (buttonName: string, metadata?: Record<string, any>) => void;
  trackFormSubmit: (formName: string, success: boolean, metadata?: Record<string, any>) => void;
  trackError: (error: Error, context?: string) => void;
}

const AuditContext = createContext<AuditContextType | null>(null);

interface AuditProviderProps {
  children: ReactNode;
  user?: {
    id: number;
    role: string;
    email: string;
  };
}

export const AuditProvider: React.FC<AuditProviderProps> = ({ children, user }) => {
  const router = useRouter();

  useEffect(() => {
    // Set user context if provided
    if (user) {
      setAuditUser(user.id, user.role);
    }

    // Track initial page view
    trackPageView(window.location.pathname);
  }, [user]);

  // Track route changes
  useEffect(() => {
    const handleRouteChange = () => {
      trackPageView(window.location.pathname);
    };

    // Listen for route changes (Next.js specific)
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  const trackButtonClick = (buttonName: string, metadata?: Record<string, any>) => {
    auditTracker.track({
      action: AuditAction.BUTTON_CLICK,
      entity: AuditEntity.SYSTEM,
      metadata: {
        buttonName,
        ...metadata
      }
    });
  };

  const trackFormSubmit = (formName: string, success: boolean, metadata?: Record<string, any>) => {
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

  const trackError = (error: Error, context?: string) => {
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

  const contextValue: AuditContextType = {
    track: auditTracker.track.bind(auditTracker),
    trackPageView,
    trackButtonClick,
    trackFormSubmit,
    trackError
  };

  return (
    <AuditContext.Provider value={contextValue}>
      {children}
    </AuditContext.Provider>
  );
};

export const useAudit = (): AuditContextType => {
  const context = useContext(AuditContext);
  if (!context) {
    throw new Error('useAudit must be used within an AuditProvider');
  }
  return context;
};

// Higher-order component for automatic audit tracking
export const withAuditTracking = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
) => {
  const AuditTrackedComponent: React.FC<P> = (props) => {
    const audit = useAudit();

    useEffect(() => {
      // Track component mount
      audit.track({
        action: AuditAction.PAGE_VIEW,
        entity: AuditEntity.SYSTEM,
        metadata: {
          componentName,
          action: 'component_mount'
        }
      });

      return () => {
        // Track component unmount
        audit.track({
          action: AuditAction.PAGE_VIEW,
          entity: AuditEntity.SYSTEM,
          metadata: {
            componentName,
            action: 'component_unmount'
          }
        });
      };
    }, [audit]);

    return <WrappedComponent {...props} />;
  };

  AuditTrackedComponent.displayName = `withAuditTracking(${componentName})`;
  return AuditTrackedComponent;
};

// Custom hooks for specific audit scenarios
export const useOrderAudit = () => {
  const audit = useAudit();

  return {
    trackOrderView: (orderId: number) => {
      audit.track({
        action: AuditAction.PAGE_VIEW,
        entity: AuditEntity.ORDER,
        entityId: orderId,
        metadata: { action: 'order_view' }
      });
    },
    trackOrderUpdate: (orderId: number, updateType: string, changes: Record<string, any>) => {
      audit.track({
        action: AuditAction.ORDER_UPDATE,
        entity: AuditEntity.ORDER,
        entityId: orderId,
        metadata: {
          updateType,
          changes
        }
      });
    },
    trackOrderStatusChange: (orderId: number, fromStatus: string, toStatus: string) => {
      audit.track({
        action: AuditAction.ORDER_UPDATE,
        entity: AuditEntity.ORDER,
        entityId: orderId,
        metadata: {
          action: 'status_change',
          fromStatus,
          toStatus
        }
      });
    }
  };
};

export const useProductAudit = () => {
  const audit = useAudit();

  return {
    trackProductView: (productId: number, productName: string) => {
      audit.track({
        action: AuditAction.PRODUCT_VIEW,
        entity: AuditEntity.PRODUCT,
        entityId: productId,
        metadata: { productName }
      });
    },
    trackProductUpdate: (productId: number, changes: Record<string, any>) => {
      audit.track({
        action: AuditAction.PRODUCT_UPDATE,
        entity: AuditEntity.PRODUCT,
        entityId: productId,
        metadata: { changes }
      });
    }
  };
};

export const useCartAudit = () => {
  const audit = useAudit();

  return {
    trackAddToCart: (productId: number, quantity: number, productName?: string) => {
      audit.track({
        action: AuditAction.CART_ADD,
        entity: AuditEntity.CART,
        entityId: productId,
        metadata: {
          quantity,
          productName
        }
      });
    },
    trackRemoveFromCart: (productId: number, quantity: number, productName?: string) => {
      audit.track({
        action: AuditAction.CART_REMOVE,
        entity: AuditEntity.CART,
        entityId: productId,
        metadata: {
          quantity,
          productName
        }
      });
    },
    trackCartUpdate: (productId: number, oldQuantity: number, newQuantity: number) => {
      audit.track({
        action: AuditAction.CART_UPDATE,
        entity: AuditEntity.CART,
        entityId: productId,
        metadata: {
          oldQuantity,
          newQuantity,
          quantityChange: newQuantity - oldQuantity
        }
      });
    }
  };
};

// Error boundary with audit tracking
interface AuditErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class AuditErrorBoundary extends React.Component<
  { children: ReactNode; fallback?: ReactNode },
  AuditErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): AuditErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Track the error
    auditTracker.track({
      action: AuditAction.ERROR_OCCURRED,
      entity: AuditEntity.SYSTEM,
      metadata: {
        errorMessage: error.message,
        errorStack: error.stack,
        errorInfo: errorInfo.componentStack,
        errorType: 'react_error_boundary',
        timestamp: new Date().toISOString()
      }
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-lg font-semibold text-red-800">Something went wrong</h2>
          <p className="text-red-600">An error occurred while rendering this component.</p>
        </div>
      );
    }

    return this.props.children;
  }
}
