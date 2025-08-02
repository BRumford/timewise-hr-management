# School District HR Management System

## Overview
"Timewise K-12" is a comprehensive multi-tenant B2B SaaS HR and payroll management platform designed specifically for school districts. It offers a clean user onboarding flow, complete data isolation between districts, and subscription-based billing tiers. The system automates document processing, employee onboarding, payroll, leave tracking, and compliance monitoring using AI. Built as a full-stack web application with React and Express, it aims to reduce manual HR workload, ensure compliance, and improve efficiency for school district HR departments.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query
- **UI Components**: Radix UI primitives with shadcn/ui
- **Styling**: Tailwind CSS with custom design system and CSS variables for theming
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM
- **Session Management**: Express sessions with PostgreSQL session store

### UI/UX Decisions
- **Dashboard**: Real-time overview of HR metrics, pending actions, and AI insights.
- **Navigation**: Clean, intuitive navigation with administrative features grouped under a "Settings" dropdown. High-priority functions like "Onboarding" are easily accessible.
- **Design Consistency**: Professional paper-like design for timecard systems, consistent form elements, and clear visual indicators.
- **Login Interface**: Clean login screen without sidebar navigation, featuring Sign In and Create Account tabs.
- **District Setup**: Streamlined 3-step district setup process (District Information → Administrator Account → Review & Complete).
- **Consolidated Interfaces**: Personnel Action Forms (PAF) functionality is consolidated into a single page with a "Create New PAF" modal. Automated Timecard Generation and Payroll Calendar systems are integrated with user-friendly interfaces.

### Technical Implementations & Feature Specifications
- **Database Schema**: Comprehensive schema including Users (role-based access), Employees, Leave Management, Payroll, Documents, Onboarding, Substitute Assignments, and Activity Logs.
- **AI-Powered Features**: Automated analysis for HR documents, real-time compliance monitoring, intelligent checklist generation for onboarding, payroll anomaly detection, and AI-driven substitute teacher matching.
- **Authentication**: Session-based with role-based access control (HR, Admin, Employee, Secretary), including individual employee login, password reset, and account lockout.
- **Multi-Tenancy**: Complete data isolation between school districts.
- **E-Signature System**: Integrated for onboarding and extra pay activities.
- **Workflow Automation**: Automated onboarding with one-click workflow creation and personalized welcome letter generation. Comprehensive workflow management for PAFs with visual step tracking and role-based access for approvals, corrections, and denials.
- **Customization**: Dynamic custom fields, customizable field labels across modules, and manageable dropdown options.
- **Timecard Management**: Comprehensive tracking with multi-step approval workflows, custom templates, locking mechanisms, and automated monthly generation with configurable pay dates. Includes monthly and substitute timecard types with payroll processing sections and export functionality.
- **Payroll Processing**: Automated tax calculations, employee benefit elections, batch processing, and comprehensive reporting. Integrated payroll calendar for district-specific scheduling and reminders with automated notifications.
- **Compliance Dashboard**: Tracks FERPA, HIPAA, and SOX compliance, with monitoring for backups, encryption, security audits, and disaster recovery.
- **Security Infrastructure**: Enterprise-grade security with real-time audit logging, threat detection, MFA support, secure file uploads, data encryption (AES-256), and security settings management.
- **System Monitoring**: Comprehensive system monitoring and error alerting infrastructure.
- **Employee Data Synchronization**: System-wide synchronization for all employee data updates with automated cascade updates and audit trail.
- **Reporting**: Dynamic date range selection for custom reporting.

## External Dependencies
- **Database Provider**: Neon serverless PostgreSQL
- **AI Services**: OpenAI API (GPT-4o)
- **UI Components**: Radix UI
- **Styling**: Tailwind CSS
- **Date Handling**: date-fns
- **Form Management**: React Hook Form with Zod validation
- **Email Service**: SendGrid
- **Image Uploads**: Multer
- **Security Enhancements**: Helmet, CORS, bcrypt