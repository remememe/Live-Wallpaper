# Live Background Plugin  

**Bring your notes to life** with animated wallpapers (e.g., swaying forests, flowing clouds, or cosmic visuals).  

## Features  
  - **Supports videos (mp4, webm)/GIFs/images** – use your own files or built-in templates  
  - **Customizable effects**:  
    - Opacity (0-80%)  
    - Blur (0-20px)  
    - Brightness/contrast    
  - **Low CPU usage** – optimized for smooth performance  

## Experimental options
*Deep customization for advanced users (basic CSS knowledge recommended).*

- **Advanced Transparency**  
  Define CSS selectors and override theme variables to control transparency.
  This helps the wallpaper appear behind the interface without making the text hard to read, improving both readability and aesthetics.
  - Define CSS selectors and override theme variables, for example:  
    - `.theme-dark` → `--background-primary`  
    - `.theme-dark` → `--col-bckg-mainpanels`  
- **Custom Background Color**  
  - Pick any color to use in the plugin’s styling logic  
  - Quickly reset to default with one click  
- **Built-in CSS Editor**  
  - Live-edit your own CSS directly in the UI (real-time preview)  

> **Note:** You may need to use dev tools (Ctrl + Shift + I) to inspect selectors and variables in your theme.

---
## Installation  
1. Download the latest release from Releases 
2. Copy `main.js` and `manifest.json` to:  
   `/plugins/live-wallpaper/`  

![](https://github.com/remememe/Live-Wallpaper/blob/main/Assets/sc2.png)
![](https://github.com/remememe/Live-Wallpaper/blob/main/Assets/sc1.gif)
![](https://github.com/remememe/Live-Wallpaper/blob/main/Assets/sc3.png)

**Dark Theme Recommended**  

*Requires version 1.1.0+ and desktop (Windows/macOS/Linux).*  