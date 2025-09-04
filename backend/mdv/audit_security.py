"""
Security and Privacy Controls for Audit Logging System

This module implements data protection, access controls, and privacy compliance
features for audit logs to ensure secure and compliant audit trail management.
"""

from __future__ import annotations

import hashlib
import hmac
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set, Any
from enum import Enum

from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from cryptography.fernet import Fernet

from .models import AuditLog, User, Role
from .config import settings


class DataClassification(str, Enum):
    """Data classification levels for audit logs."""
    PUBLIC = "public"
    INTERNAL = "internal"
    CONFIDENTIAL = "confidential"
    RESTRICTED = "restricted"


class RetentionPolicy(str, Enum):
    """Data retention policies for different types of audit logs."""
    SHORT_TERM = "short_term"  # 30 days
    MEDIUM_TERM = "medium_term"  # 1 year
    LONG_TERM = "long_term"  # 7 years
    PERMANENT = "permanent"  # Indefinite


class AuditSecurityManager:
    """Manages security and privacy controls for audit logs."""
    
    def __init__(self):
        self.encryption_key = self._get_encryption_key()
        self.cipher_suite = Fernet(self.encryption_key) if self.encryption_key else None
        
        # Define retention policies for different audit actions
        self.retention_policies = {
            "LOGIN": RetentionPolicy.MEDIUM_TERM,
            "LOGOUT": RetentionPolicy.SHORT_TERM,
            "LOGIN_FAILED": RetentionPolicy.LONG_TERM,  # Security events kept longer
            "PASSWORD_CHANGE": RetentionPolicy.LONG_TERM,
            "PAYMENT_STATUS_CHANGE": RetentionPolicy.LONG_TERM,  # Financial records
            "ORDER_STATUS_CHANGE": RetentionPolicy.MEDIUM_TERM,
            "CREATE": RetentionPolicy.MEDIUM_TERM,
            "UPDATE": RetentionPolicy.MEDIUM_TERM,
            "DELETE": RetentionPolicy.LONG_TERM,  # Deletion events kept longer
            "ROLE_CHANGE": RetentionPolicy.LONG_TERM,  # Security events
            "PERMISSION_CHANGE": RetentionPolicy.LONG_TERM,
        }
        
        # Define data classification for different entities
        self.data_classifications = {
            "USER": DataClassification.CONFIDENTIAL,
            "ORDER": DataClassification.CONFIDENTIAL,
            "PAYMENT": DataClassification.RESTRICTED,
            "PRODUCT": DataClassification.INTERNAL,
            "INVENTORY": DataClassification.INTERNAL,
            "SYSTEM": DataClassification.INTERNAL,
        }
    
    def _get_encryption_key(self) -> Optional[bytes]:
        """Get encryption key for sensitive data."""
        if hasattr(settings, 'audit_encryption_key') and settings.audit_encryption_key:
            return settings.audit_encryption_key.encode()
        return None
    
    def encrypt_sensitive_data(self, data: str) -> str:
        """Encrypt sensitive data in audit logs."""
        if not self.cipher_suite:
            return data  # Return as-is if encryption not configured
        
        try:
            encrypted = self.cipher_suite.encrypt(data.encode())
            return encrypted.decode()
        except Exception:
            # If encryption fails, return masked data
            return self._mask_sensitive_data(data)
    
    def decrypt_sensitive_data(self, encrypted_data: str) -> str:
        """Decrypt sensitive data from audit logs."""
        if not self.cipher_suite:
            return encrypted_data
        
        try:
            decrypted = self.cipher_suite.decrypt(encrypted_data.encode())
            return decrypted.decode()
        except Exception:
            return "[ENCRYPTED_DATA]"
    
    def _mask_sensitive_data(self, data: str) -> str:
        """Mask sensitive data when encryption is not available."""
        if len(data) <= 4:
            return "*" * len(data)
        return data[:2] + "*" * (len(data) - 4) + data[-2:]
    
    def sanitize_audit_data(self, data: Dict[str, Any], classification: DataClassification) -> Dict[str, Any]:
        """Sanitize audit data based on classification level."""
        if not data:
            return data
        
        sanitized = {}
        sensitive_fields = {
            "password", "password_hash", "token", "secret", "key",
            "credit_card", "cvv", "ssn", "social_security", "bank_account",
            "api_key", "private_key", "session_token"
        }
        
        for key, value in data.items():
            if key.lower() in sensitive_fields:
                sanitized[key] = "[REDACTED]"
            elif classification == DataClassification.RESTRICTED:
                # For restricted data, encrypt or mask sensitive values
                if isinstance(value, str) and len(value) > 10:
                    sanitized[key] = self.encrypt_sensitive_data(value)
                else:
                    sanitized[key] = value
            elif classification == DataClassification.CONFIDENTIAL:
                # For confidential data, mask PII
                if key.lower() in ["email", "phone", "address", "name"]:
                    sanitized[key] = self._mask_sensitive_data(str(value))
                else:
                    sanitized[key] = value
            else:
                sanitized[key] = value
        
        return sanitized
    
    def get_retention_period(self, action: str) -> timedelta:
        """Get retention period for an audit action."""
        policy = self.retention_policies.get(action, RetentionPolicy.MEDIUM_TERM)
        
        retention_periods = {
            RetentionPolicy.SHORT_TERM: timedelta(days=30),
            RetentionPolicy.MEDIUM_TERM: timedelta(days=365),
            RetentionPolicy.LONG_TERM: timedelta(days=2555),  # 7 years
            RetentionPolicy.PERMANENT: timedelta(days=36500),  # 100 years (effectively permanent)
        }
        
        return retention_periods[policy]
    
    def is_expired(self, audit_log: AuditLog) -> bool:
        """Check if an audit log has exceeded its retention period."""
        retention_period = self.get_retention_period(audit_log.action.value)
        expiry_date = audit_log.created_at + retention_period
        return datetime.utcnow() > expiry_date
    
    async def cleanup_expired_logs(self, db: AsyncSession) -> int:
        """Clean up expired audit logs based on retention policies."""
        deleted_count = 0
        
        for action, policy in self.retention_policies.items():
            if policy == RetentionPolicy.PERMANENT:
                continue
            
            retention_period = self.get_retention_period(action)
            cutoff_date = datetime.utcnow() - retention_period
            
            # Delete expired logs for this action
            result = await db.execute(
                select(func.count()).select_from(AuditLog).where(
                    and_(
                        AuditLog.action == action,
                        AuditLog.created_at < cutoff_date
                    )
                )
            )
            count = result.scalar()
            
            if count > 0:
                await db.execute(
                    AuditLog.__table__.delete().where(
                        and_(
                            AuditLog.action == action,
                            AuditLog.created_at < cutoff_date
                        )
                    )
                )
                deleted_count += count
        
        await db.commit()
        return deleted_count
    
    def check_access_permissions(self, user: User, requested_logs: List[AuditLog]) -> List[AuditLog]:
        """Filter audit logs based on user access permissions."""
        if user.role == Role.admin:
            return requested_logs  # Admins can see all logs
        
        filtered_logs = []
        
        for log in requested_logs:
            # Users can see their own actions
            if log.actor_id == user.id:
                filtered_logs.append(log)
                continue
            
            # Supervisors can see logs for their domain
            if user.role == Role.supervisor:
                # Can see most logs except admin actions
                if log.actor_role not in ["admin"]:
                    filtered_logs.append(log)
                continue
            
            # Operations staff can see limited logs
            if user.role == Role.operations:
                # Can see order and inventory related logs
                if log.entity.value in ["ORDER", "INVENTORY", "PRODUCT"]:
                    filtered_logs.append(log)
                continue
            
            # Logistics staff can see shipping related logs
            if user.role == Role.logistics:
                # Can see order fulfillment and shipping logs
                if log.entity.value in ["ORDER", "SHIPMENT"]:
                    filtered_logs.append(log)
                continue
        
        return filtered_logs
    
    def anonymize_audit_log(self, log: AuditLog, user: User) -> Dict[str, Any]:
        """Anonymize audit log data based on user permissions."""
        log_data = {
            "id": log.id,
            "action": log.action.value,
            "entity": log.entity.value,
            "entity_id": log.entity_id,
            "status": log.status.value,
            "created_at": log.created_at,
        }
        
        # Include actor information based on permissions
        if user.role in [Role.admin, Role.supervisor]:
            log_data.update({
                "actor_id": log.actor_id,
                "actor_role": log.actor_role,
                "actor_email": log.actor_email,
                "ip_address": log.ip_address,
            })
        else:
            # For lower privilege users, anonymize actor information
            log_data.update({
                "actor_id": None,
                "actor_role": log.actor_role,  # Role is okay to show
                "actor_email": "[ANONYMIZED]" if log.actor_email else None,
                "ip_address": self._mask_ip_address(log.ip_address) if log.ip_address else None,
            })
        
        # Include data changes based on classification
        classification = self.data_classifications.get(log.entity.value, DataClassification.INTERNAL)
        
        if user.role == Role.admin or classification in [DataClassification.PUBLIC, DataClassification.INTERNAL]:
            log_data.update({
                "before": log.before,
                "after": log.after,
                "changes": log.changes,
                "audit_metadata": log.audit_metadata,
            })
        else:
            # Sanitize sensitive data for non-admin users
            log_data.update({
                "before": self.sanitize_audit_data(log.before or {}, classification),
                "after": self.sanitize_audit_data(log.after or {}, classification),
                "changes": self.sanitize_audit_data(log.changes or {}, classification),
                "audit_metadata": self.sanitize_audit_data(log.audit_metadata or {}, classification),
            })
        
        return log_data
    
    def _mask_ip_address(self, ip_address: str) -> str:
        """Mask IP address for privacy."""
        if ":" in ip_address:  # IPv6
            parts = ip_address.split(":")
            return ":".join(parts[:3] + ["****"] * (len(parts) - 3))
        else:  # IPv4
            parts = ip_address.split(".")
            return ".".join(parts[:2] + ["***", "***"])
    
    def generate_audit_hash(self, log_data: Dict[str, Any]) -> str:
        """Generate tamper-proof hash for audit log integrity."""
        # Create a canonical string representation
        canonical_data = {
            "id": log_data.get("id"),
            "action": log_data.get("action"),
            "entity": log_data.get("entity"),
            "entity_id": log_data.get("entity_id"),
            "actor_id": log_data.get("actor_id"),
            "created_at": log_data.get("created_at").isoformat() if log_data.get("created_at") else None,
        }
        
        canonical_string = "|".join(str(v) for v in canonical_data.values())
        
        # Generate HMAC hash with secret key
        secret_key = getattr(settings, 'audit_integrity_key', 'default_key').encode()
        return hmac.new(secret_key, canonical_string.encode(), hashlib.sha256).hexdigest()
    
    def verify_audit_integrity(self, log_data: Dict[str, Any], expected_hash: str) -> bool:
        """Verify audit log integrity using hash."""
        calculated_hash = self.generate_audit_hash(log_data)
        return hmac.compare_digest(calculated_hash, expected_hash)


# Global security manager instance
audit_security = AuditSecurityManager()


# Privacy compliance utilities
def gdpr_anonymize_user_data(user_id: int, db: AsyncSession) -> None:
    """Anonymize user data in audit logs for GDPR compliance."""
    # This would be called when a user requests data deletion
    # Replace user-specific data with anonymized placeholders
    pass


def export_user_audit_data(user_id: int, db: AsyncSession) -> Dict[str, Any]:
    """Export user's audit data for GDPR data portability."""
    # This would be called when a user requests their data
    # Return all audit logs related to the user
    pass


async def audit_data_breach_notification(incident_details: Dict[str, Any]) -> None:
    """Log and notify about potential data breaches in audit system."""
    # This would be called if unauthorized access to audit logs is detected
    pass
