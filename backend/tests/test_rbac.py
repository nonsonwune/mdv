"""Tests for RBAC (Role-Based Access Control) implementation."""
import pytest
from mdv.models import Role
from mdv.rbac import Permission, has_permission, has_any_permission, has_all_permissions, ROLE_PERMISSIONS


class TestRolePermissions:
    """Test role-permission mappings."""
    
    def test_admin_has_all_permissions(self):
        """Admin should have all permissions."""
        admin_perms = ROLE_PERMISSIONS[Role.admin]
        all_permissions = set(Permission)
        
        assert admin_perms == all_permissions, "Admin should have all permissions"
    
    def test_supervisor_permissions(self):
        """Test supervisor permission set."""
        supervisor_perms = ROLE_PERMISSIONS[Role.supervisor]
        
        # Should have product management permissions
        assert Permission.PRODUCT_VIEW in supervisor_perms
        assert Permission.PRODUCT_CREATE in supervisor_perms
        assert Permission.PRODUCT_EDIT in supervisor_perms
        # Should NOT have product delete (as per requirements)
        assert Permission.PRODUCT_DELETE not in supervisor_perms
        
        # Should have user management permissions
        assert Permission.USER_VIEW in supervisor_perms
        assert Permission.USER_CREATE in supervisor_perms
        assert Permission.USER_EDIT in supervisor_perms
        
        # Should have inventory permissions
        assert Permission.INVENTORY_VIEW in supervisor_perms
        assert Permission.INVENTORY_ADJUST in supervisor_perms
        
        # Should have analytics permissions
        assert Permission.ANALYTICS_VIEW in supervisor_perms
    
    def test_operations_permissions(self):
        """Test operations staff permission set."""
        operations_perms = ROLE_PERMISSIONS[Role.operations]
        
        # Should have product permissions including delete
        assert Permission.PRODUCT_VIEW in operations_perms
        assert Permission.PRODUCT_CREATE in operations_perms
        assert Permission.PRODUCT_EDIT in operations_perms
        assert Permission.PRODUCT_DELETE in operations_perms
        
        # Should have inventory permissions
        assert Permission.INVENTORY_VIEW in operations_perms
        assert Permission.INVENTORY_ADJUST in operations_perms
        
        # Should have order fulfillment permissions
        assert Permission.ORDER_VIEW in operations_perms
        assert Permission.ORDER_EDIT in operations_perms
        assert Permission.ORDER_FULFILL in operations_perms
        
        # Should NOT have user management permissions
        assert Permission.USER_CREATE not in operations_perms
        assert Permission.USER_DELETE not in operations_perms
    
    def test_logistics_permissions(self):
        """Test logistics staff permission set."""
        logistics_perms = ROLE_PERMISSIONS[Role.logistics]
        
        # Should have view-only product permissions
        assert Permission.PRODUCT_VIEW in logistics_perms
        assert Permission.PRODUCT_CREATE not in logistics_perms
        assert Permission.PRODUCT_DELETE not in logistics_perms
        
        # Should have view-only inventory permissions
        assert Permission.INVENTORY_VIEW in logistics_perms
        assert Permission.INVENTORY_ADJUST not in logistics_perms
        
        # Should have order viewing and editing (for shipping)
        assert Permission.ORDER_VIEW in logistics_perms
        assert Permission.ORDER_EDIT in logistics_perms
        
        # Should NOT have user management
        assert Permission.USER_CREATE not in logistics_perms
        assert Permission.USER_DELETE not in logistics_perms
    
    def test_permission_aliases_exist(self):
        """Test that permission aliases are properly defined."""
        # Check inventory aliases
        assert Permission.VIEW_INVENTORY == Permission.INVENTORY_VIEW
        assert Permission.MANAGE_INVENTORY == Permission.INVENTORY_ADJUST
        
        # Check user aliases
        assert Permission.VIEW_USERS == Permission.USER_VIEW
        assert Permission.DELETE_USERS == Permission.USER_DELETE
        
        # Check report aliases
        assert Permission.VIEW_REPORTS == Permission.REPORT_VIEW
        assert Permission.EXPORT_DATA == Permission.REPORT_EXPORT


class TestPermissionCheckers:
    """Test permission checking functions."""
    
    def test_has_permission_admin(self):
        """Test admin has all permissions."""
        for permission in Permission:
            assert has_permission(Role.admin, permission)
    
    def test_has_permission_logistics(self):
        """Test logistics specific permissions."""
        assert has_permission(Role.logistics, Permission.PRODUCT_VIEW)
        assert not has_permission(Role.logistics, Permission.PRODUCT_CREATE)
        assert has_permission(Role.logistics, Permission.INVENTORY_VIEW)
        assert not has_permission(Role.logistics, Permission.INVENTORY_ADJUST)
    
    def test_has_any_permission(self):
        """Test has_any_permission function."""
        # Operations should have at least one of these
        assert has_any_permission(
            Role.operations, 
            Permission.PRODUCT_CREATE, 
            Permission.USER_CREATE  # They don't have this one
        )
        
        # Logistics shouldn't have any of these admin permissions
        assert not has_any_permission(
            Role.logistics,
            Permission.USER_CREATE,
            Permission.PRODUCT_CREATE,
            Permission.INVENTORY_ADJUST
        )
    
    def test_has_all_permissions(self):
        """Test has_all_permissions function."""
        # Admin should have all permissions
        test_perms = [Permission.PRODUCT_VIEW, Permission.USER_CREATE, Permission.ANALYTICS_VIEW]
        assert has_all_permissions(Role.admin, *test_perms)
        
        # Operations shouldn't have all these permissions
        assert not has_all_permissions(
            Role.operations,
            Permission.PRODUCT_VIEW,  # They have this
            Permission.USER_CREATE,   # They don't have this
        )


class TestRoleHierarchy:
    """Test role hierarchy and escalation prevention."""
    
    def test_role_separation(self):
        """Ensure roles have appropriate separation of concerns."""
        admin_perms = ROLE_PERMISSIONS[Role.admin]
        supervisor_perms = ROLE_PERMISSIONS[Role.supervisor]
        operations_perms = ROLE_PERMISSIONS[Role.operations]
        logistics_perms = ROLE_PERMISSIONS[Role.logistics]
        
        # Admin should have more permissions than supervisor
        assert len(admin_perms) > len(supervisor_perms)
        
        # Supervisor should have more permissions than operations
        assert len(supervisor_perms) > len(operations_perms)
        
        # Operations should have more permissions than logistics
        assert len(operations_perms) > len(logistics_perms)
        
        # Logistics should be most restricted
        assert len(logistics_perms) < len(operations_perms)
    
    def test_privilege_escalation_prevention(self):
        """Test that lower roles cannot perform higher privilege actions."""
        # Operations cannot manage users
        assert not has_permission(Role.operations, Permission.USER_CREATE)
        assert not has_permission(Role.operations, Permission.USER_DELETE)
        
        # Logistics cannot adjust inventory
        assert not has_permission(Role.logistics, Permission.INVENTORY_ADJUST)
        
        # Logistics cannot create products
        assert not has_permission(Role.logistics, Permission.PRODUCT_CREATE)
    
    def test_system_permissions_restricted(self):
        """Test that system permissions are restricted to admins."""
        system_permissions = [
            Permission.SYSTEM_SETTINGS,
            Permission.SYSTEM_AUDIT,
            Permission.SYSTEM_BACKUP
        ]
        
        for perm in system_permissions:
            # Only admin should have system permissions
            assert has_permission(Role.admin, perm)
            assert not has_permission(Role.supervisor, perm)
            assert not has_permission(Role.operations, perm)
            assert not has_permission(Role.logistics, perm)


class TestSecurityRequirements:
    """Test security-specific requirements."""
    
    def test_critical_permissions_properly_restricted(self):
        """Test that critical permissions are properly restricted."""
        critical_permissions = [
            Permission.USER_DELETE,
            Permission.PRODUCT_DELETE,
            Permission.SYSTEM_SETTINGS,
            Permission.SYSTEM_AUDIT,
        ]
        
        for perm in critical_permissions:
            # These should be restricted to admin/supervisor levels only
            non_privileged_roles = [Role.operations, Role.logistics]
            
            for role in non_privileged_roles:
                if perm == Permission.PRODUCT_DELETE and role == Role.operations:
                    # Operations can delete products as per requirements
                    assert has_permission(role, perm)
                else:
                    assert not has_permission(role, perm), f"{role.value} should not have {perm.value}"
    
    def test_read_write_separation(self):
        """Test proper read/write permission separation."""
        # Logistics should only have read permissions for inventory
        assert has_permission(Role.logistics, Permission.INVENTORY_VIEW)
        assert not has_permission(Role.logistics, Permission.INVENTORY_ADJUST)
        
        # Logistics should only have read permissions for products
        assert has_permission(Role.logistics, Permission.PRODUCT_VIEW)
        assert not has_permission(Role.logistics, Permission.PRODUCT_CREATE)
        assert not has_permission(Role.logistics, Permission.PRODUCT_EDIT)
        assert not has_permission(Role.logistics, Permission.PRODUCT_DELETE)
    
    def test_payment_permissions_secured(self):
        """Test that payment permissions are properly secured."""
        # Only admin and supervisor should process payments
        assert has_permission(Role.admin, Permission.PAYMENT_PROCESS)
        assert has_permission(Role.supervisor, Permission.PAYMENT_PROCESS)
        
        # Operations and logistics should only view payments
        assert has_permission(Role.operations, Permission.PAYMENT_VIEW)
        assert not has_permission(Role.operations, Permission.PAYMENT_PROCESS)
        
        assert not has_permission(Role.logistics, Permission.PAYMENT_VIEW)
        assert not has_permission(Role.logistics, Permission.PAYMENT_PROCESS)


if __name__ == "__main__":
    pytest.main([__file__])
