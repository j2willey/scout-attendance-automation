# Scout Attendance Automation

## Overview
An automated ETL (Extract, Transform, Load) pipeline that ingests raw Google Form data, normalizes it against a Roster database, and generates attendance analytics for a 50+ person organization.

## Architecture
* **Ingestion:** Google Forms (User Input) with branching logic.
* **Processing:** Google Apps Script (JavaScript/Node.js) to sanitize inputs and map Foreign Keys (Scout Names) to Database IDs.
* **Storage:** Normalized Relational Data (Google Sheets) separate from presentation layers.
* **Presentation:** Dynamic Pivot Tables for attendance tracking, camping nights, and service hours.

## Key Features
* **Data Normalization:** Converts fuzzy string matching (User input) into strict ID-based records.
* **Automated Reporting:** Eliminates manual data entry, reducing administrative time by 90%.
* **Conflict Resolution:** Handles "Branching" form logic where data appears in variable columns based on user selection.

## Tech Stack
* **Language:** JavaScript (Google Apps Script)
* **Environment:** Clasp (Command Line Apps Script Projects) for local development.
* **CI/CD:** Managed via Git/GitHub.