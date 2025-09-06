"""
Cloudinary integration for image upload and management.
"""
from __future__ import annotations

import cloudinary
import cloudinary.uploader
import cloudinary.api
from cloudinary.utils import cloudinary_url
from typing import Optional, Dict, Any, List, Tuple
import logging
from pathlib import Path
import mimetypes

from .config import settings

logger = logging.getLogger(__name__)


class CloudinaryManager:
    """Manages Cloudinary operations for product images."""
    
    def __init__(self):
        """Initialize Cloudinary configuration from settings."""
        if settings.cloudinary_url:
            # Parse the Cloudinary URL and configure
            cloudinary.config(
                cloudinary_url=settings.cloudinary_url
            )
            self.configured = True
            logger.info("Cloudinary configured successfully")
        else:
            self.configured = False
            logger.warning("Cloudinary URL not configured, image uploads will be disabled")
    
    def upload_image(
        self,
        file_data: bytes,
        filename: str,
        folder: str = "products",
        resource_type: str = "image",
        transformation: Optional[Dict[str, Any]] = None,
        tags: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Upload an image to Cloudinary with optimization.
        
        Args:
            file_data: Raw image data
            filename: Original filename
            folder: Cloudinary folder path
            resource_type: Type of resource (image, video, etc.)
            transformation: Custom transformation options
            tags: List of tags for the image
            
        Returns:
            Dictionary with upload results including URL, public_id, dimensions
            
        Raises:
            ValueError: If Cloudinary is not configured
            Exception: For upload failures
        """
        if not self.configured:
            # Return mock data for development when Cloudinary is not configured
            import uuid
            import time
            mock_id = str(uuid.uuid4())[:8]
            logger.warning(f"Cloudinary not configured, using mock upload for development: {filename}")
            return {
                "public_id": f"dev/{folder}/{mock_id}",
                "url": f"https://via.placeholder.com/600x400?text={filename}",
                "width": 600,
                "height": 400,
                "format": "jpg",
                "size": len(file_data),
                "version": int(time.time()),
            }
        
        # Default transformation for optimization
        default_transformation = {
            "quality": "auto:good",
            "fetch_format": "auto",
            "flags": "progressive",
        }
        
        if transformation:
            default_transformation.update(transformation)
        
        # Prepare upload options
        upload_options = {
            "folder": folder,
            "resource_type": resource_type,
            "transformation": default_transformation,
            "allowed_formats": ["jpg", "jpeg", "png", "gif", "webp", "svg"],
            "use_filename": True,
            "unique_filename": True,
            "overwrite": False,
        }
        
        if tags:
            upload_options["tags"] = tags
        
        # Detect mime type
        mime_type = mimetypes.guess_type(filename)[0]
        if mime_type:
            upload_options["format"] = mime_type.split("/")[-1]
        
        try:
            # Upload to Cloudinary
            result = cloudinary.uploader.upload(
                file_data,
                **upload_options
            )
            
            logger.info(f"Image uploaded successfully: {result['public_id']}")
            
            return {
                "public_id": result["public_id"],
                "url": result["secure_url"],
                "width": result.get("width"),
                "height": result.get("height"),
                "format": result.get("format"),
                "size": result.get("bytes"),
                "version": result.get("version"),
            }
            
        except Exception as e:
            logger.error(f"Failed to upload image to Cloudinary: {str(e)}")
            raise
    
    def delete_image(self, public_id: str) -> bool:
        """
        Delete an image from Cloudinary.
        
        Args:
            public_id: The public ID of the image to delete
            
        Returns:
            True if deletion was successful
            
        Raises:
            ValueError: If Cloudinary is not configured
        """
        if not self.configured:
            logger.warning(f"Cloudinary not configured, mock delete for: {public_id}")
            return True  # Return success in development
        
        try:
            result = cloudinary.uploader.destroy(public_id)
            success = result.get("result") == "ok"
            
            if success:
                logger.info(f"Image deleted successfully: {public_id}")
            else:
                logger.warning(f"Failed to delete image: {public_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error deleting image from Cloudinary: {str(e)}")
            return False
    
    def generate_responsive_urls(
        self,
        public_id: str,
        base_url: str,
        sizes: Optional[List[int]] = None
    ) -> Dict[str, str]:
        """
        Generate responsive image URLs for different screen sizes.
        
        Args:
            public_id: The public ID of the image
            base_url: The base secure URL of the image
            sizes: List of widths to generate (default: common responsive sizes)
            
        Returns:
            Dictionary mapping size names to URLs
        """
        if not self.configured:
            # Return mock URLs for development
            return {
                "original": base_url,
                "thumbnail": base_url,
                "small": base_url,
                "medium": base_url
            }
            
        if not sizes:
            sizes = [320, 640, 768, 1024, 1280, 1920]
        
        responsive_urls = {
            "original": base_url
        }
        
        for width in sizes:
            transformation = {
                "width": width,
                "quality": "auto:good",
                "fetch_format": "auto",
                "flags": "progressive",
                "crop": "limit"  # Limit to not upscale
            }
            
            url, _ = cloudinary_url(public_id, transformation=transformation, secure=True)
            responsive_urls[f"w{width}"] = url
        
        # Add thumbnail versions
        thumbnail_sizes = [
            ("thumbnail", 150, 150, "fill"),
            ("small", 300, 300, "limit"),
            ("medium", 600, 600, "limit"),
        ]
        
        for name, width, height, crop in thumbnail_sizes:
            transformation = {
                "width": width,
                "height": height,
                "crop": crop,
                "quality": "auto:good",
                "fetch_format": "auto",
            }
            
            url, _ = cloudinary_url(public_id, transformation=transformation, secure=True)
            responsive_urls[name] = url
        
        return responsive_urls
    
    def bulk_delete(self, public_ids: List[str]) -> Dict[str, bool]:
        """
        Delete multiple images from Cloudinary.
        
        Args:
            public_ids: List of public IDs to delete
            
        Returns:
            Dictionary mapping public_id to deletion success status
        """
        if not self.configured:
            logger.warning(f"Cloudinary not configured, mock bulk delete for {len(public_ids)} images")
            return {pid: True for pid in public_ids}  # Return success for all in development
        
        results = {}
        
        for public_id in public_ids:
            results[public_id] = self.delete_image(public_id)
        
        return results
    
    def get_image_info(self, public_id: str) -> Optional[Dict[str, Any]]:
        """
        Get information about an image from Cloudinary.
        
        Args:
            public_id: The public ID of the image
            
        Returns:
            Dictionary with image information or None if not found
        """
        if not self.configured:
            return None
        
        try:
            result = cloudinary.api.resource(public_id)
            return {
                "public_id": result["public_id"],
                "url": result["secure_url"],
                "width": result["width"],
                "height": result["height"],
                "format": result["format"],
                "size": result["bytes"],
                "created_at": result["created_at"],
            }
        except Exception as e:
            logger.error(f"Failed to get image info: {str(e)}")
            return None
    
    def validate_image(
        self,
        file_data: bytes,
        max_size_mb: float = 10,
        allowed_formats: Optional[List[str]] = None
    ) -> Tuple[bool, str]:
        """
        Validate image before upload.

        Args:
            file_data: Raw image data
            max_size_mb: Maximum file size in MB
            allowed_formats: List of allowed formats

        Returns:
            Tuple of (is_valid, error_message)
        """
        # Enhanced logging for debugging production issues
        logger.info(f"Validating image: size={len(file_data)} bytes, first_20_bytes={file_data[:20].hex() if len(file_data) >= 20 else file_data.hex()}")

        # Check if file is empty
        if len(file_data) == 0:
            logger.error("Image validation failed: Empty file")
            return False, "File is empty"

        # Check file size
        size_mb = len(file_data) / (1024 * 1024)
        if size_mb > max_size_mb:
            logger.error(f"Image validation failed: File size {size_mb:.2f}MB exceeds maximum {max_size_mb}MB")
            return False, f"File size {size_mb:.2f}MB exceeds maximum {max_size_mb}MB"

        # Check file format using magic bytes
        if allowed_formats is None:
            allowed_formats = ["jpg", "jpeg", "png", "gif", "webp", "svg"]

        # Enhanced magic byte checking with more comprehensive patterns
        magic_bytes = {
            # JPEG variants
            b'\xff\xd8\xff\xe0': 'jpg',  # JFIF
            b'\xff\xd8\xff\xe1': 'jpg',  # EXIF
            b'\xff\xd8\xff\xe2': 'jpg',  # Canon
            b'\xff\xd8\xff\xe3': 'jpg',  # Samsung
            b'\xff\xd8\xff\xe8': 'jpg',  # SPIFF
            b'\xff\xd8\xff\xdb': 'jpg',  # Generic JPEG
            b'\xff\xd8\xff': 'jpg',      # Fallback JPEG

            # PNG
            b'\x89PNG\r\n\x1a\n': 'png',

            # GIF
            b'GIF87a': 'gif',
            b'GIF89a': 'gif',

            # WebP
            b'RIFF': 'webp',  # Will be validated further below

            # SVG (XML-based)
            b'<?xml': 'svg',
            b'<svg': 'svg',
        }

        file_header = file_data[:20] if len(file_data) >= 20 else file_data
        detected_format = None

        # Check magic bytes
        for magic, fmt in magic_bytes.items():
            if file_header.startswith(magic):
                detected_format = fmt
                logger.info(f"Detected format by magic bytes: {fmt}")
                break

        # Special validation for WebP
        if file_header.startswith(b'RIFF') and len(file_data) >= 12:
            if file_data[8:12] == b'WEBP':
                detected_format = 'webp'
                logger.info("Confirmed WebP format")
            else:
                logger.warning(f"RIFF file but not WebP: {file_data[8:12]}")
                detected_format = None

        # Special validation for SVG
        if detected_format == 'svg':
            # Additional SVG validation
            try:
                file_text = file_data.decode('utf-8', errors='ignore')[:1000]
                if '<svg' in file_text.lower() or 'xmlns="http://www.w3.org/2000/svg"' in file_text:
                    logger.info("Confirmed SVG format")
                else:
                    logger.warning("XML file but not SVG")
                    detected_format = None
            except Exception as e:
                logger.warning(f"SVG validation error: {e}")
                detected_format = None

        # Fallback: Try to detect by common patterns in first 100 bytes
        if not detected_format and len(file_data) >= 10:
            first_100 = file_data[:100].lower()
            if b'jfif' in first_100 or b'exif' in first_100:
                detected_format = 'jpg'
                logger.info("Detected JPEG by JFIF/EXIF marker")
            elif b'png' in first_100:
                detected_format = 'png'
                logger.info("Detected PNG by content marker")

        # Log detection result
        if detected_format:
            logger.info(f"Final detected format: {detected_format}")
        else:
            logger.error(f"Could not detect format. File header: {file_header.hex()}")

        # Validate against allowed formats
        if detected_format and detected_format not in allowed_formats:
            error_msg = f"File format {detected_format} is not allowed. Allowed formats: {', '.join(allowed_formats)}"
            logger.error(f"Image validation failed: {error_msg}")
            return False, error_msg

        if not detected_format:
            error_msg = f"Could not determine file format or format is not supported. File size: {len(file_data)} bytes, Header: {file_header.hex()}"
            logger.error(f"Image validation failed: {error_msg}")
            return False, error_msg

        logger.info(f"Image validation successful: format={detected_format}, size={size_mb:.2f}MB")
        return True, ""


# Global instance
cloudinary_manager = CloudinaryManager()
