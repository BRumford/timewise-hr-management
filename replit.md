# School District HR Management System

## Overview
"Timewise K-12" is a comprehensive multi-tenant B2B SaaS HR and payroll management platform designed specifically for school districts. It offers a clean user onboarding flow, complete data isolation between districts, and subscription-based billing tiers. The system automates document processing, employee onboarding, payroll, leave tracking, and compliance monitoring using AI. Built as a full-stack web application with React and Express, it aims to reduce manual HR workload, ensure compliance, and improve efficiency for school district HR departments.

## Recent Major Updates (January 2025)
- **Complete Field Customization System**: Implemented comprehensive district-level field customization allowing full control over all form fields, labels, validation rules, and display properties across all HR modules
- **Multi-Tenant Database Schema**: Enhanced database architecture with proper multi-tenant support for field configurations
- **Dynamic Form Generation**: Real-time form customization with immediate field updates and validation
- **AI Automation System**: Comprehensive AI-powered automation including intelligent document processing, smart form enhancement, automated onboarding workflows, compliance checking, and centralized AI Dashboard for managing all automation features
- **Critical Data Isolation System**: Implemented bulletproof data separation between school districts with comprehensive validation, automated cleanup, and system owner-only controls to prevent any cross-contamination of sensitive district data during setup or operations
- **Enhanced CSV Import System**: Fully resolved CSV import functionality with intelligent header mapping, automatic field normalization, and flexible format support - handles various CSV formats including "Employee Name" to firstName/lastName splitting, employee type normalization, and smart defaults for missing fields
- **Monthly Timecard Input Performance Fix (January 11, 2025)**: Completely resolved critical one-character typing limitation in payroll processing sections by replacing component-based rendering with direct render functions, eliminating React re-render issues that caused input focus loss after each keystroke

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
- **Complete Field Customization**: Full district-level control over all field properties including labels, types, validation rules, help text, visibility, and requirements. Supports Employee, Timecard, Leave, Payroll, and Onboarding modules with real-time updates and multi-tenant data isolation.
- **AI Automation Infrastructure**: Comprehensive AI-powered automation system with OpenAI integration for intelligent document processing, smart form enhancement, automated workflow routing, compliance checking, onboarding automation, payroll analysis, and substitute assignment matching. Includes dedicated AI Dashboard with real-time system monitoring and analytics.
- **Timecard Management**: Comprehensive tracking with multi-step approval workflows, custom templates, locking mechanisms, and automated monthly generation with configurable pay dates. Includes monthly and substitute timecard types with payroll processing sections and export functionality.
- **Payroll Processing**: Automated tax calculations, employee benefit elections, batch processing, and comprehensive reporting. Integrated payroll calendar for district-specific scheduling and reminders with automated notifications.
- **Google Calendar-Style Payroll Calendar**: Dedicated payroll calendar page with interactive monthly grid view, event creation/editing, color-coded priority levels, event type filtering, and comprehensive event management for payroll scheduling and deadline tracking.
- **Compliance Dashboard**: Tracks FERPA, HIPAA, and SOX compliance, with monitoring for backups, encryption, security audits, and disaster recovery.
- **Security Infrastructure**: Enterprise-grade security with real-time audit logging, threat detection, MFA support, secure file uploads, data encryption (AES-256), and security settings management.
- **Data Isolation Dashboard**: System owner-only interface for validating district data separation, creating new districts with guaranteed isolation, and monitoring/fixing any data contamination issues. Includes comprehensive validation tools, automated cleanup procedures, and real-time monitoring of multi-tenant data integrity.
- **System Monitoring**: Comprehensive system monitoring and error alerting infrastructure.
- **Employee Data Synchronization**: System-wide synchronization for all employee data updates with automated cascade updates and audit trail.
- **Reporting**: Dynamic date range selection for custom reporting.

## External Dependencies
- **Database Provider**: Neon serverless PostgreSQL
- **AI Services**: OpenAI API (Claude Sonnet 4.0) for intelligent automation
- **UI Components**: Radix UI with shadcn/ui component library
- **Styling**: Tailwind CSS with custom design system
- **Date Handling**: date-fns
- **Form Management**: React Hook Form with Zod validation
- **Email Service**: SendGrid for automated notifications
- **Image Uploads**: Multer for file handling
- **Security Enhancements**: Helmet, CORS, bcrypt for enterprise security
- **State Management**: TanStack Query for efficient data fetching and caching