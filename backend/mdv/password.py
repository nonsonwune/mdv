"""
Password hashing and verification utilities using bcrypt.
"""
from passlib.context import CryptContext
import hashlib

# Create password context with bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.
    
    Args:
        password: Plain text password
        
    Returns:
        Hashed password string
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against a hash.
    
    Args:
        plain_password: Plain text password to verify
        hashed_password: Hashed password to check against
        
    Returns:
        True if password matches, False otherwise
    """
    # Handle legacy SHA256 hashes for backward compatibility
    if hashed_password and len(hashed_password) == 64 and not hashed_password.startswith('$'):
        # This looks like a SHA256 hash (64 hex characters)
        sha256_hash = hashlib.sha256(plain_password.encode()).hexdigest()
        return sha256_hash == hashed_password
    
    # Use bcrypt for new hashes
    return pwd_context.verify(plain_password, hashed_password)


def needs_rehash(hashed_password: str) -> bool:
    """
    Check if a password hash needs to be updated.
    
    Args:
        hashed_password: The current hashed password
        
    Returns:
        True if the hash should be updated, False otherwise
    """
    # SHA256 hashes need rehashing
    if hashed_password and len(hashed_password) == 64 and not hashed_password.startswith('$'):
        return True
    
    # Check if bcrypt hash needs update (e.g., if cost factor changed)
    return pwd_context.needs_update(hashed_password)


def migrate_password_hash(plain_password: str, old_hash: str) -> str:
    """
    Migrate an old password hash to bcrypt if verification succeeds.
    
    Args:
        plain_password: The plain text password
        old_hash: The old hash to migrate from
        
    Returns:
        New bcrypt hash if verification succeeds, otherwise returns old hash
    """
    if verify_password(plain_password, old_hash):
        return hash_password(plain_password)
    return old_hash
