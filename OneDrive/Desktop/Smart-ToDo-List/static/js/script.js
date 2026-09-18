/*
  Smart To-Do List – Daily Task Management System
  Upgraded Dynamic Controller (Modular Event Delegation, Single-Toast Architecture & Live APIs)
*/

document.addEventListener('DOMContentLoaded', () => {

    // ----------------------------------------------------
    // 1. Selector Definitions & App State
    // ----------------------------------------------------
    const themeToggleBtn = document.getElementById('themeToggle') || document.getElementById('theme-toggle');
    const taskForm = document.getElementById('task-form');
    const taskTitleInput = document.getElementById('task-title');
    const taskDescInput = document.getElementById('task-desc');
    const charCounter = document.getElementById('char-counter');
    const searchInput = document.getElementById('globalSearch') || document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const resetBtn = document.getElementById('reset-btn');
    const menuBtn = document.getElementById('menuButton');
    const sidebarEl = document.getElementById('sidebar') || document.getElementById('app-sidebar');

    // List & Empty state selectors
    const emptyStateContainer = document.getElementById('empty-state-container');
    const emptyTitleLbl = document.getElementById('empty-title-lbl');
    const emptyDescLbl = document.getElementById('empty-desc-lbl');
    const taskCountBadge = document.getElementById('task-count-badge');
    const taskItemsList = document.getElementById('task-items-list');

    // Tab buttons and panes
    const tabButtons = document.querySelectorAll('.nav-tab');
    const tabPanes = document.querySelectorAll('.page-section');

    // FAB Floating Button
    const fabBtn = document.getElementById('fab-add-task');

    // Voice Input Mic
    const voiceInputBtn = document.getElementById('voice-input-btn');

    // Focus Studio selectors
    const focusTaskSelect = document.getElementById('focus-task-select');
    const focusTimeDisplay = document.getElementById('focus-time-left');
    const focusRingFill = document.getElementById('focus-ring-fill');
    const focusStatusBadge = document.getElementById('focus-status-badge');
    const focusModeLabel = document.getElementById('focus-mode-label');
    const focusStartBtn = document.getElementById('btn-focus-start');
    const focusPauseBtn = document.getElementById('btn-focus-pause');
    const focusResumeBtn = document.getElementById('btn-focus-resume');
    const focusResetBtn = document.getElementById('btn-focus-reset');
    const focusDurationBtns = document.querySelectorAll('.focus-duration-btn');

    // Calendar grid selectors
    const calendarMonthYear = document.getElementById('calendar-month-year');
    const calendarDaysGrid = document.getElementById('calendar-days-grid');
    const calPrevBtn = document.getElementById('cal-prev-btn');
    const calNextBtn = document.getElementById('cal-next-btn');
    const calSelectedTasksContainer = document.getElementById('calendar-tasks-container');
    const calSelectedDateTitle = document.querySelector('.selected-date-title');

    // Edit Modal Elements
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-task-form');
    const closeEditBtn = document.getElementById('close-edit-modal');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const editTaskTitle = document.getElementById('edit-title');
    const editTaskDesc = document.getElementById('edit-desc');
    const editTaskEstTime = document.getElementById('edit-est-time');
    const editTaskDueDate = document.getElementById('edit-due-date');
    const editTaskPriority = document.getElementById('edit-priority');
    const editTaskCategory = document.getElementById('edit-category');
    const editTaskStatus = document.getElementById('edit-status');
    const editTaskProgress = document.getElementById('edit-progress');
    const editProgressTextDisplay = document.getElementById('edit-progress-text');
    const editCharCounter = document.getElementById('edit-char-counter');

    // Dashboard values & Progress bar
    const statTotalVal = document.getElementById('stat-total-val');
    const statActiveVal = document.getElementById('stat-active-val');
    const statToDoVal = document.getElementById('stat-todo-val');
    const statInProgressVal = document.getElementById('stat-inprogress-val');
    const statCompletedVal = document.getElementById('stat-completed-val');
    const statOverdueVal = document.getElementById('stat-overdue-val');

    // Category counters
    const countStudy = document.getElementById('count-study');
    const countWork = document.getElementById('count-work');
    const countPersonal = document.getElementById('count-personal');
    const countOther = document.getElementById('count-other');

    // Overall Productivity Widget
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressPercentageLabel = document.getElementById('progress-percentage-label');

    // Global charts instances
    let chartStatusInstance = null;
    let chartCategoryInstance = null;
    let chartWeeklyInstance = null;
    let chartPriorityInstance = null;

    // Core state lists
    let allTasks = [];
    let currentFilter = 'all';
    let currentSearch = '';

    // =========================================================================
    // Focus Studio State Engine (Single Unified Implementation)
    // =========================================================================
    let focusTimerInterval = null;
    let ambientAudioContext = null;
    let ambientGainNode = null;
    let ambientNoiseSource = null;
    let isAmbientPlaying = false;

    const focusState = {
        isRunning: false,
        isPaused: false,
        taskId: null,
        taskTitle: '',
        taskPriority: '',
        taskProgress: 0,
        durationMinutes: 20,
        totalSeconds: 20 * 60,
        remainingSeconds: 20 * 60,
        endTime: null,
        sessionId: null,
        startedAt: null
    };

    // Calendar states
    let calendarDate = new Date();

    // Toast Timer Instance
    let activeToastTimeout = null;

    // Accessibility motion reduction preference check
    function prefersReducedMotion() {
        return window.matchMedia('(prefers-color-scheme: reduce)').matches ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    // ----------------------------------------------------
    // 2. Centralized Single-Toast Notification Architecture
    // ----------------------------------------------------
    let activeToast = null;
    let activeToastTimer = null;

    function showToast(message, type = "info") {
        const container = document.getElementById("toastContainer") || document.getElementById("toast-container");
        if (!container) return;

        if (activeToastTimer) {
            clearTimeout(activeToastTimer);
            activeToastTimer = null;
        }

        if (activeToast) {
            activeToast.remove();
            activeToast = null;
        }

        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-message">${message}</span>
            <button class="toast-close" type="button" aria-label="Close notification">×</button>
        `;

        container.appendChild(toast);
        activeToast = toast;

        requestAnimationFrame(() => {
            toast.classList.add("toast-visible");
        });

        const closeBtn = toast.querySelector(".toast-close");
        if (closeBtn) {
            closeBtn.addEventListener("click", () => removeToast(toast));
        }

        const duration = (type === "error" || type === "warning") ? 3000 : 2500;
        activeToastTimer = setTimeout(() => {
            removeToast(toast);
        }, duration);
    }

    function removeToast(toast) {
        if (!toast) return;
        toast.classList.remove("toast-visible", "toast-show");
        toast.classList.add("toast-leaving", "toast-fade-out");
        setTimeout(() => {
            toast.remove();
            if (activeToast === toast) {
                activeToast = null;
            }
        }, 200);
    }

    function closeToast(toast) {
        removeToast(toast);
    }

    // Initialize/Dismiss server-rendered flashes correctly
    const initialToasts = document.querySelectorAll('.toast');
    initialToasts.forEach(toast => {
        const closeBtn = toast.querySelector('.toast-close-btn') || toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeToast(toast);
            });
        }
        setTimeout(() => removeToast(toast), 3000);
    });

    // ----------------------------------------------------
    // 3. Local Storage Theme Persistence
    // ----------------------------------------------------
    function initTheme() {
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = savedTheme === 'dark' || (!savedTheme && systemPrefersDark);

        if (isDark) {
            document.body.classList.add('dark-mode');
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            document.documentElement.setAttribute('data-theme', 'light');
        }
        updateThemeBtnUI(isDark);
    }
    function toggleTheme() {
        const isDark = document.body.classList.toggle('dark-mode');
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        updateThemeBtnUI(isDark);
        showToast(`Theme switched to ${isDark ? 'Dark Mode' : 'Light Mode'}`, 'info');
        initAnalyticsCharts();
    }
    function updateThemeBtnUI(isDark) {
        if (themeToggleBtn) {
            themeToggleBtn.textContent = isDark ? '☀️' : '☾';
            themeToggleBtn.setAttribute('title', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
        }
    };

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }
    initTheme();

    // Mobile Menu Toggle
    if (menuBtn && sidebarEl) {
        menuBtn.addEventListener('click', () => {
            sidebarEl.classList.toggle('open');
        });
    }

    // ----------------------------------------------------
    // 4. Single Left Sidebar Navigation & Dynamic Page Titles
    // ----------------------------------------------------
    function showSection(sectionName) {
        const sections = document.querySelectorAll(".page-section");
        const navItems = document.querySelectorAll(".nav-item, .sidebar-item, .nav-tab");
        const pageTitle = document.getElementById("currentPageTitle");

        sections.forEach(section => {
            section.classList.remove("active");
            section.classList.remove("active-page");
            section.style.display = "none";
        });

        navItems.forEach(item => {
            item.classList.remove("active");
            item.setAttribute('aria-selected', 'false');
        });

        const sectionMap = {
            'dashboard': 'section-dashboard',
            'tasks': 'section-tasks',
            'list': 'section-tasks',
            'calendar': 'section-calendar',
            'kanban': 'section-kanban',
            'pipeline': 'section-kanban',
            'ai': 'section-ai',
            'insights': 'section-ai',
            'planner': 'section-planner',
            'dailyPlan': 'section-planner',
            'focus': 'section-focus',
            'focusStudio': 'section-focus',
            'habits': 'section-habits',
            'habitTracker': 'section-habits',
            'analytics': 'section-analytics',
            'achievements': 'section-achievements',
            'settings': 'section-settings'
        };

        const targetId = sectionMap[sectionName] || (sectionName.startsWith('section-') ? sectionName : `section-${sectionName}`);
        const selectedSection = document.getElementById(targetId) || document.getElementById(sectionName);

        // Find matching nav button
        let selectedNav = document.querySelector(`.nav-item[data-section="${sectionName}"]`)
            || document.querySelector(`[data-page="${sectionName}"]`);

        if (!selectedNav) {
            const mappedKey = Object.keys(sectionMap).find(k => sectionMap[k] === targetId);
            if (mappedKey) {
                selectedNav = document.querySelector(`.nav-item[data-section="${mappedKey}"]`);
            }
        }

        if (selectedSection) {
            selectedSection.classList.add("active");
            selectedSection.classList.add("active-page");
            selectedSection.style.display = "block";
        }

        if (selectedNav) {
            selectedNav.classList.add("active");
            selectedNav.setAttribute('aria-selected', 'true');
            if (pageTitle) {
                pageTitle.textContent = selectedNav.dataset.title || selectedNav.textContent.trim().replace(/^[^a-zA-Z0-9]+/, '') || "AI Task Manager";
            }
        } else if (pageTitle && sectionName) {
            const formatted = sectionName.replace(/^section-/, '').charAt(0).toUpperCase() + sectionName.replace(/^section-/, '').slice(1);
            pageTitle.textContent = formatted;
        }

        const sidebar = document.getElementById("sidebar") || document.getElementById("app-sidebar");
        if (sidebar) {
            sidebar.classList.remove("open");
        }

        // Sub-views dynamic loading and chart initializations
        if (targetId.includes('dashboard')) {
            renderDashboardView();
        } else if (targetId.includes('calendar')) {
            renderCalendar();
        } else if (targetId.includes('analytics')) {
            initAnalyticsCharts();
        } else if (targetId.includes('kanban')) {
            initKanbanBoard();
        } else if (targetId.includes('focus')) {
            updateFocusDisplay();
            updateFocusTaskInfo();
            fetchFocusStats();
        } else if (targetId.includes('habits')) {
            initHabitTracker();
        } else if (targetId.includes('achievements')) {
            loadGamificationDashboard();
        }
    }

    // Function aliases for showSection switch router
    function renderTaskView() { applyFiltersAndSearch(); }
    function renderCalendarView() { renderCalendar(); }
    function renderKanbanView() { initKanbanBoard(); }
    function renderAnalyticsView() { initAnalyticsCharts(); }
    function renderFocusView() { updateFocusDisplay(); updateFocusTaskInfo(); fetchFocusStats(); }
    function renderHabitView() { initHabitTracker(); }

    window.showSection = showSection;
    window.showPage = showSection;

    document.querySelectorAll(".nav-item").forEach(item => {
        item.addEventListener("click", () => {
            const section = item.dataset.section;
            if (section) {
                showSection(section);
            }
        });
    });

    // (Initialized at bottom of DOMContentLoaded)

    // Add Task Modal Controls
    const addTaskModal = document.getElementById('add-task-modal');
    const openAddTaskBtn = document.getElementById('btn-open-create-task');
    const closeAddModalBtn = document.getElementById('close-add-modal-btn');
    const cancelAddModalBtn = document.getElementById('cancel-add-modal-btn');

    if (openAddTaskBtn && addTaskModal) {
        openAddTaskBtn.addEventListener('click', () => {
            addTaskModal.classList.remove('hidden');
            if (taskTitleInput) setTimeout(() => taskTitleInput.focus(), 150);
        });
    }

    if (closeAddModalBtn && addTaskModal) {
        closeAddModalBtn.addEventListener('click', () => {
            addTaskModal.classList.add('hidden');
        });
    }

    if (cancelAddModalBtn && addTaskModal) {
        cancelAddModalBtn.addEventListener('click', () => {
            addTaskModal.classList.add('hidden');
        });
    }

    if (addTaskModal) {
        addTaskModal.addEventListener('click', (e) => {
            if (e.target === addTaskModal) {
                addTaskModal.classList.add('hidden');
            }
        });
    }

    // Dashboard Quick Navigation Triggers
    const dashViewCalBtn = document.getElementById('dash-view-calendar-btn');
    const dashAskAiBtn = document.getElementById('dash-ask-ai-btn');
    const dashViewInsightsBtn = document.getElementById('dash-view-insights-btn');
    const dashViewAllTasksBtn = document.getElementById('dash-view-all-tasks-btn');

    if (dashViewCalBtn) dashViewCalBtn.addEventListener('click', () => showPage('calendar'));
    if (dashAskAiBtn) dashAskAiBtn.addEventListener('click', () => showPage('insights'));
    if (dashViewInsightsBtn) dashViewInsightsBtn.addEventListener('click', () => showPage('insights'));
    if (dashViewAllTasksBtn) dashViewAllTasksBtn.addEventListener('click', () => showPage('list'));

    // Dynamic Executive Dashboard Renderer
    function renderDashboardView() {
        const todayStr = new Date().toISOString().split('T')[0];
        let total = allTasks.length;
        let completed = 0;
        let inProgress = 0;
        let overdue = 0;
        let todo = 0;

        allTasks.forEach(task => {
            if (task.status === 'completed') {
                completed++;
            } else {
                if (task.status === 'in_progress') inProgress++;
                else todo++;
                if (task.dueDate && task.dueDate < todayStr) overdue++;
            }
        });

        let productivity = total > 0 ? Math.round(allTasks.reduce((s, t) => s + (t.progress || 0), 0) / total) : 0;

        // Update 5 executive stat cards
        const dashStatTotal = document.getElementById('dash-stat-total');
        const dashStatCompleted = document.getElementById('dash-stat-completed');
        const dashStatInProgress = document.getElementById('dash-stat-inprogress');
        const dashStatOverdue = document.getElementById('dash-stat-overdue');
        const dashStatProductivity = document.getElementById('dash-stat-productivity');

        if (dashStatTotal) dashStatTotal.textContent = total;
        if (dashStatCompleted) dashStatCompleted.textContent = completed;
        if (dashStatInProgress) dashStatInProgress.textContent = inProgress;
        if (dashStatOverdue) dashStatOverdue.textContent = overdue;
        if (dashStatProductivity) dashStatProductivity.textContent = `${productivity}%`;

        // Lower Dashboard widgets
        const dashCompletionRate = document.getElementById('dash-completion-rate-text');
        const dashProgressFill = document.getElementById('dash-progress-fill');
        const dashProgressLabel = document.getElementById('dash-progress-label');
        const dashProgCompleted = document.getElementById('dash-prog-completed-count');
        const dashProgInProgress = document.getElementById('dash-prog-inprogress-count');
        const dashProgToDo = document.getElementById('dash-prog-todo-count');

        if (dashCompletionRate) dashCompletionRate.textContent = `${productivity}% Complete`;
        if (dashProgressFill) dashProgressFill.style.width = `${productivity}%`;
        if (dashProgressLabel) dashProgressLabel.textContent = `${productivity}%`;
        if (dashProgCompleted) dashProgCompleted.textContent = `${completed} Completed`;
        if (dashProgInProgress) dashProgInProgress.textContent = `${inProgress} In Progress`;
        if (dashProgToDo) dashProgToDo.textContent = `${todo} To Do`;

        // Today's Plan Rows
        const todayRowsContainer = document.getElementById('dash-today-task-rows');
        const todayCountBadge = document.getElementById('dash-today-count');
        const todayTasks = allTasks.filter(t => t.dueDate === todayStr || (t.status !== 'completed' && (t.priority === 'high' || t.status === 'in_progress')));

        if (todayCountBadge) todayCountBadge.textContent = `${todayTasks.length} ${todayTasks.length === 1 ? 'task' : 'tasks'}`;

        if (todayRowsContainer) {
            if (todayTasks.length === 0) {
                todayRowsContainer.innerHTML = `
                    <div class="today-task-row" style="justify-content: center; color: var(--text-secondary); padding: 1.25rem;">
                        <span>✨ No urgent tasks for today. Great job!</span>
                    </div>
                `;
            } else {
                todayRowsContainer.innerHTML = todayTasks.slice(0, 5).map(task => {
                    const isCompleted = task.status === 'completed';
                    return `
                        <div class="today-task-row">
                            <div class="today-task-row-left">
                                <button class="task-toggle-ajax-btn" data-id="${task.id}" aria-label="Toggle task">
                                    <div class="custom-checkbox ${isCompleted ? 'checked' : ''}" style="${isCompleted ? 'background: var(--success); border-color: var(--success);' : ''}">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="${isCompleted ? '#fff' : 'currentColor'}" stroke-width="3" style="width: 12px; height: 12px; display: ${isCompleted ? 'block' : 'none'};">
                                            <polyline points="20 6 9 17 4 12"/>
                                        </svg>
                                    </div>
                                </button>
                                <div>
                                    <div class="today-task-row-title ${isCompleted ? 'text-muted' : ''}" style="${isCompleted ? 'text-decoration: line-through;' : ''}">${task.title}</div>
                                    <div class="today-task-row-meta">
                                        <span class="badge cat-${task.category}">${task.category}</span>
                                        <span class="badge prio-${task.priority}">${task.priority}</span>
                                    </div>
                                </div>
                            </div>
                            <button class="btn btn-secondary btn-xs" onclick="window.showPage('list')">View</button>
                        </div>
                    `;
                }).join('');
            }
        }

        // AI Suggestions Stack
        const aiSuggestionsStack = document.getElementById('dash-ai-suggestions-stack');
        if (aiSuggestionsStack) {
            const suggestions = [];
            if (overdue > 0) {
                suggestions.push({
                    type: 'warning',
                    icon: '⚠️',
                    text: `You have <strong>${overdue} overdue ${overdue === 1 ? 'task' : 'tasks'}</strong>. Consider rescheduling or prioritizing them today.`
                });
            }
            if (inProgress > 0) {
                suggestions.push({
                    type: 'info',
                    icon: '💡',
                    text: `You have <strong>${inProgress} active task${inProgress === 1 ? '' : 's'} in progress</strong>. Use the Focus Studio to maintain momentum.`
                });
            }
            if (completed > 0) {
                suggestions.push({
                    type: 'success',
                    icon: '🎯',
                    text: `Outstanding! You have completed <strong>${completed} task${completed === 1 ? '' : 's'}</strong> with a <strong>${productivity}% productivity rate</strong>.`
                });
            }
            if (suggestions.length < 3) {
                suggestions.push({
                    type: 'info',
                    icon: '🤖',
                    text: 'Pro-tip: Try asking the AI Assistant to generate action plans or break down complex projects.'
                });
            }
            aiSuggestionsStack.innerHTML = suggestions.map(s => `
                <div class="ai-suggestion-item ${s.type}-tint">
                    <span class="ai-suggestion-icon">${s.icon}</span>
                    <span>${s.text}</span>
                </div>
            `).join('');
        }

        // Upcoming Deadlines List
        const deadlinesContainer = document.getElementById('dash-upcoming-deadlines-list');
        if (deadlinesContainer) {
            const upcomingTasks = allTasks
                .filter(t => t.dueDate && t.dueDate >= todayStr && t.status !== 'completed')
                .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                .slice(0, 4);

            if (upcomingTasks.length === 0) {
                deadlinesContainer.innerHTML = `
                    <div class="today-task-row" style="justify-content: center; color: var(--text-secondary); padding: 1.25rem;">
                        <span>📅 No upcoming deadlines scheduled.</span>
                    </div>
                `;
            } else {
                deadlinesContainer.innerHTML = upcomingTasks.map(task => `
                    <div class="today-task-row">
                        <div class="today-task-row-left">
                            <svg class="calendar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--primary);">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            <div>
                                <div class="today-task-row-title">${task.title}</div>
                                <div class="today-task-row-meta">
                                    <span style="font-size: 0.72rem; color: var(--text-secondary);">Due: ${task.dueDate}</span>
                                    <span class="badge prio-${task.priority}">${task.priority}</span>
                                </div>
                            </div>
                        </div>
                        <button class="btn btn-secondary btn-xs" onclick="window.showPage('list')">Details</button>
                    </div>
                `).join('');
            }
        }
    };
    window.renderDashboardView = renderDashboardView;

    // Speed Dial Floating Action Button (FAB)
    const fabContainer = document.getElementById('fab-container');
    const fabMenu = document.getElementById('fab-menu');

    if (fabBtn && fabMenu) {
        fabBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fabMenu.classList.toggle('hidden');
        });

        document.addEventListener('click', (e) => {
            if (fabContainer && !fabContainer.contains(e.target)) {
                fabMenu.classList.add('hidden');
            }
        });

        document.querySelectorAll('.fab-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                fabMenu.classList.add('hidden');

                if (action === 'add-task') {
                    showPage('list');
                    const creationPanel = document.getElementById('task-creation-panel');
                    if (creationPanel) {
                        creationPanel.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
                        if (taskTitleInput) setTimeout(() => taskTitleInput.focus(), 400);
                    }
                } else if (action === 'ask-ai') {
                    showPage('insights');
                    const aiInput = document.getElementById('ai-chat-input');
                    if (aiInput) setTimeout(() => aiInput.focus(), 400);
                } else if (action === 'start-focus') {
                    showPage('focusStudio');
                } else if (action === 'create-habit') {
                    showPage('habitTracker');
                }
            });
        });
    } else if (fabBtn) {
        fabBtn.addEventListener('click', () => {
            const creationPanel = document.getElementById('task-creation-panel');
            if (creationPanel) {
                creationPanel.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
                if (taskTitleInput) setTimeout(() => taskTitleInput.focus(), 600);
            }
        });
    }

    // ----------------------------------------------------
    // 5. Tasks Parsing & Data Engine
    // ----------------------------------------------------
    function loadTasksFromDOM() {
        const cards = document.querySelectorAll('.task-items-list > .task-card');
        const seenIds = new Set();
        allTasks = [];
        cards.forEach(card => {
            const id = card.getAttribute('data-id');
            if (id && seenIds.has(id)) {
                card.remove();
                return;
            }
            if (id) seenIds.add(id);

            allTasks.push({
                id: card.getAttribute('data-id'),
                title: card.getAttribute('data-title'),
                description: card.getAttribute('data-description'),
                priority: card.getAttribute('data-priority'),
                category: card.getAttribute('data-category'),
                dueDate: card.getAttribute('data-due-date'),
                status: card.getAttribute('data-status'),
                createdAt: card.getAttribute('data-created-at'),
                boardStatus: card.getAttribute('data-status'),
                estTime: parseInt(card.getAttribute('data-est-time')) || 0,
                progress: parseInt(card.getAttribute('data-progress')) || 0,
                startedAt: card.getAttribute('data-started-at'),
                completedAt: card.getAttribute('data-completed-at'),
                updatedAt: card.getAttribute('data-updated-at'),
                aiPriority: card.getAttribute('data-ai-priority') || '',
                aiReason: card.getAttribute('data-ai-reason') || '',
                domNode: card
            });
        });
    };

    // Rebuilt Card Component
    function createTaskCardHTML(task) {
        const categoryLabels = { study: '📚 Study', work: '💼 Work', personal: '🏠 Personal', other: '🧩 Other' };

        const isCompleted = task.status === 'completed';
        const isInProgress = task.status === 'in_progress';

        let statusBadgeHTML = '⚪ To Do';
        if (isCompleted) statusBadgeHTML = '✓ Completed';
        else if (isInProgress) statusBadgeHTML = '<span class="pulse-dot"></span> Currently Working';

        return `
            <div class="task-card ${task.priority}-priority ${isCompleted ? 'task-completed' : ''}" 
                 draggable="true"
                 data-id="${task.id}"
                 data-title="${task.title.toLowerCase()}"
                 data-description="${task.description.toLowerCase()}"
                 data-priority="${task.priority}"
                 data-category="${task.category}"
                 data-due-date="${task.dueDate}"
                 data-status="${task.status}"
                 data-created-at="${task.createdAt}"
                 data-board-status="${task.status}"
                 data-est-time="${task.estTime}"
                 data-progress="${task.progress}"
                 data-started-at="${task.startedAt || 'Not started'}"
                 data-completed-at="${task.completedAt || '—'}"
                 data-updated-at="${task.updatedAt || '—'}"
                 data-ai-priority="${task.aiPriority || ''}"
                 data-ai-reason="${task.aiReason || ''}">
                
                <div class="task-card-left">
                    <button class="task-toggle-ajax-btn" data-id="${task.id}" aria-label="Toggle completed status">
                        <div class="custom-checkbox">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="check-icon" aria-hidden="true">
                                <polyline points="20 6 9 17 4 12"/>
                            </svg>
                        </div>
                    </button>
                </div>

                <div class="task-card-content">
                    <div class="task-card-meta">
                        <span class="category-badge cat-${task.category}">${categoryLabels[task.category] || '🧩 Other'}</span>
                        <span class="priority-badge prio-${task.priority}">${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>
                        
                        <span class="status-badge status-${task.status}">${statusBadgeHTML}</span>
                        
                        <span class="overdue-badge hidden">⚠️ Overdue by 0 days</span>
                        <span class="due-today-badge hidden">📅 Due Today</span>
                        <span class="upcoming-badge hidden">📅 Due in 0 days</span>
                    </div>

                    <h3 class="task-title-text">${task.title}</h3>
                    ${task.description ? `<p class="task-desc-text">${task.description}</p>` : ''}

                    <!-- Single Clean Progress Component -->
                    <div class="task-progress-container">
                        <div class="task-progress-header">
                            <span class="task-progress-label">Progress:</span>
                            <strong class="task-progress-percent card-progress-text">${task.progress}%</strong>
                        </div>
                        <div class="task-slider-track-wrap">
                            <input type="range" 
                                   class="task-progress-slider card-progress-slider" 
                                   min="0" 
                                   max="100" 
                                   value="${task.progress}" 
                                   data-id="${task.id}" 
                                   aria-label="Adjust task progress">
                        </div>
                    </div>

                    <!-- Status Selector and Quick Actions -->
                    <div class="card-status-actions-row">
                        <div class="select-wrapper card-status-select-wrapper">
                            <select class="card-status-select" data-id="${task.id}" aria-label="Change status select">
                                <option value="to_do" ${task.status === 'to_do' ? 'selected' : ''}>To Do</option>
                                <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                                <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Completed</option>
                            </select>
                        </div>
                        
                        <div class="card-action-triggers">
                            <button type="button" class="btn btn-xs btn-primary action-start-btn ${task.status !== 'to_do' ? 'hidden' : ''}" data-id="${task.id}">▶ Start</button>
                            <button type="button" class="btn btn-xs btn-warning action-pause-btn ${task.status !== 'in_progress' ? 'hidden' : ''}" data-id="${task.id}">⏸ Pause</button>
                            <button type="button" class="btn btn-xs btn-success action-complete-btn ${task.status === 'completed' ? 'hidden' : ''}" data-id="${task.id}">✓ Complete</button>
                            <button type="button" class="btn btn-xs btn-secondary action-reopen-btn ${task.status !== 'completed' ? 'hidden' : ''}" data-id="${task.id}">↩ Re-open</button>
                        </div>
                    </div>

                    <!-- AI Card Action Triggers -->
                    <div class="card-ai-triggers" style="display: flex; gap: 0.5rem; margin-top: 0.5rem; flex-wrap: wrap;">
                        <button type="button" class="btn btn-xs btn-ai card-ai-breakdown-btn" data-id="${task.id}">&#129302; Breakdown</button>
                        <button type="button" class="btn btn-xs btn-ai card-ai-priority-btn" data-id="${task.id}">&#128308; Smart Priority</button>
                        <button type="button" class="btn btn-xs btn-ai card-ai-estimate-btn" data-id="${task.id}">&#9201; Suggest Time</button>
                    </div>

                    <!-- Saved/Suggested AI Details Badge (Part 3/4) -->
                    <div class="card-ai-badge-row ${!task.aiPriority ? 'hidden' : ''}" id="ai-badges-${task.id}" style="margin-top: 0.5rem; padding: 0.5rem; background: var(--bg-hover); border-radius: var(--radius-sm); border-left: 3px solid var(--primary);">
                        <div style="font-size: 0.78rem; font-weight: 700; color: var(--primary);">&#128161; Suggested Priority: <span id="ai-badge-val-${task.id}" class="ai-prio-badge prio-${task.aiPriority || 'medium'}">${(task.aiPriority || 'Medium').toUpperCase()}</span></div>
                        <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.25rem;"><em>Reason: <span id="ai-badge-reason-${task.id}">${task.aiReason || ''}</span></em></div>
                    </div>

                    <!-- Dynamic Subtask Breakdown box -->
                    <div class="card-ai-breakdown-box hidden" id="ai-breakdown-box-${task.id}" style="margin-top: 0.5rem; padding: 0.75rem; background: var(--bg-card-sub); border-radius: var(--radius-sm); border: 1px dashed var(--border);">
                        <!-- Content populated dynamically -->
                    </div>

                    <!-- Dates timestamps grid -->
                    <div class="card-timestamps-grid">
                        <span><strong>Created:</strong> ${task.createdAt ? task.createdAt.slice(0, 10) : '—'}</span>
                        <span><strong>Started:</strong> <span class="started-date-lbl">${task.startedAt ? task.startedAt.slice(0, 10) : 'Not started'}</span></span>
                        <span><strong>Updated:</strong> <span class="updated-date-lbl">${task.updatedAt && task.updatedAt !== '—' ? task.updatedAt.slice(0, 10) : '—'}</span></span>
                        <span><strong>Completed:</strong> <span class="completed-date-lbl">${task.completedAt && task.completedAt !== '—' ? task.completedAt.slice(0, 10) : '—'}</span></span>
                    </div>

                    <div class="task-details-bottom">
                        ${task.dueDate ? `
                            <div class="due-date-meta">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="calendar-icon" aria-hidden="true">
                                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                                    <line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
                                </svg>
                                <span class="due-date-text">${task.dueDate}</span>
                            </div>
                        ` : ''}
                        ${task.estTime > 0 ? `<span class="est-time-meta">⏱️ ${task.estTime}m</span>` : ''}
                    </div>
                </div>

                <div class="task-card-actions">
                    <button class="action-btn edit-ajax-btn" data-id="${task.id}" title="Edit Task" aria-label="Edit task details">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                    </button>
                    <button class="action-btn delete-ajax-btn" data-id="${task.id}" title="Delete Task" aria-label="Delete task from database">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                </div>
            </div>
        `;
    };

    // ----------------------------------------------------
    // 6. Due-Date Intelligence (Part 10 Calculation)
    // ----------------------------------------------------
    function getSmartDateLabel(dateStr, status) {
        if (!dateStr) return '';
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const targetDate = new Date(dateStr);
            targetDate.setHours(0, 0, 0, 0);
            
            const diffTime = targetDate - today;
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Tomorrow';
            if (diffDays === -1) return 'Yesterday';
            
            const options = { month: 'short', day: 'numeric', year: 'numeric' };
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const day = parseInt(parts[2], 10);
                const localDate = new Date(year, month, day);
                return localDate.toLocaleDateString('en-US', options);
            }
            return targetDate.toLocaleDateString('en-US', options);
        } catch (e) {
            console.error('Error parsing smart date label:', e);
            return dateStr;
        }
    }

    function checkDueDates() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        allTasks.forEach(task => {
            const card = task.domNode;
            const cards = [card];
            const kanbanCard = document.querySelector(`.kanban-drop-zone .task-card[data-id="${task.id}"]`);
            if (kanbanCard) cards.push(kanbanCard);

            cards.forEach(node => {
                if (!node) return;
                const overdueBadge = node.querySelector('.overdue-badge');
                const dueTodayBadge = node.querySelector('.due-today-badge');
                const upcomingBadge = node.querySelector('.upcoming-badge');
                const dueDateWrapper = node.querySelector('.due-date-meta');

                if (overdueBadge) overdueBadge.classList.add('hidden');
                if (dueTodayBadge) dueTodayBadge.classList.add('hidden');
                if (upcomingBadge) upcomingBadge.classList.add('hidden');
                if (dueDateWrapper) dueDateWrapper.classList.remove('task-overdue');

                if (!task.dueDate) return;

                const dueDateText = node.querySelector('.due-date-text');
                if (dueDateText) {
                    dueDateText.textContent = getSmartDateLabel(task.dueDate, task.status);
                }

                const dueDateObj = new Date(task.dueDate);
                dueDateObj.setHours(0, 0, 0, 0);

                if (task.status !== 'completed') {
                    const diffTime = dueDateObj - today;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays < 0) {
                        const absDays = Math.abs(diffDays);
                        if (overdueBadge) {
                            overdueBadge.textContent = `⚠️ Overdue by ${absDays} day${absDays > 1 ? 's' : ''}`;
                            overdueBadge.classList.remove('hidden');
                        }
                        if (dueDateWrapper) dueDateWrapper.classList.add('task-overdue');
                    } else if (diffDays === 0) {
                        if (dueTodayBadge) dueTodayBadge.classList.remove('hidden');
                    } else {
                        if (upcomingBadge) {
                            upcomingBadge.textContent = `📅 Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
                            upcomingBadge.classList.remove('hidden');
                        }
                    }
                }
            });
        });
    };

    // ----------------------------------------------------
    // 7. Dynamic Dashboard Stats & Overall Productivity
    // ----------------------------------------------------
    function updateStatistics() {
        const prevTotal = parseInt(statTotalVal?.textContent || '0');
        const prevActive = parseInt(statActiveVal?.textContent || '0');
        const prevToDo = parseInt(statToDoVal?.textContent || '0');
        const prevInProgress = parseInt(statInProgressVal?.textContent || '0');
        const prevCompleted = parseInt(statCompletedVal?.textContent || '0');
        const prevOverdue = parseInt(statOverdueVal?.textContent || '0');

        let total = allTasks.length;
        let active = 0;
        let todo = 0;
        let inProgress = 0;
        let completed = 0;
        let overdue = 0;

        let study = 0, work = 0, personal = 0, other = 0;
        const todayStr = new Date().toISOString().split('T')[0];

        allTasks.forEach(task => {
            if (task.status === 'completed') {
                completed++;
            } else {
                active++;
                if (task.status === 'in_progress') inProgress++;
                else todo++;

                if (task.dueDate && task.dueDate < todayStr) {
                    overdue++;
                }
            }

            if (task.category === 'study') study++;
            else if (task.category === 'work') work++;
            else if (task.category === 'personal') personal++;
            else if (task.category === 'other') other++;
        });

        // Animate counter values
        animateCounter(statTotalVal, prevTotal, total);
        animateCounter(statActiveVal, prevActive, active);
        animateCounter(statToDoVal, prevToDo, todo);
        animateCounter(statInProgressVal, prevInProgress, inProgress);
        animateCounter(statCompletedVal, prevCompleted, completed);
        animateCounter(statOverdueVal, prevOverdue, overdue);

        if (countStudy) countStudy.textContent = study;
        if (countWork) countWork.textContent = work;
        if (countPersonal) countPersonal.textContent = personal;
        if (countOther) countOther.textContent = other;

        updateOverallProgress();
        renderDashboardView();
    }
    function updateOverallProgress() {
        let total = allTasks.length;
        let productivity = 0;

        if (total > 0) {
            const sumProgress = allTasks.reduce((sum, t) => sum + t.progress, 0);
            productivity = Math.round(sumProgress / total);
        }

        if (progressBarFill) {
            progressBarFill.style.width = `${productivity}%`;
            progressBarFill.setAttribute('aria-valuenow', productivity);
        }

        const prevPercentage = parseInt(progressPercentageLabel?.textContent || '0');
        animateCounter(progressPercentageLabel, prevPercentage, productivity, '% Complete');

        updateChartsData();
    };

    // ----------------------------------------------------
    // 8. Client Filter, Search, and Sort Engine
    // ----------------------------------------------------
    async function filterTasks(filterName) {
        currentFilter = filterName;
        applyFiltersAndSearch();
        showToast(`Filtered by: ${filterName.toUpperCase().replace('_', ' ')}`, 'info');
    }
    async function searchTasks(query) {
        currentSearch = query.toLowerCase().trim();
        applyFiltersAndSearch();
    }
    async function sortTasks(criteria) {
        if (!taskItemsList) return;
        const taskCardsArray = Array.from(document.querySelectorAll('.task-items-list > .task-card'));
        if (taskCardsArray.length === 0) return;

        taskCardsArray.sort((a, b) => {
            const idA = parseInt(a.getAttribute('data-id'));
            const idB = parseInt(b.getAttribute('data-id'));
            const titleA = a.getAttribute('data-title') || '';
            const titleB = b.getAttribute('data-title') || '';

            if (criteria === 'newest') return idB - idA;
            else if (criteria === 'oldest') return idA - idB;
            else if (criteria === 'alphabetical') return titleA.localeCompare(titleB);
            else if (criteria === 'priority') {
                const weights = { 'high': 3, 'medium': 2, 'low': 1 };
                const wA = weights[a.getAttribute('data-priority')] || 0;
                const wB = weights[b.getAttribute('data-priority')] || 0;
                return wB - wA || idB - idA;
            } else if (criteria === 'due_date') {
                const dateA = a.getAttribute('data-due-date') || '9999-12-31';
                const dateB = b.getAttribute('data-due-date') || '9999-12-31';
                return dateA.localeCompare(dateB) || idB - idA;
            } else if (criteria === 'progress') {
                const pA = parseInt(a.getAttribute('data-progress')) || 0;
                const pB = parseInt(b.getAttribute('data-progress')) || 0;
                return pB - pA || idB - idA;
            }
            return 0;
        });

        taskCardsArray.forEach(card => {
            taskItemsList.appendChild(card);
        });
    }
    async function applyFiltersAndSearch() {
        let visibleCount = 0;
        const todayStr = new Date().toISOString().split('T')[0];

        allTasks.forEach(task => {
            const card = task.domNode;

            let matchesFilter = false;
            if (currentFilter === 'all') matchesFilter = true;
            else if (currentFilter === 'active' && task.status !== 'completed') matchesFilter = true;
            else if (currentFilter === 'to_do' && task.status === 'to_do') matchesFilter = true;
            else if (currentFilter === 'in_progress' && task.status === 'in_progress') matchesFilter = true;
            else if (currentFilter === 'completed' && task.status === 'completed') matchesFilter = true;
            else if (currentFilter === 'overdue' && task.status !== 'completed' && task.dueDate && task.dueDate < todayStr) matchesFilter = true;
            else if (currentFilter === 'high' && task.priority === 'high') matchesFilter = true;
            else if (currentFilter === 'medium' && task.priority === 'medium') matchesFilter = true;
            else if (currentFilter === 'low' && task.priority === 'low') matchesFilter = true;
            else if (currentFilter === 'study' && task.category === 'study') matchesFilter = true;
            else if (currentFilter === 'work' && task.category === 'work') matchesFilter = true;
            else if (currentFilter === 'personal' && task.category === 'personal') matchesFilter = true;

            const titleStr = (task.title || '').toLowerCase();
            const descStr = (task.description || '').toLowerCase();
            const categoryStr = (task.category || '').toLowerCase();
            const matchesSearch = titleStr.includes(currentSearch) || descStr.includes(currentSearch) || categoryStr.includes(currentSearch);

            const isVisible = matchesFilter && matchesSearch;

            if (card) {
                card.classList.toggle('hidden', !isVisible);
                if (isVisible && !prefersReducedMotion()) {
                    card.style.animation = 'cardEntrance var(--speed-normal) cubic-bezier(0.16, 1, 0.3, 1)';
                }
            }

            const kanbanCard = document.querySelector(`.kanban-drop-zone .task-card[data-id="${task.id}"]`);
            if (kanbanCard) {
                kanbanCard.classList.toggle('hidden', !isVisible);
            }

            if (isVisible) {
                visibleCount++;
            }
        });

        if (taskCountBadge) {
            taskCountBadge.textContent = `Showing ${visibleCount} of ${allTasks.length} task${allTasks.length !== 1 ? 's' : ''}`;
        }

        if (visibleCount === 0) {
            if (emptyStateContainer) emptyStateContainer.classList.remove('hidden');
            if (taskItemsList) taskItemsList.classList.add('hidden');

            if (allTasks.length === 0) {
                if (emptyTitleLbl) emptyTitleLbl.textContent = "No tasks yet";
                if (emptyDescLbl) emptyDescLbl.textContent = "Plan your day by adding your first task above!";
            } else if (currentFilter === 'completed') {
                if (emptyTitleLbl) emptyTitleLbl.textContent = "No completed tasks yet";
                if (emptyDescLbl) emptyDescLbl.textContent = "Move task progress to 100% or click Complete to check them off!";
            } else {
                if (emptyTitleLbl) emptyTitleLbl.textContent = "No matching tasks found";
                if (emptyDescLbl) emptyDescLbl.textContent = "Try revising your search query or selecting another filter tab.";
            }
        } else {
            if (emptyStateContainer) emptyStateContainer.classList.add('hidden');
            if (taskItemsList) taskItemsList.classList.remove('hidden');
        }

        recalculateKanbanCounts();
    };

    // ----------------------------------------------------
    // 9. Status & Actions API calls (Rule 6 and 11 logic)
    // ----------------------------------------------------
    async function startTask(taskId) {
        const startBtn = document.querySelector(`.task-card[data-id="${taskId}"] .action-start-btn`);
        if (startBtn) {
            startBtn.disabled = true;
            startBtn.textContent = 'Starting...';
        }
        showToast('Starting task...', 'info');

        try {
            const response = await fetch(`/api/tasks/${taskId}/start`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Unable to start task');
            }

            showToast('Task started successfully', 'success');
            // Focus studio task linked if running
            if (focusState.isRunning && focusState.taskId === taskId) updateFocusTaskInfo();
            syncUpdatedTaskCard(data.task);
        } catch (err) {
            showToast(err.message, 'error');
            if (startBtn) {
                startBtn.disabled = false;
                startBtn.textContent = '▶ Start';
            }
        }
    }; async function pauseTask(taskId) {
        const pauseBtn = document.querySelector(`.task-card[data-id="${taskId}"] .action-pause-btn`);
        if (pauseBtn) {
            pauseBtn.disabled = true;
            pauseBtn.textContent = 'Pausing...';
        }
        showToast('Pausing task...', 'info');

        try {
            const response = await fetch(`/api/tasks/${taskId}/pause`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Unable to pause task');
            }

            showToast('Task paused', 'success');
            if (focusState.taskId === taskId) {
                // Reset focus task if needed
            }
            syncUpdatedTaskCard(data.task);
        } catch (err) {
            showToast(err.message, 'error');
            if (pauseBtn) {
                pauseBtn.disabled = false;
                pauseBtn.textContent = '⏸ Pause';
            }
        }
    }; async function completeTask(taskId) {
        const compBtn = document.querySelector(`.task-card[data-id="${taskId}"] .action-complete-btn`);
        if (compBtn) {
            compBtn.disabled = true;
            compBtn.textContent = 'Completing...';
        }
        showToast('Completing task...', 'info');

        try {
            const response = await fetch(`/api/tasks/${taskId}/complete`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Unable to complete task');
            }

            showToast('Task completed successfully 🎉', 'success');
            playTaskCompleteSound();
            if (focusState.taskId === taskId) {
                // Reset focus task if needed
            }
            syncUpdatedTaskCard(data.task);
        } catch (err) {
            showToast(err.message, 'error');
            if (compBtn) {
                compBtn.disabled = false;
                compBtn.textContent = '✓ Complete';
            }
        }
    }; async function updateProgress(taskId, progressVal) {
        showToast('Updating progress...', 'info');
        try {
            const response = await fetch(`/api/tasks/${taskId}/progress`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({ progress: progressVal })
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Unable to update progress');
            }

            showToast(`Progress updated to ${progressVal}% ⚡`, 'success');
            if (progressVal >= 100 && focusState.taskId === taskId) {
                // Reset focus task if needed
            } else if (progressVal > 0 && progressVal < 100) {
                // Focus studio task linked if running
                if (focusState.isRunning && focusState.taskId === taskId) updateFocusTaskInfo();
            }
            syncUpdatedTaskCard(data.task);
        } catch (err) {
            showToast(err.message, 'error');
            const cached = allTasks.find(t => t.id.toString() === taskId.toString());
            if (cached) syncUpdatedTaskCard(cached);
        }
    }; async function deleteTask(taskId) {
        const confirmed = confirm("Are you sure you want to delete this task? This cannot be undone.");
        if (!confirmed) return;

        showToast('Deleting task...', 'info');
        try {
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Unable to delete task');
            }

            showToast('Task deleted successfully.', 'success');

            const cardElements = document.querySelectorAll(`.task-card[data-id="${taskId}"]`);
            cardElements.forEach(card => {
                card.classList.add('task-exit-animate');
                setTimeout(() => {
                    card.remove();
                    loadTasksFromDOM();
                    initKanbanBoard();
                    updateStatistics();
                    applyFiltersAndSearch();
                }, 250);
            });
        } catch (err) {
            showToast(err.message, 'error');
        }
    }
    async function syncUpdatedTaskCard(task) {
        const taskId = task.id.toString();

        const localIdx = allTasks.findIndex(t => t.id.toString() === taskId);
        if (localIdx !== -1) {
            allTasks[localIdx].status = task.status;
            allTasks[localIdx].boardStatus = task.status;
            allTasks[localIdx].progress = task.progress;
            allTasks[localIdx].startedAt = task.started_at;
            allTasks[localIdx].completedAt = task.completed_at;
            allTasks[localIdx].updatedAt = task.updated_at;
        }

        const listCard = document.querySelector(`.task-items-list > .task-card[data-id="${taskId}"]`);
        if (listCard) {
            const temp = document.createElement('div');
            temp.innerHTML = createTaskCardHTML(task).trim();
            const newCard = temp.firstChild;
            if (task.status === 'completed') {
                newCard.classList.add('animate-success-pop');
            }
            listCard.parentNode.replaceChild(newCard, listCard);
        }

        loadTasksFromDOM();
        initKanbanBoard();
        checkDueDates();
        updateStatistics();
        applyFiltersAndSearch();
    };

    // ----------------------------------------------------
    // 10. Robust Event Delegation (Fixes listeners duplicates)
    // ----------------------------------------------------
    if (taskItemsList) {
        // Click delegation
        taskItemsList.addEventListener('click', (e) => {
            const btnStart = e.target.closest('.action-start-btn');
            const btnPause = e.target.closest('.action-pause-btn');
            const btnComplete = e.target.closest('.action-complete-btn');
            const btnReopen = e.target.closest('.action-reopen-btn');
            const btnDelete = e.target.closest('.delete-ajax-btn');
            const btnEdit = e.target.closest('.edit-ajax-btn');
            const btnToggle = e.target.closest('.task-toggle-ajax-btn');

            if (btnStart) {
                e.preventDefault();
                startTask(btnStart.getAttribute('data-id'));
            } else if (btnPause) {
                e.preventDefault();
                pauseTask(btnPause.getAttribute('data-id'));
            } else if (btnComplete) {
                e.preventDefault();
                completeTask(btnComplete.getAttribute('data-id'));
            } else if (btnReopen) {
                e.preventDefault();
                updateTaskStatus(btnReopen.getAttribute('data-id'), 'to_do');
            } else if (btnDelete) {
                e.preventDefault();
                deleteTask(btnDelete.getAttribute('data-id'));
            } else if (btnEdit) {
                e.preventDefault();
                openEditModal(btnEdit.getAttribute('data-id'));
            } else if (btnToggle) {
                e.preventDefault();
                completeTask(btnToggle.getAttribute('data-id'));
            }
        });

        // Status select dropdown change delegation
        taskItemsList.addEventListener('change', (e) => {
            const select = e.target.closest('.card-status-select');
            if (select) {
                updateTaskStatus(select.getAttribute('data-id'), select.value);
            }
        });

        // Progress slider input & change delegation
        taskItemsList.addEventListener('input', (e) => {
            const slider = e.target.closest('.task-progress-slider, .card-progress-slider');
            if (slider) {
                const taskId = slider.getAttribute('data-id');
                const val = parseInt(slider.value) || 0;

                const textLbls = document.querySelectorAll(`.task-card[data-id="${taskId}"] .task-progress-percent, .task-card[data-id="${taskId}"] .card-progress-text`);
                textLbls.forEach(lbl => lbl.textContent = `${val}%`);

                const fills = document.querySelectorAll(`.task-card[data-id="${taskId}"] .card-progress-bar-fill`);
                fills.forEach(f => f.style.width = `${val}%`);

                const badges = document.querySelectorAll(`.task-card[data-id="${taskId}"] .status-badge`);
                badges.forEach(badge => {
                    if (val >= 100) {
                        badge.className = 'status-badge status-completed';
                        badge.innerHTML = '✓ Completed';
                    } else if (val <= 0) {
                        badge.className = 'status-badge status-to_do';
                        badge.innerHTML = '⚪ To Do';
                    } else {
                        badge.className = 'status-badge status-in_progress';
                        badge.innerHTML = '<span class="pulse-dot"></span> In Progress';
                    }
                });

                // Update start/pause/complete button visibility based on slider value
                const startBtns = document.querySelectorAll(`.task-card[data-id="${taskId}"] .action-start-btn`);
                const pauseBtns = document.querySelectorAll(`.task-card[data-id="${taskId}"] .action-pause-btn`);
                const completeBtns = document.querySelectorAll(`.task-card[data-id="${taskId}"] .action-complete-btn`);
                const reopenBtns = document.querySelectorAll(`.task-card[data-id="${taskId}"] .action-reopen-btn`);

                if (val >= 100) {
                    startBtns.forEach(b => b.classList.add('hidden'));
                    pauseBtns.forEach(b => b.classList.add('hidden'));
                    completeBtns.forEach(b => b.classList.add('hidden'));
                    reopenBtns.forEach(b => b.classList.remove('hidden'));
                } else if (val > 0) {
                    startBtns.forEach(b => b.classList.add('hidden'));
                    pauseBtns.forEach(b => b.classList.remove('hidden'));
                    completeBtns.forEach(b => b.classList.remove('hidden'));
                    reopenBtns.forEach(b => b.classList.add('hidden'));
                } else {
                    startBtns.forEach(b => b.classList.remove('hidden'));
                    pauseBtns.forEach(b => b.classList.add('hidden'));
                    completeBtns.forEach(b => b.classList.remove('hidden'));
                    reopenBtns.forEach(b => b.classList.add('hidden'));
                }
            }
        });

        taskItemsList.addEventListener('change', (e) => {
            const slider = e.target.closest('.task-progress-slider, .card-progress-slider');
            if (slider) {
                updateProgress(slider.getAttribute('data-id'), parseInt(slider.value));
            }
        });
    }

    // Kanban Click Delegations
    const kanbanZones = ['todoList', 'progressList', 'doneList'];
    kanbanZones.forEach(zoneId => {
        const zone = document.getElementById(zoneId);
        if (zone) {
            zone.addEventListener('click', (e) => {
                const btnDelete = e.target.closest('.delete-ajax-btn');
                const btnEdit = e.target.closest('.edit-ajax-btn');
                const btnToggle = e.target.closest('.task-toggle-ajax-btn');

                if (btnDelete) {
                    e.preventDefault();
                    deleteTask(btnDelete.getAttribute('data-id'));
                } else if (btnEdit) {
                    e.preventDefault();
                    openEditModal(btnEdit.getAttribute('data-id'));
                } else if (btnToggle) {
                    e.preventDefault();
                    completeTask(btnToggle.getAttribute('data-id'));
                }
            });
        }
    });

    // Forms character counter limits
    if (taskDescInput && charCounter) {
        taskDescInput.addEventListener('input', () => {
            const count = taskDescInput.value.length;
            charCounter.textContent = `${count} / 200`;
            charCounter.style.color = count >= 180 ? 'var(--danger)' : 'var(--text-muted)';
        });
    }

    if (resetBtn && taskForm) {
        resetBtn.addEventListener('click', () => {
            taskForm.reset();
            charCounter.textContent = '0 / 200';
            charCounter.style.color = 'var(--text-muted)';
            taskTitleInput.focus();
            showToast('Form cleared.', 'info');
        });
    }

    // Create New Task Form AJAX
    let isTaskFormSubmitting = false;
    if (taskForm) {
        taskForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (isTaskFormSubmitting) return;

            const title = taskTitleInput.value.trim();

            if (!title) {
                showToast('Please enter a task title!', 'error');
                taskTitleInput.classList.add('input-error');
                setTimeout(() => taskTitleInput.classList.remove('input-error'), 1000);
                taskTitleInput.focus();
                return;
            }

            isTaskFormSubmitting = true;
            const submitBtn = document.getElementById('add-task-btn');
            const btnText = submitBtn ? submitBtn.querySelector('.btn-text') : null;
            if (submitBtn) {
                submitBtn.classList.add('loading');
                submitBtn.disabled = true;
            }
            if (btnText) btnText.textContent = 'Adding...';

            try {
                const formData = new FormData(taskForm);
                const response = await fetch('/add', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: formData
                });

                const data = await response.json();
                if (!response.ok || !data.success) {
                    throw new Error(data.message || 'Unable to add task');
                }

                showToast('Task added successfully', 'success');

                const task = data.task;
                const cardDiv = document.createElement('div');
                cardDiv.innerHTML = createTaskCardHTML(task).trim();
                const cardNode = cardDiv.firstChild;

                if (taskItemsList) {
                    const existingCard = taskItemsList.querySelector(`.task-card[data-id="${task.id}"]`);
                    if (existingCard) {
                        existingCard.replaceWith(cardNode);
                    } else {
                        taskItemsList.insertBefore(cardNode, taskItemsList.firstChild);
                    }
                }

                if (emptyStateContainer) emptyStateContainer.classList.add('hidden');
                if (taskItemsList) taskItemsList.classList.remove('hidden');

                taskForm.reset();
                if (charCounter) charCounter.textContent = '0 / 200';
                const addTaskModalEl = document.getElementById('add-task-modal');
                if (addTaskModalEl) addTaskModalEl.classList.add('hidden');

                loadTasksFromDOM();
                initKanbanBoard();
                checkDueDates();
                updateStatistics();
                applyFiltersAndSearch();
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                isTaskFormSubmitting = false;
                if (submitBtn) {
                    submitBtn.classList.remove('loading');
                    submitBtn.disabled = false;
                }
                if (btnText) btnText.textContent = 'Add Task';
            }
        });
    }

    const clearSearchBtn = document.getElementById('clear-search-btn');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value;
            if (clearSearchBtn) {
                clearSearchBtn.classList.toggle('hidden', query.length === 0);
            }
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                searchTasks(query);
            }, 180);
        });
    }

    if (clearSearchBtn && searchInput) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearSearchBtn.classList.add('hidden');
            searchTasks('');
            searchInput.focus();
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            sortTasks(e.target.value);
            showToast(`Sorted tasks by ${e.target.options[e.target.selectedIndex].text}`, 'info');
        });
    }

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterTasks(btn.getAttribute('data-filter'));
        });
    });

    // ----------------------------------------------------
    // 11. Speech Recognition Voice Task Input
    // ----------------------------------------------------
    function initVoiceInput() {
        if (!voiceInputBtn) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            voiceInputBtn.style.display = 'none';
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;

        voiceInputBtn.addEventListener('click', () => {
            if (voiceInputBtn.classList.contains('recording')) {
                recognition.stop();
            } else {
                recognition.start();
            }
        });

        recognition.onstart = () => {
            voiceInputBtn.classList.add('recording');
            showToast('Listening... Speak your task title.', 'info');
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (taskTitleInput) {
                taskTitleInput.value = transcript;
                taskTitleInput.focus();
            }
            showToast(`Voice input captured: "${transcript}"`, 'success');
        };

        recognition.onerror = () => {
            showToast('Voice input timed out or failed.', 'error');
            voiceInputBtn.classList.remove('recording');
        };

        recognition.onend = () => {
            voiceInputBtn.classList.remove('recording');
        };
    };
    initVoiceInput();

    // ----------------------------------------------------
    // 12. Focus Studio Engine (Single Unified Implementation)
    // ----------------------------------------------------
    async function updateFocusDisplay() {
        const display = document.getElementById('focus-time-left');
        const ringFill = document.getElementById('focus-ring-fill');
        const statusBadge = document.getElementById('focus-status-badge');
        const modeLabel = document.getElementById('focus-mode-label');
        const startBtn = document.getElementById('btn-focus-start');
        const pauseBtn = document.getElementById('btn-focus-pause');
        const resumeBtn = document.getElementById('btn-focus-resume');
        const durationBtns = document.querySelectorAll('.focus-duration-btn');

        const minutes = Math.floor(focusState.remainingSeconds / 60);
        const seconds = focusState.remainingSeconds % 60;
        const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        if (display) display.textContent = timeStr;

        // SVG progress ring calculation (circle perimeter ~283)
        if (ringFill && focusState.totalSeconds > 0) {
            const fraction = focusState.remainingSeconds / focusState.totalSeconds;
            const offset = 283 * (1 - fraction);
            ringFill.style.strokeDashoffset = offset;
            ringFill.style.stroke = focusState.isPaused ? 'var(--warning)' : 'var(--primary)';
        }

        // Status badge & Mode label
        if (statusBadge) {
            if (focusState.isRunning) {
                statusBadge.textContent = 'Running';
                statusBadge.className = 'focus-status-badge running';
            } else if (focusState.isPaused) {
                statusBadge.textContent = 'Paused';
                statusBadge.className = 'focus-status-badge paused';
            } else {
                statusBadge.textContent = 'Ready';
                statusBadge.className = 'focus-status-badge';
            }
        }

        if (modeLabel) {
            modeLabel.textContent = focusState.isPaused ? 'Paused' : (focusState.isRunning ? 'Deep Work' : 'Ready');
        }

        // Button states
        if (startBtn && pauseBtn && resumeBtn) {
            if (focusState.isRunning) {
                startBtn.classList.add('hidden');
                pauseBtn.classList.remove('hidden');
                resumeBtn.classList.add('hidden');
            } else if (focusState.isPaused) {
                startBtn.classList.add('hidden');
                pauseBtn.classList.add('hidden');
                resumeBtn.classList.remove('hidden');
            } else {
                startBtn.classList.remove('hidden');
                pauseBtn.classList.add('hidden');
                resumeBtn.classList.add('hidden');
            }
        }

        // Duration buttons disabled when running or paused
        durationBtns.forEach(btn => {
            if (focusState.isRunning || focusState.isPaused) {
                btn.disabled = true;
                btn.style.opacity = '0.6';
            } else {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.classList.toggle('active', parseInt(btn.dataset.duration) === focusState.durationMinutes);
            }
        });
    }
    async function updateFocusTaskInfo() {
        const taskSelect = document.getElementById('focus-task-select');
        const taskTitleEl = document.getElementById('focus-current-task-title');
        const taskPriorityBadge = document.getElementById('focus-current-task-priority');
        const taskProgressWrap = document.getElementById('focus-task-progress-wrap');
        const taskProgressFill = document.getElementById('focus-task-progress-fill');
        const taskProgressText = document.getElementById('focus-task-progress-text');

        if (focusState.taskId) {
            const task = allTasks.find(t => t.id.toString() === focusState.taskId.toString());
            if (task) {
                focusState.taskTitle = task.title;
                focusState.taskPriority = task.priority;
                focusState.taskProgress = task.progress || 0;
            }
            if (taskTitleEl) taskTitleEl.textContent = focusState.taskTitle || 'Target Task';
            if (taskPriorityBadge) {
                taskPriorityBadge.textContent = (focusState.taskPriority || 'Medium').toUpperCase();
                taskPriorityBadge.className = `badge badge-${focusState.taskPriority || 'primary'}`;
            }
            if (taskProgressWrap) {
                taskProgressWrap.style.display = 'block';
                if (taskProgressFill) taskProgressFill.style.width = `${focusState.taskProgress}%`;
                if (taskProgressText) taskProgressText.textContent = `${focusState.taskProgress}% completed`;
            }
            if (taskSelect && taskSelect.value !== focusState.taskId.toString()) {
                taskSelect.value = focusState.taskId.toString();
            }
        } else {
            if (taskTitleEl) taskTitleEl.textContent = 'No task selected (General Focus)';
            if (taskPriorityBadge) {
                taskPriorityBadge.textContent = 'GENERAL';
                taskPriorityBadge.className = 'badge badge-secondary';
            }
            if (taskProgressWrap) taskProgressWrap.style.display = 'none';
        }
    }; async function fetchFocusStats() {
        const streakPill = document.getElementById('focus-streak-pill');
        const sessionsTodayEl = document.getElementById('focus-sessions-today');
        const totalTimeEl = document.getElementById('focus-total-time');

        try {
            const res = await fetch('/api/focus/stats');
            const data = await res.json();
            if (res.ok && data.success && data.stats) {
                const s = data.stats;
                if (streakPill) streakPill.textContent = `🔥 ${s.streak || 0} Day Streak`;
                if (sessionsTodayEl) sessionsTodayEl.textContent = s.completed_today || 0;
                if (totalTimeEl) totalTimeEl.textContent = `${s.total_time_today || 0}m`;
            }
        } catch (err) {
            console.warn('Could not fetch focus stats:', err);
        }
    }; async function startFocusSession() {
        if (focusState.isRunning) return;

        // Clear any existing timer interval
        if (focusTimerInterval) {
            clearInterval(focusTimerInterval);
            focusTimerInterval = null;
        }

        const taskSelect = document.getElementById('focus-task-select');
        if (taskSelect && taskSelect.value) {
            focusState.taskId = taskSelect.value;
        }

        focusState.isRunning = true;
        focusState.isPaused = false;
        focusState.startedAt = new Date().toISOString();
        focusState.totalSeconds = focusState.durationMinutes * 60;
        focusState.remainingSeconds = focusState.totalSeconds;
        focusState.endTime = Date.now() + focusState.totalSeconds * 1000;

        updateFocusDisplay();
        updateFocusTaskInfo();

        showToast(`Focus session started: ${focusState.durationMinutes} minutes deep work. 🚀`, 'success');

        // Notify Backend
        try {
            const resp = await fetch('/api/focus/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    task_id: focusState.taskId,
                    duration_minutes: focusState.durationMinutes
                })
            });
            const data = await resp.json();
            if (resp.ok && data.success) {
                if (data.session_id) focusState.sessionId = data.session_id;
                if (data.task && focusState.taskId) {
                    const targetIdx = allTasks.findIndex(t => t.id.toString() === focusState.taskId.toString());
                    if (targetIdx !== -1) {
                        allTasks[targetIdx].status = data.task.status;
                        allTasks[targetIdx].progress = data.task.progress;
                    }
                    syncUpdatedTaskCard(data.task);
                    updateStatistics();
                }
            }
        } catch (e) {
            console.warn('Focus start API error:', e);
        }

        // Start countdown interval
        focusTimerInterval = setInterval(() => {
            if (!focusState.isRunning || focusState.isPaused) return;

            const diff = Math.max(0, Math.round((focusState.endTime - Date.now()) / 1000));
            focusState.remainingSeconds = diff;
            updateFocusDisplay();

            if (focusState.remainingSeconds <= 0) {
                clearInterval(focusTimerInterval);
                focusTimerInterval = null;
                completeFocusSession();
            }
        }, 1000);
    }; async function pauseFocusSession() {
        if (!focusState.isRunning || focusState.isPaused) return;

        focusState.isPaused = true;
        focusState.isRunning = false;

        if (focusTimerInterval) {
            clearInterval(focusTimerInterval);
            focusTimerInterval = null;
        }

        updateFocusDisplay();
        showToast('Focus session paused. ⏸️', 'info');

        try {
            await fetch('/api/focus/pause', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: focusState.sessionId })
            });
        } catch (e) {
            console.warn('Focus pause API error:', e);
        }
    }; async function resumeFocusSession() {
        if (!focusState.isPaused) return;

        if (focusTimerInterval) {
            clearInterval(focusTimerInterval);
            focusTimerInterval = null;
        }

        focusState.isRunning = true;
        focusState.isPaused = false;
        focusState.endTime = Date.now() + focusState.remainingSeconds * 1000;

        updateFocusDisplay();
        showToast('Focus session resumed. ▶️', 'success');

        try {
            await fetch('/api/focus/resume', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: focusState.sessionId })
            });
        } catch (e) {
            console.warn('Focus resume API error:', e);
        }

        focusTimerInterval = setInterval(() => {
            if (!focusState.isRunning || focusState.isPaused) return;

            const diff = Math.max(0, Math.round((focusState.endTime - Date.now()) / 1000));
            focusState.remainingSeconds = diff;
            updateFocusDisplay();

            if (focusState.remainingSeconds <= 0) {
                clearInterval(focusTimerInterval);
                focusTimerInterval = null;
                completeFocusSession();
            }
        }, 1000);
    }; async function resetFocusSession() {
        if (focusTimerInterval) {
            clearInterval(focusTimerInterval);
            focusTimerInterval = null;
        }

        const wasRunning = focusState.isRunning || focusState.isPaused;
        const prevSessionId = focusState.sessionId;

        focusState.isRunning = false;
        focusState.isPaused = false;
        focusState.totalSeconds = focusState.durationMinutes * 60;
        focusState.remainingSeconds = focusState.totalSeconds;
        focusState.endTime = null;
        focusState.sessionId = null;

        updateFocusDisplay();
        showToast('Focus session reset.', 'info');

        if (wasRunning && prevSessionId) {
            try {
                await fetch('/api/focus/reset', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ session_id: prevSessionId })
                });
            } catch (e) {
                console.warn('Focus reset API error:', e);
            }
        }
    }; async function completeFocusSession() {
        if (focusTimerInterval) {
            clearInterval(focusTimerInterval);
            focusTimerInterval = null;
        }

        focusState.isRunning = false;
        focusState.isPaused = false;

        playTimerAlertSound();
        showToast('Focus session completed! Outstanding deep work! 🎉', 'success');

        await saveFocusSession();

        // Restore timer to selected duration
        focusState.totalSeconds = focusState.durationMinutes * 60;
        focusState.remainingSeconds = focusState.totalSeconds;
        updateFocusDisplay();
    }; async function saveFocusSession() {
        try {
            const resp = await fetch('/api/focus/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: focusState.sessionId,
                    task_id: focusState.taskId,
                    duration_minutes: focusState.durationMinutes,
                    completed: 1
                })
            });
            const data = await resp.json();
            if (resp.ok && data.success) {
                fetchFocusStats();
                updateStatistics();
                if (data.gamification) {
                    handleGamificationResponse(data.gamification);
                }
                if (data.recommendation) {
                    const coachingText = document.getElementById('focus-coaching-text');
                    if (coachingText) coachingText.textContent = data.recommendation;
                }
            }
        } catch (e) {
            console.warn('Save focus session error:', e);
        }
    }
    // ----------------------------------------------------
    // Sound & Ambient Audio Synthesizer Engine (Web Audio API)
    // ----------------------------------------------------
    let globalAudioCtx = null;
    let activeAmbientNodes = [];
    let ambientGainMaster = null;

    function getAudioContext() {
        if (!globalAudioCtx || globalAudioCtx.state === 'closed') {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                globalAudioCtx = new AudioCtx();
            }
        }
        if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
            globalAudioCtx.resume().catch(e => console.warn('Audio resume error:', e));
        }
        return globalAudioCtx;
    }

    function playTaskCompleteSound() {
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 ascending chime
            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.07);
                gain.gain.setValueAtTime(0.18, now + idx * 0.07);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.28);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + idx * 0.07);
                osc.stop(now + idx * 0.07 + 0.3);
            });
        } catch (e) {
            console.warn('Audio chime error:', e);
        }
    }

    function playTimerAlertSound() {
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;
            [880, 1108.73, 1318.51].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 1.85);
            });
        } catch (e) {
            console.warn('Timer bell error:', e);
        }
    }

    function stopAmbientAudio() {
        try {
            activeAmbientNodes.forEach(node => {
                try {
                    if (node.stop) node.stop();
                    node.disconnect();
                } catch (e) {}
            });
            activeAmbientNodes = [];
        } catch (e) {
            console.warn('Stop ambient error:', e);
        }
        isAmbientPlaying = false;
        const ambientPlayBtn = document.getElementById('btn-ambient-play');
        const ambientStatusText = document.getElementById('ambient-status-text');
        if (ambientPlayBtn) {
            ambientPlayBtn.textContent = '▶ Play';
            ambientPlayBtn.classList.remove('playing', 'btn-primary');
            ambientPlayBtn.classList.add('btn-secondary');
        }
        if (ambientStatusText) {
            ambientStatusText.textContent = 'Audio paused.';
        }
    }

    async function startAmbientSynthesizer(type) {
        try {
            stopAmbientAudio();
            if (type === 'none') return;

            const ctx = getAudioContext();
            if (!ctx) return;

            if (ctx.state === 'suspended') {
                await ctx.resume();
            }

            ambientGainMaster = ctx.createGain();
            ambientGainMaster.gain.setValueAtTime(0.18, ctx.currentTime);
            ambientGainMaster.connect(ctx.destination);
            activeAmbientNodes.push(ambientGainMaster);

            const bufferSize = 2 * ctx.sampleRate;
            const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);

            if (type === 'rain') {
                let lastOut = 0.0;
                for (let i = 0; i < bufferSize; i++) {
                    const white = Math.random() * 2 - 1;
                    lastOut = (lastOut + (0.02 * white)) / 1.02;
                    output[i] = lastOut * 4.5;
                }
                const noise = ctx.createBufferSource();
                noise.buffer = noiseBuffer;
                noise.loop = true;

                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(950, ctx.currentTime);

                noise.connect(filter);
                filter.connect(ambientGainMaster);
                noise.start(0);
                activeAmbientNodes.push(noise, filter);

            } else if (type === 'forest') {
                let lastOut = 0.0;
                for (let i = 0; i < bufferSize; i++) {
                    const white = Math.random() * 2 - 1;
                    lastOut = (lastOut * 0.96) + (white * 0.04);
                    output[i] = lastOut * 3.0;
                }
                const noise = ctx.createBufferSource();
                noise.buffer = noiseBuffer;
                noise.loop = true;

                const filter = ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(750, ctx.currentTime);
                filter.Q.setValueAtTime(0.8, ctx.currentTime);

                const chimeOsc = ctx.createOscillator();
                const chimeGain = ctx.createGain();
                chimeOsc.type = 'sine';
                chimeOsc.frequency.setValueAtTime(432, ctx.currentTime);
                chimeGain.gain.setValueAtTime(0.04, ctx.currentTime);

                noise.connect(filter);
                filter.connect(ambientGainMaster);
                chimeOsc.connect(chimeGain);
                chimeGain.connect(ambientGainMaster);

                noise.start(0);
                chimeOsc.start(0);
                activeAmbientNodes.push(noise, filter, chimeOsc, chimeGain);

            } else if (type === 'lofi') {
                const chord = [261.63, 329.63, 392.00, 493.88];
                chord.forEach(freq => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    const filter = ctx.createBiquadFilter();

                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, ctx.currentTime);
                    gain.gain.setValueAtTime(0.04, ctx.currentTime);

                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(450, ctx.currentTime);

                    osc.connect(filter);
                    filter.connect(gain);
                    gain.connect(ambientGainMaster);
                    osc.start(0);
                    activeAmbientNodes.push(osc, gain, filter);
                });

            } else if (type === 'cafe') {
                for (let i = 0; i < bufferSize; i++) {
                    output[i] = (Math.random() * 2 - 1) * 0.25;
                }
                const noise = ctx.createBufferSource();
                noise.buffer = noiseBuffer;
                noise.loop = true;

                const filter = ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(600, ctx.currentTime);
                filter.Q.setValueAtTime(1.5, ctx.currentTime);

                noise.connect(filter);
                filter.connect(ambientGainMaster);
                noise.start(0);
                activeAmbientNodes.push(noise, filter);

            } else {
                let b0 = 0, b1 = 0, b2 = 0;
                for (let i = 0; i < bufferSize; i++) {
                    const white = Math.random() * 2 - 1;
                    b0 = 0.99886 * b0 + white * 0.0555179;
                    b1 = 0.99332 * b1 + white * 0.0750759;
                    b2 = 0.96900 * b2 + white * 0.1538520;
                    output[i] = (b0 + b1 + b2) * 0.35;
                }
                const noise = ctx.createBufferSource();
                noise.buffer = noiseBuffer;
                noise.loop = true;

                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(700, ctx.currentTime);

                noise.connect(filter);
                filter.connect(ambientGainMaster);
                noise.start(0);
                activeAmbientNodes.push(noise, filter);
            }

            isAmbientPlaying = true;
            const ambientPlayBtn = document.getElementById('btn-ambient-play');
            const ambientStatusText = document.getElementById('ambient-status-text');
            const ambientSelect = document.getElementById('ambient-sound-select');

            if (ambientPlayBtn) {
                ambientPlayBtn.textContent = '⏸ Pause';
                ambientPlayBtn.classList.remove('btn-secondary');
                ambientPlayBtn.classList.add('playing', 'btn-primary');
            }
            if (ambientStatusText && ambientSelect) {
                const label = ambientSelect.options[ambientSelect.selectedIndex]?.text || type;
                ambientStatusText.textContent = `Playing ${label} 🎧`;
            }
        } catch (e) {
            console.warn('Ambient Web Audio start error:', e);
            isAmbientPlaying = false;
        }
    }

    function initAmbientAudio() {
        const ambientSelect = document.getElementById('ambient-sound-select');
        const ambientPlayBtn = document.getElementById('btn-ambient-play');
        const ambientStatusText = document.getElementById('ambient-status-text');

        if (!ambientPlayBtn || !ambientSelect) return;

        ambientPlayBtn.addEventListener('click', async () => {
            const soundType = ambientSelect.value;
            if (soundType === 'none') {
                stopAmbientAudio();
                if (ambientStatusText) ambientStatusText.textContent = 'Silence selected.';
                return;
            }

            if (isAmbientPlaying) {
                stopAmbientAudio();
            } else {
                await startAmbientSynthesizer(soundType);
            }
        });

        ambientSelect.addEventListener('change', async () => {
            if (isAmbientPlaying) {
                if (ambientSelect.value === 'none') {
                    stopAmbientAudio();
                } else {
                    await startAmbientSynthesizer(ambientSelect.value);
                }
            } else if (ambientSelect.value === 'none' && ambientStatusText) {
                ambientStatusText.textContent = 'Silence selected.';
            }
        });
    }
    async function initializeFocusStudio() {
        const startBtn = document.getElementById('btn-focus-start');
        const pauseBtn = document.getElementById('btn-focus-pause');
        const resumeBtn = document.getElementById('btn-focus-resume');
        const resetBtn = document.getElementById('btn-focus-reset');
        const taskSelect = document.getElementById('focus-task-select');
        const durationBtns = document.querySelectorAll('.focus-duration-btn');

        if (startBtn) startBtn.addEventListener('click', startFocusSession);
        if (pauseBtn) pauseBtn.addEventListener('click', pauseFocusSession);
        if (resumeBtn) resumeBtn.addEventListener('click', resumeFocusSession);
        if (resetBtn) resetBtn.addEventListener('click', resetFocusSession);

        if (taskSelect) {
            taskSelect.addEventListener('change', () => {
                focusState.taskId = taskSelect.value || null;
                updateFocusTaskInfo();
            });
        }

        durationBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (focusState.isRunning || focusState.isPaused) {
                    showToast('Cannot change duration during an active session.', 'warning');
                    return;
                }
                durationBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const dur = parseInt(btn.dataset.duration) || 20;
                focusState.durationMinutes = dur;
                focusState.totalSeconds = dur * 60;
                focusState.remainingSeconds = focusState.totalSeconds;
                updateFocusDisplay();
            });
        });

        initAmbientAudio();
        updateFocusDisplay();
        fetchFocusStats();
    };

    // ----------------------------------------------------
    // 13. Drag-and-Drop Kanban Board System
    // ----------------------------------------------------
    let draggedCard = null;

    document.addEventListener("dragstart", e => {
        const card = e.target.closest(".task-card");
        if (card) {
            draggedCard = card;
            card.classList.add("dragging");
            if (e.dataTransfer) {
                e.dataTransfer.setData("text/plain", card.dataset.id);
                e.dataTransfer.effectAllowed = "move";
            }
        }
    });

    document.addEventListener("dragend", e => {
        const card = e.target.closest(".task-card");
        if (card) {
            card.classList.remove("dragging");
        }
    });

    // ----------------------------------------------------
    // 13. Kanban Pipeline Board Implementation
    // ----------------------------------------------------
    let draggedKanbanCard = null;

    function createKanbanCardHTML(task) {
        const isCompleted = task.status === 'completed';
        const categoryLabelsMap = { study: '📚 Study', work: '💼 Work', personal: '🏠 Personal', other: '🧩 Other' };
        const prioLabel = task.priority ? (task.priority.charAt(0).toUpperCase() + task.priority.slice(1)) : 'Medium';
        const catLabel = categoryLabelsMap[task.category] || (task.category ? task.category.toUpperCase() : '🧩 Other');
        
        return `
            <div class="kanban-task-card task-card ${task.priority}-priority ${isCompleted ? 'task-completed' : ''}" 
                 draggable="true" 
                 data-id="${task.id}" 
                 data-status="${task.status}"
                 style="cursor: grab; margin-bottom: 0.75rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0.85rem; transition: transform 0.15s ease, box-shadow 0.15s ease;">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.4rem; flex-wrap: wrap;">
                    <span class="category-badge cat-${task.category}" style="font-size: 0.7rem; padding: 2px 6px;">${catLabel}</span>
                    <span class="priority-badge prio-${task.priority}" style="font-size: 0.7rem; padding: 2px 6px;">${prioLabel}</span>
                </div>
                <h4 style="margin: 0 0 0.35rem 0; font-size: 0.92rem; font-weight: 700; color: var(--text); ${isCompleted ? 'text-decoration: line-through; opacity: 0.75;' : ''}">${task.title}</h4>
                ${task.description ? `<p style="margin: 0 0 0.4rem 0; font-size: 0.78rem; color: var(--text-muted); line-height: 1.3; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${task.description}</p>` : ''}
                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.72rem; color: var(--text-muted); margin-top: 0.4rem; border-top: 1px solid var(--border); padding-top: 0.4rem;">
                    <span>${task.dueDate ? `📅 ${task.dueDate}` : '📅 No due date'}</span>
                    <span>⚡ ${task.progress || (isCompleted ? 100 : 0)}%</span>
                </div>
            </div>
        `;
    }

    function initKanbanBoard() {
        const todoLane = document.getElementById('todoList');
        const progressLane = document.getElementById('progressList');
        const doneLane = document.getElementById('doneList');

        if (todoLane) todoLane.innerHTML = '';
        if (progressLane) progressLane.innerHTML = '';
        if (doneLane) doneLane.innerHTML = '';

        const seenIds = new Set();

        allTasks.forEach(task => {
            const taskId = task.id.toString();
            if (seenIds.has(taskId)) return;
            seenIds.add(taskId);

            let dropLane = todoLane;
            if (task.status === 'in_progress') dropLane = progressLane;
            else if (task.status === 'completed') dropLane = doneLane;

            if (dropLane) {
                const cardHTML = createKanbanCardHTML(task);
                dropLane.insertAdjacentHTML('beforeend', cardHTML);
            }
        });

        // Add empty placeholders if a lane has no cards
        [todoLane, progressLane, doneLane].forEach(lane => {
            if (lane && lane.children.length === 0) {
                lane.innerHTML = `<div class="kanban-empty-placeholder" style="padding: 1.5rem 0.5rem; text-align: center; color: var(--text-muted); font-size: 0.8rem; border: 1px dashed var(--border); border-radius: var(--radius-sm); margin: 0.5rem 0;">No tasks in this stage</div>`;
            }
        });

        bindKanbanDragAndDrop();
        updateCounters();
    }

    function bindKanbanDragAndDrop() {
        const cards = document.querySelectorAll('.kanban-task-card');
        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                draggedKanbanCard = card;
                card.classList.add('dragging');
                card.style.opacity = '0.5';
                e.dataTransfer.setData('text/plain', card.getAttribute('data-id'));
                e.dataTransfer.effectAllowed = 'move';
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                card.style.opacity = '1';
                draggedKanbanCard = null;
                document.querySelectorAll('.kanban-column').forEach(col => col.classList.remove('drag-over'));
            });
        });

        const columns = document.querySelectorAll('.kanban-column');
        columns.forEach(col => {
            const lane = col.querySelector('.kanban-list');
            if (!lane) return;

            col.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                col.classList.add('drag-over');
            });

            col.addEventListener('dragleave', (e) => {
                if (!col.contains(e.relatedTarget)) {
                    col.classList.remove('drag-over');
                }
            });

            col.addEventListener('drop', async (e) => {
                e.preventDefault();
                col.classList.remove('drag-over');

                if (!draggedKanbanCard) return;

                const taskId = draggedKanbanCard.getAttribute('data-id');
                const newRawStatus = col.getAttribute('data-status');
                const newStatus = (newRawStatus === 'To Do' || newRawStatus === 'to_do') ? 'to_do' :
                                  (newRawStatus === 'In Progress' || newRawStatus === 'in_progress') ? 'in_progress' : 'completed';

                const placeholder = lane.querySelector('.kanban-empty-placeholder');
                if (placeholder) placeholder.remove();

                lane.appendChild(draggedKanbanCard);
                draggedKanbanCard.setAttribute('data-status', newStatus);

                await updateTaskStatus(taskId, newStatus);
                updateCounters();
            });
        });
    }

    async function updateTaskStatus(id, status) {
        try {
            const response = await fetch("/api/task/move", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    task_id: parseInt(id),
                    status: status
                })
            });
            const data = await response.json();
            if (response.ok && data.success) {
                const normalizedStatus = (status === 'To Do' || status === 'to_do') ? 'to_do' :
                    (status === 'In Progress' || status === 'in_progress') ? 'in_progress' : 'completed';
                const labels = { 'to_do': 'To Do ⏸', 'in_progress': 'In Progress ⚡', 'completed': 'Completed 🎉' };
                showToast(`Task moved to ${labels[normalizedStatus] || status}`, 'success');

                if (normalizedStatus === 'in_progress') {
                    focusState.taskId = id; 
                    updateFocusTaskInfo();
                }

                if (normalizedStatus === 'completed') {
                    playTaskCompleteSound();
                }

                if (data.task) {
                    syncUpdatedTaskCard(data.task);
                }
                if (data.gamification) {
                    handleGamificationResponse(data.gamification);
                }
            } else {
                showToast('Failed to update status', 'error');
            }
        } catch (err) {
            console.error("Status update error:", err);
            showToast('Connection error', 'error');
        }
    }

    function recalculateKanbanCounts() {
        updateCounters();
    }

    function updateCounters() {
        const todo = document.getElementById("todoCount");
        const progress = document.getElementById("progressCount");
        const done = document.getElementById("doneCount");

        if (todo) {
            todo.textContent = document.querySelectorAll("#todoList .kanban-task-card").length;
        }
        if (progress) {
            progress.textContent = document.querySelectorAll("#progressList .kanban-task-card").length;
        }
        if (done) {
            done.textContent = document.querySelectorAll("#doneList .kanban-task-card").length;
        }
    }

    // ----------------------------------------------------
    // ----------------------------------------------------
    // 14. Month Calendar View, Timeline View & Draggable Rescheduling
    // ----------------------------------------------------
    let currentCalendarFilter = 'all';

    function formatLocalDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function isToday(date) {
        const today = new Date();
        return (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        );
    }

    function getTasksForDate(dateString) {
        return allTasks.filter(task => {
            const taskDue = task.due_date || task.dueDate;
            if (taskDue !== dateString) return false;
            if (currentCalendarFilter === 'all') return true;
            if (currentCalendarFilter === 'study') return task.category === 'study';
            if (currentCalendarFilter === 'work') return task.category === 'work';
            if (currentCalendarFilter === 'personal') return task.category === 'personal';
            if (currentCalendarFilter === 'high') return task.priority === 'high';
            if (currentCalendarFilter === 'completed') return task.status === 'completed';
            if (currentCalendarFilter === 'in_progress') return task.status === 'in_progress';
            return true;
        });
    }

    function renderTasksForCalendarDay(cell, dateString) {
        const container = cell.querySelector(".calendar-day-tasks");
        if (!container) return;

        const dayTasks = getTasksForDate(dateString);
        dayTasks.slice(0, 3).forEach(task => {
            const item = document.createElement("div");
            const priority = (task.priority || "medium").toLowerCase();
            item.className = `calendar-task priority-${priority}`;
            item.textContent = task.title;
            container.appendChild(item);
        });

        if (dayTasks.length > 3) {
            const more = document.createElement("span");
            more.className = "calendar-more";
            more.textContent = `+${dayTasks.length - 3} more`;
            container.appendChild(more);
        }
    }

    function createCalendarDay(date) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "calendar-day";
        const isoDate = formatLocalDate(date);
        cell.dataset.date = isoDate;

        cell.innerHTML = `
            <span class="calendar-day-number">${date.getDate()}</span>
            <div class="calendar-day-tasks"></div>
        `;

        if (isToday(date)) {
            cell.classList.add("calendar-today");
        }

        renderTasksForCalendarDay(cell, isoDate);
        return cell;
    }

    function renderCalendar() {
        const grid = document.getElementById("calendarGrid") || document.getElementById("calendar-days-grid");
        const label = document.getElementById("calendarMonthLabel") || document.getElementById("calendar-month-year");
        if (!grid || !label) return;

        grid.innerHTML = "";

        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        label.textContent = new Intl.DateTimeFormat("en-US", {
            month: "long",
            year: "numeric"
        }).format(calendarDate);

        for (let i = 0; i < firstDay; i++) {
            const blank = document.createElement("div");
            blank.className = "calendar-day calendar-day-empty";
            grid.appendChild(blank);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const cell = createCalendarDay(date);
            grid.appendChild(cell);
        }
    }

    function showTasksForSelectedDate(dateString) {
        const titleEl = document.querySelector(".selected-date-title");
        const container = document.getElementById("calendar-tasks-container") || document.getElementById("calendar-selected-tasks");
        if (!container) return;

        const dayTasks = getTasksForDate(dateString);
        if (titleEl) {
            const parts = dateString.split("-").map(Number);
            const dObj = new Date(parts[0], parts[1] - 1, parts[2]);
            const formatted = new Intl.DateTimeFormat("en-US", {
                day: "numeric",
                month: "long",
                year: "numeric"
            }).format(dObj);
            titleEl.textContent = `${formatted} (${dayTasks.length} Scheduled Task${dayTasks.length === 1 ? '' : 's'})`;
        }

        const taskListContainer = document.getElementById("calendar-tasks-container");
        if (taskListContainer) {
            if (dayTasks.length === 0) {
                taskListContainer.innerHTML = `<p class="muted-text">No tasks scheduled for ${dateString}.</p>`;
            } else {
                taskListContainer.innerHTML = dayTasks.map(t => createTaskCardHTML(t)).join('');
            }
        }
    }

    function initializeCalendar() {
        const prev = document.getElementById("calendarPrev") || document.getElementById("cal-prev-btn");
        const next = document.getElementById("calendarNext") || document.getElementById("cal-next-btn");
        const grid = document.getElementById("calendarGrid") || document.getElementById("calendar-days-grid");

        if (prev) {
            prev.addEventListener("click", () => {
                calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1);
                renderCalendar();
            });
        }

        if (next) {
            next.addEventListener("click", () => {
                calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1);
                renderCalendar();
            });
        }

        if (grid) {
            grid.addEventListener("click", event => {
                const cell = event.target.closest(".calendar-day:not(.calendar-day-empty)");
                if (!cell || !cell.dataset.date) return;
                showTasksForSelectedDate(cell.dataset.date);
            });
        }

        // Timeline view tabs switcher listener
        const subTabCalBtn = document.getElementById('btn-sub-calendar');
        const subTabTimeBtn = document.getElementById('btn-sub-timeline');
        const panelSubCal = document.getElementById('panel-sub-calendar');
        const panelSubTime = document.getElementById('panel-sub-timeline');

        if (subTabCalBtn && subTabTimeBtn) {
            subTabCalBtn.addEventListener('click', () => {
                subTabCalBtn.classList.add('active');
                subTabTimeBtn.classList.remove('active');
                if (panelSubCal) panelSubCal.classList.remove('hidden');
                if (panelSubTime) panelSubTime.classList.add('hidden');
                renderCalendar();
            });
            subTabTimeBtn.addEventListener('click', () => {
                subTabTimeBtn.classList.add('active');
                subTabCalBtn.classList.remove('active');
                if (panelSubTime) panelSubTime.classList.remove('hidden');
                if (panelSubCal) panelSubCal.classList.add('hidden');
                renderTimelineView();
            });
        }

        renderCalendar();
    }

    // Timeline Chronological View Render
    async function renderTimelineView() {
        const container = document.getElementById('timeline-view-container');
        if (!container) return;

        container.innerHTML = "";
        const todayStr = new Date().toISOString().split('T')[0];

        // Filter tasks based on selected calendar filters
        const activeCalTasks = allTasks.filter(t => {
            if (currentCalendarFilter === 'all') return true;
            if (currentCalendarFilter === 'study') return t.category === 'study';
            if (currentCalendarFilter === 'work') return t.category === 'work';
            if (currentCalendarFilter === 'personal') return t.category === 'personal';
            if (currentCalendarFilter === 'high') return t.priority === 'high';
            if (currentCalendarFilter === 'completed') return t.status === 'completed';
            if (currentCalendarFilter === 'in_progress') return t.status === 'in_progress';
            if (currentCalendarFilter === 'overdue') {
                return t.status !== 'completed' && t.dueDate && t.dueDate < todayStr;
            }
            return true;
        });

        if (activeCalTasks.length === 0) {
            container.innerHTML = `<p class="muted-text" style="text-align:center; padding:2rem;">No timeline events found for this filter.</p>`;
            return;
        }

        // Group active filtered tasks by due date
        const groups = {};
        const noDueDateTasks = [];

        activeCalTasks.forEach(task => {
            if (!task.dueDate) {
                noDueDateTasks.push(task);
                return;
            }
            if (!groups[task.dueDate]) {
                groups[task.dueDate] = [];
            }
            groups[task.dueDate].push(task);
        });

        const sortedDates = Object.keys(groups).sort();

        // Render timeline
        sortedDates.forEach(dateStr => {
            const dateHeader = document.createElement('div');
            dateHeader.className = "timeline-date-header";
            dateHeader.innerHTML = getSmartDateLabel(dateStr, 'pending');
            container.appendChild(dateHeader);

            const wrapper = document.createElement('div');
            wrapper.className = "timeline-items-wrapper";

            groups[dateStr].forEach(task => {
                const item = document.createElement('div');
                item.className = `timeline-item-card prio-${task.priority}`;
                item.innerHTML = `
                    <div style="font-weight:700; font-size:0.88rem;">${task.title}</div>
                    <div style="font-size:0.72rem; color:var(--text-muted);">${task.category.toUpperCase()} | ${task.status.replace('_', ' ').toUpperCase()}</div>
                `;
                wrapper.appendChild(item);
            });
            container.appendChild(wrapper);
        });

        if (noDueDateTasks.length > 0) {
            const dateHeader = document.createElement('div');
            dateHeader.className = "timeline-date-header";
            dateHeader.textContent = "No Due Date Tasks";
            container.appendChild(dateHeader);

            const wrapper = document.createElement('div');
            wrapper.className = "timeline-items-wrapper";

            noDueDateTasks.forEach(task => {
                const item = document.createElement('div');
                item.className = `timeline-item-card prio-${task.priority}`;
                item.innerHTML = `
                    <div style="font-weight:700; font-size:0.88rem;">${task.title}</div>
                    <div style="font-size:0.72rem; color:var(--text-muted);">${task.category.toUpperCase()} | ${task.status.replace('_', ' ').toUpperCase()}</div>
                `;
                wrapper.appendChild(item);
            });
            container.appendChild(wrapper);
        }
    };

    if (calPrevBtn) {
        calPrevBtn.addEventListener('click', () => {
            calendarDate.setMonth(calendarDate.getMonth() - 1);
            renderCalendar();
        });
    }

    if (calNextBtn) {
        calNextBtn.addEventListener('click', () => {
            calendarDate.setMonth(calendarDate.getMonth() + 1);
            renderCalendar();
        });
    }

    // ----------------------------------------------------
    // 14. Chart.js Analytics trends
    // ----------------------------------------------------
    async function updateRing(pathId, textId, value, maxVal = 100, suffix = "h") {
        const path = document.getElementById(pathId);
        const text = document.getElementById(textId);
        if (path) {
            const percentage = maxVal > 0 ? Math.min(100, Math.max(0, (value / maxVal) * 100)) : 0;
            path.setAttribute('stroke-dasharray', `${percentage}, 100`);
        }
        if (text) {
            text.textContent = `${value}${suffix}`;
        }
    }
    async function renderHeatmap(heatmapData) {
        const container = document.getElementById('analytics-heatmap-container');
        if (!container) return;
        container.innerHTML = '';

        heatmapData.forEach(item => {
            const box = document.createElement('div');
            box.className = 'heatmap-box';
            box.style.width = '24px';
            box.style.height = '24px';
            box.style.borderRadius = '4px';
            box.style.cursor = 'pointer';
            box.title = `${item.date}: ${item.count} completed task(s)`;

            if (item.count === 0) {
                box.style.background = 'var(--bg-input)';
                box.style.border = '1px solid var(--border-color)';
            } else if (item.count === 1 || item.count === 2) {
                box.style.background = '#3b82f6';
            } else {
                box.style.background = '#8b5cf6';
            }
            container.appendChild(box);
        });
    }; async function initAnalyticsCharts() {
        const isDarkMode = document.body.classList.contains('dark-mode');
        const gridColor = isDarkMode ? '#1e293b' : '#e2e8f0';
        const labelColor = isDarkMode ? '#94a3b8' : '#64748b';

        try {
            const response = await fetch('/api/analytics');
            const res = await response.json();
            if (!response.ok || !res.success) {
                console.error("Failed to load analytics: ", res.message);
                return;
            }

            const data = res.data;
            const overview = data.overview;

            // 1. Overview animated statistic counters
            function getVal(id) {
                const el = document.getElementById(id);
                return el ? (parseFloat(el.textContent.replace(/[^\d.]/g, "")) || 0) : 0;
            };

            animateCounter(document.getElementById('analytics-total-tasks'), getVal('analytics-total-tasks'), overview ? overview.total_tasks : 0);
            animateCounter(document.getElementById('analytics-active-tasks'), getVal('analytics-active-tasks'), overview ? overview.active_tasks : 0);
            animateCounter(document.getElementById('analytics-completed-tasks'), getVal('analytics-completed-tasks'), overview ? overview.completed_tasks : 0);
            animateCounter(document.getElementById('analytics-overdue-tasks'), getVal('analytics-overdue-tasks'), overview ? overview.overdue_tasks : 0);
            animateCounter(document.getElementById('analytics-in-progress'), getVal('analytics-in-progress'), overview ? overview.in_progress : 0);
            animateCounter(document.getElementById('analytics-completion-rate'), Math.floor(getVal('analytics-completion-rate')), Math.floor(overview ? overview.completion_rate : 0), "%");

            // 2. AI Score Ring & Paragraph
            const score = data.productivity_score || 0;
            updateRing('score-ring-path', 'score-numeric-text', score, 100, "");
            const numericTextEl = document.getElementById('score-numeric-text');
            if (numericTextEl) numericTextEl.textContent = `${score}`;

            const explanationEl = document.getElementById('score-explanation-paragraph');
            if (explanationEl) {
                explanationEl.textContent = data.score_explanation || "Analyzing your task velocity...";
            }

            // 3. Smart Insights list
            const insightsList = document.getElementById('analytics-insights-list');
            if (insightsList && data.insights && data.insights.length > 0) {
                insightsList.innerHTML = data.insights.map(ins => `
                    <li style="margin-bottom: 0.5rem; animation: ai-slide-up var(--speed-normal) ease-out forwards;">
                        ✨ ${ins}
                    </li>
                `).join('');
            } else if (insightsList) {
                insightsList.innerHTML = `<li style="color: var(--text-muted);">✨ Add and complete tasks to generate tailored recommendations.</li>`;
            }

            // 4. Monthly Comparison
            const comp = data.monthly_comparison;
            if (comp) {
                const prevHeader = document.getElementById('prev-month-header');
                const currHeader = document.getElementById('curr-month-header');
                if (prevHeader && comp.previous) prevHeader.textContent = comp.previous.month;
                if (currHeader && comp.current) currHeader.textContent = comp.current.month;

                const prevCompleted = document.getElementById('prev-month-completed');
                const currCompleted = document.getElementById('curr-month-completed');
                if (prevCompleted && comp.previous) prevCompleted.textContent = comp.previous.completed;
                if (currCompleted && comp.current) currCompleted.textContent = comp.current.completed;

                const prevRate = document.getElementById('prev-month-rate');
                const currRate = document.getElementById('curr-month-rate');
                if (prevRate && comp.previous) prevRate.textContent = `${comp.previous.rate}%`;
                if (currRate && comp.current) currRate.textContent = `${comp.current.rate}%`;
            }

            // 6. Weekly Productivity Chart
            const canvasWeekly = document.getElementById('chart-weekly-trend');
            if (canvasWeekly) {
                if (chartWeeklyInstance) chartWeeklyInstance.destroy();

                const labels = data.weekly_trend.map(d => d.day);
                const values = data.weekly_trend.map(d => d.count);

                chartWeeklyInstance = new Chart(canvasWeekly, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Tasks Completed',
                            data: values,
                            backgroundColor: '#2563eb',
                            hoverBackgroundColor: '#1d4ed8',
                            borderRadius: 6,
                            barThickness: 22,
                            maxBarThickness: 30
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        layout: { padding: { top: 10, bottom: 5, left: 5, right: 5 } },
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                backgroundColor: '#0f172a',
                                titleFont: { family: 'Plus Jakarta Sans', weight: '700' },
                                bodyFont: { family: 'Plus Jakarta Sans' },
                                padding: 10,
                                cornerRadius: 8
                            }
                        },
                        scales: {
                            x: { grid: { display: false }, ticks: { color: labelColor, font: { family: 'Plus Jakarta Sans', weight: '600', size: 12 } } },
                            y: { beginAtZero: true, grid: { color: gridColor, drawBorder: false }, ticks: { stepSize: 1, precision: 0, color: labelColor, font: { family: 'Plus Jakarta Sans', size: 11 } } }
                        }
                    }
                });
            }

            // 7. Category Distribution Chart (Doughnut)
            const canvasCategory = document.getElementById('chart-category');
            if (canvasCategory) {
                if (chartCategoryInstance) chartCategoryInstance.destroy();

                const catData = data.category_distribution;

                chartCategoryInstance = new Chart(canvasCategory, {
                    type: 'doughnut',
                    data: {
                        labels: ['📚 Study', '💼 Work', '🏠 Personal', '🧩 Other'],
                        datasets: [{
                            data: [catData.study || 0, catData.work || 0, catData.personal || 0, catData.other || 0],
                            backgroundColor: ['#2563eb', '#6366f1', '#ec4899', '#f59e0b'],
                            borderColor: isDarkMode ? '#0f172a' : '#ffffff',
                            borderWidth: 3,
                            hoverOffset: 6
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '68%',
                        layout: { padding: { top: 5, bottom: 5 } },
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    usePointStyle: true,
                                    pointStyle: 'circle',
                                    padding: 14,
                                    color: labelColor,
                                    font: { family: 'Plus Jakarta Sans', weight: '600', size: 12 }
                                }
                            },
                            tooltip: {
                                backgroundColor: '#0f172a',
                                titleFont: { family: 'Plus Jakarta Sans', weight: '700' },
                                bodyFont: { family: 'Plus Jakarta Sans' },
                                padding: 10,
                                cornerRadius: 8
                            }
                        }
                    }
                });
            }

            // 8. Priority Analysis Chart (Stacked bar with bounded bar width)
            const canvasPriority = document.getElementById('chart-priority');
            if (canvasPriority) {
                if (chartPriorityInstance) chartPriorityInstance.destroy();

                const prioData = data.priority_analysis;

                chartPriorityInstance = new Chart(canvasPriority, {
                    type: 'bar',
                    data: {
                        labels: ['High Priority', 'Medium Priority', 'Low Priority'],
                        datasets: [
                            {
                                label: 'Completed',
                                data: [prioData.high.completed, prioData.medium.completed, prioData.low.completed],
                                backgroundColor: '#10b981',
                                borderRadius: 6,
                                barThickness: 28,
                                maxBarThickness: 38
                            },
                            {
                                label: 'Pending',
                                data: [prioData.high.pending, prioData.medium.pending, prioData.low.pending],
                                backgroundColor: '#f59e0b',
                                borderRadius: 6,
                                barThickness: 28,
                                maxBarThickness: 38
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        layout: { padding: { top: 10, bottom: 5, left: 10, right: 10 } },
                        plugins: {
                            legend: {
                                position: 'top',
                                labels: {
                                    usePointStyle: true,
                                    pointStyle: 'circle',
                                    padding: 16,
                                    color: labelColor,
                                    font: { family: 'Plus Jakarta Sans', weight: '600', size: 12 }
                                }
                            },
                            tooltip: {
                                backgroundColor: '#0f172a',
                                titleFont: { family: 'Plus Jakarta Sans', weight: '700' },
                                bodyFont: { family: 'Plus Jakarta Sans' },
                                padding: 10,
                                cornerRadius: 8
                            }
                        },
                        scales: {
                            x: {
                                stacked: true,
                                grid: { display: false },
                                ticks: { color: labelColor, font: { family: 'Plus Jakarta Sans', weight: '600', size: 12 } }
                            },
                            y: {
                                stacked: true,
                                beginAtZero: true,
                                grid: { color: gridColor, drawBorder: false },
                                ticks: { stepSize: 1, precision: 0, color: labelColor, font: { family: 'Plus Jakarta Sans', size: 11 } }
                            }
                        }
                    }
                });
            }

            // 9. Progress Heatmap (Last 30 Days)
            renderHeatmap(data.heatmap);

        } catch (err) {
            console.error("Analytics fetch failure: ", err);
        }
    }; async function initHabitTracker() {
        const streakValEl = document.getElementById('habit-current-streak-val');
        const longestStreakEl = document.getElementById('habit-longest-streak-val');
        const totalCompletedEl = document.getElementById('habit-total-completed-val');
        const progressRingFill = document.getElementById('habit-progress-ring-fill');
        const progressText = document.getElementById('habit-progress-text');
        const completedCountEl = document.getElementById('habit-completed-today-count');
        const remainingCountEl = document.getElementById('habit-remaining-count');
        const insightsList = document.getElementById('habit-insights-list');
        const listContainer = document.getElementById('habits-list-container');

        try {
            const response = await fetch('/api/habit/list');
            const res = await response.json();
            if (response.ok && res.success) {
                const habits = res.habits;
                const streaks = res.streaks;
                const insights = res.insights;
                const overview = res.overview;

                const currentStreak = streaks.current_streak;
                const prevStreakText = streakValEl?.textContent.replace(/[^\d]/g, "") || "0";
                animateCounter(streakValEl, parseInt(prevStreakText) || 0, currentStreak, " 🔥");

                if (longestStreakEl) longestStreakEl.textContent = streaks.longest_streak;
                if (totalCompletedEl) totalCompletedEl.textContent = streaks.total_completed;

                const rate = overview.rate;
                if (progressRingFill) {
                    progressRingFill.setAttribute('stroke-dasharray', `${rate}, 100`);
                }
                if (progressText) {
                    progressText.textContent = `${Math.floor(rate)}%`;
                }
                if (completedCountEl) completedCountEl.textContent = overview.completed_today;
                if (remainingCountEl) remainingCountEl.textContent = overview.remaining;

                if (insightsList) {
                    insightsList.innerHTML = insights.map(item => `
                        <li style="margin-bottom: 0.5rem; animation: ai-slide-up var(--speed-normal) ease-out forwards;">
                            ✨ ${item}
                        </li>
                    `).join('');
                }

                if (listContainer) {
                    if (habits.length > 0) {
                        listContainer.innerHTML = habits.map(habit => {
                            const completedClass = habit.completed_today === 1 ? 'completed-habit' : '';
                            const checkIcon = habit.completed_today === 1 ? '✅' : '⬜';
                            return `
                                <div class="task-card glass-card ${completedClass}" style="border-left: 4px solid ${habit.color}; padding: 12px; display: flex; justify-content: space-between; align-items: center; transition: all 300ms ease;">
                                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                                        <span style="font-size: 1.5rem;">${habit.icon}</span>
                                        <div>
                                            <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700;">${habit.name}</h4>
                                            <span style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted);">${habit.category} | ${habit.frequency}</span>
                                        </div>
                                    </div>
                                    <button type="button" class="btn btn-secondary btn-complete-habit" data-habit-id="${habit.id}" data-completed="${habit.completed_today}" style="font-size: 0.85rem; font-weight: 700; padding: 0.4rem 0.6rem; border-radius: var(--radius-sm); display: flex; align-items: center; gap: 0.25rem; transition: var(--speed-fast) ease;">
                                        <span>${checkIcon}</span>
                                        <span>${habit.completed_today === 1 ? 'Done' : 'Complete'}</span>
                                    </button>
                                </div>
                            `;
                        }).join('');

                        document.querySelectorAll('.btn-complete-habit').forEach(btn => {
                            btn.addEventListener('click', async (e) => {
                                const habitId = btn.dataset.habitId;
                                const isCompleted = btn.dataset.completed === "1";
                                const nextState = isCompleted ? 0 : 1;

                                const card = btn.closest('.task-card');
                                if (card) {
                                    card.style.transform = 'scale(0.95)';
                                    card.style.opacity = '0.7';
                                }

                                try {
                                    const logRes = await fetch('/api/habit/complete', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ habit_id: habitId, completed: nextState })
                                    });
                                    const logData = await logRes.json();
                                    if (logRes.ok && logData.success) {
                                        showToast(nextState === 1 ? "Habit completed today! 🔥 Keep the streak going!" : "Habit status reverted.", "success");
                                        initHabitTracker();
                                        updateStatistics();
                                        if (logData.gamification) {
                                            handleGamificationResponse(logData.gamification);
                                        }
                                    }
                                } catch (err) {
                                    console.error("Error saving habit log completion: ", err);
                                    showToast("Failed to update habit status.", "error");
                                }
                            });
                        });
                    } else {
                        listContainer.innerHTML = `
                            <p class="muted-text" style="text-align: center; padding: 1.5rem;">No active habits defined. Create one below to start your routine!</p>
                        `;
                    }
                }
            }
        } catch (err) {
            console.error("Error loading habits list: ", err);
        }

        try {
            const heatRes = await fetch('/api/habit/heatmap');
            const data = await heatRes.json();
            if (heatRes.ok && data.success) {
                const heatmap = data.heatmap;
                const container = document.getElementById('habit-heatmap-container');
                if (container) {
                    container.innerHTML = '';
                    heatmap.forEach(item => {
                        const box = document.createElement('div');
                        box.className = 'heatmap-box';
                        box.style.width = '24px';
                        box.style.height = '24px';
                        box.style.borderRadius = '4px';
                        box.style.cursor = 'pointer';
                        box.title = `${item.date}: ${item.count} completed routine(s)`;

                        if (item.count === 0) {
                            box.style.background = 'var(--bg-input)';
                            box.style.border = '1px solid var(--border-color)';
                        } else if (item.count === 1) {
                            box.style.background = '#3b82f6';
                        } else {
                            box.style.background = '#8b5cf6';
                        }
                        container.appendChild(box);
                    });
                }
            }
        } catch (err) {
            console.error("Error drawing habit heatmap: ", err);
        }
    };

    const createHabitForm = document.getElementById('create-habit-form');
    if (createHabitForm) {
        createHabitForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('habit-name-input').value;
            const category = document.getElementById('habit-category-select').value;
            const frequency = document.getElementById('habit-frequency-select').value;
            const color = document.getElementById('habit-color-input').value;
            const icon = document.getElementById('habit-icon-select').value;

            showToast("Saving routine habit...", "info");

            try {
                const response = await fetch('/api/habit/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, category, frequency, color, icon })
                });
                const res = await response.json();
                if (response.ok && res.success) {
                    showToast("Routine habit defined successfully! 🚀", "success");
                    createHabitForm.reset();
                    initHabitTracker();
                } else {
                    showToast(res.message || "Failed to create habit.", "error");
                }
            } catch (err) {
                console.error("Create habit API error: ", err);
                showToast("Failed to connect to habit creation service.", "error");
            }
        });
    } function updateChartsData() {
        const analyticsTab = document.getElementById('analytics');
        if (analyticsTab && analyticsTab.classList.contains('active-page')) {
            initAnalyticsCharts();
        }
    };

    // ----------------------------------------------------
    // 15. In-Place Edit Modal
    // ----------------------------------------------------
    async function openEditModal(taskId) {
        if (!editModal) return;

        try {
            const response = await fetch(`/edit/${taskId}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Unable to edit task');
            }

            const task = data.task;

            document.getElementById('edit-task-id').value = task.id;
            editTaskTitle.value = task.title;
            editTaskDesc.value = task.description || '';
            editTaskEstTime.value = task.estimated_time || 0;
            editTaskDueDate.value = task.due_date || '';
            editTaskPriority.value = task.priority;
            editTaskCategory.value = task.category;
            editTaskStatus.value = task.status;

            editTaskProgress.value = task.progress || 0;
            if (editProgressTextDisplay) editProgressTextDisplay.textContent = task.progress || 0;

            if (editCharCounter) {
                editCharCounter.textContent = `${(task.description || '').length} / 200`;
            }

            editModal.classList.remove('hidden');
            editTaskTitle.focus();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }
    async function closeEditModal() {
        if (editModal) {
            editModal.classList.add('hidden');
            editForm.reset();
        }
    };

    if (closeEditBtn) closeEditBtn.addEventListener('click', closeEditModal);
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeEditModal);
    if (editModal) {
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) closeEditModal();
        });
    }

    if (editTaskDesc && editCharCounter) {
        editTaskDesc.addEventListener('input', () => {
            const count = editTaskDesc.value.length;
            editCharCounter.textContent = `${count} / 200`;
            editCharCounter.style.color = count >= 180 ? 'var(--danger)' : 'var(--text-muted)';
        });
    }

    if (editTaskProgress && editProgressTextDisplay) {
        editTaskProgress.addEventListener('input', (e) => {
            const val = e.target.value;
            editProgressTextDisplay.textContent = val;
            if (val >= 100) editTaskStatus.value = 'completed';
            else if (val <= 0) editTaskStatus.value = 'to_do';
            else editTaskStatus.value = 'in_progress';
        });

        editTaskStatus.addEventListener('change', (e) => {
            const statusVal = e.target.value;
            if (statusVal === 'completed') {
                editTaskProgress.value = 100;
                editProgressTextDisplay.textContent = 100;
            } else if (statusVal === 'to_do') {
                if (editTaskProgress.value == 100) {
                    editTaskProgress.value = 0;
                    editProgressTextDisplay.textContent = 0;
                }
            } else {
                if (editTaskProgress.value == 0 || editTaskProgress.value == 100) {
                    editTaskProgress.value = 5;
                    editProgressTextDisplay.textContent = 5;
                }
            }
        });
    }

    // Modal Edit Task submit
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const taskId = document.getElementById('edit-task-id').value;
            const title = editTaskTitle.value.trim();

            if (!title) {
                showToast('Please enter a task title!', 'error');
                editTaskTitle.classList.add('input-error');
                setTimeout(() => editTaskTitle.classList.remove('input-error'), 1000);
                editTaskTitle.focus();
                return;
            }

            const saveBtn = document.getElementById('save-task-btn');
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
            showToast('Saving changes...', 'info');

            try {
                const data = {
                    title: title,
                    description: editTaskDesc.value.trim(),
                    estimated_time: parseInt(editTaskEstTime.value) || 0,
                    due_date: editTaskDueDate.value,
                    priority: editTaskPriority.value,
                    category: editTaskCategory.value,
                    status: editTaskStatus.value,
                    progress: parseInt(editTaskProgress.value) || 0
                };

                const response = await fetch(`/edit/${taskId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result.message || 'Unable to update task');
                }

                closeEditModal();
                showToast('Task updated successfully', 'success');
                syncUpdatedTaskCard(result.task);
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Changes';
            }
        });
    }

    // ----------------------------------------------------
    // 16. Live Numbers Counter Animation (Part 10)
    // ----------------------------------------------------
    async function animateCounter(element, start, end, suffix = '') {
        if (!element) return;
        if (prefersReducedMotion() || start === end) {
            element.textContent = end + suffix;
            return;
        }

        const range = end - start;
        let current = start;
        const increment = end > start ? 1 : -1;
        const stepTime = Math.max(Math.abs(Math.floor(250 / Math.abs(range))), 10);

        const timer = setInterval(() => {
            current += increment;
            element.textContent = current + suffix;
            if (current === end) {
                clearInterval(timer);
            }
        }, stepTime);
    };

    // ----------------------------------------------------
    // 18. AI Assistant Integration Handlers
    // ----------------------------------------------------

    // Helper to render dynamic loader inside a button or block
    async function showAILoader(container, messageText = "AI is thinking...") {
        container.disabled = true;
        container.setAttribute('data-original-html', container.innerHTML);
        container.innerHTML = `
            <div class="ai-loading-container" style="display:inline-flex;">
                <span>${messageText}</span>
                <div class="ai-loading-dots" style="margin-left:0.25rem;">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
    }
    async function hideAILoader(container) {
        container.disabled = false;
        if (container.hasAttribute('data-original-html')) {
            container.innerHTML = container.getAttribute('data-original-html');
            container.removeAttribute('data-original-html');
        }
    };

    // 1. AI PLANNER ASSISTANT
    const aiPlannerBtn = document.getElementById('ai-generate-plan-btn');
    const aiAccomplishInput = document.getElementById('ai-accomplish-input');
    const aiPlanSuggestionsHolder = document.getElementById('ai-plan-suggestions-holder');

    if (aiPlannerBtn) {
        aiPlannerBtn.addEventListener('click', async () => {
            const accomplishText = aiAccomplishInput.value.trim();
            if (!accomplishText) {
                showToast("Please type what you want to accomplish first!", "warning");
                return;
            }

            showAILoader(aiPlannerBtn, "Planning...");
            aiPlanSuggestionsHolder.innerHTML = "";
            aiPlanSuggestionsHolder.classList.add('hidden');

            try {
                const response = await fetch('/api/ai/plan', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: JSON.stringify({ accomplish: accomplishText })
                });
                const result = await response.json();

                if (response.ok && result.success) {
                    aiPlanSuggestionsHolder.classList.remove('hidden');

                    // Render individual cards for suggested tasks
                    const tasksList = result.data;

                    // Main Add All Button
                    const addAllBtn = document.createElement('button');
                    addAllBtn.className = "btn btn-xs btn-primary";
                    addAllBtn.style.width = "100%";
                    addAllBtn.style.marginBottom = "0.75rem";
                    addAllBtn.innerHTML = "&#10024; Add All Tasks";
                    aiPlanSuggestionsHolder.appendChild(addAllBtn);

                    const itemCards = [];

                    tasksList.forEach((taskItem, idx) => {
                        const card = document.createElement('div');
                        card.className = "ai-suggestion-item-card";
                        card.style.animationDelay = `${idx * 0.1}s`;

                        card.innerHTML = `
                            <div style="font-weight: 700; font-size: 0.85rem; color: var(--text-main);">${taskItem.title}</div>
                            <div style="display: flex; gap: 0.5rem; align-items: center; font-size: 0.72rem; margin-top: 0.25rem;">
                                <span class="ai-prio-badge prio-${taskItem.priority}">${taskItem.priority.toUpperCase()}</span>
                                <span style="color: var(--text-muted);">&#9201; ${taskItem.estimated_time}m</span>
                                <span style="color: var(--text-muted);">Due +${taskItem.due_days_offset}d</span>
                            </div>
                            <div class="ai-item-actions-row">
                                <button type="button" class="btn btn-xs btn-success accept-suggest-item-btn">Accept</button>
                                <button type="button" class="btn btn-xs btn-secondary reject-suggest-item-btn">Reject</button>
                            </div>
                        `;

                        // Accept individual task
                        card.querySelector('.accept-suggest-item-btn').addEventListener('click', async () => {
                            await addSuggestedTaskViaAJAX(taskItem.title, taskItem.priority, taskItem.estimated_time, taskItem.due_days_offset, card);
                        });

                        // Reject individual task
                        card.querySelector('.reject-suggest-item-btn').addEventListener('click', () => {
                            card.style.animation = 'ai-slide-up var(--speed-normal) reverse forwards';
                            setTimeout(() => card.remove(), 350);
                        });

                        aiPlanSuggestionsHolder.appendChild(card);
                        itemCards.push({ element: card, data: taskItem });
                    });

                    // Add All callback
                    addAllBtn.addEventListener('click', async () => {
                        addAllBtn.disabled = true;
                        addAllBtn.textContent = "Adding all...";
                        for (const item of itemCards) {
                            if (item.element.parentNode) {
                                await addSuggestedTaskViaAJAX(item.data.title, item.data.priority, item.data.estimated_time, item.data.due_days_offset, item.element);
                            }
                        }
                        addAllBtn.remove();
                        aiPlanSuggestionsHolder.classList.add('hidden');
                    });

                    showToast("Plan suggestions loaded successfully", "success");
                } else {
                    showToast(result.message || "Failed to generate plan.", "error");
                }
            } catch (e) {
                showToast("Connection to server failed.", "error");
            } finally {
                hideAILoader(aiPlannerBtn);
            }
        });
    } async function addSuggestedTaskViaAJAX(title, priority, estTime, dueOffsetDays, parentCard = null) {
        let dueDateStr = '';
        if (dueOffsetDays) {
            const date = new Date();
            date.setDate(date.getDate() + parseInt(dueOffsetDays));
            dueDateStr = date.toISOString().split('T')[0];
        }

        const payload = {
            title: title,
            description: 'AI Generated Plan Task',
            priority: priority,
            category: 'study',
            due_date: dueDateStr,
            estimated_time: parseInt(estTime) || 60
        };

        try {
            const response = await fetch('/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(payload)
            });
            const res = await response.json();
            if (response.ok && res.success) {
                // Prepend to active local list
                allTasks.unshift({
                    id: res.task.id,
                    title: res.task.title,
                    description: res.task.description || '',
                    priority: res.task.priority,
                    category: res.task.category,
                    dueDate: res.task.due_date || '',
                    status: res.task.status,
                    createdAt: res.task.created_at,
                    boardStatus: res.task.status,
                    estTime: parseInt(res.task.estimated_time) || 0,
                    progress: parseInt(res.task.progress) || 0,
                    startedAt: res.task.started_at,
                    completedAt: res.task.completed_at,
                    updatedAt: res.task.updated_at,
                    aiPriority: res.task.ai_priority || '',
                    aiReason: res.task.ai_reason || '',
                    domNode: null
                });

                // Re-render task cards on DOM
                const container = document.getElementById('task-items-list');
                if (container) {
                    // Rebuild container from scratch based on global list
                    container.innerHTML = "";
                    allTasks.forEach(t => {
                        const html = createTaskCardHTML(t);
                        container.insertAdjacentHTML('beforeend', html);
                    });
                    loadTasksFromDOM();
                    checkDueDates();
                    updateStatistics();
                    applyFiltersAndSearch();
                    initKanbanBoard();
                }

                if (parentCard) {
                    parentCard.style.animation = 'ai-slide-up var(--speed-normal) reverse forwards';
                    setTimeout(() => parentCard.remove(), 350);
                }
            }
        } catch (e) {
            console.error("AJAX task save failed: ", e);
        }
    };

    // 2. CARD DELEGATION: AI BREAKDOWN, SMART PRIORITY & SUGGEST ESTIMATE
    const tasksListContainer = document.getElementById('task-items-list');
    if (tasksListContainer) {
        tasksListContainer.addEventListener('click', async (e) => {
            const breakdownBtn = e.target.closest('.card-ai-breakdown-btn');
            const priorityBtn = e.target.closest('.card-ai-priority-btn');
            const estimateBtn = e.target.closest('.card-ai-estimate-btn');

            if (breakdownBtn) {
                const taskId = breakdownBtn.getAttribute('data-id');
                const box = document.getElementById(`ai-breakdown-box-${taskId}`);
                if (!box) return;

                if (!box.classList.contains('hidden')) {
                    box.classList.add('hidden');
                    box.innerHTML = "";
                    return;
                }

                showAILoader(breakdownBtn, "Breaking down...");
                box.classList.remove('hidden');
                box.innerHTML = `<p style="font-size:0.75rem; color:var(--primary); margin:0;">&#129302; Generating subtasks...</p>`;

                try {
                    const response = await fetch('/api/ai/breakdown', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        body: JSON.stringify({ task_id: taskId })
                    });
                    const res = await response.json();

                    if (response.ok && res.success) {
                        box.innerHTML = `<div style="font-weight:700; font-size:0.8rem; margin-bottom:0.5rem; color:var(--text-main);">Suggested Subtasks (Editable):</div>`;

                        const subtasks = res.data;

                        subtasks.forEach((subTitle, idx) => {
                            const row = document.createElement('div');
                            row.className = "subtask-item-row";
                            row.style.display = "flex";
                            row.style.alignItems = "center";
                            row.style.gap = "0.5rem";
                            row.style.margin = "0.35rem 0";
                            row.style.fontSize = "0.78rem";
                            row.style.color = "var(--text-main)";

                            row.innerHTML = `
                                <input type="checkbox" checked class="subtask-select-chk">
                                <input type="text" class="subtask-title-input" value="${subTitle}" style="flex:1; font-size:0.78rem; padding:2px 4px; border:1px solid var(--border); background:var(--bg-hover); color:var(--text-main); border-radius:3px;">
                            `;

                            box.appendChild(row);
                        });

                        const actionsRow = document.createElement('div');
                        actionsRow.style.display = "flex";
                        actionsRow.style.gap = "0.5rem";
                        actionsRow.style.marginTop = "0.6rem";

                        actionsRow.innerHTML = `
                            <button type="button" class="btn btn-xs btn-primary add-selected-subtasks-btn">Add Selected</button>
                            <button type="button" class="btn btn-xs btn-secondary cancel-breakdown-btn">Reject</button>
                        `;

                        actionsRow.querySelector('.add-selected-subtasks-btn').addEventListener('click', async () => {
                            const parentTask = allTasks.find(t => t.id.toString() === taskId.toString());
                            const pPriority = parentTask ? parentTask.priority : 'medium';

                            const rows = box.querySelectorAll('.subtask-item-row');
                            for (const r of rows) {
                                const chk = r.querySelector('.subtask-select-chk');
                                const input = r.querySelector('.subtask-title-input');
                                if (chk && chk.checked && input) {
                                    const stTitle = input.value.trim();
                                    if (stTitle) {
                                        await addSuggestedTaskViaAJAX(stTitle, pPriority, 30, 0, null);
                                    }
                                }
                            }

                            box.classList.add('hidden');
                            box.innerHTML = "";
                            showToast("Selected subtasks added successfully!", "success");
                        });

                        actionsRow.querySelector('.cancel-breakdown-btn').addEventListener('click', () => {
                            box.classList.add('hidden');
                            box.innerHTML = "";
                        });

                        box.appendChild(actionsRow);
                    } else {
                        box.innerHTML = `<p style="font-size:0.75rem; color:var(--danger); margin:0;">Failed to generate breakdown: ${res.message}</p>`;
                    }
                } catch (err) {
                    box.innerHTML = `<p style="font-size:0.75rem; color:var(--danger); margin:0;">Connection error.</p>`;
                } finally {
                    hideAILoader(breakdownBtn);
                }
            }

            if (priorityBtn) {
                const taskId = priorityBtn.getAttribute('data-id');
                showAILoader(priorityBtn, "Analyzing...");

                try {
                    const response = await fetch('/api/ai/priority', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        body: JSON.stringify({ task_id: taskId })
                    });
                    const res = await response.json();

                    if (response.ok && res.success) {
                        const badgesRow = document.getElementById(`ai-badges-${taskId}`);
                        const badgeVal = document.getElementById(`ai-badge-val-${taskId}`);
                        const badgeReason = document.getElementById(`ai-badge-reason-${taskId}`);

                        if (badgesRow && badgeVal && badgeReason) {
                            badgeVal.textContent = res.data.priority.toUpperCase();
                            badgeVal.className = `ai-prio-badge prio-${res.data.priority}`;
                            badgeReason.textContent = res.data.reason;
                            badgesRow.classList.remove('hidden');

                            const applyConfirm = confirm(`AI Suggestion:\nPriority: ${res.data.priority.toUpperCase()}\nReason: ${res.data.reason}\n\nDo you want to apply this priority to the task?`);
                            if (applyConfirm) {
                                const cached = allTasks.find(t => t.id.toString() === taskId.toString());
                                if (cached) {
                                    const updateRes = await fetch(`/edit/${taskId}`, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'Accept': 'application/json',
                                            'X-Requested-With': 'XMLHttpRequest'
                                        },
                                        body: JSON.stringify({
                                            title: cached.title,
                                            description: cached.description || '',
                                            estimated_time: cached.estTime,
                                            due_date: cached.dueDate,
                                            priority: res.data.priority,
                                            category: cached.category,
                                            status: cached.status,
                                            progress: cached.progress
                                        })
                                    });
                                    const updateData = await updateRes.json();
                                    if (updateRes.ok && updateData.success) {
                                        showToast(`Task priority updated to ${res.data.priority.toUpperCase()}!`, 'success');
                                        syncUpdatedTaskCard(updateData.task);
                                    }
                                }
                            }
                        }
                    } else {
                        showToast(res.message || "Failed to recommend priority.", "error");
                    }
                } catch (err) {
                    showToast("Connection error.", "error");
                } finally {
                    hideAILoader(priorityBtn);
                }
            }

            if (estimateBtn) {
                const taskId = estimateBtn.getAttribute('data-id');
                showAILoader(estimateBtn, "Analyzing...");

                try {
                    const response = await fetch('/api/ai/estimate', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        body: JSON.stringify({ task_id: taskId })
                    });
                    const res = await response.json();

                    if (response.ok && res.success) {
                        const minutes = res.data.estimated_time;
                        const hours = (minutes / 60).toFixed(1);
                        const applyConfirm = confirm(`AI Estimate Suggestion:\n⏱️ ${minutes} minutes (~ ${hours} hours)\n\nDo you want to apply this estimate?`);
                        if (applyConfirm) {
                            const saveRes = await fetch('/api/ai/estimate/save', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Accept': 'application/json',
                                    'X-Requested-With': 'XMLHttpRequest'
                                },
                                body: JSON.stringify({ task_id: taskId, estimate: minutes })
                            });
                            const saveResult = await saveRes.json();
                            if (saveRes.ok && saveResult.success) {
                                showToast(`Estimate saved: ${minutes} minutes!`, 'success');
                                syncUpdatedTaskCard(saveResult.task);
                            }
                        }
                    } else {
                        showToast(res.message || "Failed to get time estimate.", "error");
                    }
                } catch (err) {
                    showToast("Connection error.", "error");
                } finally {
                    hideAILoader(estimateBtn);
                }
            }
        });
    }



    // 4. PRODUCTIVITY INSIGHTS TAB
    const generateInsightsBtn = document.getElementById('generate-insights-btn');
    const insightsBodyContainer = document.getElementById('insights-body-container');

    if (generateInsightsBtn) {
        generateInsightsBtn.addEventListener('click', async () => {
            showAILoader(generateInsightsBtn, "Analyzing...");
            insightsBodyContainer.innerHTML = `<p style="font-size:0.85rem; color:var(--primary); text-align:center;">&#129302; Processing historical completions and active weights...</p>`;

            try {
                const response = await fetch('/api/ai/insights', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
                const res = await response.json();

                if (response.ok && res.success) {
                    let html = `<ul style="list-style: none; padding: 0; display:flex; flex-direction:column; gap:0.75rem;">`;
                    res.data.insights.forEach((insight, idx) => {
                        html += `
                            <li class="timeline-node" style="animation: ai-slide-up var(--speed-normal) ease-out forwards; animation-delay: ${idx * 0.15}s; opacity:0; transform:translateY(10px); border-left:3px solid var(--success);">
                                <div style="font-weight:700; font-size:0.85rem;">&#128161; Insight #${idx + 1}</div>
                                <p style="margin:0.25rem 0 0 0; font-size:0.8rem; color:var(--text-main);">${insight}</p>
                            </li>
                        `;
                    });
                    html += `</ul>`;
                    insightsBodyContainer.innerHTML = html;
                    showToast("Productivity insights updated", "success");
                } else {
                    insightsBodyContainer.innerHTML = `<p class="text-danger">Failed to compile insights: ${res.message}</p>`;
                }
            } catch (err) {
                insightsBodyContainer.innerHTML = `<p class="text-danger">Unable to reach server.</p>`;
            } finally {
                hideAILoader(generateInsightsBtn);
            }
        });
    }

    // 5. RECOMMENDED NEXT TASK
    const aiRecommendationContainer = document.getElementById('ai-recommendation-container');
    const aiRecommendationBody = document.getElementById('ai-recommendation-body');
    const refreshRecommendationBtn = document.getElementById('refresh-ai-recommendation-btn'); async function loadAIRecommendation() {
        if (!aiRecommendationBody) return;

        try {
            const response = await fetch('/api/ai/recommend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            const res = await response.json();

            if (response.ok && res.success && res.data.task_id) {
                aiRecommendationContainer.classList.remove('hidden');

                let bulletHtml = "";
                res.data.reason.forEach(bullet => {
                    bulletHtml += `<li style="font-size: 0.76rem; color: var(--text-muted);">&#8226; ${bullet}</li>`;
                });

                aiRecommendationBody.innerHTML = `
                    <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-main);">${res.data.task_title}</div>
                    <ul style="padding: 0; list-style: none; margin: 0.5rem 0; display:flex; flex-direction:column; gap:0.2rem;">
                        ${bulletHtml}
                    </ul>
                    <button type="button" class="btn btn-xs btn-primary start-recommended-task-btn" data-id="${res.data.task_id}">&#9654; Start Task Focus</button>
                `;

                aiRecommendationBody.querySelector('.start-recommended-task-btn').addEventListener('click', async () => {
                    await startTask(res.data.task_id);
                });
            } else {
                aiRecommendationContainer.classList.add('hidden');
            }
        } catch (err) {
            console.error("Failed to load AI next task recommendation: ", err);
        }
    };

    if (refreshRecommendationBtn) {
        refreshRecommendationBtn.addEventListener('click', async () => {
            refreshRecommendationBtn.disabled = true;
            refreshRecommendationBtn.textContent = "Loading...";
            await loadAIRecommendation();
            refreshRecommendationBtn.disabled = false;
            refreshRecommendationBtn.innerHTML = "🔄 Refresh";
        });
    }

    // 6. AI CHAT ASSISTANT
    const aiChatForm = document.getElementById('ai-chat-form');
    const aiChatInput = document.getElementById('ai-chat-input');
    const aiChatMessages = document.getElementById('ai-chat-messages');
    const aiChatRegenerateBtn = document.getElementById('ai-chat-regenerate-btn');

    let lastUserMessage = "";
    let aiRequestRunning = false;

    function parseMarkdown(text) {
        if (!text) return "";
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    if (aiChatInput) {
        aiChatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (aiChatForm) {
                    aiChatForm.dispatchEvent(new Event('submit'));
                }
            }
        });
        // Auto-grow textarea
        aiChatInput.addEventListener('input', () => {
            aiChatInput.style.height = 'auto';
            aiChatInput.style.height = (aiChatInput.scrollHeight) + 'px';
        });
    }

    function streamText(element, text, speed = 15) {
        return new Promise((resolve) => {
            const words = text.split(" ");
            let i = 0;
            element.innerHTML = "";
            const timer = setInterval(() => {
                if (i < words.length) {
                    element.innerHTML += (i === 0 ? "" : " ") + words[i];
                    i++;
                    if (aiChatMessages) {
                        aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
                    }
                } else {
                    clearInterval(timer);
                    resolve();
                }
            }, speed);
        });
    }

    async function displayAIResponse(reply) {
        if (!aiChatMessages) return;
        const aiMsgNode = document.createElement('div');
        aiMsgNode.className = "chat-msg ai-msg";
        aiMsgNode.style.background = "var(--bg-hover)";
        aiMsgNode.style.padding = "0.4rem 0.6rem";
        aiMsgNode.style.borderRadius = "var(--radius-sm)";
        aiMsgNode.style.color = "var(--text-main)";

        const textHolder = document.createElement('div');
        textHolder.style.margin = "0";
        aiMsgNode.appendChild(textHolder);

        const copyBtn = document.createElement('button');
        copyBtn.type = "button";
        copyBtn.className = "btn btn-xs btn-secondary";
        copyBtn.style.marginTop = "0.25rem";
        copyBtn.style.fontSize = "0.68rem";
        copyBtn.style.padding = "1px 4px";
        copyBtn.innerHTML = "&#128203; Copy";
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(reply);
            showToast("Response copied!", "success");
        });

        aiChatMessages.appendChild(aiMsgNode);
        aiChatMessages.scrollTop = aiChatMessages.scrollHeight;

        // Stream text word-by-word dynamically
        await streamText(textHolder, reply, 15);

        // Parse markdown HTML when typing finishes
        textHolder.innerHTML = parseMarkdown(reply);
        aiMsgNode.appendChild(copyBtn);
        aiChatMessages.scrollTop = aiChatMessages.scrollHeight;

        // Show regenerate option
        if (aiChatRegenerateBtn) {
            aiChatRegenerateBtn.classList.remove('hidden');
        }
    }

    async function askAI(message) {
        if (aiRequestRunning) return;
        aiRequestRunning = true;

        try {
            const response = await fetch("/api/ai/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "X-Requested-With": "XMLHttpRequest"
                },
                body: JSON.stringify({ message })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to generate AI response.");
            }

            await displayAIResponse(data.reply);

        } catch (error) {
            showToast(error.message || "Unable to connect to AI service.", "error");
        } finally {
            aiRequestRunning = false;
        }
    }

    async function submitChatMessage(messageVal) {
        if (!messageVal || aiRequestRunning) return;
        aiRequestRunning = true;

        // Append User msg
        const userMsgNode = document.createElement('div');
        userMsgNode.className = "chat-msg user-msg";
        userMsgNode.innerHTML = `<p style="margin:0;">${messageVal}</p>`;
        aiChatMessages.appendChild(userMsgNode);
        if (aiChatInput) {
            aiChatInput.value = "";
            aiChatInput.style.height = 'auto';
        }
        aiChatMessages.scrollTop = aiChatMessages.scrollHeight;

        // Append Typing Indicator
        const typingNode = document.createElement('div');
        typingNode.className = "chat-msg ai-msg";
        typingNode.innerHTML = `<div class="ai-loading-container" style="padding:0;"><div class="ai-loading-dots"><span></span><span></span><span></span></div></div>`;
        aiChatMessages.appendChild(typingNode);
        aiChatMessages.scrollTop = aiChatMessages.scrollHeight;

        try {
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({ message: messageVal })
            });

            typingNode.remove();

            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const res = await response.json();
                if (response.ok && res.success) {
                    await displayAIResponse(res.reply);
                } else {
                    showToast(res.message || "Unable to connect to the AI service.", "error");
                }
            } else {
                const errText = await response.text();
                console.error("Non-JSON error: ", errText);
                showToast("Unable to connect to the AI service.", "error");
            }
        } catch (err) {
            typingNode.remove();
            console.error("Fetch request failed: ", err);
            showToast(err.message || "Unable to connect to the AI service.", "error");
        } finally {
            aiRequestRunning = false;
        }
    }

    window.askAI = askAI;
    window.displayAIResponse = displayAIResponse;

    if (aiChatForm) {
        aiChatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const val = aiChatInput.value.trim();
            if (!val || aiRequestRunning) return;
            lastUserMessage = val;
            submitChatMessage(val);
        });
    }

    if (aiChatRegenerateBtn) {
        aiChatRegenerateBtn.addEventListener('click', () => {
            if (lastUserMessage) {
                showToast("Regenerating last query...", "info");
                submitChatMessage(lastUserMessage);
            } else {
                showToast("No previous query to regenerate.", "warning");
            }
        });
    }

    // 9. AI WEEKLY PLANNER INTERACTIVE DISPLAY
    const generateWeeklyPlanBtn = document.getElementById('generate-weekly-plan-btn');
    const weeklyPlanBodyContainer = document.getElementById('weekly-plan-body-container');
    if (generateWeeklyPlanBtn && weeklyPlanBodyContainer) {
        generateWeeklyPlanBtn.addEventListener('click', async () => {
            weeklyPlanBodyContainer.innerHTML = `<div class="ai-loading-container" style="display:flex; justify-content:center; padding:1.5rem;"><div class="ai-loading-dots"><span></span><span></span><span></span></div></div>`;
            try {
                const res = await fetch('/api/ai/weekly-plan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    if (data.data.length === 0) {
                        weeklyPlanBodyContainer.innerHTML = `<p class="muted-text">No active tasks to plan. Add some tasks first!</p>`;
                        return;
                    }
                    let html = `<div style="display:flex; flex-direction:column; gap:1rem; margin-top:1rem;">`;
                    data.data.forEach(item => {
                        html += `
                            <div style="background: var(--bg-hover); padding: 0.75rem; border-radius: var(--radius-sm); border-left: 4px solid var(--primary);">
                                <h4 style="margin:0 0 0.5rem 0; font-weight:700; color:var(--text-main);">${item.day}</h4>
                        `;
                        if (item.tasks.length === 0) {
                            html += `<p style="margin:0; font-size:0.8rem; color:var(--text-muted);"><em>No tasks scheduled. Balanced load.</em></p>`;
                        } else {
                            html += `<ul style="margin:0; padding-left:1.2rem; display:flex; flex-direction:column; gap:0.35rem;">`;
                            item.tasks.forEach(t => {
                                const prioColor = t.priority === 'high' ? 'var(--danger)' : (t.priority === 'medium' ? 'var(--warning)' : 'var(--success)');
                                html += `
                                    <li style="font-size:0.82rem; color:var(--text-main);">
                                        <strong>${t.title}</strong> 
                                        <span style="display:inline-block; font-size:0.7rem; padding:1px 4px; border-radius:3px; background:${prioColor}20; color:${prioColor}; font-weight:700; text-transform:uppercase; margin-left:0.25rem;">${t.priority}</span>
                                        <div style="font-size:0.72rem; color:var(--text-muted); margin-top:0.1rem;"><em>${t.reason}</em></div>
                                    </li>
                                `;
                            });
                            item.tasks.forEach(t => { }); // redundant spacer
                            html += `</ul>`;
                        }
                        html += `</div>`;
                    });
                    html += `</div>`;
                    weeklyPlanBodyContainer.innerHTML = html;
                } else {
                    showToast("Failed to compile weekly plan.", "error");
                    weeklyPlanBodyContainer.innerHTML = `<p class="muted-text">Unable to run week compiler analysis.</p>`;
                }
            } catch (err) {
                showToast("Network error.", "error");
                weeklyPlanBodyContainer.innerHTML = `<p class="muted-text">Network connection error.</p>`;
            }
        });
    }

    // 10. AI STUDY MODE Dashboard Handler
    const generateStudyModeBtn = document.getElementById('generate-study-mode-btn');
    const studyModeBodyContainer = document.getElementById('study-mode-body-container');
    if (generateStudyModeBtn && studyModeBodyContainer) {
        generateStudyModeBtn.addEventListener('click', () => {
            studyModeBodyContainer.innerHTML = `<div class="ai-loading-container" style="display:flex; justify-content:center; padding:1.5rem;"><div class="ai-loading-dots"><span></span><span></span><span></span></div></div>`;

            // Gather study tasks
            const studyTasks = [];
            document.querySelectorAll('.task-card-item').forEach(card => {
                const catText = card.querySelector('.task-category-pill')?.textContent || '';
                const titleText = card.querySelector('.task-title-text')?.textContent || '';
                const prioText = card.getAttribute('data-priority') || 'medium';
                const id = card.getAttribute('data-id');
                if (catText.toLowerCase().includes('study') || titleText.toLowerCase().includes('study') || titleText.toLowerCase().includes('exam') || titleText.toLowerCase().includes('quiz')) {
                    studyTasks.push({ id, title: titleText, priority: prioText });
                }
            });

            setTimeout(() => {
                if (studyTasks.length === 0) {
                    studyModeBodyContainer.innerHTML = `
                        <div style="padding: 1rem; border-radius: var(--radius-sm); background: var(--bg-hover); border-left: 4px solid var(--warning);">
                            <p style="margin: 0; font-size: 0.85rem; color: var(--text-main);"><strong>No study/academic tasks found!</strong> Add some tasks under the "Study" category to activate Study Mode dashboards.</p>
                        </div>
                    `;
                    return;
                }

                let html = `
                    <div style="display:flex; flex-direction:column; gap:1rem;">
                        <div style="background: var(--primary)15; padding:0.75rem; border-radius:var(--radius-sm); border:1px solid var(--primary)30;">
                           <h4 style="margin:0 0 0.35rem 0; font-weight:700; color:var(--primary); font-size:0.9rem;">📚 AI Study Checklist & Revision Order</h4>
                           <ul style="margin:0; padding-left:1.2rem; display:flex; flex-direction:column; gap:0.25rem; font-size:0.8rem; color:var(--text-main);">
                `;
                studyTasks.forEach((t, idx) => {
                    html += `<li><strong>Step ${idx + 1}:</strong> Revise core concepts for <em>"${t.title}"</em> (Priority: ${t.priority.toUpperCase()})</li>`;
                });
                html += `
                           </ul>
                        </div>
                        
                        <div style="background: var(--bg-hover); padding:0.75rem; border-radius:var(--radius-sm); border:1px solid var(--border);">
                           <h4 style="margin:0 0 0.35rem 0; font-weight:700; color:var(--text-main); font-size:0.85rem;">⚡ Deep Work Focus Cycles suggested</h4>
                           <p style="margin:0 0 0.5rem 0; font-size:0.78rem; color:var(--text-muted);">We suggest structured deep work sessions to maximize academic retention:</p>
                           <ul style="margin:0; padding-left:1.2rem; display:flex; flex-direction:column; gap:0.25rem; font-size:0.78rem; color:var(--text-main);">
                               <li>🍅 <strong>Session 1:</strong> 25 mins Focus on high-priority revision</li>
                               <li>☕ <strong>Break 1:</strong> 5 mins Relax and stretch</li>
                               <li>🍅 <strong>Session 2:</strong> 25 mins Practice mock questions/exercises</li>
                               <li>☕ <strong>Break 2:</strong> 15 mins Extended walk/hydration break</li>
                           </ul>
                        </div>
                        
                        <div style="background: var(--danger)10; padding:0.75rem; border-radius:var(--radius-sm); border:1px solid var(--danger)20;">
                           <h4 style="margin:0 0 0.35rem 0; font-weight:700; color:var(--danger); font-size:0.85rem;">⚠️ Mock Test & Exam Prep Reminder</h4>
                           <p style="margin:0; font-size:0.78rem; color:var(--text-main);">Perform a timed mock exam test for <strong>"${studyTasks[0].title}"</strong> 2 days before the due date to lock in revision cycles.</p>
                        </div>
                    </div>
                `;
                studyModeBodyContainer.innerHTML = html;
                showToast("Study mode dashboard updated!", "success");
            }, 800);
        });
    }

    // --- AI Smart Daily Planner Controller ---
    const generateDailyPlanBtn = document.getElementById('generate-daily-plan-btn');
    const refreshDailyPlanBtn = document.getElementById('refresh-daily-plan-btn');
    const acceptDailyPlanBtn = document.getElementById('accept-daily-plan-btn');
    const dailyPlanBodyContainer = document.getElementById('daily-plan-body-container');

    let currentGeneratedPlan = null; async function fetchAndRenderDailyPlan() {
        dailyPlanBodyContainer.innerHTML = `
            <div class="ai-loading-container" style="display:flex; flex-direction:column; align-items:center; gap:0.5rem; justify-content:center; padding:2rem;">
                <div class="ai-loading-dots"><span></span><span></span><span></span></div>
                <span>🤖 Planning your day...</span>
            </div>
        `;

        if (refreshDailyPlanBtn) refreshDailyPlanBtn.classList.add('hidden');
        if (acceptDailyPlanBtn) acceptDailyPlanBtn.classList.add('hidden');

        try {
            const res = await fetch('/api/ai/daily-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (res.ok && data.success) {
                const plan = data.plan;
                if (!plan || plan.length === 0) {
                    dailyPlanBodyContainer.innerHTML = `<p class="muted-text">No active tasks available to generate a daily plan. Add some tasks first!</p>`;
                    return;
                }

                currentGeneratedPlan = plan;

                let html = `<div class="planner-timeline">`;
                plan.forEach(item => {
                    html += `
                        <div class="planner-timeline-item" data-task-id="${item.task_id}">
                            <div class="planner-time">${item.time}</div>
                            <div class="planner-card glass-card">
                                <div class="planner-task-header">
                                    <h4>${item.task}</h4>
                                </div>
                                <p class="planner-reason">${item.reason}</p>
                            </div>
                        </div>
                    `;
                });
                html += `</div>`;
                dailyPlanBodyContainer.innerHTML = html;

                if (refreshDailyPlanBtn) refreshDailyPlanBtn.classList.remove('hidden');
                if (acceptDailyPlanBtn) acceptDailyPlanBtn.classList.remove('hidden');

                showToast("Daily plan generated successfully!", "success");

                const planView = document.getElementById('tab-daily-plan-view');
                if (planView) {
                    planView.scrollIntoView({ behavior: 'smooth' });
                }
            } else {
                showToast(data.message || "Failed to generate daily plan.", "error");
                dailyPlanBodyContainer.innerHTML = `<p class="muted-text">Unable to generate daily schedule.</p>`;
            }
        } catch (err) {
            console.error("Daily plan error:", err);
            showToast("Network connection error.", "error");
            dailyPlanBodyContainer.innerHTML = `<p class="muted-text">Connection error.</p>`;
        }
    };

    if (generateDailyPlanBtn) {
        generateDailyPlanBtn.addEventListener('click', fetchAndRenderDailyPlan);
    }

    if (refreshDailyPlanBtn) {
        refreshDailyPlanBtn.addEventListener('click', fetchAndRenderDailyPlan);
    }

    if (acceptDailyPlanBtn) {
        acceptDailyPlanBtn.addEventListener('click', async () => {
            if (!currentGeneratedPlan || currentGeneratedPlan.length === 0) {
                showToast("No active plan to accept.", "warning");
                return;
            }

            acceptDailyPlanBtn.disabled = true;
            acceptDailyPlanBtn.textContent = "Saving...";

            const planItems = currentGeneratedPlan.map(item => {
                const parts = item.time.split('-');
                const startTime = parts[0] || "09:00";
                const endTime = parts[1] || "10:00";
                return {
                    task_id: item.task_id,
                    start_time: startTime,
                    end_time: endTime
                };
            });

            try {
                const res = await fetch('/api/daily-plan/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ plan_items: planItems })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    showToast("Daily plan accepted and saved successfully!", "success");
                    acceptDailyPlanBtn.classList.add('hidden');
                } else {
                    showToast(data.message || "Failed to save daily plan.", "error");
                }
            } catch (err) {
                console.error("Save plan error:", err);
                showToast("Failed to save plan due to network error.", "error");
            } finally {
                acceptDailyPlanBtn.disabled = false;
                acceptDailyPlanBtn.innerHTML = "✅ Accept Plan";
            }
        });
    }

    // =========================================================================
    // NEXT-GEN AI & VOICE CAPABILITIES CONTROLLERS
    // =========================================================================

    // ----------------------------------------------------
    // A. Voice-to-Task Dictation (Web Speech API + Gemini AI)
    // ----------------------------------------------------
    const voiceDictationModal = document.getElementById('voice-dictation-modal');
    const closeVoiceModalBtn = document.getElementById('close-voice-modal-btn');
    const voiceCancelBtn = document.getElementById('voice-cancel-btn');
    const voiceStopBtn = document.getElementById('voice-stop-btn');
    const voiceLiveTranscript = document.getElementById('voice-live-transcript');
    const voiceMicStatusIcon = document.getElementById('voice-mic-status-icon');
    const aiVoiceDictateBtn = document.getElementById('ai-voice-dictate-btn');
    
    let speechRecognitionInstance = null;
    let accumulatedTranscript = '';
    let isSpeechRecording = false;

    function initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            return null;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            isSpeechRecording = true;
            if (voiceMicStatusIcon) voiceMicStatusIcon.textContent = '🎙️';
            if (voiceLiveTranscript) voiceLiveTranscript.textContent = 'Listening... Speak your task now.';
        };

        recognition.onresult = (event) => {
            let interim = '';
            let final = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    final += event.results[i][0].transcript;
                } else {
                    interim += event.results[i][0].transcript;
                }
            }

            accumulatedTranscript = (final || interim).trim();
            if (voiceLiveTranscript) {
                voiceLiveTranscript.innerHTML = `"${accumulatedTranscript || 'Listening...'}"`;
                voiceLiveTranscript.style.color = 'var(--primary)';
            }
        };

        recognition.onerror = (event) => {
            console.warn('Speech recognition error:', event.error);
            if (event.error === 'not-allowed') {
                showToast('Microphone access was denied. Please allow mic permissions in browser settings.', 'error');
            } else if (event.error !== 'no-speech') {
                showToast(`Voice input warning: ${event.error}`, 'warning');
            }
        };

        recognition.onend = () => {
            isSpeechRecording = false;
            if (voiceMicStatusIcon) voiceMicStatusIcon.textContent = '🎤';
        };

        return recognition;
    }

    function openVoiceDictation() {
        accumulatedTranscript = '';
        if (!voiceDictationModal) return;

        voiceDictationModal.classList.remove('hidden');
        if (voiceLiveTranscript) {
            voiceLiveTranscript.textContent = 'Initializing microphone...';
            voiceLiveTranscript.style.color = 'var(--text-muted)';
        }

        try {
            if (!speechRecognitionInstance) {
                speechRecognitionInstance = initSpeechRecognition();
            }

            if (speechRecognitionInstance) {
                speechRecognitionInstance.start();
            } else {
                if (voiceLiveTranscript) {
                    voiceLiveTranscript.innerHTML = '<em>Speech recognition is not supported in this browser. You can type in the prompt box directly.</em>';
                }
            }
        } catch (e) {
            console.warn('Recognition start exception:', e);
        }
    }

    function closeVoiceDictation() {
        if (speechRecognitionInstance && isSpeechRecording) {
            try { speechRecognitionInstance.stop(); } catch (e) {}
        }
        isSpeechRecording = false;
        if (voiceDictationModal) voiceDictationModal.classList.add('hidden');
    }

    async function processSpokenTask(transcriptText) {
        const text = (transcriptText || accumulatedTranscript || '').trim();
        if (!text || text === 'Waiting for speech input...' || text === 'Listening... Speak your task now.') {
            showToast('No speech detected. Please speak or type your task.', 'warning');
            return;
        }

        closeVoiceDictation();
        showToast('🤖 AI is parsing voice task...', 'info');

        try {
            const res = await fetch('/api/ai/voice-task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: text })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                const parsed = data.data;

                // Populate Natural Prompt & Modal fields
                if (aiNaturalPrompt) aiNaturalPrompt.value = parsed.title || text;

                const titleInput = document.getElementById('task-title');
                const descInput = document.getElementById('task-desc');
                const estInput = document.getElementById('task-est-time');
                const dateInput = document.getElementById('task-due-date');
                const prioSelect = document.getElementById('task-priority');
                const catSelect = document.getElementById('task-category');

                if (titleInput && parsed.title) titleInput.value = parsed.title;
                if (descInput && parsed.description) descInput.value = parsed.description;
                if (dateInput && parsed.due_date) dateInput.value = parsed.due_date;
                if (prioSelect && parsed.priority) prioSelect.value = parsed.priority;
                if (catSelect && parsed.category) catSelect.value = parsed.category;
                if (estInput && parsed.estimated_time) estInput.value = parsed.estimated_time;

                const addTaskModal = document.getElementById('add-task-modal');
                if (addTaskModal) {
                    addTaskModal.classList.remove('hidden');
                    if (titleInput) titleInput.focus();
                }

                showToast(`🎙️ Task parsed: "${parsed.title}" (${parsed.priority.toUpperCase()})`, 'success');
            } else {
                showToast(data.message || 'Failed to parse voice task.', 'error');
            }
        } catch (err) {
            console.error('Voice parse error:', err);
            showToast('Failed to connect to voice parsing service.', 'error');
        }
    }

    if (voiceInputBtn) voiceInputBtn.addEventListener('click', openVoiceDictation);
    if (aiVoiceDictateBtn) aiVoiceDictateBtn.addEventListener('click', openVoiceDictation);
    if (closeVoiceModalBtn) closeVoiceModalBtn.addEventListener('click', closeVoiceDictation);
    if (voiceCancelBtn) voiceCancelBtn.addEventListener('click', closeVoiceDictation);
    if (voiceStopBtn) {
        voiceStopBtn.addEventListener('click', () => {
            if (speechRecognitionInstance && isSpeechRecording) {
                try { speechRecognitionInstance.stop(); } catch (e) {}
            }
            processSpokenTask(accumulatedTranscript);
        });
    }

    // ----------------------------------------------------
    // Natural Language Task Parser Button
    // ----------------------------------------------------
    const aiParseTaskBtn = document.getElementById('ai-parse-task-btn');
    const aiNaturalPrompt = document.getElementById('ai-natural-prompt');
    if (aiParseTaskBtn && aiNaturalPrompt) {
        aiParseTaskBtn.addEventListener('click', async () => {
            const promptText = aiNaturalPrompt.value.trim();
            if (!promptText) {
                showToast("Please enter a task description prompt.", "warning");
                return;
            }

            aiParseTaskBtn.disabled = true;
            aiParseTaskBtn.innerHTML = "<span>✨ Parsing...</span>";

            try {
                const res = await fetch('/api/ai/create-task', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: promptText })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    const parsed = data.data;

                    const titleInput = document.getElementById('task-title');
                    const descInput = document.getElementById('task-desc');
                    const estInput = document.getElementById('task-est-time');
                    const dateInput = document.getElementById('task-due-date');
                    const prioSelect = document.getElementById('task-priority');
                    const catSelect = document.getElementById('task-category');

                    if (titleInput && parsed.title) titleInput.value = parsed.title;
                    if (descInput && parsed.description) descInput.value = parsed.description;
                    if (dateInput && parsed.due_date) dateInput.value = parsed.due_date;
                    if (prioSelect && parsed.priority) prioSelect.value = parsed.priority;
                    if (catSelect && parsed.category) catSelect.value = parsed.category;
                    if (estInput && parsed.estimated_time) estInput.value = parsed.estimated_time;

                    const addTaskModal = document.getElementById('add-task-modal');
                    if (addTaskModal) {
                        addTaskModal.classList.remove('hidden');
                        if (titleInput) titleInput.focus();
                    }

                    showToast("Task parameters extracted and form populated!", "success");
                    aiNaturalPrompt.value = "";
                } else {
                    showToast("Failed to parse prompt.", "error");
                }
            } catch (err) {
                showToast("Network parsing failed.", "error");
            } finally {
                aiParseTaskBtn.disabled = false;
                aiParseTaskBtn.innerHTML = "<span>✨ Parse & Populate</span>";
            }
        });
    }

    // ----------------------------------------------------
    // B. AI Daily Morning Briefing & Standup Generator
    // ----------------------------------------------------
    const aiBriefingModal = document.getElementById('ai-briefing-modal');
    const closeBriefingModalBtn = document.getElementById('close-briefing-modal-btn');
    const btnOpenBriefing = document.getElementById('btn-open-briefing');
    const btnOpenStandup = document.getElementById('btn-open-standup');
    const btnRefreshBriefing = document.getElementById('btn-refresh-briefing');
    const btnCopyStandup = document.getElementById('btn-copy-standup');
    const briefingModalContent = document.getElementById('briefing-modal-content');
    const briefingModalTitle = document.getElementById('briefing-modal-title');
    const briefingHeaderEmoji = document.getElementById('briefing-header-emoji');
    const briefingTabBtns = document.querySelectorAll('.briefing-tab-btn');

    let currentBriefingMode = 'morning';
    let lastBriefingData = null;

    async function loadAIBriefing(mode = 'morning') {
        currentBriefingMode = mode;
        if (!briefingModalContent) return;

        if (briefingHeaderEmoji) briefingHeaderEmoji.textContent = mode === 'morning' ? '🌅' : '🌙';
        if (briefingModalTitle) briefingModalTitle.textContent = mode === 'morning' ? 'AI Daily Morning Briefing' : 'AI Evening Standup & Recap';

        briefingTabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        briefingModalContent.innerHTML = `
            <div class="ai-loading-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem 1rem;">
                <div class="ai-loading-dots"><span></span><span></span><span></span></div>
                <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 1rem;">
                    Generating your personalized ${mode === 'morning' ? 'morning priorities' : 'evening standup'}...
                </p>
            </div>
        `;

        try {
            const res = await fetch(`/api/ai/briefing?mode=${mode}`);
            const result = await res.json();

            if (res.ok && result.success && result.data) {
                lastBriefingData = result.data;
                renderBriefingContent(result.data, mode);
            } else {
                briefingModalContent.innerHTML = `<p class="text-danger" style="text-align: center; padding: 2rem;">Failed to generate briefing: ${result.message || 'Unknown error'}</p>`;
            }
        } catch (err) {
            console.error('Briefing fetch error:', err);
            briefingModalContent.innerHTML = `<p class="text-danger" style="text-align: center; padding: 2rem;">Unable to reach AI briefing service.</p>`;
        }
    }

    function renderBriefingContent(data, mode) {
        let prioritiesHtml = '';
        if (data.top_priorities && data.top_priorities.length > 0) {
            prioritiesHtml = data.top_priorities.map((p, idx) => `
                <div class="briefing-priority-card">
                    <div style="flex: 1;">
                        <div style="font-weight: 700; font-size: 0.88rem; color: var(--text); display: flex; align-items: center; gap: 6px;">
                            <span>#${idx + 1}</span>
                            <span>${p.title}</span>
                            <span class="badge badge-primary" style="font-size: 0.65rem;">~${p.suggested_time}m</span>
                        </div>
                        <p style="margin: 0.2rem 0 0 0; font-size: 0.78rem; color: var(--text-muted);">${p.reason}</p>
                    </div>
                    <button type="button" class="btn btn-xs btn-primary btn-start-briefing-task" data-title="${encodeURIComponent(p.title)}" style="margin-left: 0.75rem;">
                        ⚡ Focus
                    </button>
                </div>
            `).join('');
        }

        let bulletsHtml = '';
        if (data.standup_bullets && data.standup_bullets.length > 0) {
            bulletsHtml = data.standup_bullets.map(b => `
                <li class="standup-bullet-item">
                    <span style="color: var(--primary); font-weight: bold;">•</span>
                    <span>${b}</span>
                </li>
            `).join('');
        }

        briefingModalContent.innerHTML = `
            <div style="margin-bottom: 1rem;">
                <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text); margin: 0 0 0.4rem 0;">
                    ${data.greeting}
                </h3>
                <div class="briefing-quote-card">
                    "${data.quote}"
                </div>
            </div>

            <div style="background: var(--surface-sub); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0.75rem 1rem; margin-bottom: 1rem; font-size: 0.82rem; color: var(--text);">
                <div style="font-weight: 700; margin-bottom: 0.2rem;">⏱️ Workload Commitment</div>
                <div>${data.workload_summary}</div>
                ${data.habit_callout ? `<div style="margin-top: 0.35rem; color: var(--primary);">🔥 ${data.habit_callout}</div>` : ''}
            </div>

            <div style="margin-bottom: 1rem;">
                <h4 style="font-size: 0.92rem; font-weight: 700; color: var(--text); margin: 0 0 0.5rem 0;">
                    🎯 Top Focus Priorities
                </h4>
                <div>${prioritiesHtml || '<p class="muted-text">No pending priorities.</p>'}</div>
            </div>

            <div>
                <h4 style="font-size: 0.92rem; font-weight: 700; color: var(--text); margin: 0 0 0.5rem 0;">
                    📋 Daily Standup Summary
                </h4>
                <ul class="standup-bullet-list">${bulletsHtml}</ul>
            </div>
        `;

        briefingModalContent.querySelectorAll('.btn-start-briefing-task').forEach(btn => {
            btn.addEventListener('click', () => {
                if (aiBriefingModal) aiBriefingModal.classList.add('hidden');
                showPage('focusStudio');
                showToast('Switched to Focus Studio! Select your target task to start deep work.', 'info');
            });
        });
    }

    function openBriefingModal(mode = 'morning') {
        if (aiBriefingModal) {
            aiBriefingModal.classList.remove('hidden');
            loadAIBriefing(mode);
        }
    }

    function closeBriefingModal() {
        if (aiBriefingModal) aiBriefingModal.classList.add('hidden');
    }

    if (btnOpenBriefing) btnOpenBriefing.addEventListener('click', () => openBriefingModal('morning'));
    if (btnOpenStandup) btnOpenStandup.addEventListener('click', () => openBriefingModal('evening'));
    if (closeBriefingModalBtn) closeBriefingModalBtn.addEventListener('click', closeBriefingModal);
    if (btnRefreshBriefing) btnRefreshBriefing.addEventListener('click', () => loadAIBriefing(currentBriefingMode));
    
    briefingTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode || 'morning';
            loadAIBriefing(mode);
        });
    });

    if (btnCopyStandup) {
        btnCopyStandup.addEventListener('click', () => {
            if (!lastBriefingData) {
                showToast('No briefing data to copy.', 'warning');
                return;
            }
            const standupText = `**${lastBriefingData.greeting}**\n\n*Quote:* ${lastBriefingData.quote}\n\n*Workload:* ${lastBriefingData.workload_summary}\n\n*Standup Bullets:*\n${(lastBriefingData.standup_bullets || []).map(b => '- ' + b).join('\n')}`;
            navigator.clipboard.writeText(standupText).then(() => {
                showToast('📋 Standup summary copied to clipboard!', 'success');
            }).catch(() => {
                showToast('Failed to copy to clipboard.', 'error');
            });
        });
    }

    // ----------------------------------------------------
    // C. Smart Task Estimation & Burnout Detector
    // ----------------------------------------------------
    const workloadAuditModal = document.getElementById('workload-audit-modal');
    const closeAuditModalBtn = document.getElementById('close-audit-modal-btn');
    const btnOpenWorkloadAudit = document.getElementById('btn-open-workload-audit');
    const auditModalContent = document.getElementById('audit-modal-content');

    const dashBurnoutHours = document.getElementById('dash-burnout-hours');
    const dashBurnoutRatio = document.getElementById('dash-burnout-ratio');
    const dashBurnoutBar = document.getElementById('dash-burnout-bar');
    const dashBurnoutBadge = document.getElementById('dash-burnout-badge');
    const dashBurnoutIcon = document.getElementById('dash-burnout-icon');
    const dashBurnoutSubtitle = document.getElementById('dash-burnout-subtitle');

    async function loadWorkloadBurnoutRadar() {
        try {
            const res = await fetch('/api/ai/workload-audit');
            const result = await res.json();

            if (res.ok && result.success && result.data) {
                const data = result.data;
                const hours = data.total_scheduled_hours || 0;
                const cap = data.capacity_hours || 8;
                const pct = Math.min(100, Math.round((hours / cap) * 100));

                if (dashBurnoutHours) dashBurnoutHours.textContent = `${hours}h`;
                if (dashBurnoutRatio) dashBurnoutRatio.textContent = `${pct}% Capacity`;
                if (dashBurnoutBar) {
                    dashBurnoutBar.style.width = `${pct}%`;
                    if (data.risk_level === 'critical') dashBurnoutBar.style.background = 'var(--danger)';
                    else if (data.risk_level === 'high') dashBurnoutBar.style.background = '#f97316';
                    else if (data.risk_level === 'moderate') dashBurnoutBar.style.background = 'var(--warning)';
                    else dashBurnoutBar.style.background = 'var(--success)';
                }

                if (dashBurnoutBadge) {
                    const badgeClass = data.risk_level === 'critical' ? 'prio-high' : (data.risk_level === 'high' ? 'prio-high' : (data.risk_level === 'moderate' ? 'prio-medium' : 'prio-low'));
                    dashBurnoutBadge.className = `badge ${badgeClass}`;
                    dashBurnoutBadge.textContent = `${data.risk_level.toUpperCase()} (${data.risk_score}%)`;
                }

                if (dashBurnoutIcon) {
                    dashBurnoutIcon.textContent = data.risk_level === 'critical' ? '🚨' : (data.risk_level === 'high' ? '⚠️' : (data.risk_level === 'moderate' ? '⚖️' : '🟢'));
                }

                if (dashBurnoutSubtitle) {
                    dashBurnoutSubtitle.textContent = data.status_headline || 'Cognitive capacity & schedule health';
                }
            }
        } catch (err) {
            console.error('Workload radar error:', err);
        }
    }

    async function openWorkloadAuditModal() {
        if (!workloadAuditModal) return;

        workloadAuditModal.classList.remove('hidden');
        if (auditModalContent) {
            auditModalContent.innerHTML = `
                <div class="ai-loading-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem 1rem;">
                    <div class="ai-loading-dots"><span></span><span></span><span></span></div>
                    <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 1rem;">Analyzing scheduled tasks, durations & cognitive load...</p>
                </div>
            `;
        }

        try {
            const res = await fetch('/api/ai/workload-audit');
            const result = await res.json();

            if (res.ok && result.success && result.data) {
                renderWorkloadAuditModal(result.data);
            } else {
                auditModalContent.innerHTML = `<p class="text-danger" style="text-align: center; padding: 2rem;">Failed to load workload audit: ${result.message}</p>`;
            }
        } catch (err) {
            auditModalContent.innerHTML = `<p class="text-danger" style="text-align: center; padding: 2rem;">Unable to reach workload audit service.</p>`;
        }
    }

    function renderWorkloadAuditModal(data) {
        const riskClass = `burnout-risk-${data.risk_level}`;
        const riskColor = data.risk_level === 'critical' ? 'var(--danger)' : (data.risk_level === 'high' ? '#f97316' : (data.risk_level === 'moderate' ? 'var(--warning)' : 'var(--success)'));

        let recsHtml = '';
        if (data.recommendations && data.recommendations.length > 0) {
            recsHtml = data.recommendations.map(r => `
                <li style="display: flex; align-items: flex-start; gap: 0.5rem; font-size: 0.82rem; color: var(--text); padding: 0.35rem 0;">
                    <span style="color: ${riskColor}; font-weight: bold;">✔</span>
                    <span>${r}</span>
                </li>
            `).join('');
        }

        let tasksHtml = '';
        if (data.tasks_to_reschedule && data.tasks_to_reschedule.length > 0) {
            tasksHtml = `
                <div style="margin-top: 1rem; border-top: 1px solid var(--border); padding-top: 0.75rem;">
                    <div style="font-weight: 700; font-size: 0.85rem; color: var(--text); margin-bottom: 0.5rem;">
                        🔄 Suggested Tasks to Defer (Reduce Overload):
                    </div>
                    ${data.tasks_to_reschedule.map(id => {
                        const task = allTasks.find(t => String(t.id) === String(id));
                        if (!task) return '';
                        return `
                            <div class="rebalance-task-item">
                                <div>
                                    <strong>${task.title}</strong>
                                    <span style="font-size: 0.72rem; color: var(--text-muted); margin-left: 0.5rem;">(${task.priority} prio, ~${task.estTime}m)</span>
                                </div>
                                <button type="button" class="btn btn-xs btn-secondary btn-defer-tomorrow" data-id="${task.id}">
                                    +1 Day Defer
                                </button>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        auditModalContent.innerHTML = `
            <div class="burnout-risk-banner ${riskClass}">
                <div>
                    <h3 style="margin: 0; font-size: 1.1rem; color: ${riskColor}; font-weight: 800;">
                        ${data.status_headline}
                    </h3>
                    <p style="margin: 0.25rem 0 0 0; font-size: 0.8rem; color: var(--text);">
                        Risk Score: <strong>${data.risk_score}%</strong> • Scheduled: <strong>${data.total_scheduled_hours}h</strong> of ${data.capacity_hours}h limit
                    </p>
                </div>
                <div style="font-size: 2rem;">
                    ${data.risk_level === 'critical' ? '🚨' : (data.risk_level === 'high' ? '⚠️' : (data.risk_level === 'moderate' ? '⚖️' : '🟢'))}
                </div>
            </div>

            <div style="background: var(--surface-sub); padding: 0.85rem 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border); margin-bottom: 1rem; font-size: 0.84rem; line-height: 1.5; color: var(--text);">
                ${data.analysis_text}
            </div>

            <div>
                <h4 style="font-size: 0.88rem; font-weight: 700; margin: 0 0 0.4rem 0; color: var(--text);">
                    💡 AI Rebalancing Recommendations
                </h4>
                <ul style="list-style: none; padding: 0; margin: 0;">${recsHtml}</ul>
            </div>

            ${tasksHtml}

            <div style="display: flex; justify-content: flex-end; margin-top: 1.25rem;">
                <button type="button" id="close-audit-done-btn" class="btn btn-primary btn-sm">
                    Done
                </button>
            </div>
        `;

        const doneBtn = document.getElementById('close-audit-done-btn');
        if (doneBtn) doneBtn.addEventListener('click', () => workloadAuditModal.classList.add('hidden'));

        auditModalContent.querySelectorAll('.btn-defer-tomorrow').forEach(btn => {
            btn.addEventListener('click', async () => {
                const taskId = btn.dataset.id;
                btn.disabled = true;
                btn.textContent = 'Deferring...';

                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const nextDate = tomorrow.toISOString().split('T')[0];

                try {
                    const res = await fetch('/api/task/reschedule', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ task_id: taskId, due_date: nextDate })
                    });
                    const resData = await res.json();
                    if (res.ok && resData.success) {
                        showToast('Task deferred to tomorrow! Workload updated.', 'success');
                        syncUpdatedTaskCard(resData.task);
                        openWorkloadAuditModal();
                        loadWorkloadBurnoutRadar();
                    } else {
                        showToast(resData.message || 'Failed to reschedule.', 'error');
                        btn.disabled = false;
                        btn.textContent = '+1 Day Defer';
                    }
                } catch (e) {
                    showToast('Failed to defer task.', 'error');
                    btn.disabled = false;
                    btn.textContent = '+1 Day Defer';
                }
            });
        });
    }

    if (btnOpenWorkloadAudit) btnOpenWorkloadAudit.addEventListener('click', openWorkloadAuditModal);
    if (closeAuditModalBtn) closeAuditModalBtn.addEventListener('click', () => {
        if (workloadAuditModal) workloadAuditModal.classList.add('hidden');
    });

    window.loadWorkloadBurnoutRadar = loadWorkloadBurnoutRadar;


    // ----------------------------------------------------
    // 19. Smart Notifications & Reminder Center
    // ----------------------------------------------------
    let currentNotifFilter = 'all';
    const notifBellBtn = document.getElementById('notification-bell-btn');
    const notifBadge = document.getElementById('notification-badge');
    const notifDrawer = document.getElementById('notification-drawer');
    const notifBackdrop = document.getElementById('notification-backdrop');
    const notifCloseBtn = document.getElementById('close-notification-drawer-btn');
    const notifList = document.getElementById('notifications-list');
    const notifUnreadBadge = document.getElementById('drawer-unread-count-badge');
    const markAllReadBtn = document.getElementById('mark-all-read-btn');
    const refreshNotifsBtn = document.getElementById('refresh-notifications-btn');
    const browserPermBanner = document.getElementById('browser-perm-banner');
    const enableBrowserNotifBtn = document.getElementById('enable-browser-notifications-btn');
    const shownBrowserNotifs = new Set(); function updateBrowserNotificationUI() {
        if (!('Notification' in window)) {
            if (browserPermBanner) browserPermBanner.style.display = 'none';
            return;
        }
        if (Notification.permission === 'granted' || Notification.permission === 'denied') {
            if (browserPermBanner) browserPermBanner.style.display = 'none';
        } else {
            if (browserPermBanner) browserPermBanner.style.display = 'flex';
        }
    };

    if (enableBrowserNotifBtn) {
        enableBrowserNotifBtn.addEventListener('click', async () => {
            if (!('Notification' in window)) {
                showToast("Browser notifications are not supported on this browser.", "warning");
                return;
            }
            try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    showToast("Browser desktop notifications enabled! 🔔", "success");
                    sendDesktopNotification("Smart To-Do Reminders Active", "You will receive desktop alerts when tasks are due or overdue.");
                } else {
                    showToast("Browser notifications permission denied.", "info");
                }
                updateBrowserNotificationUI();
            } catch (err) {
                console.error("Error requesting notification permission: ", err);
            }
        });
    } function sendDesktopNotification(title, message) {
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification(title, {
                    body: message,
                    icon: "/static/favicon.ico"
                });
            } catch (e) {
                console.error("Failed to trigger desktop notification:", e);
            }
        }
    }
    async function updateNotificationBadge(count) {
        if (notifBadge) {
            if (count > 0) {
                notifBadge.textContent = count > 99 ? '99+' : count;
                notifBadge.classList.remove('hidden');
            } else {
                notifBadge.textContent = '0';
                notifBadge.classList.add('hidden');
            }
        }
        if (notifUnreadBadge) {
            notifUnreadBadge.textContent = `${count} unread`;
        }
    }; async function loadNotifications(filter = currentNotifFilter) {
        if (!notifList) return;

        try {
            const response = await fetch(`/api/notifications?type=${filter}&include_read=true`);
            const res = await response.json();
            if (response.ok && res.success) {
                const notifs = res.notifications;
                updateNotificationBadge(res.unread_count);

                if (notifs.length === 0) {
                    notifList.innerHTML = `
                        <div style="text-align: center; padding: 2.5rem 1rem;">
                            <span style="font-size: 2.5rem; display: block; margin-bottom: 0.5rem;">🎉</span>
                            <p style="font-weight: 700; color: var(--text-main); margin: 0;">All caught up!</p>
                            <p class="muted-text" style="font-size: 0.8rem; margin-top: 0.25rem;">No reminders in this category.</p>
                        </div>
                    `;
                    return;
                }

                notifList.innerHTML = notifs.map(n => {
                    const unreadClass = n.is_read === 0 ? 'unread' : '';
                    const typeClass = `type-${n.type}`;
                    const timeAgo = formatTimeAgo(n.created_at);

                    return `
                        <div class="notification-card ${unreadClass} ${typeClass}" data-id="${n.id}">
                            <div class="notification-card-header">
                                <h4 class="notification-card-title">${n.title}</h4>
                                <span class="notification-card-time">${timeAgo}</span>
                            </div>
                            <p class="notification-card-msg">${n.message}</p>
                            <div class="notification-card-footer">
                                <div>
                                    ${n.is_read === 0 ? `<button type="button" class="btn-link-action btn-mark-read" data-id="${n.id}">Mark read</button>` : `<span class="muted-text" style="font-size: 0.72rem;">✓ Read</span>`}
                                </div>
                                <div style="display: flex; align-items: center; gap: 0.35rem;">
                                    <span class="muted-text" style="font-size: 0.7rem;">Snooze:</span>
                                    <select class="snooze-select" data-id="${n.id}">
                                        <option value="" disabled selected>Select</option>
                                        <option value="10m">10 min</option>
                                        <option value="30m">30 min</option>
                                        <option value="1h">1 hour</option>
                                        <option value="tomorrow">Tomorrow 9AM</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');

                notifList.querySelectorAll('.btn-mark-read').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const id = btn.dataset.id;
                        await markNotificationAsRead(id);
                    });
                });

                notifList.querySelectorAll('.snooze-select').forEach(select => {
                    select.addEventListener('change', async (e) => {
                        const id = select.dataset.id;
                        const duration = select.value;
                        if (duration) {
                            await snoozeNotification(id, duration);
                        }
                    });
                });

            } else {
                notifList.innerHTML = `<p class="muted-text" style="text-align: center; padding: 2rem;">Failed to load notifications.</p>`;
            }
        } catch (err) {
            console.error("Error loading notifications: ", err);
        }
    }
    async function formatTimeAgo(dateStr) {
        try {
            const date = new Date(dateStr.replace(' ', 'T'));
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) return `${diffHours}h ago`;
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch (e) {
            return dateStr;
        }
    }; async function markNotificationAsRead(id) {
        try {
            const response = await fetch('/api/notifications/read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            const res = await response.json();
            if (response.ok && res.success) {
                loadNotifications(currentNotifFilter);
            }
        } catch (err) {
            console.error("Error marking notification read: ", err);
        }
    }; async function snoozeNotification(id, duration) {
        try {
            const response = await fetch('/api/notifications/snooze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, duration })
            });
            const res = await response.json();
            if (response.ok && res.success) {
                showToast(`Reminder snoozed! ⏰`, "info");
                loadNotifications(currentNotifFilter);
            }
        } catch (err) {
            console.error("Error snoozing notification: ", err);
        }
    }; async function checkNotifications() {
        try {
            const response = await fetch('/api/notifications/check');
            const res = await response.json();
            if (response.ok && res.success) {
                updateNotificationBadge(res.unread_count);

                if (res.notifications) {
                    res.notifications.forEach(n => {
                        if (n.is_read === 0 && !shownBrowserNotifs.has(n.id) && (n.type === 'due_today' || n.type === 'overdue')) {
                            shownBrowserNotifs.add(n.id);
                            sendDesktopNotification(n.title, n.message);
                        }
                    });
                }
            }
        } catch (err) {
            console.error("Error checking notifications: ", err);
        }
    }
    async function openNotificationDrawer() {
        if (notifDrawer && notifBackdrop) {
            notifDrawer.classList.remove('hidden');
            notifBackdrop.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            updateBrowserNotificationUI();
            loadNotifications(currentNotifFilter);
        }
    }
    async function closeNotificationDrawer() {
        if (notifDrawer && notifBackdrop) {
            notifDrawer.classList.add('hidden');
            notifBackdrop.classList.add('hidden');
            document.body.style.overflow = '';
        }
    };

    if (notifBellBtn) {
        notifBellBtn.addEventListener('click', () => {
            if (notifDrawer.classList.contains('hidden')) {
                openNotificationDrawer();
            } else {
                closeNotificationDrawer();
            }
        });
    }

    if (notifCloseBtn) notifCloseBtn.addEventListener('click', closeNotificationDrawer);
    if (notifBackdrop) notifBackdrop.addEventListener('click', closeNotificationDrawer);

    document.querySelectorAll('.notif-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.notif-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentNotifFilter = btn.dataset.filter;
            loadNotifications(currentNotifFilter);
        });
    });

    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', async () => {
            await markNotificationAsRead('all');
            showToast("All notifications marked as read.", "success");
        });
    }

    if (refreshNotifsBtn) {
        refreshNotifsBtn.addEventListener('click', async () => {
            await checkNotifications();
            await loadNotifications(currentNotifFilter);
            showToast("Notifications refreshed.", "info");
        });
    }

    // ----------------------------------------------------
    // 20. Gamification & Achievements System
    // ----------------------------------------------------
    const xpFloatingContainer = document.getElementById('xp-floating-container');
    const levelUpModal = document.getElementById('level-up-modal');
    const closeLevelUpBtn = document.getElementById('close-level-up-btn');
    const headerGamificationPill = document.getElementById('header-gamification-pill');
    let confettiAnimationId = null; function showXPEarned(amount, label = 'XP Earned') {
        if (!amount || amount <= 0 || !xpFloatingContainer) return;

        const floatItem = document.createElement('div');
        floatItem.className = 'xp-float-item';
        floatItem.innerHTML = `<span>✨</span><span>+${amount} XP</span>`;

        const randomX = Math.floor(Math.random() * 80) - 40;
        floatItem.style.top = '12%';
        floatItem.style.left = `calc(50% + ${randomX}px)`;

        xpFloatingContainer.appendChild(floatItem);

        setTimeout(() => {
            if (floatItem && floatItem.parentNode) {
                floatItem.parentNode.removeChild(floatItem);
            }
        }, 1800);
    }
    async function runConfetti(canvas) {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;

        const pieces = [];
        const colors = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#ef4444'];

        for (let i = 0; i < 60; i++) {
            pieces.push({
                x: canvas.width / 2,
                y: canvas.height / 2,
                w: Math.random() * 8 + 4,
                h: Math.random() * 6 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.7) * 12,
                gravity: 0.25,
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 8
            });
        }

        let frames = 0; function animate() {
            frames++;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            pieces.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += p.gravity;
                p.rotation += p.rotSpeed;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();
            });

            if (frames < 120) {
                confettiAnimationId = requestAnimationFrame(animate);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        };

        if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);
        animate();
    }
    async function showLevelUpModal(level, title, icon = '👑') {
        if (!levelUpModal) return;

        const modalIcon = document.getElementById('modal-level-icon');
        const modalTier = document.getElementById('modal-level-tier');

        if (modalIcon) modalIcon.textContent = icon;
        if (modalTier) modalTier.textContent = `Level ${level} — ${title}`;

        levelUpModal.classList.remove('hidden');

        const canvas = document.getElementById('confetti-canvas');
        if (canvas) runConfetti(canvas);
    };

    if (closeLevelUpBtn && levelUpModal) {
        closeLevelUpBtn.addEventListener('click', () => {
            levelUpModal.classList.add('hidden');
        });
        levelUpModal.addEventListener('click', (e) => {
            if (e.target === levelUpModal) {
                levelUpModal.classList.add('hidden');
            }
        });
    } function handleGamificationResponse(gamification) {
        if (!gamification) return;

        if (gamification.xp_earned && gamification.xp_earned > 0) {
            showXPEarned(gamification.xp_earned);
        }

        if (gamification.leveled_up) {
            setTimeout(() => {
                showLevelUpModal(
                    gamification.new_level || gamification.level,
                    gamification.level_title || 'Achiever',
                    gamification.level_icon || '👑'
                );
            }, 600);
        }

        if (gamification.new_achievements && gamification.new_achievements.length > 0) {
            gamification.new_achievements.forEach(ach => {
                setTimeout(() => {
                    showToast(`🏆 Achievement Unlocked: ${ach.name}!`, 'success');
                }, 400);
            });
        }

        loadGamificationDashboard();
    };
    window.handleGamificationResponse = handleGamificationResponse; async function loadGamificationDashboard() {
        try {
            const [gamRes, achRes, histRes] = await Promise.all([
                fetch('/api/gamification').then(r => r.json()),
                fetch('/api/achievements').then(r => r.json()),
                fetch('/api/gamification/history').then(r => r.json())
            ]);

            if (gamRes.success && gamRes.gamification) {
                const g = gamRes.gamification;
                const lvl = g.level_info;

                // Update Mini Header Gamification Pill
                const headerLvl = document.getElementById('header-level-badge');
                const headerXpFill = document.getElementById('header-xp-bar-fill');
                const headerXpLbl = document.getElementById('header-xp-label');

                if (headerLvl) headerLvl.textContent = `${lvl.icon} Lvl ${lvl.level}`;
                if (headerXpFill) headerXpFill.style.width = `${lvl.progress_pct}%`;
                if (headerXpLbl) headerXpLbl.textContent = `${lvl.total_xp} XP`;

                // Update Hero Card
                const heroIcon = document.getElementById('hero-level-icon');
                const heroTitle = document.getElementById('hero-level-title');
                const heroNumBadge = document.getElementById('hero-level-number-badge');
                const heroXpProgText = document.getElementById('hero-xp-progress-text');
                const heroXpNeededText = document.getElementById('hero-xp-needed-text');
                const heroXpFill = document.getElementById('hero-xp-bar-fill');

                if (heroIcon) heroIcon.textContent = lvl.icon;
                if (heroTitle) heroTitle.textContent = `Level ${lvl.level} — ${lvl.title}`;
                if (heroNumBadge) heroNumBadge.textContent = `LEVEL ${lvl.level}`;
                if (heroXpProgText) heroXpProgText.textContent = `${lvl.total_xp} / ${lvl.max_xp + 1} Total XP`;
                if (heroXpNeededText) heroXpNeededText.textContent = lvl.xp_to_next > 0 ? `${lvl.xp_to_next} XP to Level ${lvl.level + 1}` : 'Max Level Master!';
                if (heroXpFill) heroXpFill.style.width = `${lvl.progress_pct}%`;

                // Hero Stat Pills
                const totalXpVal = document.getElementById('hero-total-xp-val');
                const streakVal = document.getElementById('hero-streak-val');
                const badgesVal = document.getElementById('hero-badges-unlocked-val');

                if (totalXpVal) totalXpVal.textContent = `${lvl.total_xp} XP`;
                if (streakVal) streakVal.textContent = `${g.streak.current_streak} Days`;
                if (badgesVal) badgesVal.textContent = `${g.unlocked_achievements} / ${g.total_achievements}`;

                // Daily Goal Card
                const dg = g.daily_goal;
                const dgRing = document.getElementById('daily-goal-ring');
                const dgPct = document.getElementById('daily-goal-percent-text');
                const dgCount = document.getElementById('daily-goal-count-text');
                const dgDesc = document.getElementById('daily-goal-status-desc');

                if (dgRing) dgRing.setAttribute('stroke-dasharray', `${dg.progress_pct}, 100`);
                if (dgPct) dgPct.textContent = `${dg.progress_pct}%`;
                if (dgCount) dgCount.textContent = `${dg.completed_today} / ${dg.daily_goal} Tasks`;
                if (dgDesc) {
                    if (dg.goal_reached) {
                        dgDesc.innerHTML = `<span style="color: #10b981; font-weight: 800;">🎉 Daily Goal Reached! (+50 XP)</span>`;
                    } else {
                        const rem = Math.max(0, dg.daily_goal - dg.completed_today);
                        dgDesc.textContent = `${rem} task${rem === 1 ? '' : 's'} remaining today`;
                    }
                }

                // Sync daily goal buttons active state
                document.querySelectorAll('.btn-goal-opt').forEach(btn => {
                    if (parseInt(btn.dataset.goal) === dg.daily_goal) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });

                // Weekly Challenge Card
                const wc = g.weekly_challenge;
                const wcTitle = document.getElementById('weekly-challenge-title');
                const wcDesc = document.getElementById('weekly-challenge-desc');
                const wcProgText = document.getElementById('weekly-challenge-progress-text');
                const wcPctText = document.getElementById('weekly-challenge-pct-text');
                const wcBarFill = document.getElementById('weekly-challenge-bar-fill');

                if (wcTitle) wcTitle.textContent = wc.title;
                if (wcDesc) wcDesc.textContent = wc.description;
                if (wcProgText) wcProgText.textContent = `${wc.progress} / ${wc.target} Completed`;
                if (wcPctText) wcPctText.textContent = `${wc.progress_pct}%`;
                if (wcBarFill) wcBarFill.style.width = `${wc.progress_pct}%`;
            }

            // Render Achievements Gallery
            if (achRes.success && achRes.achievements) {
                const gallery = document.getElementById('achievements-gallery-grid');
                const galleryCount = document.getElementById('gallery-unlocked-count');
                const achs = achRes.achievements;

                const unlockedTotal = achs.filter(a => a.unlocked).length;
                if (galleryCount) galleryCount.textContent = `${unlockedTotal} / ${achs.length} Unlocked`;

                if (gallery) {
                    gallery.innerHTML = achs.map(a => {
                        const statusClass = a.unlocked ? 'unlocked' : 'locked';
                        const unlockDateFormatted = a.unlocked_at ? new Date(a.unlocked_at.replace(' ', 'T')).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

                        return `
                            <div class="achievement-card ${statusClass}">
                                <div class="achievement-icon-wrapper">${a.icon}</div>
                                <div class="achievement-info">
                                    <div class="achievement-title">
                                        <span>${a.name}</span>
                                        ${a.unlocked ? `<span style="font-size: 0.75rem; color: #f59e0b;">✓ Unlocked</span>` : `<span class="muted-text" style="font-size: 0.72rem;">🔒 ${a.current}/${a.target}</span>`}
                                    </div>
                                    <p class="achievement-desc">${a.description}</p>
                                    ${a.unlocked ? `
                                        <div class="achievement-unlock-date">Earned on ${unlockDateFormatted}</div>
                                    ` : `
                                        <div class="progress-bar-track" style="height: 6px; margin-top: 0.4rem;">
                                            <div class="progress-bar-fill" style="width: ${a.progress_pct}%; background: #64748b;"></div>
                                        </div>
                                    `}
                                </div>
                            </div>
                        `;
                    }).join('');
                }
            }

            // Render XP Activity Log
            if (histRes.success && histRes.history) {
                const rowsContainer = document.getElementById('xp-history-rows');
                if (rowsContainer) {
                    const logs = histRes.history;
                    if (logs.length === 0) {
                        rowsContainer.innerHTML = `<tr><td colspan="3" class="muted-text" style="text-align: center; padding: 1rem;">No XP logged yet. Complete tasks to earn points!</td></tr>`;
                    } else {
                        rowsContainer.innerHTML = logs.map(l => {
                            const dateFormatted = new Date(l.created_at.replace(' ', 'T')).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                            let eventName = l.source_type.replace(/_/g, ' ').toUpperCase();
                            if (l.source_type === 'task_complete') eventName = 'Task Completed';
                            else if (l.source_type === 'daily_goal_reached') eventName = 'Daily Goal Bonus';
                            else if (l.source_type === 'focus_session') eventName = 'Focus Studio Session';
                            else if (l.source_type === 'habit_complete') eventName = 'Daily Habit Done';
                            else if (l.source_type === 'habit_streak_7') eventName = '7-Day Habit Streak Bonus';

                            return `
                                <tr style="border-bottom: 1px solid var(--border-color);">
                                    <td style="padding: 0.55rem 0.5rem; font-weight: 700;">${eventName}</td>
                                    <td style="padding: 0.55rem 0.5rem;"><span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; font-weight: 800;">+${l.xp_amount} XP</span></td>
                                    <td style="padding: 0.55rem 0.5rem; text-align: right; color: var(--text-muted); font-size: 0.78rem;">${dateFormatted}</td>
                                </tr>
                            `;
                        }).join('');
                    }
                }
            }

        } catch (err) {
            console.error("Error loading gamification dashboard: ", err);
        }
    };

    // Header Pill Click opens achievements view
    if (headerGamificationPill) {
        headerGamificationPill.addEventListener('click', () => {
            showPage('achievements');
        });
    }

    // Daily Goal selector buttons
    document.querySelectorAll('.btn-goal-opt').forEach(btn => {
        btn.addEventListener('click', async () => {
            const goal = parseInt(btn.dataset.goal);
            try {
                const response = await fetch('/api/gamification/daily-goal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ daily_goal: goal })
                });
                const res = await response.json();
                if (response.ok && res.success) {
                    showToast(`Daily goal updated to ${goal} tasks! 🎯`, 'success');
                    loadGamificationDashboard();
                }
            } catch (err) {
                console.error("Error updating daily goal: ", err);
            }
        });
    });

    const refreshXpBtn = document.getElementById('refresh-xp-history-btn');
    if (refreshXpBtn) {
        refreshXpBtn.addEventListener('click', () => {
            loadGamificationDashboard();
            showToast("XP activity refreshed.", "info");
        });
    }

    // ----------------------------------------------------
    // 21. Settings Preferences Handler
    // ----------------------------------------------------
    const saveSettingsBtn = document.getElementById('btn-save-settings');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            const usernameInput = document.getElementById('settings-username');
            const themeSelect = document.getElementById('settings-theme-select');

            if (usernameInput) {
                const name = usernameInput.value.trim() || 'Workspace';
                const userNameEl = document.querySelector('.user-name-text');
                const userAvatarEl = document.querySelector('.user-avatar-circle');
                if (userNameEl) userNameEl.textContent = name;
                if (userAvatarEl) userAvatarEl.textContent = name[0].toUpperCase();
            }

            if (themeSelect) {
                const isDark = themeSelect.value === 'dark';
                document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
                localStorage.setItem('theme', isDark ? 'dark' : 'light');
                updateThemeBtnUI(isDark);
            }

            showToast('Settings updated successfully! ⚙️', 'success');
        });
    }

    // ----------------------------------------------------
    // 22. Data Export & Backup Hub Controller
    // ----------------------------------------------------
    const exportModal = document.getElementById('export-data-modal');
    const closeExportModalBtn = document.getElementById('close-export-modal-btn');
    const exportTriggers = [
        document.getElementById('btn-open-export-modal'),
        document.getElementById('dropdown-export-btn'),
        document.getElementById('task-filter-export-btn'),
        document.getElementById('settings-open-export-btn')
    ];

    function openExportModal() {
        if (exportModal) {
            exportModal.classList.remove('hidden');
        }
    }

    function closeExportModal() {
        if (exportModal) {
            exportModal.classList.add('hidden');
        }
    }

    exportTriggers.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                openExportModal();
            });
        }
    });

    if (closeExportModalBtn) {
        closeExportModalBtn.addEventListener('click', closeExportModal);
    }

    if (exportModal) {
        exportModal.addEventListener('click', (e) => {
            if (e.target === exportModal) {
                closeExportModal();
            }
        });
    }

    // Task Import / Restore Drag & Drop Handler
    const importForm = document.getElementById('import-tasks-form');
    const importFileInput = document.getElementById('import-file-input');
    const fileDropzone = document.getElementById('file-dropzone');
    const importFileLabel = document.getElementById('import-file-label');
    const btnSubmitImport = document.getElementById('btn-submit-import');
    const importStatusMsg = document.getElementById('import-status-msg');

    if (fileDropzone && importFileInput) {
        fileDropzone.addEventListener('click', () => {
            importFileInput.click();
        });

        fileDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileDropzone.classList.add('dragover');
        });

        fileDropzone.addEventListener('dragleave', () => {
            fileDropzone.classList.remove('dragover');
        });

        fileDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            fileDropzone.classList.remove('dragover');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                importFileInput.files = e.dataTransfer.files;
                handleFileSelected(e.dataTransfer.files[0]);
            }
        });

        importFileInput.addEventListener('change', () => {
            if (importFileInput.files && importFileInput.files.length > 0) {
                handleFileSelected(importFileInput.files[0]);
            }
        });
    }

    function handleFileSelected(file) {
        const name = file.name;
        const sizeKb = (file.size / 1024).toFixed(1);
        if (!name.endsWith('.json') && !name.endsWith('.csv')) {
            showToast('Please select a valid .json or .csv backup file.', 'error');
            if (btnSubmitImport) btnSubmitImport.disabled = true;
            return;
        }
        if (importFileLabel) {
            importFileLabel.innerHTML = `Selected: <strong>${name}</strong> (${sizeKb} KB)`;
        }
        if (btnSubmitImport) {
            btnSubmitImport.disabled = false;
        }
    }

    if (importForm) {
        importForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!importFileInput.files || importFileInput.files.length === 0) {
                showToast('Please select a file to import.', 'warning');
                return;
            }

            const formData = new FormData();
            formData.append('file', importFileInput.files[0]);

            if (btnSubmitImport) {
                btnSubmitImport.disabled = true;
                btnSubmitImport.innerHTML = '<span>⏳ Importing...</span>';
            }
            if (importStatusMsg) {
                importStatusMsg.style.display = 'none';
            }

            try {
                const response = await fetch('/api/import/tasks', {
                    method: 'POST',
                    body: formData
                });
                const res = await response.json();

                if (response.ok && res.success) {
                    showToast(res.message || 'Tasks imported successfully!', 'success');
                    if (importStatusMsg) {
                        importStatusMsg.className = 'import-status-success';
                        importStatusMsg.innerHTML = `✅ ${res.message} Reloading dashboard...`;
                        importStatusMsg.style.display = 'block';
                    }
                    setTimeout(() => {
                        window.location.reload();
                    }, 1200);
                } else {
                    showToast(res.message || 'Import failed.', 'error');
                    if (importStatusMsg) {
                        importStatusMsg.className = 'import-status-error';
                        importStatusMsg.innerHTML = `❌ ${res.message || 'Import failed. Check file structure.'}`;
                        importStatusMsg.style.display = 'block';
                    }
                    if (btnSubmitImport) {
                        btnSubmitImport.disabled = false;
                        btnSubmitImport.innerHTML = '<span>🚀 Import Tasks</span>';
                    }
                }
            } catch (err) {
                console.error('Import error:', err);
                showToast('Network error during file import.', 'error');
                if (btnSubmitImport) {
                    btnSubmitImport.disabled = false;
                    btnSubmitImport.innerHTML = '<span>🚀 Import Tasks</span>';
                }
            }
        });
    }

    // Call Recommended Task load on init
    setTimeout(() => {
        loadAIRecommendation();
    }, 1500);

    // ----------------------------------------------------
    // 23. Global Keyboard Shortcuts & Interactive Tactile Engine
    // ----------------------------------------------------
    document.addEventListener('keydown', (e) => {
        // Ctrl+K or Cmd+K: Focus Global Search
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            const searchInput = document.getElementById('globalSearch');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }

        // Alt+N: Quick Open Add Task
        if (e.altKey && e.key.toLowerCase() === 'n') {
            e.preventDefault();
            const addBtn = document.getElementById('btn-open-create-task') || document.querySelector('[data-open-task-form]');
            if (addBtn) addBtn.click();
        }

        // Escape: Close all active modals
        if (e.key === 'Escape') {
            const openModals = document.querySelectorAll('.modal-overlay:not(.hidden)');
            openModals.forEach(modal => {
                modal.classList.add('hidden');
            });
            const searchInput = document.getElementById('globalSearch');
            if (document.activeElement === searchInput) {
                searchInput.blur();
            }
        }
    });

    // Tactile Ripple on Buttons
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn, .add-task-btn, .top-icon-btn, .nav-item');
        if (!btn) return;
        
        btn.classList.add('has-ripple');
        const rect = btn.getBoundingClientRect();
        const ripple = document.createElement('span');
        ripple.className = 'ripple-wave';
        
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        
        btn.appendChild(ripple);
        setTimeout(() => {
            ripple.remove();
        }, 600);
    });

    // ----------------------------------------------------
    // 17. Startup Initialization
    // ----------------------------------------------------
    initializeFocusStudio();
    loadTasksFromDOM();
    checkDueDates();
    updateStatistics();
    applyFiltersAndSearch();
    initKanbanBoard();
    initializeCalendar();
    showPage('dashboard');

    // Notifications & Gamification & AI Radar startup
    checkNotifications();
    updateBrowserNotificationUI();
    loadGamificationDashboard();
    loadWorkloadBurnoutRadar();
    setInterval(checkNotifications, 60000);
});
