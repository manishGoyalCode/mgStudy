class Achievement {
    constructor(id, title, description, icon, condition, points) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.icon = icon;
        this.condition = condition;
        this.points = points;
        this.earned = false;
        this.earnedDate = null;
    }
}

class AchievementManager {
    constructor(readingTracker) {
        this.readingTracker = readingTracker;
        this.achievements = [];
        this.userProgress = {
            totalPoints: 0,
            level: 1,
            achievements: new Set()
        };
        
        this.initializeAchievements();
        this.loadProgress();
    }

    initializeAchievements() {
        this.achievements = [
            new Achievement(
                'first_book',
                'First Steps',
                'Add your first reading item',
                '📚',
                (stats) => stats.totalItems >= 1,
                10
            ),
            new Achievement(
                'reading_streak',
                'Reading Streak',
                'Read for 5 consecutive days',
                '🔥',
                (stats) => stats.readingStreak >= 5,
                50
            ),
            new Achievement(
                'time_spent',
                'Dedicated Reader',
                'Spend 2 hours reading',
                '⏱️',
                (stats) => stats.totalTimeSpent >= 7200, // 2 hours in seconds
                30
            ),
            new Achievement(
                'completion_master',
                'Completion Master',
                'Complete 5 reading items',
                '✅',
                (stats) => stats.completedItems >= 5,
                40
            ),
            new Achievement(
                'organization_pro',
                'Organization Pro',
                'Use 5 different tags',
                '🏷️',
                (stats) => stats.uniqueTags >= 5,
                20
            ),
            new Achievement(
                'speed_reader',
                'Speed Reader',
                'Complete a reading item in under 30 minutes',
                '⚡',
                (stats) => stats.fastestCompletion <= 1800, // 30 minutes in seconds
                25
            ),
            new Achievement(
                'priority_planner',
                'Priority Planner',
                'Have items in all priority levels',
                '📊',
                (stats) => stats.usedAllPriorities,
                15
            ),
            new Achievement(
                'night_owl',
                'Night Owl',
                'Read after 10 PM',
                '🦉',
                (stats) => stats.lateNightReading,
                20
            ),
            new Achievement(
                'early_bird',
                'Early Bird',
                'Read before 8 AM',
                '🌅',
                (stats) => stats.earlyMorningReading,
                20
            ),
            new Achievement(
                'bookworm',
                'Bookworm',
                'Read 10 different items',
                '🪱',
                (stats) => stats.totalItems >= 10,
                60
            )
        ];
    }

    loadProgress() {
        const savedProgress = localStorage.getItem('achievementProgress');
        if (savedProgress) {
            const parsed = JSON.parse(savedProgress);
            this.userProgress = {
                ...parsed,
                achievements: new Set(parsed.achievements)
            };
            
            // Update earned status of achievements
            this.achievements.forEach(achievement => {
                if (this.userProgress.achievements.has(achievement.id)) {
                    achievement.earned = true;
                    achievement.earnedDate = parsed.earnedDates?.[achievement.id] || null;
                }
            });
        }
    }

    saveProgress() {
        const progressToSave = {
            ...this.userProgress,
            achievements: Array.from(this.userProgress.achievements),
            earnedDates: {}
        };

        // Save earned dates
        this.achievements.forEach(achievement => {
            if (achievement.earned) {
                progressToSave.earnedDates[achievement.id] = achievement.earnedDate;
            }
        });

        localStorage.setItem('achievementProgress', JSON.stringify(progressToSave));
    }

    calculateStats() {
        const items = this.readingTracker.items;
        const now = new Date();

        // Calculate reading streak
        const sessions = items.flatMap(item => item.readingSessions || []);
        const sessionDates = new Set(sessions.map(s => s.startTime.split('T')[0]));
        let streak = 0;
        let currentDate = new Date();
        while (sessionDates.has(currentDate.toISOString().split('T')[0])) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        }

        return {
            totalItems: items.length,
            completedItems: items.filter(item => item.status === 'completed').length,
            readingStreak: streak,
            totalTimeSpent: items.reduce((total, item) => total + (item.timeSpent || 0), 0),
            uniqueTags: new Set(items.flatMap(item => item.tags || [])).size,
            fastestCompletion: Math.min(...items
                .filter(item => item.status === 'completed' && item.timeSpent)
                .map(item => item.timeSpent)),
            usedAllPriorities: new Set(items.map(item => item.priority)).size === 3,
            lateNightReading: sessions.some(s => {
                const hour = new Date(s.startTime).getHours();
                return hour >= 22 || hour < 4;
            }),
            earlyMorningReading: sessions.some(s => {
                const hour = new Date(s.startTime).getHours();
                return hour >= 5 && hour < 8;
            })
        };
    }

    checkAchievements() {
        const stats = this.calculateStats();
        let newAchievements = false;

        this.achievements.forEach(achievement => {
            if (!achievement.earned && achievement.condition(stats)) {
                achievement.earned = true;
                achievement.earnedDate = new Date().toISOString();
                this.userProgress.achievements.add(achievement.id);
                this.userProgress.totalPoints += achievement.points;
                this.updateLevel();
                newAchievements = true;
                this.showAchievementNotification(achievement);
            }
        });

        if (newAchievements) {
            this.saveProgress();
        }
    }

    updateLevel() {
        // Level up every 100 points
        this.userProgress.level = Math.floor(this.userProgress.totalPoints / 100) + 1;
    }

    showAchievementNotification(achievement) {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-content">
                <h3>${achievement.title}</h3>
                <p>${achievement.description}</p>
                <div class="achievement-points">+${achievement.points} points</div>
            </div>
        `;

        document.body.appendChild(notification);
        requestAnimationFrame(() => notification.classList.add('show'));

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    getProgress() {
        return {
            earnedAchievements: this.achievements.filter(a => a.earned),
            totalAchievements: this.achievements.length,
            points: this.userProgress.totalPoints,
            level: this.userProgress.level
        };
    }
} 