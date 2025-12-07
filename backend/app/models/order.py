"""
Purchase Order models for ordering and restocking
"""
from sqlalchemy import Column, String, ForeignKey, DateTime, Numeric, Integer, Boolean, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import enum
from datetime import datetime
from app.models.base import BaseModel


class OrderStatus(str, enum.Enum):
    """Purchase order status enumeration"""
    PENDING = "pending"
    ORDERED = "ordered"
    SHIPPED = "shipped"
    PARTIAL = "partial"
    RECEIVED = "received"
    CANCELLED = "cancelled"


class ShippingCarrier(str, enum.Enum):
    """Common shipping carriers"""
    UPS = "ups"
    FEDEX = "fedex"
    USPS = "usps"
    DHL = "dhl"
    AMAZON = "amazon"
    ONTRAC = "ontrac"
    OTHER = "other"


class Vendor(BaseModel):
    """Vendor model for suppliers"""
    __tablename__ = "vendors"
    
    name = Column(String(255), nullable=False, unique=True, index=True)
    contact_name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    address = Column(String(500), nullable=True)
    website = Column(String(255), nullable=True)
    notes = Column(String(1000), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    purchase_orders = relationship("PurchaseOrder", back_populates="vendor")
    auto_order_rules = relationship("AutoOrderRule", back_populates="preferred_vendor")
    
    def __repr__(self):
        return f"<Vendor {self.name}>"


class PurchaseOrder(BaseModel):
    """Purchase Order model for tracking orders"""
    __tablename__ = "purchase_orders"
    
    po_number = Column(String(100), unique=True, nullable=False, index=True)
    vendor_id = Column(
        UUID(as_uuid=True),
        ForeignKey("vendors.id", ondelete="RESTRICT"),
        nullable=False
    )
    status = Column(SQLEnum(OrderStatus), nullable=False, default=OrderStatus.PENDING)
    order_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    expected_delivery_date = Column(DateTime, nullable=True)
    received_date = Column(DateTime, nullable=True)
    total_cost = Column(Numeric(10, 2), nullable=True)
    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    
    # Tracking Information
    tracking_number = Column(String(100), nullable=True, index=True)
    carrier = Column(SQLEnum(ShippingCarrier), nullable=True)
    carrier_other = Column(String(100), nullable=True)  # For "other" carrier name
    shipped_date = Column(DateTime, nullable=True)
    tracking_url = Column(String(500), nullable=True)
    shipping_notes = Column(Text, nullable=True)
    
    # Relationships
    vendor = relationship("Vendor", back_populates="purchase_orders")
    items = relationship("PurchaseOrderItem", back_populates="purchase_order")
    
    @property
    def tracking_link(self):
        """Generate tracking URL based on carrier"""
        if not self.tracking_number:
            return None
        if self.tracking_url:
            return self.tracking_url
        # Auto-generate tracking URLs for known carriers
        tracking_urls = {
            ShippingCarrier.UPS: f"https://www.ups.com/track?tracknum={self.tracking_number}",
            ShippingCarrier.FEDEX: f"https://www.fedex.com/fedextrack/?trknbr={self.tracking_number}",
            ShippingCarrier.USPS: f"https://tools.usps.com/go/TrackConfirmAction?tLabels={self.tracking_number}",
            ShippingCarrier.DHL: f"https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id={self.tracking_number}",
            ShippingCarrier.AMAZON: f"https://www.amazon.com/progress-tracker/package?trackingId={self.tracking_number}",
        }
        return tracking_urls.get(self.carrier)
    
    def __repr__(self):
        return f"<PurchaseOrder {self.po_number} - {self.status}>"


class PurchaseOrderItem(BaseModel):
    """Purchase Order Item model for order line items"""
    __tablename__ = "purchase_order_items"
    
    po_id = Column(
        UUID(as_uuid=True),
        ForeignKey("purchase_orders.id", ondelete="CASCADE"),
        nullable=False
    )
    item_id = Column(
        UUID(as_uuid=True),
        ForeignKey("items.id", ondelete="RESTRICT"),
        nullable=False
    )
    quantity_ordered = Column(Integer, nullable=False)
    quantity_received = Column(Integer, nullable=False, default=0)
    unit_cost = Column(Numeric(10, 2), nullable=True)
    total_cost = Column(Numeric(10, 2), nullable=True)
    
    # Relationships
    purchase_order = relationship("PurchaseOrder", back_populates="items")
    item = relationship("Item", back_populates="purchase_order_items")
    
    def __repr__(self):
        return f"<POItem {self.item_id}: {self.quantity_ordered}>"


class AutoOrderRule(BaseModel):
    """Auto Order Rule model for automated ordering"""
    __tablename__ = "auto_order_rules"
    
    item_id = Column(
        UUID(as_uuid=True),
        ForeignKey("items.id", ondelete="CASCADE"),
        nullable=False,
        unique=True
    )
    trigger_quantity = Column(Integer, nullable=False)  # Auto-order when below
    order_quantity = Column(Integer, nullable=False)  # How much to order
    preferred_vendor_id = Column(
        UUID(as_uuid=True),
        ForeignKey("vendors.id", ondelete="SET NULL"),
        nullable=True
    )
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    item = relationship("Item", back_populates="auto_order_rules")
    preferred_vendor = relationship("Vendor", back_populates="auto_order_rules")
    
    def __repr__(self):
        return f"<AutoOrderRule {self.item_id}: trigger={self.trigger_quantity}>"
