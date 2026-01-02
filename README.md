# ZenFocus HUD
**A Cinematic, ADHD-Friendly Productivity Dashboard**

ZenFocus is a **Minimalist "Heads-Up Display" (HUD)** designed to help you enter and maintain a flow state. It combines an ambient video background with a powerful Pomodoro timer and essential productivity tools, all in a distraction-free interface.

![ZenFocus HUD](image.png)

## Key Features

### Advanced Pomodoro Timer
- **Circular Visuals:** Beautiful, animated progress ring.
- **Flow State Tools:** "Focus Intent" input (`I am focusing on...`) to anchor your attention.
- **Smart Breaks:** Configurable "Long Break" interval (e.g., after 4 sessions).
- **Audio Feedback:** Subtle sounds for start, stop, and completion.
- **Background Integrity:** Works perfectly even when the tab is inactive.

### Cinematic Atmosphere
- **Ambient Video:** Defaults to a curated Lofi Hip Hop playlist (YouTube).
- **Playlist Support:** Paste any YouTube Playlist URL to loop your own vibes.
- **Glassmorphism:** Premium frosted glass UI that blends into the background.

### Full PWA Support
- **Installable:** Works as a standalone desktop application (Mac/Windows/Linux).
- **Offline Capable:** Loads instantly even without an internet connection.
- **Notifications:** Desktop alerts for timer completion.

### Smart Integration
- **Quick Links:** Customizable dock for your most-used sites.
- **Embedded Tools:** Direct access to Google Tasks and Google Keep via smart links.

## Getting Started

### Option 1: The Easy Way (Install)
1. Open the deployed application (Link coming soon).
2. Click the **Install** icon in your browser's address bar.
3. Launch **ZenFocus** from your desktop or dock.

### Option 2: Run Locally (Developers)
Clone the repository and install dependencies:
```bash
git clone https://github.com/yourusername/zenfocus.git
cd zenfocus
npm install
```

Run the development server:
```bash
npm run dev
```

Build for production (enables PWA & offline support):
```bash
npm run build
npm start
```

## Built With
- **Next.js 16** (App Router)
- **Tailwind CSS 4** (Styling)
- **Framer Motion** (Animations)
- **Lucide React** (Icons)
- **PWA** via `@ducanh2912/next-pwa`

## Integration Guide
Want to plug ZenFocus into another app? You have two options:

### Option A: The "Component" Method (Next.js / React)
Best for deep integration.
1.  Copy the `src/components` folder to your project.
2.  Install dependencies: `npm install framer-motion lucide-react date-fns`.
3.  Import and use the `SplitView` component:
    ```tsx
    import SplitView from '@/components/Layout/SplitView';
    export default function FocusPage() {
      return <SplitView />;
    }
    ```

### Option B: The "Iframe" Method (Any Stack)
Best for quick setup. Deploy ZenFocus (e.g., to Vercel) and embed it:
```html
<iframe 
  src="https://your-zenfocus-deploy.vercel.app" 
  style="width: 100vw; height: 100vh; border: none;"
  allow="fullscreen; autoplay; encrypted-media"
></iframe>
```

## License
This project is open source and available under the [Apache 2.0 License](LICENSE).
