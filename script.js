// Reading Item class to represent each reading item
class ReadingItem {
    constructor(title, url, tags = []) {
        this.id = Date.now().toString();
        this.title = title;
        this.url = url;
        this.tags = tags;
        this.status = 'unread';
        this.dateAdded = new Date().toISOString();
        this.progress = 0; // Progress percentage (0-100)
        this.timeSpent = 0; // Time spent in seconds
        this.lastRead = null; // Last reading session timestamp
        this.readingSessions = []; // Array to store reading sessions
        this.priority = 'medium'; // Priority level: low, medium, high
        this.notes = ''; // Add notes property
    }
}

class ThemeManager {
    constructor() {
        this.themeToggle = document.getElementById('theme-toggle');
        this.initialize();
    }

    initialize() {
        // Load saved theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);

        // Add event listener for theme toggle
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => {
                const newTheme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
                this.setTheme(newTheme);
            });
        }

        // Add system theme change listener
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            const newTheme = e.matches ? 'dark' : 'light';
            this.setTheme(newTheme);
        });
    }

    setTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }
}

// Main app class to handle all functionality
class ReadingTracker {
    constructor() {
        this.items = [];
        this.currentFilter = 'all';
        this.activeTags = new Set();
        this.allTags = new Set();
        this.currentTags = new Set();
        this.searchQuery = '';
        this.activePriorities = new Set(); // Track active priority filters
        
        // Initialize theme manager
        this.themeManager = new ThemeManager();
        
        // DOM Elements
        this.form = document.getElementById('add-item-form');
        this.titleInput = document.getElementById('title');
        this.urlInput = document.getElementById('url');
        this.tagsInput = document.getElementById('tags');
        this.tagsPreview = document.getElementById('tags-preview');
        this.itemsList = document.getElementById('items-list');
        this.filterButtons = document.querySelectorAll('.filter-btn');
        this.activeTagsContainer = document.getElementById('active-tags');
        this.availableTagsContainer = document.getElementById('available-tags');
        this.searchInput = document.getElementById('search-input');
        this.searchStats = document.getElementById('search-stats');
        this.searchClear = document.getElementById('search-clear');
        
        // Stats Elements
        this.unreadCount = document.getElementById('unread-count');
        this.readingCount = document.getElementById('reading-count');
        this.completedCount = document.getElementById('completed-count');
        
        this.activeReadingSession = null;
        
        this.deletedItems = new Map(); // Store recently deleted items
        this.undoTimers = new Map(); // Store undo timers
        
        // Stats elements
        this.statsPanel = document.getElementById('stats-panel');
        this.statsToggle = document.getElementById('stats-toggle');
        this.statsClose = document.querySelector('.stats-close');
        this.readingTrendsChart = document.getElementById('reading-trends-chart');
        
        // Initialize Chart.js
        this.chart = null;
        this.loadChartJS();
        
        // Initialize elements
        this.priorityButtons = document.querySelectorAll('.priority-btn');
        
        this.filterPanel = document.getElementById('filter-panel');
        this.filterToggle = document.getElementById('filter-toggle');
        this.activeFilterTags = document.getElementById('active-filter-tags');
        
        // Initialize achievement manager
        this.achievementManager = new AchievementManager(this);
        
        // Add achievements panel elements
        this.achievementsPanel = document.getElementById('achievements-panel');
        this.achievementsToggle = document.getElementById('achievements-toggle');
        this.achievementsGrid = document.getElementById('achievements-grid');
        
        // Add new filter state properties
        this.sortBy = 'date-added-desc';
        this.progressFilter = {
            min: 0,
            max: 100
        };
        this.dateFilter = {
            from: null,
            to: null
        };
        this.tagsMode = 'any';
        
        // Add new filter elements
        this.sortSelect = document.getElementById('sort-select');
        this.minProgress = document.getElementById('min-progress');
        this.maxProgress = document.getElementById('max-progress');
        this.minProgressValue = document.getElementById('min-progress-value');
        this.maxProgressValue = document.getElementById('max-progress-value');
        this.dateFrom = document.getElementById('date-from');
        this.dateTo = document.getElementById('date-to');
        this.tagsMode = document.querySelector('input[name="tags-mode"]:checked')?.value || 'any';
        this.resetFiltersBtn = document.getElementById('reset-filters');
        this.applyFiltersBtn = document.getElementById('apply-filters');
        
        // Add edit modal elements
        this.editModal = document.getElementById('edit-modal');
        this.editForm = document.getElementById('edit-item-form');
        this.editTitle = document.getElementById('edit-title');
        this.editUrl = document.getElementById('edit-url');
        this.editTags = document.getElementById('edit-tags');
        this.editTagsPreview = document.getElementById('edit-tags-preview');
        this.currentEditId = null;
        this.editCurrentTags = new Set();
        
        // Add editor elements
        this.editNotes = document.getElementById('edit-notes');
        this.editorButtons = document.querySelectorAll('.editor-btn');
        
        // Load saved items
        const savedItems = localStorage.getItem('readingItems');
        if (savedItems) {
            this.items = JSON.parse(savedItems);
            this.updateStatusCounts(); // Add this line to update counts on load
        }
        
        this.initialize();
    }
    
    initialize() {
        this.loadItems();
        this.setupEventListeners();
        this.setupEditor();
        this.renderItems();
        this.updateStats();
        this.updateTagsFilter();
        this.updateActiveFilters();
        this.renderAchievements();
    }
    
    setupEditor() {
        if (!this.editNotes || !this.editorButtons) return;
        
        // Handle toolbar buttons
        this.editorButtons.forEach(button => {
            button.addEventListener('click', () => {
                const format = button.dataset.format;
                this.executeFormat(format);
                button.classList.toggle('active');
            });
        });
        
        // Handle keyboard shortcuts
        this.editNotes.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key.toLowerCase()) {
                    case 'b':
                        e.preventDefault();
                        this.executeFormat('bold');
                        break;
                    case 'i':
                        e.preventDefault();
                        this.executeFormat('italic');
                        break;
                }
            }
        });
    }
    
    executeFormat(format) {
        switch(format) {
            case 'h1':
            case 'h2':
            case 'h3':
                document.execCommand('formatBlock', false, format);
                break;
            case 'bold':
                document.execCommand('bold', false);
                break;
            case 'italic':
                document.execCommand('italic', false);
                break;
            case 'bullet':
                document.execCommand('insertUnorderedList', false);
                break;
            case 'number':
                document.execCommand('insertOrderedList', false);
                break;
            case 'quote':
                document.execCommand('formatBlock', false, 'blockquote');
                break;
        }
        this.editNotes.focus();
    }
    
    setupEventListeners() {
        // Form submission
        if (this.form) {
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddItem();
            });
        }

        // Filter buttons
        this.filterButtons.forEach(button => {
            button.addEventListener('click', () => this.handleFilter(button.dataset.filter));
        });
        
        // Tags input
        if (this.tagsInput) {
            this.tagsInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    this.addTag(this.tagsInput.value.trim());
                }
            });
            
            this.tagsInput.addEventListener('blur', () => {
                if (this.tagsInput.value.trim()) {
                    this.addTag(this.tagsInput.value.trim());
                }
            });
        }

        // Search input
        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => {
                this.searchQuery = this.searchInput.value.trim().toLowerCase();
                this.toggleSearchClear();
                this.renderItems();
            });

            // Clear search with Escape key
            this.searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.clearSearch();
                }
            });

            // Clear button click
            if (this.searchClear) {
                this.searchClear.addEventListener('click', () => {
                    this.clearSearch();
                });
            }
        }

        // Stats panel toggle
        if (this.statsToggle) {
            this.statsToggle.addEventListener('click', () => this.toggleStatsPanel());
        }
        if (this.statsClose) {
            this.statsClose.addEventListener('click', () => this.toggleStatsPanel());
        }

        // Priority filter buttons
        this.priorityButtons.forEach(button => {
            button.addEventListener('click', () => this.togglePriorityFilter(button.dataset.priority));
        });

        // Filter panel toggle
        if (this.filterToggle) {
            this.filterToggle.addEventListener('click', () => this.toggleFilterPanel());
        }

        // Achievements panel toggle
        if (this.achievementsToggle) {
            this.achievementsToggle.addEventListener('click', () => this.toggleAchievementsPanel());
        }
        
        // Close button for achievements panel
        const achievementsClose = this.achievementsPanel?.querySelector('.stats-close');
        if (achievementsClose) {
            achievementsClose.addEventListener('click', () => this.toggleAchievementsPanel());
        }

        // Sort select
        if (this.sortSelect) {
            this.sortSelect.addEventListener('change', () => {
                this.sortBy = this.sortSelect.value;
                this.renderItems();
            });
        }
        
        // Progress range inputs
        if (this.minProgress && this.maxProgress) {
            this.minProgress.addEventListener('input', () => {
                const value = parseInt(this.minProgress.value);
                this.progressFilter.min = value;
                this.minProgressValue.textContent = `${value}%`;
                if (value > parseInt(this.maxProgress.value)) {
                    this.maxProgress.value = value;
                    this.maxProgressValue.textContent = `${value}%`;
                    this.progressFilter.max = value;
                }
            });
            
            this.maxProgress.addEventListener('input', () => {
                const value = parseInt(this.maxProgress.value);
                this.progressFilter.max = value;
                this.maxProgressValue.textContent = `${value}%`;
                if (value < parseInt(this.minProgress.value)) {
                    this.minProgress.value = value;
                    this.minProgressValue.textContent = `${value}%`;
                    this.progressFilter.min = value;
                }
            });
        }
        
        // Date filters
        if (this.dateFrom) {
            this.dateFrom.addEventListener('change', () => {
                this.dateFilter.from = this.dateFrom.value ? new Date(this.dateFrom.value) : null;
            });
        }
        
        if (this.dateTo) {
            this.dateTo.addEventListener('change', () => {
                this.dateFilter.to = this.dateTo.value ? new Date(this.dateTo.value) : null;
            });
        }
        
        // Tags mode
        document.querySelectorAll('input[name="tags-mode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.tagsMode = e.target.value;
            });
        });
        
        // Reset filters
        if (this.resetFiltersBtn) {
            this.resetFiltersBtn.addEventListener('click', () => this.resetFilters());
        }
        
        // Apply filters
        if (this.applyFiltersBtn) {
            this.applyFiltersBtn.addEventListener('click', () => this.renderItems());
        }

        // Edit modal events
        if (this.editModal) {
            // Close modal on clicking outside
            this.editModal.addEventListener('click', (e) => {
                if (e.target === this.editModal) {
                    this.closeEditModal();
                }
            });
            
            // Close button
            const closeBtn = this.editModal.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.closeEditModal());
            }
            
            // Cancel button
            const cancelBtn = this.editModal.querySelector('[data-action="cancel"]');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => this.closeEditModal());
            }
        }
        
        // Edit form submission
        if (this.editForm) {
            this.editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleEditSubmit();
            });
        }
        
        // Edit tags input
        if (this.editTags) {
            this.editTags.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    this.addEditTag(this.editTags.value.trim());
                }
            });
            
            this.editTags.addEventListener('blur', () => {
                if (this.editTags.value.trim()) {
                    this.addEditTag(this.editTags.value.trim());
                }
            });
        }
    }
    
    addTag(tagName) {
        if (!tagName) return;
        
        // Remove any special characters and convert to lowercase
        tagName = tagName.toLowerCase().replace(/[^\w\s]/g, '').trim();
        
        if (tagName && !this.currentTags.has(tagName)) {
            this.currentTags.add(tagName);
            this.renderTagsPreview();
        }
        
        if (this.tagsInput) {
            this.tagsInput.value = '';
        }
    }
    
    renderTagsPreview() {
        if (!this.tagsPreview) return;
        
        this.tagsPreview.innerHTML = '';
        this.currentTags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'tag';
            tagElement.innerHTML = `
                ${tag}
                <span class="remove-tag" data-tag="${tag}">×</span>
            `;
            
            tagElement.querySelector('.remove-tag').addEventListener('click', () => {
                this.currentTags.delete(tag);
                this.renderTagsPreview();
            });
            
            this.tagsPreview.appendChild(tagElement);
        });
    }
    
    handleAddItem() {
        const title = this.titleInput.value.trim();
        const url = this.urlInput.value.trim();
        const tags = Array.from(this.currentTags);
        const priority = document.querySelector('input[name="priority"]:checked').value;
        
        if (title) {
            const newItem = new ReadingItem(title, url, tags);
            newItem.priority = priority;
            this.items.unshift(newItem);
            this.saveItems();
            
            // Check achievements after adding item
            this.achievementManager.checkAchievements();
            
            // Create and append the new item with animation
            const itemElement = this.createItemElement(newItem);
            itemElement.style.opacity = '0';
            itemElement.style.transform = 'translateY(20px)';
            
            if (this.itemsList.firstChild) {
                this.itemsList.insertBefore(itemElement, this.itemsList.firstChild);
            } else {
                this.itemsList.appendChild(itemElement);
            }
            
            // Trigger animation
            requestAnimationFrame(() => {
                itemElement.style.transition = 'all 0.3s ease';
                itemElement.style.opacity = '1';
                itemElement.style.transform = 'translateY(0)';
            });
            
            // Reset form
            this.form.reset();
            this.currentTags.clear();
            this.renderTagsPreview();
            
            // Form feedback animation
            this.titleInput.style.transition = 'all 0.2s ease';
            this.urlInput.style.transition = 'all 0.2s ease';
            this.titleInput.style.backgroundColor = '#f0f9ff';
            this.urlInput.style.backgroundColor = '#f0f9ff';
            setTimeout(() => {
                this.titleInput.style.backgroundColor = '';
                this.urlInput.style.backgroundColor = '';
            }, 500);
        }
    }
    
    updateAllTags() {
        this.allTags.clear();
        this.items.forEach(item => {
            if (item.tags && Array.isArray(item.tags)) {
                item.tags.forEach(tag => this.allTags.add(tag));
            }
        });
        this.updateTagsFilter();
    }
    
    updateTagsFilter() {
        if (!this.availableTagsContainer || !this.activeTagsContainer) return;
        
        // Update available tags
        this.availableTagsContainer.innerHTML = '';
        this.activeTagsContainer.innerHTML = '';
        
        // Sort tags alphabetically
        const sortedTags = Array.from(this.allTags).sort();
        
        sortedTags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'tag';
            
            if (this.activeTags.has(tag)) {
                tagElement.innerHTML = `
                    ${tag}
                    <span class="remove-tag">×</span>
                `;
                tagElement.addEventListener('click', () => this.toggleTagFilter(tag));
                this.activeTagsContainer.appendChild(tagElement);
            } else {
                tagElement.textContent = tag;
                tagElement.addEventListener('click', () => this.toggleTagFilter(tag));
                this.availableTagsContainer.appendChild(tagElement);
            }
        });
    }
    
    toggleTagFilter(tag) {
        if (this.activeTags.has(tag)) {
            this.activeTags.delete(tag);
        } else {
            this.activeTags.add(tag);
        }
        this.updateTagsFilter();
        this.renderItems();
        this.updateActiveFilters();
    }
    
    loadItems() {
        const savedItems = localStorage.getItem('readingItems');
        try {
            this.items = savedItems ? JSON.parse(savedItems) : [];
            // Ensure all items have the tags property
            this.items = this.items.map(item => ({
                ...item,
                tags: Array.isArray(item.tags) ? item.tags : []
            }));
        } catch (error) {
            console.error('Error loading items:', error);
            this.items = [];
        }
        this.updateAllTags();
    }
    
    saveItems() {
        localStorage.setItem('readingItems', JSON.stringify(this.items));
        this.updateStats();
        this.updateAllTags();
        this.updateStatusCounts();
    }
    
    handleFilter(filter) {
        this.currentFilter = filter;
        
        // Update active filter button with smooth transition
        this.filterButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.filter === filter);
        });
        
        // Animate items out
        const items = this.itemsList.children;
        for (let item of items) {
            item.style.transition = 'all 0.2s ease';
            item.style.opacity = '0';
            item.style.transform = 'scale(0.95)';
        }
        
        // Render new items after animation
        setTimeout(() => {
            this.renderItems();
        }, 200);
        this.updateActiveFilters();
    }
    
    updateStats() {
        this.updateOverviewStats();
        this.updateReadingTrends();
        this.updateTagCloud();
        this.updateRecentActivity();
    }
    
    updateOverviewStats() {
        // Update total items
        document.getElementById('total-items').textContent = this.items.length;

        // Calculate total reading time
        const totalTime = this.items.reduce((acc, item) => acc + (item.timeSpent || 0), 0);
        document.getElementById('total-time').textContent = this.formatTime(totalTime);

        // Calculate completion rate
        const completedItems = this.items.filter(item => item.status === 'completed').length;
        const completionRate = this.items.length ? Math.round((completedItems / this.items.length) * 100) : 0;
        document.getElementById('completion-rate').textContent = `${completionRate}%`;

        // Calculate average completion time
        const completedItemsTimes = this.items
            .filter(item => item.status === 'completed')
            .map(item => item.timeSpent || 0);
        const avgTime = completedItemsTimes.length
            ? Math.round(completedItemsTimes.reduce((a, b) => a + b, 0) / completedItemsTimes.length)
            : 0;
        document.getElementById('avg-completion-time').textContent = this.formatTime(avgTime);
    }
    
    updateReadingTrends() {
        if (!this.readingTrendsChart || !window.Chart) return;

        // Get last 7 days of activity
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            return date.toISOString().split('T')[0];
        }).reverse();

        // Count reading sessions per day
        const sessionsPerDay = last7Days.map(date => {
            return this.items.reduce((count, item) => {
                const sessions = item.readingSessions || [];
                return count + sessions.filter(session => 
                    session.startTime.split('T')[0] === date
                ).length;
            }, 0);
        });

        // Update or create chart
        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(this.readingTrendsChart, {
            type: 'line',
            data: {
                labels: last7Days.map(date => {
                    const [year, month, day] = date.split('-');
                    return `${month}/${day}`;
                }),
                datasets: [{
                    label: 'Reading Sessions',
                    data: sessionsPerDay,
                    borderColor: '#2384E1',
                    backgroundColor: 'rgba(35, 132, 225, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }
    
    updateTagCloud() {
        const tagCloud = document.getElementById('tag-cloud');
        if (!tagCloud) return;

        // Count tag occurrences
        const tagCounts = {};
        this.items.forEach(item => {
            (item.tags || []).forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });

        // Calculate tag sizes based on frequency
        const maxCount = Math.max(...Object.values(tagCounts), 1);
        const tags = Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([tag, count]) => {
                const size = 0.8 + (count / maxCount) * 0.7; // Size between 0.8 and 1.5rem
                const opacity = 0.5 + (count / maxCount) * 0.5; // Opacity between 0.5 and 1
                return `<span class="tag" style="--tag-size: ${size}rem; --tag-opacity: ${opacity}">#${tag}</span>`;
            });

        tagCloud.innerHTML = tags.join('');
    }
    
    updateRecentActivity() {
        const activityList = document.getElementById('activity-list');
        if (!activityList) return;

        // Collect all activities
        const activities = [];

        // Add reading sessions
        this.items.forEach(item => {
            (item.readingSessions || []).forEach(session => {
                activities.push({
                    type: 'session',
                    title: item.title,
                    time: new Date(session.startTime),
                    duration: session.duration
                });
            });
        });

        // Sort by most recent
        activities.sort((a, b) => b.time - a.time);

        // Take last 5 activities
        const recentActivities = activities.slice(0, 5);

        // Render activities
        activityList.innerHTML = recentActivities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">📖</div>
                <div class="activity-details">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-time">
                        Read for ${this.formatTime(activity.duration)} • 
                        ${this.formatRelativeTime(activity.time)}
                    </div>
                </div>
            </div>
        `).join('') || '<div class="activity-item">No recent activity</div>';
    }
    
    formatRelativeTime(date) {
        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    }
    
    getFilteredItems() {
        let filteredItems = this.items;
        
        // Status filter
        if (this.currentFilter !== 'all') {
            filteredItems = filteredItems.filter(item => item.status === this.currentFilter);
        }
        
        // Priority filter
        if (this.activePriorities.size > 0) {
            filteredItems = filteredItems.filter(item => 
                this.activePriorities.has(item.priority)
            );
        }
        
        // Progress filter
        filteredItems = filteredItems.filter(item => {
            const progress = item.progress || 0;
            return progress >= this.progressFilter.min && progress <= this.progressFilter.max;
        });
        
        // Date filter
        if (this.dateFilter.from || this.dateFilter.to) {
            filteredItems = filteredItems.filter(item => {
                const itemDate = new Date(item.dateAdded);
                if (this.dateFilter.from && itemDate < this.dateFilter.from) return false;
                if (this.dateFilter.to && itemDate > this.dateFilter.to) return false;
                return true;
            });
        }
        
        // Tags filter
        if (this.activeTags.size > 0) {
            filteredItems = filteredItems.filter(item => {
                const itemTags = new Set(item.tags);
                const activeTagsArray = Array.from(this.activeTags);
                
                if (this.tagsMode === 'any') {
                    return activeTagsArray.some(tag => itemTags.has(tag));
                } else { // 'all' mode
                    return activeTagsArray.every(tag => itemTags.has(tag));
                }
            });
        }
        
        // Search filter
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filteredItems = filteredItems.filter(item => {
                const titleMatch = item.title.toLowerCase().includes(query);
                const urlMatch = item.url?.toLowerCase().includes(query);
                const tagsMatch = item.tags.some(tag => tag.toLowerCase().includes(query));
                return titleMatch || urlMatch || tagsMatch;
            });
        }
        
        // Sort items
        filteredItems.sort((a, b) => {
            switch (this.sortBy) {
                case 'date-added-desc':
                    return new Date(b.dateAdded) - new Date(a.dateAdded);
                case 'date-added-asc':
                    return new Date(a.dateAdded) - new Date(b.dateAdded);
                case 'priority-desc':
                    const priorityOrder = { high: 2, medium: 1, low: 0 };
                    return priorityOrder[b.priority] - priorityOrder[a.priority];
                case 'priority-asc':
                    const priorityOrderAsc = { low: 2, medium: 1, high: 0 };
                    return priorityOrderAsc[b.priority] - priorityOrderAsc[a.priority];
                case 'progress-desc':
                    return (b.progress || 0) - (a.progress || 0);
                case 'progress-asc':
                    return (a.progress || 0) - (b.progress || 0);
                case 'time-spent-desc':
                    return (b.timeSpent || 0) - (a.timeSpent || 0);
                case 'time-spent-asc':
                    return (a.timeSpent || 0) - (b.timeSpent || 0);
                case 'title-asc':
                    return a.title.localeCompare(b.title);
                case 'title-desc':
                    return b.title.localeCompare(a.title);
                default:
                    return 0;
            }
        });
        
        // Update search stats
        if (this.searchStats) {
            this.searchStats.textContent = this.searchQuery ? `${filteredItems.length} results` : '';
        }
        
        return filteredItems;
    }
    
    handleStatusChange(id, newStatus) {
        const item = this.items.find(item => item.id === id);
        if (item) {
            const itemElement = document.querySelector(`[data-id="${id}"]`);
            if (itemElement) {
                // Animate status change
                itemElement.style.transition = 'all 0.3s ease';
                itemElement.style.transform = 'scale(0.95)';
                itemElement.style.opacity = '0.5';
                
                setTimeout(() => {
                    item.status = newStatus;
                    this.saveItems();
                    this.renderItems();
                    this.updateStatusCounts();
                }, 300);
            }
        }
    }
    
    handleDeleteItem(id) {
        const itemElement = document.querySelector(`[data-id="${id}"]`);
        const item = this.items.find(item => item.id === id);
        
        if (itemElement && item) {
            // Store the item and its index for potential undo
            const itemIndex = this.items.findIndex(i => i.id === id);
            this.deletedItems.set(id, { item, index: itemIndex });
            
            // Animate deletion
            itemElement.style.transition = 'all 0.3s ease';
            itemElement.style.transform = 'translateX(100px)';
            itemElement.style.opacity = '0';
            
            // Remove item from the list
            setTimeout(() => {
                this.items = this.items.filter(item => item.id !== id);
                this.saveItems();
                this.renderItems();
                
                // Show undo toast
                this.showUndoToast(id);
            }, 300);
        }
    }
    
    showUndoToast(itemId) {
        // Create toast container if it doesn't exist
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `
            <div class="toast-content">
                <span>Item deleted</span>
                <button class="undo-btn">Undo</button>
            </div>
            <div class="toast-progress"></div>
        `;

        // Add to container
        toastContainer.appendChild(toast);

        // Add undo button listener
        const undoBtn = toast.querySelector('.undo-btn');
        undoBtn.addEventListener('click', () => this.handleUndo(itemId, toast));

        // Set timer for auto-removal
        const timer = setTimeout(() => {
            this.removeToast(toast);
            this.deletedItems.delete(itemId);
        }, 5000);

        // Store the timer
        this.undoTimers.set(itemId, timer);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
    }

    handleUndo(itemId, toast) {
        const deletedItem = this.deletedItems.get(itemId);
        if (deletedItem) {
            // Clear the auto-remove timer
            clearTimeout(this.undoTimers.get(itemId));
            this.undoTimers.delete(itemId);

            // Restore the item
            this.items.splice(deletedItem.index, 0, deletedItem.item);
            this.deletedItems.delete(itemId);
            
            // Save and render
            this.saveItems();
            this.renderItems();

            // Remove the toast
            this.removeToast(toast);
        }
    }

    removeToast(toast) {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
            // Remove container if empty
            const container = document.querySelector('.toast-container');
            if (container && !container.hasChildNodes()) {
                container.remove();
            }
        }, 300);
    }
    
    highlightSearchMatches(text, type = 'text') {
        if (!this.searchQuery) return text;
        
        const query = this.searchQuery.toLowerCase();
        if (!text) return '';

        if (type === 'url') {
            // For URLs, only highlight the domain and path parts
            const url = new URL(text);
            const domain = url.hostname;
            const path = url.pathname + url.search + url.hash;
            
            const highlightedDomain = this.highlightSearchMatches(domain);
            const highlightedPath = this.highlightSearchMatches(path);
            
            return `${url.protocol}//${highlightedDomain}${highlightedPath}`;
        }

        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<span class="highlight-match">$1</span>');
    }
    
    createItemElement(item) {
        const li = document.createElement('li');
        li.className = 'reading-item';
        li.dataset.id = item.id;
        
        // Set active session attribute for styling
        const isActiveSession = this.activeReadingSession && this.activeReadingSession.itemId === item.id;
        if (isActiveSession) {
            li.dataset.activeSession = 'true';
        }
        
        const priorityIcons = {
            low: '🔽',
            medium: '➡️',
            high: '🔼'
        };
        
        const title = item.url 
            ? `<div class="item-title"><a href="${item.url}" target="_blank" rel="noopener noreferrer">${this.highlightSearchMatches(item.title)}</a></div>`
            : `<div class="item-title">${this.highlightSearchMatches(item.title)}</div>`;
            
        const url = item.url 
            ? `<div class="item-url">${this.highlightSearchMatches(item.url, 'url')}</div>`
            : '';

        // Calculate current session time if active
        let currentSessionTime = 0;
        if (isActiveSession) {
            currentSessionTime = Math.floor((Date.now() - this.activeReadingSession.startTime) / 1000);
        }
        
        const totalTime = item.timeSpent + (isActiveSession ? currentSessionTime : 0);
            
        // Create status dropdown
        const statusDropdown = `
            <div class="status-dropdown">
                <select class="status-select" data-action="change-status">
                    <option value="unread" ${item.status === 'unread' ? 'selected' : ''}>📥 Unread</option>
                    <option value="reading" ${item.status === 'reading' ? 'selected' : ''}>📖 Reading</option>
                    <option value="completed" ${item.status === 'completed' ? 'selected' : ''}>✅ Completed</option>
                </select>
            </div>`;
            
        const progressBar = `
            <div class="progress-container">
                <div class="progress-bar">
                    <input type="range" 
                        class="progress-slider" 
                        value="${item.progress || 0}" 
                        min="0" 
                        max="100"
                        aria-label="Reading progress slider">
                    <div class="progress-fill" style="width: ${item.progress}%"></div>
                </div>
                <input type="number" 
                    class="progress-input" 
                    value="${item.progress}" 
                    min="0" 
                    max="100"
                    aria-label="Reading progress percentage">
                <span class="progress-label">${item.progress}%</span>
            </div>`;

        const readingStats = `
            <div class="reading-stats">
                <span class="reading-time">
                    ${isActiveSession ? 
                        `<span class="active-timer" data-timer="true">⏱️ Current session: ${this.formatTime(currentSessionTime)}</span>` 
                        : ''
                    }
                    <span class="total-time">📚 Total time: ${this.formatTime(totalTime)}</span>
                </span>
                ${item.lastRead ? `<span class="last-read">Last read: ${this.formatDate(item.lastRead)}</span>` : ''}
            </div>`;
        
        const notesHtml = item.notes ? `
            <div class="item-notes">
                <div class="notes-toggle">
                    <span class="notes-toggle-icon">▼</span>
                    <span>Notes & Comments</span>
                </div>
                <div class="notes-content">
                    <div class="notes-preview">
                        ${item.notes}
                    </div>
                </div>
            </div>
        ` : '';
        
        const tagsHtml = item.tags.length > 0 
            ? `<div class="item-tags">
                ${item.tags.map(tag => `<span class="tag">#${this.highlightSearchMatches(tag)}</span>`).join('')}
               </div>`
            : '';
        
        const priorityDropdown = `
            <div class="priority-dropdown">
                <select class="priority-select" data-action="change-priority">
                    <option value="low" ${item.priority === 'low' ? 'selected' : ''}>🔽 Low</option>
                    <option value="medium" ${item.priority === 'medium' ? 'selected' : ''}>➡️ Medium</option>
                    <option value="high" ${item.priority === 'high' ? 'selected' : ''}>🔼 High</option>
                </select>
            </div>`;
        
        const itemActions = `
            <div class="item-actions">
                <button class="btn btn-edit" data-action="edit">
                    <span>✏️</span>
                    Edit
                </button>
                ${!isActiveSession && item.status !== 'completed' ? 
                    `<button class="btn btn-status btn-reading" data-action="start-reading">📖 Start Reading Session</button>` : ''}
                ${isActiveSession ? 
                    `<button class="btn btn-status btn-completed" data-action="end-reading">⏸️ End Reading Session</button>` : ''}
                <button class="btn btn-status btn-delete" data-action="delete">🗑️ Delete</button>
            </div>`;
        
        li.innerHTML = `
            <div class="item-main-content">
                <div class="item-header">
                    <div class="item-title-section">
                        ${title}
                        ${url}
                    </div>
                    <div class="item-controls">
                        ${priorityDropdown}
                        ${statusDropdown}
                    </div>
                </div>
                ${tagsHtml}
                ${progressBar}
                ${readingStats}
                ${notesHtml}
                ${itemActions}
            </div>
        `;
        
        // Add event listeners for buttons
        li.querySelectorAll('.btn-status').forEach(button => {
            button.addEventListener('click', () => {
                const action = button.dataset.action;
                if (action === 'delete') {
                    this.handleDeleteItem(item.id);
                } else if (action === 'start-reading') {
                    this.startReadingSession(item.id);
                } else if (action === 'end-reading') {
                    this.endReadingSession();
                }
            });
        });

        // Add event listener for status change
        const statusSelect = li.querySelector('.status-select');
        if (statusSelect) {
            statusSelect.addEventListener('change', (e) => {
                const newStatus = e.target.value;
                if (newStatus !== item.status) {
                    if (isActiveSession && newStatus !== 'reading') {
                        this.endReadingSession();
                    }
                    this.handleStatusChange(item.id, newStatus);
                }
            });
        }

        // Add event listener for progress slider
        const progressSlider = li.querySelector('.progress-slider');
        const progressFill = li.querySelector('.progress-fill');
        const progressInput = li.querySelector('.progress-input');
        const progressLabel = li.querySelector('.progress-label');

        if (progressSlider) {
            progressSlider.addEventListener('input', (e) => {
                const progress = parseInt(e.target.value, 10);
                progressFill.style.width = `${progress}%`;
                progressInput.value = progress;
                progressLabel.textContent = `${progress}%`;
            });

            progressSlider.addEventListener('change', (e) => {
                const progress = parseInt(e.target.value, 10);
                this.updateProgress(item.id, progress);
            });
        }

        // Update existing progress input event listener
        if (progressInput) {
            progressInput.addEventListener('change', (e) => {
                const progress = parseInt(e.target.value, 10);
                progressSlider.value = progress;
                progressFill.style.width = `${progress}%`;
                progressLabel.textContent = `${progress}%`;
                this.updateProgress(item.id, progress);
            });
        }
        
        // Add priority change listener
        const prioritySelect = li.querySelector('.priority-select');
        if (prioritySelect) {
            prioritySelect.addEventListener('change', (e) => {
                this.handlePriorityChange(item.id, e.target.value);
            });
        }
        
        // Add edit button event listener
        li.querySelector('[data-action="edit"]').addEventListener('click', () => {
            this.openEditModal(item);
        });
        
        // Add notes toggle functionality
        const notesToggle = li.querySelector('.notes-toggle');
        if (notesToggle) {
            notesToggle.addEventListener('click', () => {
                const notesSection = notesToggle.closest('.item-notes');
                notesSection.classList.toggle('notes-collapsed');
            });
        }
        
        return li;
    }
    
    renderItems() {
        if (!this.itemsList) return;
        
        const filteredItems = this.getFilteredItems();
        this.itemsList.innerHTML = '';
        
        if (filteredItems.length === 0) {
            const emptyState = document.createElement('li');
            emptyState.className = 'reading-item';
            emptyState.innerHTML = `
                <p style="text-align: center; color: var(--secondary-color); padding: 2rem;">
                    No items to display 🤷‍♂️
                </p>
            `;
            this.itemsList.appendChild(emptyState);
            return;
        }
        
        filteredItems.forEach((item, index) => {
            const itemElement = this.createItemElement(item);
            this.itemsList.appendChild(itemElement);
            
            // Stagger animation for items
            requestAnimationFrame(() => {
                itemElement.style.opacity = '0';
                itemElement.style.transform = 'translateY(20px)';
                itemElement.style.transition = 'all 0.3s ease';
                
                setTimeout(() => {
                    itemElement.style.opacity = '1';
                    itemElement.style.transform = 'translateY(0)';
                }, index * 50);
            });
        });
    }

    clearSearch() {
        if (this.searchInput) {
            this.searchInput.value = '';
            this.searchQuery = '';
            this.toggleSearchClear();
            this.renderItems();
            this.searchInput.focus();
        }
    }

    toggleSearchClear() {
        if (this.searchClear) {
            this.searchClear.classList.toggle('visible', this.searchInput.value.length > 0);
        }
    }

    startReadingSession(itemId) {
        // End any existing session first
        this.endReadingSession();
        
        const item = this.items.find(item => item.id === itemId);
        if (item) {
            // Start new session
            this.activeReadingSession = {
                itemId,
                startTime: Date.now(),
                timer: setInterval(() => this.updateReadingTime(itemId), 1000)
            };
            
            // Update item status if needed
            if (item.status === 'unread') {
                item.status = 'reading';
            }
            
            item.lastRead = new Date().toISOString();
            this.saveItems();
            this.renderItems();
        }
    }

    endReadingSession() {
        if (this.activeReadingSession) {
            // Clear the timer
            clearInterval(this.activeReadingSession.timer);
            
            // Save the session
            const item = this.items.find(item => item.id === this.activeReadingSession.itemId);
            if (item) {
                const duration = Math.floor((Date.now() - this.activeReadingSession.startTime) / 1000);
                item.timeSpent = (item.timeSpent || 0) + duration;
                
                // Ensure readingSessions array exists
                if (!Array.isArray(item.readingSessions)) {
                    item.readingSessions = [];
                }
                
                item.readingSessions.push({
                    startTime: new Date(this.activeReadingSession.startTime).toISOString(),
                    duration: duration,
                    endTime: new Date().toISOString()
                });
            }
            
            this.activeReadingSession = null;
            this.saveItems();
            this.renderItems();
            
            // Check achievements after ending session
            this.achievementManager.checkAchievements();
        }
    }

    updateReadingTime(itemId) {
        const item = this.items.find(item => item.id === itemId);
        if (item && this.activeReadingSession) {
            const currentSessionTime = Math.floor((Date.now() - this.activeReadingSession.startTime) / 1000);
            const totalTime = (item.timeSpent || 0) + currentSessionTime;
            
            // Update the time displays in real-time
            const itemElement = document.querySelector(`[data-id="${itemId}"]`);
            if (itemElement) {
                const activeTimer = itemElement.querySelector('.active-timer');
                const totalTimeDisplay = itemElement.querySelector('.total-time');
                
                if (activeTimer) {
                    activeTimer.textContent = `⏱️ Current session: ${this.formatTime(currentSessionTime)}`;
                }
                if (totalTimeDisplay) {
                    totalTimeDisplay.textContent = `📚 Total time: ${this.formatTime(totalTime)}`;
                }
            }
        }
    }

    updateProgress(itemId, progress) {
        const item = this.items.find(item => item.id === itemId);
        if (item) {
            item.progress = Math.min(Math.max(0, progress), 100);
            if (item.progress === 100) {
                item.status = 'completed';
                this.endReadingSession();
            }
            this.saveItems();
            this.renderItems();
            
            // Check achievements after updating progress
            this.achievementManager.checkAchievements();
        }
    }

    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0s';
        
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes}m ${remainingSeconds}s`;
        }
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    async loadChartJS() {
        // Load Chart.js dynamically
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = () => this.initializeChart();
        document.head.appendChild(script);
    }

    toggleStatsPanel() {
        this.statsPanel.classList.toggle('show');
        if (this.statsPanel.classList.contains('show')) {
            this.updateStats();
        }
    }

    togglePriorityFilter(priority) {
        const button = document.querySelector(`.priority-btn[data-priority="${priority}"]`);
        
        if (this.activePriorities.has(priority)) {
            this.activePriorities.delete(priority);
            button.classList.remove('active');
        } else {
            this.activePriorities.add(priority);
            button.classList.add('active');
        }
        
        this.renderItems();
        this.updateActiveFilters();
    }

    handlePriorityChange(id, newPriority) {
        const item = this.items.find(item => item.id === id);
        if (item) {
            const itemElement = document.querySelector(`[data-id="${id}"]`);
            if (itemElement) {
                // Animate priority change
                itemElement.style.transition = 'all 0.3s ease';
                itemElement.style.transform = 'scale(0.95)';
                itemElement.style.opacity = '0.5';
                
                setTimeout(() => {
                    item.priority = newPriority;
                    this.saveItems();
                    this.renderItems();
                }, 300);
            }
        }
    }

    toggleFilterPanel() {
        this.filterPanel.classList.toggle('show');
        this.filterToggle.classList.toggle('active');
        this.updateActiveFilters();
    }

    updateActiveFilters() {
        if (!this.activeFilterTags) return;
        
        const activeFilters = [];
        
        // Status filter
        if (this.currentFilter !== 'all') {
            activeFilters.push({
                type: 'status',
                value: this.currentFilter,
                icon: this.currentFilter === 'unread' ? '📥' : this.currentFilter === 'reading' ? '📖' : '✅'
            });
        }
        
        // Priority filters
        this.activePriorities.forEach(priority => {
            activeFilters.push({
                type: 'priority',
                value: priority,
                icon: priority === 'low' ? '🔽' : priority === 'medium' ? '➡️' : '🔼'
            });
        });
        
        // Progress filter
        if (this.progressFilter.min > 0 || this.progressFilter.max < 100) {
            activeFilters.push({
                type: 'progress',
                value: `${this.progressFilter.min}% - ${this.progressFilter.max}%`,
                icon: '📊'
            });
        }
        
        // Date filter
        if (this.dateFilter.from || this.dateFilter.to) {
            const dateRange = [];
            if (this.dateFilter.from) dateRange.push(this.formatDate(this.dateFilter.from));
            if (this.dateFilter.to) dateRange.push(this.formatDate(this.dateFilter.to));
            activeFilters.push({
                type: 'date',
                value: dateRange.join(' - '),
                icon: '📅'
            });
        }
        
        // Tags filter
        this.activeTags.forEach(tag => {
            activeFilters.push({
                type: 'tag',
                value: tag,
                icon: '#'
            });
        });
        
        if (activeFilters.length === 0) {
            this.activeFilterTags.innerHTML = 'No active filters';
            return;
        }
        
        this.activeFilterTags.innerHTML = activeFilters.map(filter => `
            <span class="active-filter-tag">
                ${filter.icon} ${filter.value}
                <span class="remove" data-type="${filter.type}" data-value="${filter.value}">×</span>
            </span>
        `).join('');
        
        // Add event listeners for remove buttons
        this.activeFilterTags.querySelectorAll('.remove').forEach(removeBtn => {
            removeBtn.addEventListener('click', (e) => {
                const type = e.target.dataset.type;
                const value = e.target.dataset.value;
                this.removeFilter(type, value);
            });
        });
    }
    
    removeFilter(type, value) {
        switch (type) {
            case 'status':
                this.handleFilter('all');
                break;
            case 'priority':
                this.togglePriorityFilter(value);
                break;
            case 'progress':
                this.progressFilter = { min: 0, max: 100 };
                if (this.minProgress && this.maxProgress) {
                    this.minProgress.value = 0;
                    this.maxProgress.value = 100;
                    this.minProgressValue.textContent = '0%';
                    this.maxProgressValue.textContent = '100%';
                }
                break;
            case 'date':
                this.dateFilter = { from: null, to: null };
                if (this.dateFrom && this.dateTo) {
                    this.dateFrom.value = '';
                    this.dateTo.value = '';
                }
                break;
            case 'tag':
                this.toggleTagFilter(value);
                break;
        }
        
        this.renderItems();
    }
    
    toggleAchievementsPanel() {
        this.achievementsPanel.classList.toggle('show');
        if (this.achievementsPanel.classList.contains('show')) {
            this.renderAchievements();
        }
    }
    
    renderAchievements() {
        if (!this.achievementsGrid) return;
        
        const progress = this.achievementManager.getProgress();
        
        // Update level info
        const levelBadge = document.querySelector('.level-badge');
        const levelTitle = document.querySelector('.level-title');
        const levelPoints = document.querySelector('.level-points');
        const levelProgressFill = document.querySelector('.level-progress-fill');
        
        if (levelBadge) levelBadge.textContent = progress.level;
        if (levelTitle) levelTitle.textContent = `Level ${progress.level}`;
        if (levelPoints) {
            const pointsInCurrentLevel = progress.points % 100;
            levelPoints.textContent = `${pointsInCurrentLevel} / 100 points`;
            if (levelProgressFill) {
                levelProgressFill.style.width = `${pointsInCurrentLevel}%`;
            }
        }
        
        // Render achievement cards
        this.achievementsGrid.innerHTML = this.achievementManager.achievements
            .map(achievement => `
                <div class="achievement-card ${achievement.earned ? 'earned' : 'locked'}">
                    <div class="achievement-icon">${achievement.icon}</div>
                    <div class="achievement-info">
                        <div class="achievement-title">${achievement.title}</div>
                        <div class="achievement-description">${achievement.description}</div>
                        <div class="achievement-meta">
                            <div class="achievement-points">+${achievement.points} points</div>
                            ${achievement.earned 
                                ? `<div class="achievement-date">Earned ${this.formatDate(achievement.earnedDate)}</div>`
                                : '<div class="achievement-date">Locked</div>'
                            }
                        </div>
                    </div>
                </div>
            `)
            .join('');
    }

    resetFilters() {
        // Reset status filter
        this.currentFilter = 'all';
        this.filterButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.filter === 'all');
        });
        
        // Reset priority filters
        this.activePriorities.clear();
        document.querySelectorAll('.priority-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Reset progress filters
        if (this.minProgress && this.maxProgress) {
            this.minProgress.value = 0;
            this.maxProgress.value = 100;
            this.minProgressValue.textContent = '0%';
            this.maxProgressValue.textContent = '100%';
            this.progressFilter = { min: 0, max: 100 };
        }
        
        // Reset date filters
        if (this.dateFrom && this.dateTo) {
            this.dateFrom.value = '';
            this.dateTo.value = '';
            this.dateFilter = { from: null, to: null };
        }
        
        // Reset tags
        this.activeTags.clear();
        this.updateTagsFilter();
        
        // Reset tags mode
        const anyRadio = document.querySelector('input[name="tags-mode"][value="any"]');
        if (anyRadio) {
            anyRadio.checked = true;
            this.tagsMode = 'any';
        }
        
        // Reset sort
        if (this.sortSelect) {
            this.sortSelect.value = 'date-added-desc';
            this.sortBy = 'date-added-desc';
        }
        
        // Update UI and render items
        this.updateActiveFilters();
        this.renderItems();
    }

    openEditModal(item) {
        this.currentEditId = item.id;
        
        // Set form values
        this.editTitle.value = item.title;
        this.editUrl.value = item.url || '';
        
        // Set notes content
        this.editNotes.innerHTML = item.notes || '';
        
        // Set priority
        const priorityInput = document.querySelector(`input[name="edit-priority"][value="${item.priority}"]`);
        if (priorityInput) {
            priorityInput.checked = true;
        }
        
        // Set tags
        this.editCurrentTags = new Set(item.tags);
        this.renderEditTagsPreview();
        
        // Show modal with animation
        this.editModal.classList.add('show');
        this.editTitle.focus();
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }
    
    closeEditModal() {
        this.editModal.classList.remove('show');
        this.currentEditId = null;
        this.editCurrentTags.clear();
        this.editForm.reset();
        this.editNotes.innerHTML = '';
        document.body.style.overflow = '';
    }
    
    addEditTag(tagName) {
        if (!tagName) return;
        
        // Remove any special characters and convert to lowercase
        tagName = tagName.toLowerCase().replace(/[^\w\s]/g, '').trim();
        
        if (tagName && !this.editCurrentTags.has(tagName)) {
            this.editCurrentTags.add(tagName);
            this.renderEditTagsPreview();
        }
        
        this.editTags.value = '';
    }
    
    renderEditTagsPreview() {
        if (!this.editTagsPreview) return;
        
        this.editTagsPreview.innerHTML = '';
        this.editCurrentTags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'tag';
            tagElement.innerHTML = `
                ${tag}
                <span class="remove-tag" data-tag="${tag}">×</span>
            `;
            
            tagElement.querySelector('.remove-tag').addEventListener('click', () => {
                this.editCurrentTags.delete(tag);
                this.renderEditTagsPreview();
            });
            
            this.editTagsPreview.appendChild(tagElement);
        });
    }
    
    handleEditSubmit() {
        const item = this.items.find(item => item.id === this.currentEditId);
        if (!item) return;
        
        // Get form values
        const newTitle = this.editTitle.value.trim();
        const newUrl = this.editUrl.value.trim();
        const newPriority = document.querySelector('input[name="edit-priority"]:checked')?.value || 'medium';
        const newTags = Array.from(this.editCurrentTags);
        const newNotes = this.editNotes.innerHTML;
        
        // Update item
        item.title = newTitle;
        item.url = newUrl;
        item.priority = newPriority;
        item.tags = newTags;
        item.notes = newNotes;
        
        // Save and update UI
        this.saveItems();
        this.renderItems();
        
        // Show success feedback
        const saveBtn = this.editForm.querySelector('button[type="submit"]');
        const originalText = saveBtn.textContent;
        saveBtn.innerHTML = '✅ Saved!';
        saveBtn.disabled = true;
        
        setTimeout(() => {
            this.closeEditModal();
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }, 1000);
    }

    updateStatusCounts() {
        // Count items by status
        const counts = {
            unread: 0,
            reading: 0,
            completed: 0
        };
        
        this.items.forEach(item => {
            counts[item.status]++;
        });
        
        // Update the DOM
        document.getElementById('unread-count').textContent = counts.unread;
        document.getElementById('reading-count').textContent = counts.reading;
        document.getElementById('completed-count').textContent = counts.completed;
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new ReadingTracker();
}); 