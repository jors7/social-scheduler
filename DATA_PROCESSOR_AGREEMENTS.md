# Data Processor Agreements - SocialCal

## Overview
This document outlines the data processing relationships between SocialCal and its service providers, as required for Meta App Review and compliance with data protection regulations.

## Data Controller
**Entity Name**: [Your Legal Entity Name or Your Full Name if Individual]  
**Location**: [Your Country]  
**Role**: Data Controller - determines the purposes and means of processing Platform Data received from Meta and other social media platforms.

## Data Processors and Sub-Processors

### 1. Supabase Inc.
**Service Type**: Database Infrastructure & Authentication  
**Location**: United States  
**Data Processed**:
- User account information (email, name, user ID)
- Authentication tokens and session data
- Social media account connections
- Scheduled post content and metadata

**Security Measures**:
- End-to-end encryption for data in transit
- Encryption at rest for database storage
- Row-level security policies
- SOC 2 Type II certified
- GDPR compliant

**Data Processing Agreement**: [Supabase DPA](https://supabase.com/legal/dpa)

### 2. Cloudflare, Inc.
**Service Type**: Content Delivery Network & Media Storage (R2)  
**Location**: United States (with global CDN)  
**Data Processed**:
- Temporary media files (images, videos) for social posts
- CDN delivery of application assets
- Request logs and analytics

**Security Measures**:
- SSL/TLS encryption for all data transfers
- DDoS protection
- ISO 27001, 27017, 27018 certified
- GDPR and CCPA compliant

**Data Processing Agreement**: [Cloudflare DPA](https://www.cloudflare.com/cloudflare-customer-dpa/)

### 3. Vercel Inc.
**Service Type**: Application Hosting & Serverless Functions  
**Location**: United States  
**Data Processed**:
- Application deployment and execution
- Serverless function logs
- Cron job execution for scheduled posts
- Environment variables (encrypted)

**Security Measures**:
- HTTPS by default
- Encrypted secrets management
- SOC 2 Type II certified
- GDPR compliant infrastructure

**Data Processing Agreement**: [Vercel DPA](https://vercel.com/legal/dpa)

### 4. OpenAI, L.L.C.
**Service Type**: AI Content Generation (Optional Feature)  
**Location**: United States  
**Data Processed**:
- User prompts for caption generation
- Content context for AI suggestions
- No permanent storage of user content

**Security Measures**:
- API-only access (no data retention)
- Encrypted API communications
- SOC 2 Type II certified
- No training on customer data

**Data Processing Agreement**: [OpenAI DPA](https://openai.com/policies/data-processing-addendum)

### 5. Stripe, Inc.
**Service Type**: Payment Processing  
**Location**: United States  
**Data Processed**:
- Payment information (processed directly by Stripe)
- Customer billing details
- Subscription status
- **Note**: No Meta Platform Data is shared with Stripe

**Security Measures**:
- PCI DSS Level 1 certified
- Strong Customer Authentication (SCA)
- Encrypted payment tokenization
- GDPR and CCPA compliant

**Data Processing Agreement**: [Stripe DPA](https://stripe.com/legal/dpa)

## Data Flow and Purpose Limitation

### Meta Platform Data Flow
1. **User Authorization**: User authorizes SocialCal via OAuth 2.0
2. **Token Storage**: Access tokens encrypted and stored in Supabase
3. **Content Creation**: User creates content in SocialCal interface
4. **Media Processing**: Images/videos temporarily stored in Cloudflare R2
5. **Publishing**: Content posted directly to Meta platforms via Graph API
6. **Cleanup**: Temporary media files deleted after successful posting

### Purpose Limitation Commitments
- Platform Data is used ONLY for the explicit purpose of social media management
- No selling or sharing of user data with third parties
- No use of Platform Data for advertising or marketing
- Processors are contractually limited to processing data only as instructed

## Security and Compliance

### Technical Measures
- All data transmissions use TLS 1.2 or higher
- Access tokens encrypted at rest using AES-256
- Multi-factor authentication available for user accounts
- Regular security audits and penetration testing
- Automated token refresh and validation

### Organizational Measures
- Limited access to production systems
- Regular security training for development team
- Incident response procedures in place
- Data breach notification within 72 hours
- Regular review of processor agreements

## Data Subject Rights

### User Rights Implementation
- **Access**: Users can view all their data via account settings
- **Rectification**: Users can update their information anytime
- **Erasure**: Complete account deletion available
- **Portability**: Data export in JSON format
- **Disconnection**: Immediate removal of social account connections

### Meta-Specific Rights
- Support for Meta's data deletion callback URL
- Immediate token deletion upon account disconnection
- No caching of Meta user data beyond session needs
- Compliance with Meta's Platform Terms

## International Data Transfers

### Transfer Mechanisms
- Standard Contractual Clauses (SCCs) where applicable
- Privacy Shield framework participants (where valid)
- Adequate protection measures per GDPR Article 46

### Geographic Distribution
- Primary processing: United States
- CDN edge locations: Global (Cloudflare)
- User control: Users informed of transfer locations

## Audit and Monitoring

### Processor Audits
- Annual review of processor certifications
- Regular assessment of security measures
- Compliance verification with DPAs
- Performance monitoring and incident tracking

### Compliance Monitoring
- Regular internal audits
- Third-party security assessments
- User feedback and complaint handling
- Regulatory update tracking

## Updates and Amendments

This document is reviewed quarterly and updated as needed when:
- New processors are added or removed
- Processing purposes change
- Regulatory requirements update
- Service architecture changes

**Last Updated**: January 2025  
**Version**: 1.0

## Contact

For questions about data processing:
- Email: privacy@socialcal.app
- Data Protection Officer: [If applicable]
- Support: https://socialcal.app/contact

---

*This document is provided for Meta App Review and demonstrates our commitment to responsible data handling and GDPR compliance.*