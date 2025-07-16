# School District HR Management System

## Overview

This is a comprehensive human resources management system designed specifically for school districts. The application automates document processing, employee onboarding, payroll management, leave tracking, and compliance monitoring using AI-powered features. It's built as a full-stack web application with a React frontend and Express backend.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with custom design system and CSS variables for theming
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Database Provider**: Neon serverless PostgreSQL
- **Session Management**: Express sessions with PostgreSQL session store
- **AI Integration**: OpenAI GPT-4o for document processing and intelligent automation

## Key Components

### Database Schema
The application uses a comprehensive schema with the following main entities:
- **Users**: Authentication and user management with role-based access
- **Employees**: Complete employee information including personal details, employment data, and emergency contacts
- **Leave Management**: Leave types, requests, and approval workflows
- **Payroll**: Salary records, deductions, and payroll processing
- **Documents**: AI-processed document storage with metadata and compliance tracking
- **Onboarding**: Workflow management for new employee orientation
- **Substitute Assignments**: Teacher substitute management and assignments
- **Activity Logs**: Comprehensive audit trail for all system actions

### AI-Powered Features
- **Document Processing**: Automated analysis of HR documents (certifications, background checks, etc.)
- **Compliance Monitoring**: Real-time tracking of document expiration dates and regulatory requirements
- **Onboarding Automation**: Intelligent checklist generation based on employee type and department
- **Payroll Analysis**: Anomaly detection in payroll data
- **Substitute Recommendations**: AI-driven matching of substitute teachers to assignments

### User Interface
- **Dashboard**: Real-time overview of HR metrics, pending actions, and AI-generated insights
- **Employee Management**: Complete CRUD operations for employee records
- **Leave Management**: Request submission, approval workflows, and calendar integration
- **Payroll**: Salary management, deduction tracking, and reporting
- **Document Management**: Upload, processing, and compliance tracking
- **Onboarding**: Workflow management and progress tracking
- **Reports**: Comprehensive analytics and compliance reporting
- **Settings**: System configuration and user preferences

## Data Flow

### Authentication Flow
1. User authentication handled through session-based auth
2. Role-based access control (HR, Admin, Employee roles)
3. Session persistence in PostgreSQL

### Document Processing Flow
1. Document upload to the system
2. AI analysis using OpenAI GPT-4o
3. Metadata extraction and compliance checking
4. Storage with processing results
5. Automated notifications for required actions

### Employee Onboarding Flow
1. New employee record creation
2. AI-generated onboarding checklist based on role/department
3. Workflow step tracking and completion
4. Automated document requirements and deadline management

### Leave Request Flow
1. Employee submits leave request
2. Automatic routing to appropriate approvers
3. AI-powered substitute teacher recommendations
4. Calendar integration and conflict detection
5. Approval workflow with notifications

## External Dependencies

### Core Dependencies
- **Database**: Neon PostgreSQL with connection pooling
- **AI Services**: OpenAI API for document processing and intelligent automation
- **UI Components**: Radix UI ecosystem for accessible, unstyled components
- **Styling**: Tailwind CSS for utility-first styling
- **Date Handling**: date-fns for date manipulation and formatting
- **Form Management**: React Hook Form with Zod validation

### Development Dependencies
- **Type Safety**: TypeScript with strict configuration
- **Database Management**: Drizzle Kit for migrations and schema management
- **Build Tools**: Vite for development and production builds
- **Development Environment**: Replit-specific plugins for enhanced development experience

## Deployment Strategy

### Development Environment
- **Local Development**: Vite dev server with hot module replacement
- **Database**: Neon serverless PostgreSQL connection
- **Environment Variables**: DATABASE_URL and OPENAI_API_KEY required
- **Development Tools**: Replit integration with live preview and debugging

### Production Build
- **Frontend**: Vite production build with optimized bundling
- **Backend**: esbuild compilation to ESM format
- **Database**: Drizzle push for schema deployment
- **Environment**: Node.js production server with Express

### Configuration Management
- **Database Configuration**: Drizzle config with PostgreSQL dialect
- **Tailwind Configuration**: Custom design system with CSS variables
- **TypeScript Configuration**: Strict type checking with path aliases
- **Build Configuration**: Vite config with React plugin and development enhancements

The system is designed to be scalable, maintainable, and specifically tailored for the complex needs of school district HR departments, with AI automation reducing manual workload while ensuring compliance and efficiency.

## Recent Changes
- Added comprehensive time cards functionality for employee hour tracking (July 15, 2025)
  - Created time_cards database table with clock in/out, breaks, and approval workflow
  - Implemented full CRUD operations for time card management
  - Added time cards page with filtering, approval, and real-time statistics
  - Integrated time cards navigation into sidebar menu
  - Added support for draft, submitted, approved, and rejected statuses
  
- Enhanced time cards with multi-step approval workflow (July 15, 2025)
  - Implemented secretary-managed workflow: secretary → employee → administrator → payroll
  - Added approval stage tracking with current_approval_stage column
  - Created separate notes fields for each approval stage (secretary, employee, admin, payroll)
  - Built comprehensive approval API endpoints with proper state transitions
  - Enhanced frontend with stage-specific action buttons and approval dialogs
  - Added real-time statistics for pending, approved, and processed time cards

- Completed Letters functionality for automated document generation (July 15, 2025)
  - Created letters database table with template and processed content fields
  - Implemented automatic placeholder replacement with employee data
  - Added comprehensive Letters page with template creation and processing
  - Built full CRUD operations for letter management
  - Added letter processing workflow with employee data population
  - Integrated letters navigation into sidebar menu
  - Support for multiple letter types (offer, recommendation, disciplinary, etc.)
  - Placeholder system for firstName, lastName, position, department, salary, dates, etc.

- Added Employee Import/Export functionality for bulk data management (July 15, 2025)
  - Implemented CSV export with all employee data fields
  - Added bulk import functionality with validation and error handling
  - Created import template download for proper format guidance
  - Built duplicate detection and update logic for existing employees
  - Enhanced Employee Management page with import/export buttons
  - Added comprehensive error reporting for import validation failures
  - Support for updating existing employees based on employeeId matching
  - Automatic data type conversion for dates and numeric fields

- Implemented Custom Timecard Templates system for flexible timecard design (July 15, 2025)
  - Created timecardTemplates and timecardTemplateFields database tables
  - Built comprehensive template designer with drag-and-drop field management
  - Added support for different employee types (certificated, classified, substitute)
  - Implemented field types: text, number, date, time, dropdown, checkbox, textarea, radio, email, phone
  - Created section-based organization: general, time_tracking, breaks, overtime, leave, approval, notes
  - Built template preview functionality showing real-time form layout
  - Added template management with active/inactive states and default template selection
  - Integrated custom fields data storage in time_cards table with jsonb column
  - Created full CRUD API endpoints for templates and template fields
  - Added comprehensive frontend page with tabs for templates, design, and preview
  - School districts can now create custom timecard layouts tailored to their specific needs

- Enhanced Onboarding Forms with Form Library and File Upload Support (July 15, 2025)
  - Added file upload functionality for PDF, DOC, and DOCX onboarding documents
  - Implemented reusable form library system with versioning support
  - Added form template creation with "Create New" or "Use Existing" options
  - Built secure file storage with multer middleware and validation
  - Enhanced form display with version information and file indicators
  - Added download functionality for uploaded form files
  - Created dual-mode form creation: new forms or existing library selection
  - Implemented proper form versioning with parent-child relationships
  - Added form library statistics and improved UI with informative helpers
  - Districts can now upload W4, I9, and other forms once and reuse them across workflows

- Completed Onboarding Workflow Management with Form Selection and Action Buttons (July 15, 2025)
  - Fixed workflow creation functionality with proper date handling and validation
  - Added comprehensive form selection during workflow creation with checkbox interface
  - Implemented working action buttons for "View Details" and "Update Workflow"
  - Built detailed workflow view dialog showing progress, documents, and completion status
  - Added update workflow dialog for changing status and current step
  - Enhanced workflow progress tracking with visual indicators
  - Integrated AI-powered checklist generation with graceful fallback to defaults
  - Added proper error handling for OpenAI API quota limitations
  - Created comprehensive workflow management interface with full CRUD operations
  - School districts can now create workflows with specific form requirements and track progress

- Implemented Comprehensive Role-Based Access Control System (July 15, 2025)
  - Added three-tier user role system: employee, admin, and HR with distinct permissions
  - Created authentication middleware with requireRole, requireSelfOrAdmin, and isAuthenticated functions
  - Implemented role-based API route protection ensuring employees can only access their own data
  - Built dynamic sidebar navigation that shows different menu items based on user role
  - Created streamlined employee interface with access to only two essential functions:
    * Leave Management - Submit time-off requests
    * Time Cards - Approve their own timecards only
  - Enhanced security with proper permission checks on all sensitive endpoints
  - Administrators retain full access to manage all records and system settings
  - System gracefully handles missing employee records with appropriate fallbacks
  - Employee interface is clean and focused on core workflow needs without administrative clutter

- Enhanced Data Isolation and Employee Experience (July 15, 2025)
  - Implemented comprehensive data isolation where employees can only see their own information
  - Secured all administrative routes (employees, payroll, onboarding, documents) to admin/hr only
  - Created employee-specific dashboard showing personal profile, leave requests, and time cards
  - Built secure role switcher component for development and authorized users
  - Restricted API access ensuring employees cannot view:
    * Other employees' records or payroll information
    * Onboarding workflows or administrative functions
    * Document management or compliance tracking
    * System-wide statistics or recent activity logs
  - Employee dashboard displays only personal data with quick action buttons
  - Fixed React hook ordering issues in role switcher component
  - Added comprehensive error handling for unauthorized access attempts
  - System now provides completely isolated experience for each user role

- Fixed Role Switching Authentication Issues (July 15, 2025)
  - Resolved role switching failure by updating authentication middleware to fetch current user role from database
  - Fixed apiRequest parameter order (url, method, data) to match frontend expectations
  - Added proper authentication middleware to role switching endpoints
  - Updated isAuthenticated middleware to dynamically retrieve user role instead of hardcoded values
  - Role switching now works correctly between employee, admin, and hr roles
  - Session properly maintains updated role after switching with automatic page refresh
  - Added comprehensive error handling and debugging capabilities

- Implemented Retirees and Archived Employees Management System (July 16, 2025)
  - Created comprehensive Retirees page for managing post-employment benefits and records
  - Built Archived Employees page with personnel file scanning and upload functionality
  - Added three new database tables: retirees, archived_employees, and personnel_files
  - Implemented secure file upload system with multer middleware and proper validation
  - Created full CRUD operations for both retirees and archived employees management
  - Added search, filtering, and statistical dashboard for both modules
  - Fixed data validation issues using proper Zod union types for numeric fields
  - Integrated secure role-based access control (admin/hr only)
  - Added navigation sidebar entries with appropriate icons (Heart for retirees, Archive for archived employees)
  - Retirees module handles pension plans, health insurance, Medicare coverage, and emergency contacts
  - Archived employees module supports personnel file management with category organization
  - Successfully resolved SelectItem component validation errors for proper form functionality
  - Both systems include comprehensive error handling and real-time data updates

- Completed District Payroll Configuration System (July 15, 2025)
  - Fixed database schema issues by adding missing working_days and holidays columns to district_settings table
  - Resolved data type mismatch for autoApprovalThreshold field (decimal in database vs number in frontend)
  - Updated form schema to handle decimal values as strings with proper transformation
  - Fixed form initialization and validation issues for district settings dialog
  - Implemented working district settings form with proper data persistence
  - Added comprehensive API testing to ensure payroll settings functionality works correctly
  - Districts can now configure payroll cutoff dates, timecard deadlines, and approval workflows
  - System supports flexible payroll scheduling (25th of month vs end of month configurations)

- Implemented Customizable Field Labels System (July 15, 2025)
  - Added custom_field_labels database table with field name, display label, and section organization
  - Created comprehensive field labels management interface with tabs for different sections
  - Built full CRUD operations for field labels with admin/hr access control
  - Added initialization system for default field labels across all system modules
  - Integrated dynamic field labels into employee management forms
  - Implemented field label helper functions for consistent label display
  - Added custom and default label badges for easy identification
  - Created field labels page with organized sections: employee, payroll, leave, timecard, onboarding
  - Districts can now customize field titles throughout the system to match their terminology
  - System supports both default labels and custom labels with proper versioning
  - Enhanced user experience with consistent terminology across all forms and interfaces
- Extended field labels system to leave management, time cards, and onboarding forms
- All major forms now use customizable field labels instead of hardcoded text
- System provides consistent labeling across employee management, leave requests, and time tracking

- Implemented Comprehensive Dropdown Editing System Across All Pages (July 16, 2025)
  - Created reusable DropdownEdit component for consistent inline editing functionality
  - Added dropdown editing to Employees page (department, position, employee type, status)
  - Added dropdown editing to Documents page (document type, status)
  - Added dropdown editing to Payroll page (processed status with boolean conversion)
  - Added dropdown editing to Leave Management page (status updates)
  - Fixed null/undefined value handling in DropdownEdit component with proper error handling
  - Added field update mutations for each page with proper API integration
  - Users can now edit most fields inline without opening separate forms or dialogs
  - Improved user experience with hover-to-edit functionality and real-time updates
  - Fixed payroll page error by correctly mapping processed boolean field to status dropdown options

- Added Payroll Use Only Section to Time Cards Page (July 16, 2025)
  - Created specialized section that appears only for admin_approved and payroll_processed time cards
  - Added visual indicators with purple styling to differentiate payroll-specific information
  - Displays regular hours, overtime hours, total pay, processed date, and payroll period
  - Shows payroll notes field for internal payroll department use
  - Helps payroll staff track processed time cards and calculate compensation
  - Section is restricted to appropriate approval stages for security

- Fixed and Enhanced Custom Field Labels System (July 16, 2025)
  - Fixed custom field labels functionality with proper database schema alignment
  - Added comprehensive field selection interface with dropdowns for valid fields
  - Created available fields reference showing all customizable fields by section
  - Updated interface to show field requirements and validation information
  - Added helpful guidance explaining which fields actually exist in the system
  - Improved field label creation process with better validation and error handling
  - Custom field labels now work properly across employee, timecard, leave, payroll, and onboarding forms
  - Districts can now successfully customize field terminology throughout the system

- Added Payroll Processing Section to Time Cards with Automatic Calculation (July 16, 2025)
  - Created comprehensive Payroll Processing section for admin-approved and payroll-processed time cards
  - Added five new database fields: payroll_addon, payroll_units, payroll_rate, payroll_total, payroll_processing_notes
  - Implemented automatic calculation functionality where Total = Units × Rate
  - Built editing interface with real-time calculation updates when units or rate values change
  - Added dedicated API endpoint for updating payroll processing fields with proper authentication
  - Created purple-styled section that appears only for appropriate approval stages
  - Features include: Addon description, Units input, Rate input, auto-calculated Total, and processing Notes
  - Payroll staff can now track additional compensation calculations directly within time cards
  - All payroll processing data is saved to database with proper audit logging
  - System automatically updates totals when editing units or rates for accurate calculations

- Fixed Leave Request Creation Error with OpenAI API Quota Handling (July 15, 2025)
  - Resolved 400 error when creating leave requests with substitute requirements
  - Added proper error handling for OpenAI API quota exceeded errors
  - Implemented graceful fallback when AI substitute recommendations fail
  - Leave requests now successfully create even when AI services are unavailable
  - Added comprehensive logging for OpenAI API errors to help with debugging
  - System continues to function normally with manual substitute assignment when AI fails

- Fixed Timecard Templates Edit Button and API Request Issues (July 15, 2025)
  - Resolved non-functional edit button on timecard templates page
  - Fixed API request format errors in all template mutation functions
  - Corrected apiRequest parameter structure from object format to (url, method, data) format
  - Added proper state management for template editing workflow
  - Improved data cleaning and validation before sending updates
  - Enhanced error handling and debugging capabilities for template operations
  - Template editing now works correctly with proper form population and successful updates

- Completed Comprehensive Payroll Processing System with Full Tax Withholdings (July 15, 2025)
  - Built complete payroll management system with automated tax calculations
  - Created comprehensive database schema with tax_withholding_configs, employee_benefit_elections, employee_tax_withholdings, and payroll_batches tables
  - Implemented full tax withholding setup for federal, state, social security, medicare, unemployment, and disability taxes
  - Added employee benefit elections management with health, dental, vision, retirement, and other benefit types
  - Created tabbed interface for payroll records, tax configuration, and benefits management
  - Built payroll processing workflow that converts approved time cards into payroll records with proper tax calculations
  - Added comprehensive benefit election form with employee selection, coverage types, and contribution tracking
  - Implemented tax configuration management for different employee types with rate settings and income limits
  - Created payroll batch processing for multiple employees with detailed reporting
  - Added real-time payroll statistics showing total payroll, employee count, deductions, and net pay
  - School districts now have complete payroll processing capabilities without needing separate software
  - System handles complex payroll calculations including regular pay, overtime, taxes, and benefit deductions
  - Fixed add benefit button functionality with proper validation and error handling

- Fixed Employee Update Date Validation Error (July 15, 2025)
  - Resolved 400 error when updating employee records with date fields
  - Added proper date field transformation in API endpoint (hireDate string to Date object)
  - Enhanced employee schema validation with date coercion using z.coerce.date()
  - Improved error logging for better debugging of validation issues  
  - Added proper handling of certifications array field
  - Employee update functionality now works correctly with all field types including dates

- Completed Comprehensive Payroll Reporting System (July 15, 2025)
  - Built three essential payroll reports: Payroll Summary, Tax Liabilities, and Benefits Contributions/Deductions
  - Added tabbed interface in Reports page for easy navigation between report types
  - Implemented dynamic date range selection for custom reporting periods
  - Created comprehensive API endpoints for each report type with proper data filtering
  - Added real-time data loading with professional UI and loading states
  - Built payroll summary report showing total employees, gross pay, deductions, and net pay
  - Implemented tax liability report with federal, state, social security, medicare, and unemployment taxes
  - Created benefits report displaying employee benefit deductions and contribution tracking
  - Added export functionality for all report types with download buttons
  - School districts now have complete payroll reporting capabilities for compliance and analysis
  - Successfully resolved all export functionality issues with proper authentication and CSV generation

- Implemented Self-Service Password Reset System (July 15, 2025)
  - Added password_reset_tokens database table with secure token management
  - Built complete password reset API endpoints (request, verify, confirm)
  - Created professional forgot password page with email submission form
  - Developed secure reset password page with token validation and user info display
  - Added password_hash field to users table for secure password storage
  - Integrated with existing authentication system for seamless user experience
  - Features secure token-based reset system with 1-hour expiration for security
  - Includes professional email templates for password reset links with proper styling
  - Enforces strong password validation requirements (8+ chars, upper/lower case, numbers)
  - Automatic token cleanup system to prevent security vulnerabilities
  - Reduces support burden by allowing users to reset passwords independently
  - System tested and confirmed working with proper email notification flow

- Implemented Comprehensive System Monitoring and Error Alerting Infrastructure (July 16, 2025)
  - Built complete email alert system with SendGrid integration for automated error notifications
  - Created error handling middleware with automatic alerts for database failures, authentication issues, API errors, and payroll problems
  - Implemented system health monitoring with real-time dashboard showing database, email, storage, and authentication status
  - Added comprehensive error reporting system with categorized error tracking and automatic notifications
  - Created monitoring tab in settings page with health checks, metrics, and alert testing capabilities
  - Built data retention monitoring system with storage capacity analysis and compliance tracking
  - Added database storage estimation tools for capacity planning and district size projections
  - Implemented retention policy management with compliance recommendations for different record types
  - Created comprehensive data retention dashboard showing current usage, storage metrics, and provider information
  - System now provides proactive error monitoring with email notifications to reduce support burden
  - Administrators can monitor system health in real-time and test alert configurations
  - Data retention system helps districts understand storage requirements and compliance obligations
  - All monitoring features are role-restricted to admin and HR users for security

- Enhanced Leave Management with Workers Compensation and Medical Leave Tracking (July 16, 2025)
  - Added comprehensive database schema with 22 new fields for detailed Workers Compensation and Medical Leave tracking
  - Created conditional form sections that appear when Workers Comp or Medical Leave is selected during leave request creation
  - Implemented Workers Compensation tracking: injury details, incident location, witness information, claim numbers, doctor contacts, return dates, and work restrictions
  - Added Medical Leave tracking: FMLA eligibility, medical providers, diagnosis codes, certification dates, intermittent/reduced schedule options, and workplace accommodations
  - Enhanced the leave request view dialog with detailed information displays for both special leave types
  - Added visual indicators with colored badges and icons (Shield for Workers Comp, Stethoscope for Medical Leave, Heart for FMLA)
  - Successfully tested with sample data - both types of leave requests created and tracked properly
  - System now provides complete compliance tracking for workplace injuries and medical leaves
  - Helps districts meet legal requirements and manage employee health situations effectively
  - All specialized leave tracking fields are optional and only appear when relevant checkboxes are selected

- Implemented Comprehensive Enterprise-Grade Security Infrastructure (July 16, 2025)
  - Built complete security monitoring system with real-time audit logging and threat detection
  - Added multi-layered security database schema: audit_logs, security_events, security_alerts, user_sessions, secure_files, data_encryption_keys
  - Implemented comprehensive security middleware with Helmet, CORS, rate limiting, and audit logging
  - Created advanced user authentication with MFA support, account lockout, and failed login tracking
  - Built secure file upload system with encryption, virus scanning, and access tracking
  - Added comprehensive Security Monitoring page with dashboard, audit logs, encryption status, and compliance tracking
  - Implemented data encryption for all sensitive information using AES-256 encryption
  - Created audit trail system that logs all user actions with IP addresses, timestamps, and severity levels
  - Built security dashboard showing real-time metrics: daily actions, failed logins, critical events, and security trends
  - Added security settings management with configurable policies for passwords, sessions, and data retention
  - Implemented compliance monitoring for regulatory requirements (FERPA, HIPAA, SOX)
  - Created security alert system with email notifications for critical security events
  - All security features are role-restricted to admin and HR users only
  - System now provides enterprise-grade protection for sensitive HR and employee data
  - Successfully integrated with existing authentication system and database infrastructure

- Completed Comprehensive Support Documentation and Ticket Management System (July 16, 2025)
  - Built complete support documentation library with categories, difficulty levels, and search functionality
  - Created support database schema: support_documents, support_categories, support_tickets, support_bookmarks, support_feedback
  - Implemented comprehensive support documentation page with live data from database
  - Added support categories system with User Manual, Admin Guide, Troubleshooting, and Video Tutorials
  - Built working search functionality across document titles, content, and tags
  - Implemented bookmark system for users to save frequently accessed documents
  - Added feedback and rating system for documentation quality improvement
  - Created support ticket management system for technical issue tracking
  - Built security updates management page for system maintenance notifications
  - Fixed all API response handling and database schema compatibility issues
  - Resolved infinite re-render loops and date formatting errors in frontend
  - Added proper error handling and authentication for all support endpoints
  - Successfully integrated with existing role-based access control system
  - Support system now provides complete self-service help resources for users
  - Reduces support burden by enabling users to find answers independently
  - All support features work with real database data and proper CRUD operations

- Implemented Editable Extra Pay Contract Fields System (July 16, 2025)
  - Updated form fields to match database schema (title, amount, contractType, description, etc.)
  - Added comprehensive edit dialog with all contract fields and proper validation
  - Implemented edit functionality with proper form validation and error handling
  - Added edit button in contracts table with edit icon for easy access
  - Updated contract display to show correct fields (title, amount, status instead of old fields)
  - Fixed statistics calculations to use correct field names from database schema
  - Added proper edit handlers and mutation for updating contracts with real-time updates
  - Created sample contracts for testing: Boys Basketball Coach and After School Tutoring
  - Successfully tested edit functionality with API calls showing proper data updates
  - System now allows users to edit contract title, type, description, amount, dates, and requirements
  - All edits are properly validated and saved to database with immediate UI updates

- Implemented Comprehensive Dropdown Options Management System (July 16, 2025)
  - Created dropdown_options database table with proper schema (category, value, label, description, display_order, is_active)
  - Added sample data for four categories: Code, Funding, Site, and Addon with relevant district options
  - Implemented full CRUD API endpoints for dropdown options management with proper authentication
  - Updated monthly timecard form to use dropdowns instead of text inputs for Code, Funding, Site fields
  - Added dropdown functionality to payroll processing section for Addon field selection
  - Created comprehensive Dropdown Settings page with tabbed interface for each category
  - Built full management interface with create, edit, delete, and reorder functionality
  - Added active/inactive toggle for options without permanent deletion
  - Implemented drag-and-drop ordering with up/down arrows for display sequence
  - Added proper form validation and error handling for all dropdown operations
  - Integrated dropdown settings page into navigation sidebar with admin/hr access control
  - Districts can now customize all dropdown options throughout the timecard system
  - System provides consistent dropdown options across daily entries and payroll processing sections

- Implemented Comprehensive Timecard Locking System (July 16, 2025)
  - Added automatic timecard locking when status is changed to "submitted" to prevent unauthorized changes
  - Extended monthly_timecards database table with isLocked, lockedBy, lockedAt, and lockReason fields
  - Created lock/unlock API endpoints with proper role-based access control (admin/hr only)
  - Implemented visual lock indicators and status badges in the timecard header
  - Added lock/unlock buttons for authorized users with proper authentication checks
  - Created comprehensive lock notification system showing who locked the timecard and when
  - Disabled all form fields and Save button when timecard is locked with visual overlay
  - Added lock/unlock mutations with proper error handling and success notifications
  - Lock system automatically triggers when timecards are submitted to payroll for processing
  - HR and admin users can manually lock/unlock timecards with custom reasons
  - System prevents accidental changes to approved timecards while allowing authorized modifications
  - Added comprehensive audit trail for all lock/unlock actions with timestamps and user tracking