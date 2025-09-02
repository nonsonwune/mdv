# Admin User Management - Test Cases

## Test Environment Setup

### Prerequisites
1. **Database**: Ensure `force_password_change` column exists in users table
2. **Test Users**: Create test users with different roles:
   - `admin@test.com` (Admin role)
   - `supervisor@test.com` (Supervisor role)  
   - `operations@test.com` (Operations role)
   - `logistics@test.com` (Logistics role)
3. **Test Orders**: Create some test orders for business rule validation

## 1. Password Reset Functionality Tests

### Test Case 1.1: Admin Password Reset (Happy Path)
**Scenario**: Admin resets another user's password
**Steps**:
1. Login as admin user
2. Navigate to `/admin/users`
3. Click password reset button (key icon) for operations user
4. Confirm the reset action
**Expected Results**:
- ✅ Success message shows temporary password "password123"
- ✅ User's `force_password_change` flag is set to `true`
- ✅ Audit log entry created
- ✅ User must change password on next login

### Test Case 1.2: Supervisor Password Reset (Restricted)
**Scenario**: Supervisor tries to reset admin password
**Steps**:
1. Login as supervisor user
2. Navigate to `/admin/users`
3. Verify admin user row
**Expected Results**:
- ✅ Password reset button (key icon) is hidden for admin users
- ✅ Password reset button visible for operations/logistics users
- ✅ API call returns 403 if attempted directly

### Test Case 1.3: Self Password Reset Prevention
**Scenario**: User tries to reset their own password
**Steps**:
1. Login as any admin user
2. Try to reset own password via API
**Expected Results**:
- ✅ API returns 400 error: "Cannot reset your own password"

### Test Case 1.4: Force Password Change Flow
**Scenario**: User with forced password change logs in
**Steps**:
1. Reset a user's password (set force_password_change = true)
2. Login with that user using "password123"
**Expected Results**:
- ✅ Login returns special response with `force_password_change: true`
- ✅ User redirected to password change form
- ✅ Cannot access system until password changed
- ✅ After password change, `force_password_change` flag cleared

## 2. User Deletion Tests

### Test Case 2.1: User Deletion (Happy Path)
**Scenario**: Admin deletes user with no active orders
**Steps**:
1. Login as admin
2. Navigate to `/admin/users`
3. Click delete button for user with no orders
4. Confirm deletion
**Expected Results**:
- ✅ User is soft deleted (active = false)
- ✅ Success message displayed
- ✅ User removed from active users list
- ✅ Audit log entry created

### Test Case 2.2: User Deletion with Active Orders
**Scenario**: Admin tries to delete user with active orders
**Steps**:
1. Create test order for a user
2. Try to delete that user
**Expected Results**:
- ✅ Error message: "User has X active order(s). Use force=true to delete anyway."
- ✅ Option to force delete presented
- ✅ Force delete works and sets forced flag in audit log

### Test Case 2.3: Supervisor Deletion Restrictions
**Scenario**: Supervisor tries to delete admin user
**Steps**:
1. Login as supervisor
2. Navigate to `/admin/users`
3. Check admin user row
**Expected Results**:
- ✅ Delete button hidden for admin/supervisor users
- ✅ "No actions available" message shown
- ✅ API returns 403 if attempted directly

### Test Case 2.4: Self Deletion Prevention
**Scenario**: User tries to delete their own account
**Steps**:
1. Login as any user
2. Try to delete own account
**Expected Results**:
- ✅ API returns 400: "Cannot delete your own account"

## 3. Supervisor Role Restrictions Tests

### Test Case 3.1: User Creation Restrictions
**Scenario**: Supervisor tries to create admin/supervisor account
**Steps**:
1. Login as supervisor
2. Try to create user with admin role
3. Try to create user with supervisor role
**Expected Results**:
- ✅ API returns 403: "Supervisors cannot create admin or supervisor accounts"
- ✅ Can create operations/logistics users successfully

### Test Case 3.2: User Edit Restrictions
**Scenario**: Supervisor tries to edit admin account
**Steps**:
1. Login as supervisor
2. Try to edit admin user details
3. Try to promote operations user to admin
**Expected Results**:
- ✅ Edit button hidden for admin/supervisor users in UI
- ✅ API returns 403 for admin/supervisor account edits
- ✅ API returns 403 for role promotion to admin/supervisor

### Test Case 3.3: UI Permission Indicators
**Scenario**: Supervisor views user management page
**Steps**:
1. Login as supervisor
2. Navigate to `/admin/users`
**Expected Results**:
- ✅ Header shows "(Limited Access - Cannot manage Admin/Supervisor accounts)"
- ✅ Action buttons hidden for admin/supervisor users
- ✅ "No actions available" shown for restricted users

## 4. Security & Error Handling Tests

### Test Case 4.1: Permission Validation
**Scenario**: Test all permission boundaries
**Steps**:
1. Test each role's access to user management endpoints
2. Verify frontend permission guards work
**Expected Results**:
- ✅ Operations/Logistics users cannot access user management
- ✅ Supervisor restrictions properly enforced
- ✅ Admin has full access

### Test Case 4.2: Audit Logging
**Scenario**: Verify all actions are logged
**Steps**:
1. Perform various user management actions
2. Check audit logs
**Expected Results**:
- ✅ All actions logged with actor, target, before/after states
- ✅ Timestamps accurate
- ✅ Force flags recorded correctly

### Test Case 4.3: Error Message Quality
**Scenario**: Test error handling and messages
**Steps**:
1. Trigger various error conditions
2. Verify error messages are helpful
**Expected Results**:
- ✅ Clear, actionable error messages
- ✅ No sensitive information leaked
- ✅ Proper HTTP status codes

## 5. Integration Tests

### Test Case 5.1: Cross-Page Consistency
**Scenario**: Verify user status consistency across pages
**Steps**:
1. Deactivate user in user management
2. Check user appears correctly in other admin pages
**Expected Results**:
- ✅ Deactivated users don't appear in active user lists
- ✅ Order history still accessible
- ✅ User data preserved

### Test Case 5.2: Authentication Flow
**Scenario**: Test complete password reset flow
**Steps**:
1. Admin resets user password
2. User logs in with temporary password
3. User changes password
4. User logs in with new password
**Expected Results**:
- ✅ Each step works correctly
- ✅ No authentication bypass possible
- ✅ Force flag cleared after password change

## 6. Performance Tests

### Test Case 6.1: Large User Lists
**Scenario**: Test with many users
**Steps**:
1. Create 100+ test users
2. Load user management page
3. Perform various operations
**Expected Results**:
- ✅ Page loads in reasonable time (<3 seconds)
- ✅ Pagination works correctly
- ✅ Search/filter functions work

### Test Case 6.2: Permission Check Performance
**Scenario**: Verify permission checks don't slow down UI
**Steps**:
1. Load user management with many users
2. Measure time for permission calculations
**Expected Results**:
- ✅ Permission checks complete quickly
- ✅ UI remains responsive
- ✅ No noticeable lag

## Test Execution Checklist

### Manual Testing
- [ ] All password reset scenarios
- [ ] All user deletion scenarios  
- [ ] All supervisor restriction scenarios
- [ ] Error handling and edge cases
- [ ] UI/UX validation
- [ ] Cross-browser testing

### Automated Testing
- [ ] API endpoint tests
- [ ] Permission validation tests
- [ ] Database constraint tests
- [ ] Integration tests

### Security Testing
- [ ] Authorization bypass attempts
- [ ] SQL injection tests
- [ ] XSS prevention validation
- [ ] Audit log integrity

### Performance Testing
- [ ] Load testing with many users
- [ ] Permission check performance
- [ ] Database query optimization

## Success Criteria

✅ **All test cases pass**
✅ **No security vulnerabilities found**
✅ **Performance meets requirements**
✅ **Error handling is robust**
✅ **UI/UX is intuitive**
✅ **Documentation is complete**

## Rollback Plan

If critical issues are found:
1. **Immediate**: Disable new features via feature flags
2. **Database**: Rollback migration if necessary
3. **Code**: Revert to previous version
4. **Monitoring**: Watch for any residual issues
