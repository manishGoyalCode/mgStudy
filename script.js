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
        
        this.initialize();
    }
    
    initialize() {
        this.loadItems();
        this.setupEventListeners();
        this.renderItems();
        this.updateStats();
        this.updateTagsFilter();
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
        
        if (title) {
            const newItem = new ReadingItem(title, url, tags);
            this.items.unshift(newItem);
            this.saveItems();
            
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
            
            // Reset form and tags
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
        
        // Filter by status
        if (this.currentFilter !== 'all') {
            filteredItems = filteredItems.filter(item => item.status === this.currentFilter);
        }
        
        // Filter by active tags
        if (this.activeTags.size > 0) {
            filteredItems = filteredItems.filter(item => 
                Array.from(this.activeTags).every(tag => item.tags.includes(tag))
            );
        }

        // Filter by search query
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filteredItems = filteredItems.filter(item => {
                const titleMatch = item.title.toLowerCase().includes(query);
                const urlMatch = item.url.toLowerCase().includes(query);
                const tagsMatch = item.tags.some(tag => tag.toLowerCase().includes(query));
                return titleMatch || urlMatch || tagsMatch;
            });

            // Update search stats
            if (this.searchStats) {
                this.searchStats.textContent = `${filteredItems.length} results`;
            }
        } else if (this.searchStats) {
            this.searchStats.textContent = '';
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
                <span class="reading-time">${this.formatTime(totalTime)}</span>
                ${item.lastRead ? `<span class="last-read">Last read: ${this.formatDate(item.lastRead)}</span>` : ''}
            </div>`;
        
        const tagsHtml = item.tags.length > 0 
            ? `<div class="item-tags">
                ${item.tags.map(tag => `<span class="tag">#${this.highlightSearchMatches(tag)}</span>`).join('')}
               </div>`
            : '';
        
        li.innerHTML = `
            <div class="item-main-content">
                <div class="item-header">
                    <div class="item-title-section">
                        ${title}
                        ${url}
                    </div>
                    ${statusDropdown}
                </div>
                ${tagsHtml}
                ${progressBar}
                ${readingStats}
                <div class="item-actions">
                    ${!isActiveSession && item.status !== 'completed' ? 
                        `<button class="btn btn-status btn-reading" data-action="start-reading">📖 Start Reading Session</button>` : ''}
                    ${isActiveSession ? 
                        `<button class="btn btn-status btn-completed" data-action="end-reading">⏸️ End Reading Session</button>` : ''}
                    <button class="btn btn-status btn-delete" data-action="delete">🗑️ Delete</button>
                </div>
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

        // Add event listener for progress input
        const progressInput = li.querySelector('.progress-input');
        if (progressInput) {
            progressInput.addEventListener('change', (e) => {
                const progress = parseInt(e.target.value, 10);
                this.updateProgress(item.id, progress);
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
        }
    }

    updateReadingTime(itemId) {
        const item = this.items.find(item => item.id === itemId);
        if (item && this.activeReadingSession) {
            const currentSessionTime = Math.floor((Date.now() - this.activeReadingSession.startTime) / 1000);
            const totalTime = (item.timeSpent || 0) + currentSessionTime;
            
            // Update the time display in real-time
            const timeDisplay = document.querySelector(`[data-id="${itemId}"] .reading-time`);
            if (timeDisplay) {
                timeDisplay.textContent = this.formatTime(totalTime);
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
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new ReadingTracker();
}); 