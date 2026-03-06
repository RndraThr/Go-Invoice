# Project Context Summary: KSM Internal Systems
**Date:** March 5, 2026

This document provides a comprehensive overview of the ongoing development for PT Kian Santang Muliatama Tbk's internal systems, specifically focusing on the **Invoice Out** and **Cost Control** modules.

## 1. Project Overview & Objectives
The primary objective of this project is to digitize and integrate KSM's core operational workflows, moving away from manual tracking (spreadsheets) to a centralized web-based platform. 

The project is divided into two main pillars managed by two developers (Rendra & Andre), designed to communicate seamlessly with each other:
1. **Invoice Out (PIC: Rendra)**: A system focused on managing outgoing billing, generating official invoices, tracking payment statuses, and issuing standalone Kwitansi (receipts).
2. **Cost Control (PIC: Andre)**: A system focused on project budgeting, tracking actual expenditures against the Rencana Anggaran Biaya (RAB), and calculating the remaining budget (Cost To Go).

---

## 2. Shared Architecture & Technology Stack
To ensure these two systems can talk to each other and be maintained easily, they share a standardized modern technology stack and a centralized authentication system.

### Tech Stack
* **Frontend**: React JS with Next.js Framework, styled using Tailwind CSS and components from shadcn/ui.
* **Backend**: Golang utilizing the Fiber framework for high-performance REST APIs.
* **Database**: PostgreSQL/MySQL (managed via GORM) for relational data storage, and **Redis** for fast session management and caching.

### Single Sign-On (SSO) & Centralized Master Data
Instead of each app having its own login system, the **Cost Control API acts as the central hub**. 
* **Auth Hub**: Users log in once (via standard email/password or Google OAuth2). The system generates a JWT Bearer token stored in Redis, which is then used to authorize actions in both the Cost Control and Invoice Out applications.
* **Master Data Hub**: Reference data such as Item Catalogs, Client records, and Vendor details are sourced from a central Procurement module, ensuring data consistency across all applications.

---

## 3. Pillar 1: Invoice Out System (Deep Dive)
*Developed to handle the full lifecycle of client billing.*

### Workflow & Status Lifecycle
Invoices go through a strict, trackable lifecycle:
1. **Draft**: Created by the Finance team. Can include multiple billable items and file attachments (e.g., BAST, Timesheets).
2. **In Review**: Submitted by Finance to either the Procon or Marketing team for approval (depending on the PO type).
3. **Approved**: The designated team validates the invoice.
4. **Sent**: Finance marks the invoice as sent to the client. The system can generate official PDF Invoices with company letterheads.
5. **Paid**: Finance marks the invoice as resolved once payment is received.

### Key Features Implemented:
* **Dynamic Approval Routing**: A smart routing system where invoices tied to a "PROJECT" PO are reviewed by the **Procon** division, whereas invoices tied to a "RETAIL" PO are reviewed by the **Marketing** division.
* **Independent Kwitansi Module**: A dedicated workflow for generating Kwitansi (receipts). A Kwitansi is strictly linked to an approved/paid Invoice. The system automatically fetches client and nominal data from the parent Invoice and can generate a PDF with the nominal amount automatically converted to Indonesian spelled-out words (e.g., "Satu Juta Rupiah").
* **Audit Trails & Overdue Tracking**: Every status change is logged with the user's name and timestamp. The system also flags invoices that have passed their due date.
* **Export Capabilities**: Data can be exported to Excel worksheets for management reporting.

---

## 4. Pillar 2: Cost Control System (Deep Dive)
*Developed to monitor project financial health by comparing planned budgets against actual spending.*

### Workflow & Core Modules
1. **Project Registry**: The starting point where a new project is registered, capturing the contract value, client details, timeline, and any Addendums (changes in project scope/value).
2. **Budgeting (RAB)**: Setting the baseline for planned expenditures.
3. **Realization (Actual Costs)**: As the project progresses, actual expenditures are inputted based on material/service item codes.

### Key Features Implemented:
* **Automated Cost Calculation**: The system's core value lies in its auto-calculation engine. Whenever a new real expenditure is logged, the backend instantly recalculates the project's **Cost To Go (Remaining Budget)** and the **Progress Percentage (%)**, eliminating manual spreadsheet updates.
* **Procurement Readiness**: Currently utilizing a "Mock Adapter" for testing, but structurally ready to pull live pricing and vendor data from the upcoming Procurement API.

---

## 5. Upcoming Milestones (Next Steps)
While the core functionalities are active, the following enhancements are planned for the immediate future:

1. **WhatsApp Notifications**: Integrating a third-party WhatsApp API (e.g., Fonnte or Twilio) to automatically notify relevant divisions when an invoice requires approval, is rejected, or has been successfully paid.
2. **Executive Dashboards**: Building visual analytics dashboards for top-level management to view the global financial health of all running projects, tracking total receivables (Invoice Out) versus total expenditures (Cost Control) in real-time.
3. **Enhanced Reporting**: Finalizing the ability to export detailed RAB and Realization histories into clean PDF and Excel formats.
