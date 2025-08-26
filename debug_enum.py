#!/usr/bin/env python3
"""Debug script to test OrderStatus enum behavior"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

try:
    from backend.mdv.models import OrderStatus
    
    print("=== ENUM DEBUG OUTPUT ===")
    print(f"OrderStatus.pending_payment = {repr(OrderStatus.pending_payment)}")
    print(f"OrderStatus.pending_payment.value = {repr(OrderStatus.pending_payment.value)}")
    print(f"OrderStatus.pending_payment.name = {repr(OrderStatus.pending_payment.name)}")
    print(f"str(OrderStatus.pending_payment) = {repr(str(OrderStatus.pending_payment))}")
    print(f"OrderStatus.pending_payment == 'PendingPayment' = {OrderStatus.pending_payment == 'PendingPayment'}")
    print(f"OrderStatus.pending_payment == 'pending_payment' = {OrderStatus.pending_payment == 'pending_payment'}")
    
    # Test all values
    print("\n=== ALL ENUM VALUES ===")
    for status in OrderStatus:
        print(f"{status.name} -> {repr(status.value)} (str: {repr(str(status))})")
        
    print(f"\n=== ENUM CLASS TYPE ===")
    print(f"OrderStatus.__bases__ = {OrderStatus.__bases__}")
    print(f"isinstance(OrderStatus.pending_payment, str) = {isinstance(OrderStatus.pending_payment, str)}")
    
except Exception as e:
    print(f"Error importing: {e}")
    import traceback
    traceback.print_exc()
