# Personal Profile Website

A modern, responsive personal profile website built with React, Vite, and Tailwind CSS. Features a beautiful design with smooth animations, dark mode support, and a comprehensive showcase of skills, projects, and experience.

## ✨ Features

- **Modern Design**: Clean, professional design with smooth animations
- **Responsive**: Fully responsive across all devices
- **Dark Mode**: Toggle between light and dark themes
- **Smooth Animations**: Powered by Framer Motion
- **Interactive Components**: Hover effects and micro-interactions
- **Contact Form**: Functional contact form with validation
- **Project Showcase**: Filterable project gallery
- **Skills Display**: Animated skill bars and technology grid
- **SEO Optimized**: Proper meta tags and semantic HTML

## 🚀 Tech Stack

- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **React Router** - Client-side routing
- **Heroicons** - Beautiful SVG icons

## 📦 Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd linturomusic
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and visit `http://localhost:5173`

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── Navbar.jsx      # Navigation bar
│   ├── Hero.jsx        # Hero section
│   ├── About.jsx       # About section
│   ├── Skills.jsx      # Skills section
│   ├── Projects.jsx    # Projects showcase
│   ├── Contact.jsx     # Contact form
│   └── Footer.jsx      # Footer
├── App.jsx             # Main app component
├── main.jsx           # App entry point
├── index.css          # Global styles
└── App.css            # App-specific styles
```

## 🎨 Customization

### Personal Information
Update the following files with your information:

1. **Hero Section** (`src/components/Hero.jsx`):
   - Change "Your Name" to your actual name
   - Update the tagline and description

2. **About Section** (`src/components/About.jsx`):
   - Update personal description
   - Modify experience and education
   - Change statistics and interests

3. **Skills Section** (`src/components/Skills.jsx`):
   - Update skill categories and proficiency levels
   - Modify technology list

4. **Projects Section** (`src/components/Projects.jsx`):
   - Add your actual projects
   - Update project images, descriptions, and links

5. **Contact Section** (`src/components/Contact.jsx`):
   - Update contact information
   - Modify social media links

6. **Navigation** (`src/components/Navbar.jsx`):
   - Change "Your Name" in the logo

### Styling
- Colors: Modify the color scheme in `tailwind.config.js`
- Fonts: Change fonts in `tailwind.config.js` and `src/index.css`
- Animations: Customize animations in `src/index.css`

## 🌟 Key Features Explained

### Dark Mode
The website includes a built-in dark mode toggle that persists across sessions. The theme is managed through CSS classes and React state.

### Responsive Design
Built with mobile-first approach using Tailwind CSS responsive utilities. All components adapt seamlessly to different screen sizes.

### Animations
Smooth scroll-triggered animations using Framer Motion's `whileInView` prop. Hover effects and micro-interactions enhance user experience.

### Contact Form
Functional contact form with validation and loading states. Currently shows a success message - integrate with your preferred backend service.

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
- [Framer Motion](https://www.framer.com/motion/) for smooth animations
- [Heroicons](https://heroicons.com/) for beautiful icons
- [Unsplash](https://unsplash.com/) for placeholder images

## 📞 Support

If you have any questions or need help customizing the website, feel free to reach out!

---

**Happy coding! 🚀**
