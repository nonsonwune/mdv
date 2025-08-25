from sqlalchemy import Column, BigInteger, Integer, Text, Boolean, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from .base import Base  # adjust import

class ProductImage(Base):
    __tablename__ = 'product_images'

    id = Column(BigInteger, primary_key=True)
    product_id = Column(BigInteger, ForeignKey('products.id', ondelete='CASCADE'), nullable=False, index=True)
    url = Column(Text, nullable=False)
    alt_text = Column(Text)
    width = Column(Integer)
    height = Column(Integer)
    sort_order = Column(Integer, nullable=False, server_default='0')
    is_primary = Column(Boolean, nullable=False, server_default='false')
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

# In your Product model (models/product.py), add:
# images = relationship('ProductImage', backref='product', cascade='all, delete-orphan', order_by="(ProductImage.is_primary.desc(), ProductImage.sort_order.asc())")

