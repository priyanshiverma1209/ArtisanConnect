# Smart To-Do List – Daily Task Management System

An academic, production-quality BCA mini-project template built using Python (Flask), HTML5, CSS3, JavaScript, and SQLite. This project implements a fully functional task-tracking dashboard with a responsive, modern glassmorphic interface and a complete SQLite database backend.

---

## 📂 Project Structure

```text
Smart-ToDo-List/
│
├── app.py                  # Main Flask application (Routes, CRUD operations, Validation)
├── database.py             # SQLite helper module (Schema initialization, transactions)
├── database.db             # SQLite database file (Automatically generated on first run)
├── requirements.txt        # Python external dependencies manifest
├── project_report.md       # Comprehensive academic testing report, user manual, and bug log
├── README.md               # Quickstart and project overview
│
├── templates/
│   ├── index.html          # Main productivity dashboard
│   └── edit.html           # Task editor page
│
└── static/
    ├── css/
    │   └── style.css       # Custom styles (theme vars, responsive grid, animations)
    └── js/
        └── script.js       # Core interactions (real-time search, filters, sorts, stats)
```

---

## 🛠️ Technology Stack

* **Backend**: Python 3.8+ (Flask Framework)
* **Database**: SQLite3 (relational local storage)
* **Frontend Styles**: Native CSS3 (Variables, Flexbox, CSS Grid, Glassmorphic overlays)
* **Frontend Logic**: Vanilla JavaScript (ES6+, DOM API, local storage)
* **Design Accents**: Inline SVGs (No external icon packages or slow CDN assets)

---

## ✨ System Features

1. **Full CRUD Operations**: Create new tasks, read them dynamically from SQLite, update their fields, toggle completion status, and delete records.
2. **Dynamic Statistics Panel**: Live counters displaying Total, Completed, Pending, and High Priority counts.
3. **Completion Progress Meter**: Real-time progress bar rendering the overall daily completion percentage.
4. **Real-time Query Search**: Search box filtering matches against titles and descriptions instantly.
5. **Multi-Parameter Sorting**: Re-order lists client-side by Due Date, Priority Rank, Newest, or Oldest.
6. **Task Status Filters**: All, Active, and Completed quick filters.
7. **Overdue / Due Today Warnings**: Red indicator flags for tasks past their due date and yellow flags for tasks due today.
8. **Toast Notifications**: Interactive popups showing system feedback (Task Added, Completed, Deleted, Theme Switched).
9. **Persistent Dark Mode**: Header toggle mapping light/dark styles, saved across browser reloads via `localStorage`.

---

## 🏁 Installation & Launch Instructions

Follow these steps to run the application on your computer:

### Step 1: Initialize Virtual Environment
Open a terminal in the project directory:
```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### Step 2: Install Packages
```bash
pip install -r requirements.txt
```

### Step 3: Run the Web Server
```bash
python app.py
```

### Step 4: Open Browser
Navigate to [http://127.0.0.1:5000](http://127.0.0.1:5000) in your web browser.

---

## 📷 Screenshots Section
*(Add screenshots of your light mode dashboard, dark mode layouts, edit view panels, and validation warnings inside your final project submissions here).*

---

## 📚 Academic Documentation & Reports
For details regarding test cases, bug reports, user manuals, and technical deployment guides, please see the companion document:
* **[Project Report & User Manual](file:///C:/Users/raiak/.gemini/antigravity/scratch/Smart-ToDo-List/project_report.md)**

---

## 👨‍💻 Author & License
* **Author**: BCA Final-Year Student  
* **License**: MIT License - Free to modify and reuse for academic submissions.
