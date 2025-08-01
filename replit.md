# School District HR Management System

## Overview
This is "Timewise K-12" - a comprehensive multi-tenant B2B SaaS HR and payroll management platform designed specifically for school districts. The application features a clean user onboarding flow with login screen, new user creation, and streamlined district setup functionality. It provides complete data isolation between districts and subscription-based billing tiers. The system automates document processing, employee onboarding, payroll management, leave tracking, and compliance monitoring using AI-powered features. Built as a full-stack web application with React frontend and Express backend, the platform reduces manual HR workload, ensures compliance, and improves efficiency for school district HR departments.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query (React Query)
- **UI Components**: Radix UI primitives with shadcn/ui
- **Styling**: Tailwind CSS with custom design system and CSS variables for theming
- **Build Tool**: Vite

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Session Management**: Express sessions with PostgreSQL session store

### UI/UX Decisions
- **Dashboard**: Real-time overview of HR metrics, pending actions, and AI-generated insights.
- **Employee Management**: CRUD operations for employee records.
- **Leave Management**: Request submission, approval workflows, and calendar integration.
- **Payroll**: Salary management, deduction tracking, and reporting.
- **Document Management**: Upload, processing, and compliance tracking.
- **Onboarding**: Workflow management and progress tracking.
- **Reports**: Comprehensive analytics and compliance reporting.
- **Settings**: System configuration and user preferences.
- **Navigation**: Clean, intuitive navigation with administrative features grouped under a "Settings" dropdown to reduce clutter. High-priority functions like "Onboarding" are easily accessible.
- **Design Consistency**: Professional paper-like design for timecard systems, consistent form elements, and clear visual indicators for statuses and actions.

### Recent Changes (January 2025)
- **Branding Update**: Complete rebrand to "Timewise K-12" with tagline "Complete All-In-System for HR and Payroll"
- **Clean Login Interface**: Implemented login screen without sidebar navigation, featuring Sign In and Create Account tabs
- **Streamlined Onboarding**: Created 3-step district setup process (District Information → Administrator Account → Review & Complete)
- **Simplified Flow**: Removed billing/subscription selection to focus on core functionality and faster onboarding
- **Multi-Tenant Foundation**: Confirmed working multi-tenant architecture with complete data isolation between school districts
- **Authentication & Personalization (January 31, 2025)**: 
  - Fixed complete authentication flow with proper session management
  - Resolved registration API integration issues
  - Implemented dynamic user data display across all interface components
  - Added working logout functionality with session cleanup
  - Replaced all hardcoded demo content with real user registration data
  - Enhanced header and sidebar to show actual administrator names and roles
- **Personnel Action Forms (PAF) System (August 1, 2025)**:
  - Successfully integrated user's actual Personnel Action Form PDF with "Load Standard Template" feature
  - Fixed authentication middleware across PAF routes with proper role-based access controls
  - Resolved PAF file serving issues by implementing static file serving through attached_assets directory
  - Confirmed PDF viewing functionality - templates now open correctly in new browser tabs
  - **E-Signature Integration**: Implemented comprehensive fillable PDF system with automatic form field creation
    - All uploaded PDFs are automatically converted to fillable forms with e-signature capability
    - Added dedicated signature fields for HR, Finance, Supervisor, and Administrator approvals
    - Each approval section includes signature, name, and date fields for complete audit trail
    - System creates backup copies before conversion and provides detailed field status reporting
    - Enhanced UI with "Check E-Signature Fields" and "Add E-Signature Fields" functionality
  - Simplified workflow: districts upload PDFs → system auto-converts to fillable → users download, fill with signatures → upload completed forms

### Technical Implementations & Feature Specifications
- **Database Schema**: Comprehensive schema including Users (role-based access), Employees, Leave Management, Payroll, Documents, Onboarding, Substitute Assignments, and Activity Logs.
- **AI-Powered Features**:
    - **Document Processing**: Automated analysis of HR documents.
    - **Compliance Monitoring**: Real-time tracking of document expiration and regulatory requirements.
    - **Onboarding Automation**: Intelligent checklist generation.
    - **Payroll Analysis**: Anomaly detection.
    - **Substitute Recommendations**: AI-driven matching of substitute teachers.
- **Authentication**: Session-based authentication with role-based access control (HR, Admin, Employee, Secretary). Includes individual employee login, password reset, and account lockout.
- **E-Signature System**: Integrated for onboarding paperwork and extra pay activities.
- **Workflow Automation**: Automated onboarding system with one-click workflow creation and personalized welcome letter generation.
- **Customization**:
    - **Dynamic Custom Fields**: For extra pay activities.
    - **Customizable Field Labels**: Allows districts to personalize field names across the system (Employee, Timecard, Leave, Payroll, Onboarding).
    - **Dropdown Options Management**: Customizable dropdowns for consistent data entry (e.g., Code, Funding, Site, Addon).
- **Timecard Management**: Comprehensive time tracking with multi-step approval workflows (Secretary → Employee → Secretary → Admin → Payroll), custom timecard templates, and locking mechanisms. Includes monthly and substitute timecard types with payroll processing sections and export functionality.
- **Payroll Processing**: Automated tax calculations, employee benefit elections, and batch processing. Features comprehensive reporting (Payroll Summary, Tax Liabilities, Benefits).
- **Compliance Dashboard**: Tracks FERPA, HIPAA, and SOX compliance, with monitoring for backups, encryption, security audits, and disaster recovery.
- **Security Infrastructure**: Enterprise-grade security with real-time audit logging, threat detection, MFA support, secure file uploads, data encryption (AES-256), and security settings management.
- **System Monitoring**: Comprehensive system monitoring and error alerting infrastructure with email notifications, health checks, metrics, and data retention monitoring.
- **Support System**: Comprehensive support documentation and ticket management system.
- **Employee Management**: Includes individual employee access management, archiving, and retiree management.
- **Leave Management Enhancements**: Includes detailed Workers Compensation and Medical Leave tracking.
- **Reporting**: Dynamic date range selection for custom reporting periods across all modules.

## External Dependencies
- **Database Provider**: Neon serverless PostgreSQL
- **AI Services**: OpenAI API (GPT-4o)
- **UI Components**: Radix UI
- **Styling**: Tailwind CSS
- **Date Handling**: date-fns
- **Form Management**: React Hook Form with Zod validation
- **Email Service**: SendGrid (for email alerts and notifications)
- **Image Uploads**: Multer middleware (for file uploads)
- **Security Enhancements**: Helmet (for HTTP headers), CORS, bcrypt (for password hashing)