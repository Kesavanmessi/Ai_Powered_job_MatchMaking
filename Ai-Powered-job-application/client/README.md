# AI JobMatch Frontend

This is the React frontend for the AI-powered job matchmaking platform, built with Vite and Tailwind CSS.

## 🚀 Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Build for production**:
   ```bash
   npm run build
   ```

4. **Preview production build**:
   ```bash
   npm run preview
   ```

## 🛠 Tech Stack

- **React 18** - Modern React with hooks
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **PostCSS** - CSS processing with autoprefixer
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls
- **React Hot Toast** - Beautiful notifications
- **Lucide React** - Beautiful icons

## 📁 Project Structure

```
client/
├── public/           # Static assets
├── src/
│   ├── components/   # Reusable components (.jsx)
│   ├── contexts/     # React contexts (.jsx)
│   ├── pages/        # Page components (.jsx)
│   ├── App.jsx       # Main app component
│   ├── index.jsx     # Entry point
│   └── index.css     # Global styles with Tailwind
├── index.html        # HTML template
├── vite.config.js    # Vite configuration
├── tailwind.config.js # Tailwind configuration
├── postcss.config.js  # PostCSS configuration
└── package.json      # Dependencies and scripts
```

## 🎨 Styling

The project uses Tailwind CSS with custom configuration:

- **Custom Colors**: Primary and secondary color palettes
- **Custom Animations**: Fade-in, slide-up, and bounce effects
- **Component Classes**: Pre-built button, card, and input styles
- **Line Clamping**: Built-in text truncation utilities
- **Responsive Design**: Mobile-first approach
- **Dark Mode Ready**: Prepared for future dark mode implementation

## 🔧 Development

### Hot Module Replacement (HMR)
Vite provides lightning-fast HMR for instant updates during development.

### CSS Processing
- Tailwind CSS for utility-first styling
- PostCSS for autoprefixer and CSS optimization
- Custom component classes in `src/index.css`

### Code Quality
- ESLint for code linting
- React-specific linting rules
- Pre-commit hooks (can be added)

## 🚀 Deployment

The build process creates an optimized production bundle in the `dist/` directory.

### Build Commands
```bash
# Development
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

### Environment Variables
The frontend connects to the backend API through Vite's proxy configuration in `vite.config.js`.

## 📱 Features

- **Responsive Design**: Works on all device sizes
- **Fast Loading**: Optimized bundle with Vite
- **Modern UI**: Clean, professional interface
- **Accessibility**: WCAG compliant components
- **Performance**: Optimized images and lazy loading

## 🎯 Development Tips

1. **Tailwind IntelliSense**: Install the Tailwind CSS IntelliSense VS Code extension
2. **Component Structure**: Keep components small and focused
3. **State Management**: Use React Context for global state
4. **API Calls**: All API calls go through the proxy to the backend
5. **Styling**: Use Tailwind utilities and custom component classes

## 🔗 Backend Integration

The frontend communicates with the backend API through:
- Proxy configuration in `vite.config.js`
- Axios for HTTP requests
- JWT tokens for authentication
- Error handling with React Hot Toast
