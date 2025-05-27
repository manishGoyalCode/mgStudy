// Reading Item class to represent each reading item
class ReadingItem {
    constructor(title, url, tags = []) {
        this.id = Date.now().toString();
        this.title = title;
        this.url = url;
        this.tags = tags;
        this.status = 'unread';
        this.dateAdded = new Date().toISOString();
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
        
        // Stats Elements
        this.unreadCount = document.getElementById('unread-count');
        this.readingCount = document.getElementById('reading-count');
        this.completedCount = document.getElementById('completed-count');
        
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
        const stats = this.items.reduce((acc, item) => {
            acc[item.status]++;
            return acc;
        }, { unread: 0, reading: 0, completed: 0 });
        
        if (this.unreadCount) this.unreadCount.textContent = `📥 Unread: ${stats.unread}`;
        if (this.readingCount) this.readingCount.textContent = `📖 Reading: ${stats.reading}`;
        if (this.completedCount) this.completedCount.textContent = `✅ Completed: ${stats.completed}`;
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
        if (itemElement) {
            // Animate deletion
            itemElement.style.transition = 'all 0.3s ease';
            itemElement.style.transform = 'translateX(100px)';
            itemElement.style.opacity = '0';
            
            setTimeout(() => {
                this.items = this.items.filter(item => item.id !== id);
                this.saveItems();
                this.renderItems();
            }, 300);
        }
    }
    
    createItemElement(item) {
        const li = document.createElement('li');
        li.className = 'reading-item';
        li.dataset.id = item.id;
        
        const title = item.url 
            ? `<h3><a href="${item.url}" target="_blank" rel="noopener noreferrer">${item.title}</a></h3>`
            : `<h3>${item.title}</h3>`;
            
        const url = item.url 
            ? `<span class="item-url">${item.url}</span>`
            : '';
            
        const statusEmoji = {
            unread: '📥',
            reading: '📖',
            completed: '✅'
        };
            
        const statusBadge = `<span class="status-badge status-${item.status}">${statusEmoji[item.status]} ${item.status.charAt(0).toUpperCase() + item.status.slice(1)}</span>`;
        
        // Create tags HTML
        const tagsHtml = item.tags.length > 0 
            ? `<div class="item-tags">
                ${item.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
               </div>`
            : '';
        
        li.innerHTML = `
            ${title}
            ${url}
            ${statusBadge}
            ${tagsHtml}
            <div class="item-actions">
                ${item.status !== 'reading' ? 
                    `<button class="btn btn-status btn-reading" data-action="reading">📖 Mark as Reading</button>` : ''}
                ${item.status !== 'completed' ? 
                    `<button class="btn btn-status btn-completed" data-action="completed">✅ Mark as Completed</button>` : ''}
                <button class="btn btn-status btn-delete" data-action="delete">🗑️ Delete</button>
            </div>
        `;
        
        // Add event listeners for buttons
        li.querySelectorAll('.btn-status').forEach(button => {
            button.addEventListener('click', () => {
                const action = button.dataset.action;
                if (action === 'delete') {
                    this.handleDeleteItem(item.id);
                } else {
                    this.handleStatusChange(item.id, action);
                }
            });
        });
        
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
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new ReadingTracker();
}); 