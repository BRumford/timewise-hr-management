import { db } from './db';
import { sql } from 'drizzle-orm';

export async function initSupportTables() {
  try {
    // Create support_documents table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS support_documents (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        excerpt TEXT,
        category VARCHAR(50) NOT NULL,
        tags TEXT[] DEFAULT '{}',
        difficulty VARCHAR(20) DEFAULT 'beginner',
        is_published BOOLEAN DEFAULT false,
        view_count INTEGER DEFAULT 0,
        author_id VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create support_categories table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS support_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        icon VARCHAR(50),
        color VARCHAR(20),
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create support_bookmarks table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS support_bookmarks (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        document_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (document_id) REFERENCES support_documents(id) ON DELETE CASCADE
      )
    `);

    // Create support_feedback table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS support_feedback (
        id SERIAL PRIMARY KEY,
        document_id INTEGER NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        is_helpful BOOLEAN,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (document_id) REFERENCES support_documents(id) ON DELETE CASCADE
      )
    `);

    // Create support_tickets table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        ticket_number VARCHAR(50) NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(50) NOT NULL,
        priority VARCHAR(20) DEFAULT 'medium',
        status VARCHAR(20) DEFAULT 'open',
        created_by VARCHAR(255) NOT NULL,
        assigned_to VARCHAR(255),
        resolution_notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        resolved_at TIMESTAMP
      )
    `);

    // Create security_updates table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS security_updates (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        severity VARCHAR(20) DEFAULT 'medium',
        category VARCHAR(50) NOT NULL,
        version VARCHAR(50),
        affected_systems TEXT[] DEFAULT '{}',
        status VARCHAR(20) DEFAULT 'pending',
        requires_approval BOOLEAN DEFAULT true,
        requires_downtime BOOLEAN DEFAULT false,
        estimated_downtime INTEGER,
        scheduled_for TIMESTAMP,
        released_at TIMESTAMP DEFAULT NOW(),
        released_by VARCHAR(255) NOT NULL,
        approved_at TIMESTAMP,
        approved_by VARCHAR(255),
        deployed_at TIMESTAMP,
        deployed_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create security_notifications table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS security_notifications (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(20) DEFAULT 'info',
        severity VARCHAR(20) DEFAULT 'medium',
        target_audience VARCHAR(20) DEFAULT 'all',
        is_active BOOLEAN DEFAULT true,
        is_dismissible BOOLEAN DEFAULT true,
        expires_at TIMESTAMP,
        created_by VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create vulnerability_assessments table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS vulnerability_assessments (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        severity VARCHAR(20) DEFAULT 'medium',
        cvss_score DECIMAL(3,1),
        affected_systems TEXT[] DEFAULT '{}',
        status VARCHAR(20) DEFAULT 'open',
        risk_level VARCHAR(50) NOT NULL,
        discovered_at TIMESTAMP DEFAULT NOW(),
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Insert sample data
    // Only initialize support categories (these are global, not district-specific)
    await db.execute(sql`
      INSERT INTO support_categories (name, description, icon, color, is_active, sort_order) 
      VALUES 
        ('User Manual', 'Step-by-step guides for using the system', 'BookOpen', 'blue', true, 1),
        ('Admin Guide', 'Administrative functions and settings', 'Settings', 'purple', true, 2),
        ('Troubleshooting', 'Common issues and solutions', 'AlertTriangle', 'orange', true, 3),
        ('Video Tutorials', 'Video guides and walkthroughs', 'Play', 'green', true, 4)
      ON CONFLICT DO NOTHING
    `);

    // NOTE: Demo documents and notifications removed to prevent data persistence across districts

    // NOTE: Demo security updates removed to prevent data persistence across districts

    // NOTE: Demo security notifications and vulnerability assessments removed to prevent data persistence across districts

    console.log('Support and security tables initialized successfully');
  } catch (error) {
    console.error('Error initializing support tables:', error);
  }
}