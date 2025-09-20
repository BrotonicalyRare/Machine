# Video Tube - GitHub Pages Edition

A modern, responsive video browsing platform built for GitHub Pages using HTML, CSS, and JavaScript.

## ✨ Features

- 📺 **Video Gallery**: Browse videos in a modern, responsive grid layout
- 🏷️ **Category Filtering**: Dynamic navigation with category-based filtering  
- � **Video Submission**: Users can submit videos for review
- �🔐 **Admin Panel**: Secure admin interface for managing videos and submissions
- � **Dynamic Database**: Client-side database with GitHub sync
- �📱 **Mobile-Friendly**: Fully responsive design
- 🚀 **GitHub Pages Ready**: Completely static, no server required

## 🚀 Quick Start

### Deploy to GitHub Pages

1. **Fork or Clone** this repository
2. **Enable GitHub Pages** in repository settings:
   - Go to Settings → Pages
   - Select source: "Deploy from a branch"
   - Choose branch: `main`
   - Select folder: `/ (root)`
3. **Access your site** at `https://yourusername.github.io/repository-name`

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/video-tube.git
   cd video-tube
   ```

2. Serve locally (any HTTP server will work):
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js http-server
   npx http-server
   
   # Using PHP (if available)
   php -S localhost:8000
   ```

3. Open `http://localhost:8000` in your browser

## File Structure

## 📁 Project Structure

```
video-tube/
├── index.html          # Main page with video gallery
├── submit.html         # Video submission form for users
├── login.html          # Admin login page
├── admin.html          # Admin panel for managing videos & submissions
├── watch.html          # Individual video player page
├── database.js         # Client-side database management
├── style.css           # Responsive CSS styles
├── videos.json         # Video data storage
├── .gitignore          # Git ignore file
├── _config.yml         # Jekyll configuration for GitHub Pages
└── README.md           # Documentation
```

## 👥 User Features

### Video Submission
1. **Click** "Submit a Video" button on main page
2. **Fill form** with video details (title and URL required)
3. **Submit** for admin review
4. **Get confirmation** and auto-redirect to main page

### Video Browsing
- Browse videos by category in the sidebar
- Click video cards to watch
- Mobile-responsive design

## 🔐 Admin Access

- **URL**: `/admin.html`
- **Password**: Contact administrator for secure password
- **Features**: Add/delete videos, GitHub sync, dynamic updates 
- **Security**: Password is hashed using SHA-256 for better security
- **To Change**: Generate new hash and update both `login.html` and `admin.html`

**Generate new password hash:**
```bash
echo -n "yournewpassword" | sha256sum
```

### Adding Videos

1. Go to `/login.html` and enter the admin password
2. Use the admin panel to add new videos
3. Fill in: name, description, tag, and video URL
4. **Important**: After adding videos, click "Download Updated videos.json"
5. Replace the `videos.json` file in your repository with the downloaded file
6. Commit and push the changes to update your live site

### Video URL Formats

The system accepts:
- YouTube watch URLs: `https://www.youtube.com/watch?v=VIDEO_ID`
- YouTube share URLs: `https://youtu.be/VIDEO_ID`
- Direct embed URLs: `https://www.youtube.com/embed/VIDEO_ID`
- Any other embeddable video URL

## Customization

### Changing Colors/Styling
Edit `style.css` to customize the appearance:
- Primary color: `#1976d2` (search and replace to change theme)
- Background: `#f9f9f9`
- Cards: `white` with subtle shadows

### Adding Video Categories
Categories (tags) are automatically generated from the videos in `videos.json`. Just add videos with new tags and they'll appear in the navigation.

### Modifying Admin Password
Generate a new SHA-256 hash and update both files:

```bash
# Generate hash for new password
echo -n "yournewpassword" | sha256sum
```

Then update the `ADMIN_PASS_HASH` constant in both:
- `login.html` 
- `admin.html`

```javascript
const ADMIN_PASS_HASH = "your_new_hash_here";
```

## Data Format

The `videos.json` file structure:
```json
{
  "videos": [
    {
      "name": "Video Title",
      "desc": "Video description",
      "tag": "category",
      "src": "https://www.youtube.com/embed/VIDEO_ID"
    }
  ],
  "tags": ["category1", "category2", "category3"]
}
```

## Security Notes

✅ **Improved Security**: 
- Admin password is now hashed using SHA-256
- Login tokens provide additional session security
- 24-hour session expiration

⚠️ **Important**: Since this runs on GitHub Pages (client-side only), the password hash is still visible in the source code. This is suitable for:
- Personal projects
- Internal tools
- Demonstrations
- Low-security scenarios

For production sites with sensitive content, consider:
- Using a headless CMS (Strapi, Contentful)
- Implementing proper backend authentication
- Using GitHub's API with personal access tokens

## Browser Compatibility

- ✅ Chrome/Edge 60+
- ✅ Firefox 55+
- ✅ Safari 11+
- ✅ Mobile browsers
- ⚠️ Internet Explorer: Not supported (uses modern JavaScript)

## Troubleshooting

### Videos not loading
- Check that `videos.json` is valid JSON
- Ensure video URLs are accessible and embeddable
- Check browser console for errors

### Admin panel issues
- Clear browser storage: `localStorage.clear()` in console
- Check that you're using the correct password
- Ensure you're accessing via HTTP/HTTPS (not file://)

### GitHub Pages deployment issues
- Ensure `index.html` is in the root directory
- Check that all file paths are relative
- Wait a few minutes after pushing changes

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add some feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

If you encounter any issues or have questions:
1. Check the troubleshooting section above
2. Open an issue on GitHub
3. Check that your setup matches the requirements

---

**Happy video sharing! 🎬**