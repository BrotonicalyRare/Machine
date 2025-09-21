/**
 * Database Manager using SQL.js for dynamic video management
 * Provides local storage with GitHub API sync for real-time updates
 */
class VideoDatabase {
    constructor() {
        console.log('VideoDatabase constructor called');
        this.db = null;
        this.isInitialized = false;
        this.githubConfig = {
            owner: null,
            repo: null,
            token: null,
            branch: 'main'
        };
        console.log('VideoDatabase constructor completed, githubConfig:', this.githubConfig);
    }

    /**
     * Initialize the database
     */
    async init() {
        console.log('VideoDatabase init called');
        try {
            // Load SQL.js from CDN
            const SQL = await this.loadSQLJS();
            console.log('SQL.js loaded successfully');
            
            // Try to load existing database from localStorage
            const savedDB = localStorage.getItem('videoDB');
            if (savedDB) {
                const uint8Array = new Uint8Array(JSON.parse(savedDB));
                this.db = new SQL.Database(uint8Array);
                console.log('Loaded existing database from localStorage');
            } else {
                // Create new database
                this.db = new SQL.Database();
                this.createTables();
                console.log('Created new database');
            }
            
            // Load GitHub configuration from database
            this.loadGitHubConfig();
            console.log('Loaded GitHub config:', this.githubConfig);
            
            this.isInitialized = true;
            console.log('Database initialized successfully');
            console.log('Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this)));
            return true;
        } catch (error) {
            console.error('Failed to initialize database:', error);
            return false;
        }
    }

    /**
     * Load SQL.js library
     */
    async loadSQLJS() {
        return new Promise((resolve, reject) => {
            if (window.SQL) {
                resolve(window.SQL);
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js';
            script.onload = async () => {
                try {
                    const SQL = await initSqlJs({
                        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
                    });
                    window.SQL = SQL;
                    resolve(SQL);
                } catch (error) {
                    reject(error);
                }
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Create database tables
     */
    createTables() {
        const createVideosTable = `
            CREATE TABLE IF NOT EXISTS videos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                tag TEXT NOT NULL,
                src TEXT NOT NULL,
                thumbnail TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const createTagsTable = `
            CREATE TABLE IF NOT EXISTS tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                count INTEGER DEFAULT 0
            )
        `;

        const createConfigTable = `
            CREATE TABLE IF NOT EXISTS config (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        `;

        this.db.run(createVideosTable);
        this.db.run(createTagsTable);
        this.db.run(createConfigTable);
        
        // Add thumbnail column to existing databases
        try {
            this.db.run('ALTER TABLE videos ADD COLUMN thumbnail TEXT');
            console.log('Added thumbnail column to existing database');
        } catch (error) {
            // Column already exists or other error
            console.log('Thumbnail column already exists or could not be added');
        }
        
        console.log('Database tables created');
    }

    /**
     * Save database to localStorage
     */
    saveToStorage() {
        if (!this.db) return;
        
        const data = this.db.export();
        const array = Array.from(data);
        localStorage.setItem('videoDB', JSON.stringify(array));
    }

    /**
     * Import initial data from JSON
     */
    async importFromJSON(jsonData) {
        if (!this.isInitialized) {
            console.error('Database not initialized');
            return false;
        }

        try {
            // Clear existing data
            this.db.run('DELETE FROM videos');
            this.db.run('DELETE FROM tags');

            // Insert videos
            const insertVideo = this.db.prepare(`
                INSERT INTO videos (name, description, tag, src, thumbnail) 
                VALUES (?, ?, ?, ?, ?)
            `);

            const tagCounts = {};

            jsonData.videos.forEach(video => {
                // Auto-generate thumbnail for YouTube videos if not provided
                let thumbnail = video.thumbnail;
                if (!thumbnail && this.isYouTubeVideo(video.src)) {
                    thumbnail = this.getYouTubeThumbnail(video.src);
                }
                
                insertVideo.run([
                    video.name, 
                    video.desc || video.description, 
                    video.tag, 
                    video.src, 
                    thumbnail || null
                ]);
                tagCounts[video.tag] = (tagCounts[video.tag] || 0) + 1;
            });

            // Insert tags with counts
            const insertTag = this.db.prepare(`
                INSERT INTO tags (name, count) VALUES (?, ?)
            `);

            Object.entries(tagCounts).forEach(([tag, count]) => {
                insertTag.run([tag, count]);
            });

            this.saveToStorage();
            console.log('Data imported successfully');
            return true;
        } catch (error) {
            console.error('Failed to import data:', error);
            return false;
        }
    }

    /**
     * Get all videos
     */
    getAllVideos() {
        if (!this.isInitialized) return [];
        
        const stmt = this.db.prepare('SELECT * FROM videos ORDER BY created_at DESC');
        const videos = [];
        
        while (stmt.step()) {
            const row = stmt.getAsObject();
            videos.push({
                id: row.id,
                name: row.name,
                desc: row.description,
                tag: row.tag,
                src: row.src,
                thumbnail: row.thumbnail,
                created_at: row.created_at
            });
        }
        
        stmt.free();
        return videos;
    }

    /**
     * Get all tags
     */
    getAllTags() {
        if (!this.isInitialized) return [];
        
        const stmt = this.db.prepare('SELECT name FROM tags ORDER BY name');
        const tags = [];
        
        while (stmt.step()) {
            const row = stmt.getAsObject();
            tags.push(row.name);
        }
        
        stmt.free();
        return tags;
    }

    /**
     * Add new video
     */
    addVideo(name, description, tag, src, thumbnail = null) {
        if (!this.isInitialized) return false;

        try {
            // Auto-generate thumbnail for YouTube videos if not provided
            if (!thumbnail && this.isYouTubeVideo(src)) {
                thumbnail = this.getYouTubeThumbnail(src);
            }

            // Insert video
            const stmt = this.db.prepare(`
                INSERT INTO videos (name, description, tag, src, thumbnail) 
                VALUES (?, ?, ?, ?, ?)
            `);
            stmt.run([name, description, tag, src, thumbnail]);
            stmt.free();

            // Update tag count
            this.updateTagCount(tag);
            
            this.saveToStorage();
            
            // Trigger sync with GitHub if configured
            this.syncWithGitHub();
            
            return true;
        } catch (error) {
            console.error('Failed to add video:', error);
            return false;
        }
    }

    /**
     * Remove video
     */
    removeVideo(id) {
        if (!this.isInitialized) return false;

        try {
            // Get tag before deletion
            const getTagStmt = this.db.prepare('SELECT tag FROM videos WHERE id = ?');
            getTagStmt.bind([id]);
            
            let tag = null;
            if (getTagStmt.step()) {
                tag = getTagStmt.getAsObject().tag;
            }
            getTagStmt.free();

            // Delete video
            const deleteStmt = this.db.prepare('DELETE FROM videos WHERE id = ?');
            deleteStmt.run([id]);
            deleteStmt.free();

            // Update tag count
            if (tag) {
                this.updateTagCount(tag);
            }

            this.saveToStorage();
            
            // Trigger sync with GitHub if configured
            this.syncWithGitHub();
            
            return true;
        } catch (error) {
            console.error('Failed to remove video:', error);
            return false;
        }
    }

    /**
     * Delete video by name and src (for admin interface)
     */
    deleteVideo(name, src) {
        if (!this.isInitialized) return false;

        try {
            console.log('deleteVideo called with:', { name, src });
            
            // Find and delete video by name and src
            const deleteStmt = this.db.prepare('DELETE FROM videos WHERE name = ? AND src = ?');
            deleteStmt.run([name, src]);
            deleteStmt.free();

            // Get number of affected rows from the database object
            const changes = this.db.getRowsModified();
            console.log('Delete operation affected rows:', changes);

            if (changes > 0) {
                // Update tag counts
                this.updateTagCounts();
                this.saveToStorage();
                
                // Trigger sync with GitHub if configured
                this.syncWithGitHub();
                
                console.log('Video deleted successfully');
                return true;
            } else {
                console.log('No video found with matching name and src');
                return false;
            }
        } catch (error) {
            console.error('Failed to delete video:', error);
            return false;
        }
    }

    /**
     * Update tag count
     */
    updateTagCount(tagName) {
        // Count videos with this tag
        const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM videos WHERE tag = ?');
        countStmt.bind([tagName]);
        
        let count = 0;
        if (countStmt.step()) {
            count = countStmt.getAsObject().count;
        }
        countStmt.free();

        if (count > 0) {
            // Update existing tag
            const updateStmt = this.db.prepare(`
                INSERT OR REPLACE INTO tags (name, count) VALUES (?, ?)
            `);
            updateStmt.run([tagName, count]);
            updateStmt.free();
        } else {
            // Remove tag if no videos
            const deleteStmt = this.db.prepare('DELETE FROM tags WHERE name = ?');
            deleteStmt.run([tagName]);
            deleteStmt.free();
        }
    }

    /**
     * Update all tag counts (for cleanup after deletions)
     */
    updateTagCounts() {
        try {
            // Get all unique tags from videos
            const tagsStmt = this.db.prepare('SELECT DISTINCT tag FROM videos');
            const activeTags = [];
            
            while (tagsStmt.step()) {
                const row = tagsStmt.getAsObject();
                activeTags.push(row.tag);
            }
            tagsStmt.free();

            // Clear all tags
            this.db.run('DELETE FROM tags');

            // Recalculate counts for active tags
            activeTags.forEach(tag => {
                this.updateTagCount(tag);
            });

            console.log('Updated tag counts for:', activeTags);
        } catch (error) {
            console.error('Failed to update tag counts:', error);
        }
    }

    /**
     * Configure GitHub integration
     */
    configureGitHub(owner, repo, token) {
        console.log('configureGitHub called with:', { owner, repo, token: token ? '***hidden***' : 'empty' });
        
        this.githubConfig.owner = owner;
        this.githubConfig.repo = repo;
        this.githubConfig.token = token;
        
        console.log('Updated githubConfig:', { 
            owner: this.githubConfig.owner, 
            repo: this.githubConfig.repo, 
            token: this.githubConfig.token ? '***hidden***' : 'empty' 
        });
        
        // Save to database
        this.db.run('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', ['github_owner', owner]);
        this.db.run('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', ['github_repo', repo]);
        this.db.run('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', ['github_token', token]);
        
        this.saveToStorage();
        console.log('GitHub configuration saved to database and storage');
    }

    /**
     * Load GitHub configuration
     */
    loadGitHubConfig() {
        const configs = ['github_owner', 'github_repo', 'github_token'];
        const stmt = this.db.prepare('SELECT key, value FROM config WHERE key IN (?, ?, ?)');
        stmt.bind(configs);
        
        while (stmt.step()) {
            const row = stmt.getAsObject();
            switch (row.key) {
                case 'github_owner':
                    this.githubConfig.owner = row.value;
                    break;
                case 'github_repo':
                    this.githubConfig.repo = row.value;
                    break;
                case 'github_token':
                    this.githubConfig.token = row.value;
                    break;
            }
        }
        stmt.free();
    }

    /**
     * Sync with GitHub repository
     */
    async syncWithGitHub() {
        if (!this.githubConfig.owner || !this.githubConfig.repo || !this.githubConfig.token) {
            console.log('GitHub not configured, skipping sync');
            return false;
        }

        try {
            const videos = this.getAllVideos();
            const tags = this.getAllTags();
            
            const jsonData = {
                videos: videos.map(v => ({
                    name: v.name,
                    desc: v.desc,
                    tag: v.tag,
                    src: v.src,
                    thumbnail: v.thumbnail
                })),
                tags: tags
            };

            await this.updateGitHubFile('videos.json', JSON.stringify(jsonData, null, 2));
            console.log('Synced with GitHub successfully');
            return true;
        } catch (error) {
            console.error('Failed to sync with GitHub:', error);
            return false;
        }
    }

    /**
     * Update file on GitHub
     */
    async updateGitHubFile(filename, content) {
        const { owner, repo, token, branch } = this.githubConfig;
        
        // Get current file SHA
        const getResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filename}`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        let sha = null;
        if (getResponse.ok) {
            const fileData = await getResponse.json();
            sha = fileData.sha;
        }

        // Update file
        const updateResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filename}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Update ${filename} via Video Tube admin`,
                content: btoa(unescape(encodeURIComponent(content))),
                branch: branch,
                ...(sha && { sha })
            })
        });

        if (!updateResponse.ok) {
            throw new Error(`GitHub API error: ${updateResponse.status}`);
        }

        return await updateResponse.json();
    }

    /**
     * Test GitHub connection
     */
    async testGitHubConnection() {
        console.log('database.js testGitHubConnection called');
        console.log('Current githubConfig:', this.githubConfig);
        
        if (!this.githubConfig.owner || !this.githubConfig.repo || !this.githubConfig.token) {
            console.log('GitHub configuration incomplete');
            return false;
        }

        try {
            const { owner, repo, token } = this.githubConfig;
            console.log('Testing GitHub API with:', { owner, repo, token: '***hidden***' });
            
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            console.log('GitHub API response status:', response.status);
            console.log('GitHub API response ok:', response.ok);
            
            if (response.ok) {
                const repoData = await response.json();
                console.log('Repository found:', repoData.full_name);
            } else {
                const errorText = await response.text();
                console.log('GitHub API error:', errorText);
            }

            return response.ok;
        } catch (error) {
            console.error('GitHub connection test failed:', error);
            return false;
        }
    }

    /**
     * Export data as JSON
     */
    exportAsJSON() {
        const videos = this.getAllVideos();
        const tags = this.getAllTags();
        
        return {
            videos: videos.map(v => ({
                name: v.name,
                desc: v.desc,
                tag: v.tag,
                src: v.src,
                thumbnail: v.thumbnail
            })),
            tags: tags
        };
    }

    /**
     * Check if URL is a YouTube video
     */
    isYouTubeVideo(url) {
        return url.includes('youtube.com') || url.includes('youtu.be');
    }

    /**
     * Extract YouTube video ID from URL
     */
    getYouTubeVideoId(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    /**
     * Get YouTube thumbnail URL
     */
    getYouTubeThumbnail(url) {
        const videoId = this.getYouTubeVideoId(url);
        if (videoId) {
            return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
        }
        return null;
    }

    /**
     * Get video thumbnail with fallback
     */
    getVideoThumbnail(video) {
        // Use custom thumbnail if provided
        if (video.thumbnail) {
            return video.thumbnail;
        }
        
        // Auto-generate for YouTube videos
        if (this.isYouTubeVideo(video.src)) {
            return this.getYouTubeThumbnail(video.src);
        }
        
        // Default placeholder for other video types
        return 'https://via.placeholder.com/320x180/1976d2/white?text=Video+Thumbnail';
    }
}

// Global database instance
window.videoDB = new VideoDatabase();