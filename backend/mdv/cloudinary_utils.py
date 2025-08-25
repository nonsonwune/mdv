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
            raise ValueError("Cloudinary is not configured. Please set CLOUDINARY_URL environment variable.")
        
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
            raise ValueError("Cloudinary is not configured")
        
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
            raise ValueError("Cloudinary is not configured")
        
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
        # Check file size
        size_mb = len(file_data) / (1024 * 1024)
        if size_mb > max_size_mb:
            return False, f"File size {size_mb:.2f}MB exceeds maximum {max_size_mb}MB"
        
        # Check file format using magic bytes
        if allowed_formats is None:
            allowed_formats = ["jpg", "jpeg", "png", "gif", "webp"]
        
        # Simple magic byte checking
        magic_bytes = {
            b'\xff\xd8\xff': 'jpg',
            b'\x89PNG\r\n\x1a\n': 'png',
            b'GIF87a': 'gif',
            b'GIF89a': 'gif',
            b'RIFF': 'webp',  # WebP starts with RIFF
        }
        
        file_header = file_data[:10]
        detected_format = None
        
        for magic, fmt in magic_bytes.items():
            if file_header.startswith(magic):
                detected_format = fmt
                break
        
        # Special check for WebP
        if file_header.startswith(b'RIFF') and file_data[8:12] == b'WEBP':
            detected_format = 'webp'
        
        if detected_format and detected_format not in allowed_formats:
            return False, f"File format {detected_format} is not allowed. Allowed formats: {', '.join(allowed_formats)}"
        
        if not detected_format:
            return False, "Could not determine file format or format is not supported"
        
        return True, ""


# Global instance
cloudinary_manager = CloudinaryManager()
