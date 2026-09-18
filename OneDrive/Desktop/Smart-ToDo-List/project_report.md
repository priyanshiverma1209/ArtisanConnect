# Project Report: Smart To-Do List – Daily Task Management System

**Academic Project Report**  
**Course Code**: BCA-Mini-Project  
**Author**: BCA Final-Year Student  

---

## 📋 Executive Summary
The **Smart To-Do List** is a responsive, full-stack task management application designed to facilitate daily tracking of activities. Built using python-based **Flask**, **SQLite**, and modern web standards (**HTML5**, **CSS3**, **Vanilla JS**), the system implements local database persistence, instant theme settings, multi-parameter sorting, text query search, and visual progress tracking.

---

## 🧪 1. Testing Documentation

Testing was performed across multiple layers including backend routing validation, database consistency tests, UI responsive responsiveness, and browser engine compatibility.

### 1.1 Testing Methodology
* **Unit Testing**: Direct method executions on `database.py` interface.
* **Functional Testing**: Validating user CRUD operations (Add, Complete, Edit, Delete).
* **UI/UX Testing**: Theme transitions, responsive grids, limits on char count.
* **Database Testing**: Verifying table creation, column checks, and null constraints.
* **Browser Compatibility Testing**: Testing functionality across Blink (Chrome/Edge), WebKit (Safari), and Gecko (Firefox) layout engines.

### 1.2 Test Cases Table (15 Cases)

| Test ID | Category | Feature Tested | Input / Action | Expected Output | Result |
|---|---|---|---|---|---|
| **TC-01** | Functional | DB Initialization | Run `app.py` first time | `database.db` and table `tasks` created | **PASS** |
| **TC-02** | Functional | Add Task (Valid) | Submit Form: "Complete BCA Report", Category: "Study", Priority: "High" | Task added, flash message shown, stats update | **PASS** |
| **TC-03** | Validation | Add Task (Empty) | Submit Title: "" (empty string) | Blocks HTML submit (required tag), flash alert triggered if bypassed | **PASS** |
| **TC-04** | Validation | Add Task (Spaces) | Submit Title: "   " | Backend validation catches empty trim, flashes error redirect | **PASS** |
| **TC-05** | Functional | Task Completion | Click checkbox on task card | Card opacity transitions, checkbox checked, statistics counts adjust | **PASS** |
| **TC-06** | Functional | Edit Task UI | Click Edit link on card | Navigation to `/edit/<id>`, fields pre-populate with task details | **PASS** |
| **TC-07** | Functional | Edit Task Save | Modify title and click "Save Changes" | Redirects to `/`, updates title, displays success toast | **PASS** |
| **TC-08** | Functional | Delete Task | Click Delete, accept popup alert | Task record removed from DB, card fades out, stats update | **PASS** |
| **TC-09** | Functional | Real-time Search | Type "BCA" in search bar | Instant client-side show/hide of tasks matching query | **PASS** |
| **TC-10** | Functional | Status Filter Pills | Click "Completed" filter button | Filters cards to show only matching status client-side | **PASS** |
| **TC-11** | Functional | Task Sorting | Choose "Due Date" in Sort dropdown | Re-orders task cards array by date ascending | **PASS** |
| **TC-12** | UI/UX | Dark Mode Persistence | Toggle to "Dark Mode" and reload page | Reloads in Dark Mode instantly checking local storage settings | **PASS** |
| **TC-13** | UI/UX | Description Limit | Type 205 characters in description | Text area truncates at max 200 chars, counters shows warning | **PASS** |
| **TC-14** | Functional | Overdue Checks | Add task with yesterday's due date | Red "⚠️ Overdue" badge appears on the card automatically | **PASS** |
| **TC-15** | UI/UX | Mobile Responsive | Resize viewport to 375px wide | Form stack transitions to vertical columns, cards scale cleanly | **PASS** |

---

## 🐛 2. Bug Tracking & Resolution Report

During development, several issues were identified and resolved during system integration.

| Bug ID | Description | Severity | Status | Technical Solution / Fix |
|---|---|---|---|---|
| **BUG-01** | Database locked errors during high-frequency requests. | **Medium** | **Fixed** | Implemented connection close statement inside `finally` block in `database.py` to release SQLite locks. |
| **BUG-02** | Description textarea text overflowing card boundaries. | **Low** | **Fixed** | Added `word-break: break-word` and limited maximum description lengths to 200 characters in the schema/UI. |
| **BUG-03** | Empty spaces inputs accepted as task title. | **High** | **Fixed** | Added `.strip()` checks in both Flask routing and client-side submit validation loops. |
| **BUG-04** | Client side statistics went out of sync when JS filters hid elements. | **Medium** | **Fixed** | Standardized `recalculateDashboard()` to inspect all DOM elements regardless of hidden classes. |
| **BUG-05** | Date picker value mismatch on safari browser. | **Low** | **Fixed** | Configured inputs to standard ISO `YYYY-MM-DD` and added helper parse validation in JS. |

---

## 🛠️ 3. VS Code Deployment Guide

A step-by-step guide to run this project in **Visual Studio Code (VS Code)**.

### Step 1: Open Project Workspace
1. Launch **VS Code**.
2. Click `File` -> `Open Folder...` and select `C:\Users\raiak\.gemini\antigravity\scratch\Smart-ToDo-List`.
3. Open a terminal by clicking `Terminal` -> `New Terminal`.

### Step 2: Establish Virtual Environment
To isolate dependency installs:
```powershell
# Create environment
python -m venv venv

# Activate on Windows Powershell
.\venv\Scripts\Activate.ps1
```

### Step 3: Install Package Prerequisites
Install Flask package specifications:
```powershell
pip install -r requirements.txt
```

### Step 4: Run Flask Backend Application
Initialize database structures and run the debug server:
```powershell
python app.py
```

### Step 5: Load Client Dashboard
1. Open your web browser.
2. Visit the local URL: [http://127.0.0.1:5000](http://127.0.0.1:5000).

---

## 📖 4. User Manual

This guide describes how to operate the To-Do List features.

### 4.1 Creating Tasks
1. Under **Create New Task** on the left column, fill in the **Task Title** (required).
2. Write a summary under **Description** (limit 200 characters).
3. Set a **Priority** badge value (High, Medium, Low) and select a **Category** folder.
4. Pick a **Due Date** if applicable.
5. Click **Add Task**. A success toast message appears.

### 4.2 Editing Tasks
1. Click the pencil icon on the right side of the task card.
2. Edit details in the populated form.
3. Select **Save Changes** to commit updates or **Cancel** to revert.

### 4.3 Toggling Completion Status
* Click the circular button on the left edge of any card.
* Completed items display line-throughs and a green check icon. The progress meter increases instantly.

### 4.4 Removing Tasks
* Click the trash icon on the task card.
* Accept the pop-up warning to delete the record.

### 4.5 Sorting and Search Filters
* **Search**: Type in the query bar to narrow down matching tasks instantly.
* **Filters**: Select **All**, **Active**, or **Completed** pills to view specific lists.
* **Sorting**: Click the sort dropdown to order list elements by Date, Priority, or Newest.

### 4.6 Theme Customization
* Select **Dark Mode** on the upper right header to switch theme. This state is stored in your browser settings.

---

## 🚀 5. Future Enhancements

These features are recommended for a full production-level system:
1. **User Accounts & Authentication**: Secure sign-ups and logins via Flask-Login.
2. **Cloud Synchronization**: Sync records using PostgreSQL/MySQL backends.
3. **Email Alerts**: Automatic email notifications for upcoming deadlines.
4. **Calendar Visualizer**: Grid calendar interface matching due-dates.
5. **AI Schedule Builder**: Dynamic task breakdown suggestion using Gemini API.
6. **Voice Commands**: Microphone capture to input titles.
7. **Native Mobile App**: Mobile layout wrapper using React Native.
8. **Push Notifications**: Browser service worker push messaging.
9. **Team Integration**: Shared workspaces and tasks assigning.
10. **Data Backups**: CSV/JSON download tools to export records.
