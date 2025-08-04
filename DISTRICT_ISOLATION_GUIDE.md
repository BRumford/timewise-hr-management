# District Data Isolation Guide

## Critical Security Feature: Complete Data Separation

This system implements **complete data isolation** between school districts to ensure:
- No district can access another district's data
- No data cross-contamination during district setup
- Comprehensive audit trails for data access
- Multi-tenant architecture with bulletproof security

## How Data Isolation Works

### 1. Multi-Tenant Database Architecture
Every data table includes a `districtId` field that ensures:
```sql
-- All queries are automatically scoped to district
SELECT * FROM employees WHERE district_id = :current_district_id;
SELECT * FROM leave_requests WHERE district_id = :current_district_id;
```

### 2. Middleware Protection
- `tenantMiddleware`: Identifies district context from request
- `withDistrictFilter`: Ensures users can only access their district's data
- `requireDistrict`: Blocks requests without proper district context

### 3. Data Isolation Service
Provides comprehensive validation and cleanup:
- **Validation**: Checks for cross-district data leakage
- **Cleanup**: Removes orphaned records and fixes assignments
- **Setup**: Creates new districts with proper isolation
- **Monitoring**: Ongoing verification of data separation

## Setting Up New Districts Safely

### Automated Setup Process
1. **Access Data Isolation Dashboard**: `/system-owner/data-isolation`
2. **Create New District**: Use the "Setup New District" tab
3. **Automatic Validation**: System validates isolation immediately
4. **Default Configuration**: Creates proper multi-tenant structure

### Manual Verification Steps
```bash
# 1. Validate district isolation
curl "/api/data-isolation/validate/:districtId"

# 2. Check overall system status
curl "/api/data-isolation/validate-all"

# 3. Get detailed district status
curl "/api/data-isolation/status/:districtId"
```

## Data Isolation Violations

### Common Issues
1. **Orphaned Records**: Data without `districtId` assignment
2. **Cross-District References**: Users assigned to wrong district
3. **Missing Filters**: Queries not scoped to district context

### Resolution Process
1. **Dry Run Cleanup**: Test cleanup without making changes
2. **Execute Cleanup**: Fix violations with actual database changes
3. **Re-validate**: Confirm isolation after cleanup

## Security Best Practices

### For Developers
- Always use `MultiTenantStorage` class for data operations
- Include district context in all database queries
- Test with multiple districts to verify isolation
- Use `getDistrictStorage(req)` helper in API routes

### For System Administrators
- Run validation checks regularly
- Monitor for cross-district access attempts
- Use cleanup tools only when necessary
- Maintain audit logs for all district operations

## API Endpoints (System Owner Only)

### Validation
- `GET /api/data-isolation/validate/:districtId` - Check specific district
- `GET /api/data-isolation/validate-all` - System-wide validation

### Management
- `POST /api/data-isolation/setup-district` - Create isolated district
- `POST /api/data-isolation/cleanup/:districtId` - Fix isolation issues
- `GET /api/data-isolation/status/:districtId` - Detailed district status

## Database Schema Requirements

### Required Fields
Every multi-tenant table must include:
```sql
district_id INTEGER NOT NULL REFERENCES districts(id)
```

### Index Requirements
```sql
CREATE INDEX idx_table_district_id ON table_name(district_id);
```

### Constraints
```sql
-- Ensure no NULL district assignments
ALTER TABLE table_name ADD CONSTRAINT check_district_id 
CHECK (district_id IS NOT NULL);
```

## Monitoring and Alerts

### Automated Checks
- Validation runs on district creation
- Regular system-wide validation scans
- Real-time monitoring of cross-district attempts

### Alert Conditions
- Data isolation violations detected
- Orphaned records found
- Cross-district access attempts
- Failed district setup processes

## Compliance and Auditing

### Audit Trail
All district operations are logged with:
- User ID and role
- District context
- Operation performed
- Timestamp and result

### Compliance Features
- FERPA-compliant data separation
- SOX audit trail requirements
- HIPAA-level security for sensitive data
- Complete data portability per district

## Emergency Procedures

### Data Breach Response
1. Immediate isolation validation
2. Identify affected districts
3. Execute emergency cleanup
4. Generate incident report
5. Notify affected districts

### Recovery Process
1. Backup verification
2. Point-in-time recovery
3. Re-run isolation validation
4. Confirm data integrity
5. Resume normal operations

---

**Critical Note**: Only system owners can access data isolation tools. This restriction prevents accidental or malicious cross-district operations and maintains the highest level of security for sensitive school district data.