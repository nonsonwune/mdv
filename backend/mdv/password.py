"""
Password hashing and verification utilities using bcrypt.
"""
import bcrypt
import hashlib


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.

    Args:
        password: Plain text password

    Returns:
        Hashed password string
    """
    # Generate salt and hash password
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


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
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except (ValueError, TypeError):
        return False


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

    # For bcrypt, we'll consider all existing hashes as valid for now
    # In the future, we could check the cost factor and update if needed
    return False


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
