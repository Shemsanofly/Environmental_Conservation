# Global Environmental Conservation Initiative (GECI)

A professional website for an environmental conservation organization dedicated to protecting nature and promoting sustainable practices worldwide.

## Project Overview

GECI is a fully responsive, modern web application showcasing an environmental conservation organization's mission, initiatives, team, and contact information.

## Features

### Core Pages
- **Home (index.html)** - Landing page with mission overview and impact statistics
- **About Us (about.html)** - Organization mission, vision, values, and team information
- **Initiatives (initiatives.html)** - Detailed information about ongoing conservation projects
- **Contact (contact.html)** - Contact form and communication channels

### Additional Pages
- **Privacy Policy** - Comprehensive data protection policies
- **Terms of Service** - Legal terms and conditions
- **404 Error Page** - Custom error page with navigation options

### Technical Features
- Responsive design with mobile-first approach
- Bootstrap CSS framework integration
- Professional navigation with hamburger menu for mobile
- Hero sections with call-to-action buttons
- Form validation and submission handling
- SEO optimization (meta tags, robots.txt, sitemap.xml)
- Accessibility features (ARIA labels, semantic HTML)
- Social media integration ready
- Performance-optimized structure

## Directory Structure

```
OUR PROJECT/
├── index.html                 # Home page
├── about.html                 # About page
├── initiatives.html           # Initiatives page
├── contact.html               # Contact page
├── privacy-policy.html        # Privacy Policy page
├── terms-of-service.html      # Terms of Service page
├── 404.html                   # 404 Error page
├── robots.txt                 # SEO robot directives
├── sitemap.xml                # XML sitemap for search engines
├── css/
│   ├── bootstrap.css          # Bootstrap framework
│   └── style.css              # Custom styles
├── js/
│   ├── main.js                # Main JavaScript functionality
│   └── contact-form.js        # Contact form handling
└── images/
    ├── logo.jpg               # Organization logo
    ├── 2.avif                 # Featured image
    └── [other images]
```

## Getting Started

### Prerequisites
- Web server with PHP support (recommended)
- Modern web browser (Chrome, Firefox, Safari, Edge)
- HTTPS certificate (recommended for production)

### Installation

1. **Clone or Download** the project files
```bash
git clone https://github.com/yourusername/geci-website.git
cd geci-website
```

2. **Local Setup** (if using local server)
   - Place files in your web server's root directory
   - Ensure `.htaccess` is configured (if using Apache)
   - Update `sitemap.xml` with actual domain URLs

3. **Update Configuration**
   - Replace `https://www.example.com` with your actual domain in `sitemap.xml` and `robots.txt`
   - Update contact email addresses in legal pages
   - Add your organization's actual logo and images

## Backend (Node + SQLite)

This project now includes a lightweight backend that stores:
- Contact form submissions
- Donation intents
- Sponsorship intents

### Setup

1. Create a `.env` file based on `.env.example`
2. Install dependencies
3. Run the server

Add payment keys for Flutterwave in `.env`:

```
FLW_SECRET_KEY=your_flutterwave_secret_key
```

### Admin Dashboard

Open `/admin` in the browser and enter your admin key to view user data.

## SEO Optimization

### Implemented Features
- **robots.txt** - Guides search engine crawlers
- **sitemap.xml** - Helps search engines index all pages
- **Meta Tags** - Descriptions and keywords on all pages
- **Semantic HTML** - Proper heading hierarchy and structure
- **Mobile Responsive** - Ensures mobile indexing compatibility
- **Fast Loading** - Optimized images and CSS

### Recommended Next Steps
- Submit sitemap to Google Search Console
- Set up Google Analytics
- Implement structured data (Schema.org JSON-LD)
- Enable HTTPS/SSL certificate
- Monitor Core Web Vitals

## Accessibility Features

- Semantic HTML5 elements
- ARIA labels for navigation
- Proper color contrast ratios
- Keyboard navigation support
- Alt text for all images
- Form validation and error messages

## Performance Optimization

To further improve performance:
1. Compress images using tools like TinyPNG
2. Minify CSS and JavaScript files
3. Implement lazy loading for images
4. Enable gzip compression on server
5. Use a CDN for static assets
6. Add caching headers

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari 14+, Chrome Mobile)

## Deployment

### Development
```bash
# Local testing
python -m http.server 8000
# Access at http://localhost:8000
```

### Production
1. Use HTTPS/SSL certificate
2. Configure `.htaccess` for URL rewriting
3. Set up email backend for contact forms
4. Enable security headers
5. Set up regular backups
6. Monitor website analytics

## Contact Form Backend

The contact form now submits to the Node backend and stores data in SQLite. You can access messages from the admin dashboard at `/admin`.

## Maintenance

### Regular Tasks
- Update content regularly (especially initiatives)
- Monitor contact form submissions
- Check website analytics
- Test all links and forms
- Update security headers
- Review and update privacy policy annually

### Security Best Practices
- Keep software updated
- Use strong passwords
- Enable HTTPS
- Regular security audits
- Implement CSRF protection on forms

## Contributing

To contribute to this project:
1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Support

For questions or support:
- Email: support@geci.org
- Visit: contact.html page
- Phone: +255 123 456 789

## Changelog

### Version 1.0 (February 2026)
- Initial release
- Core pages and navigation
- Contact form
- SEO optimization
- Legal pages (Privacy Policy, Terms)
- Mobile responsive design

## Future Enhancements

- Blog/News section
- Donation payment integration
- Newsletter subscription system
- Testimonials/Reviews carousel
- Event management system
- Volunteer registration
- Photo gallery with lightbox
- Multi-language support
- Admin dashboard

---

**Last Updated:** February 3, 2026
