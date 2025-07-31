# Role-Based Access Demonstration

## Test Accounts Created

### 1. Employee Role - Jessica Williams
- **Email**: jessica.williams@testschool.edu
- **Password**: EmployeePass123!
- **Access Level**: Dashboard only (timecard and leave requests)
- **Sidebar Navigation**: Only Dashboard visible

### 2. Admin Role - Admin User  
- **Email**: admin@testschool.edu
- **Password**: AdminPass123!
- **Access Level**: Dashboard + Administrator Timecard Approval only
- **Sidebar Navigation**: Dashboard + Administrator Timecard Approval

### 3. HR Role - Sarah Johnson
- **Email**: sarah.johnson@testschool.edu
- **Password**: HRPassword123!
- **Access Level**: Full system access (all HR, payroll, district functions)
- **Sidebar Navigation**: Complete menu with all HR and system functions

### 4. Payroll Role - Michael Chen
- **Email**: michael.chen@testschool.edu
- **Password**: PayrollPass123!
- **Access Level**: Full system access + employee access approval authority
- **Sidebar Navigation**: Complete menu + Employee Access Management (unique to Payroll)

## Role Hierarchy (Lowest to Highest Access)
1. **Employee** → Dashboard only
2. **Admin** → Limited (timecard approval)
3. **HR** → Full system access
4. **Payroll** → Full system access + employee approval authority

## Key Differences to Test
- **Employee**: Can only see Dashboard
- **Admin**: Can only see Dashboard and Administrator Timecard Approval
- **HR**: Can see all modules except Employee Access Management
- **Payroll**: Can see all modules INCLUDING Employee Access Management

Log in with each account to see how the sidebar navigation changes based on role permissions.