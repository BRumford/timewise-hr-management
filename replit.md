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