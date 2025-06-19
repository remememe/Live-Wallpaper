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

  > **Note:** The built-in CSS editor has been removed in recent versions of the plugin to prevent accidental overwriting of user styles during updates. For full control, please use the snippet method described above.

  ---

  ### Optional: UI-based CSS customization

  If you're looking for a graphical interface to tweak theme/plugin variables, try these community plugins:
  
  - **Style Settings**
  - **CSS Snippets**

  > **Tip:** You may need to use developer tools (Ctrl + Shift + I) to inspect selectors and variables in your theme.


---
## Installation  
1. Download the latest release from Releases 
2. Copy `main.js` and `manifest.json` to:  
   `/plugins/live-wallpaper/`  

![](https://github.com/remememe/Live-Wallpaper/blob/main/Assets/sc4.png)
![](https://github.com/remememe/Live-Wallpaper/blob/main/Assets/sc2.png)
![](https://github.com/remememe/Live-Wallpaper/blob/main/Assets/sc1.gif)
![](https://github.com/remememe/Live-Wallpaper/blob/main/Assets/sc3.png)


**Dark Theme Recommended**  

*Requires version 1.1.0+ and works on both desktop (Windows/macOS/Linux) and mobile*

> **Note:** The plugin now supports mobile devices in addition to desktop platforms.

*Contribution*
Contributions are welcome! If you'd like to 
help improve the plugin, feel free to open an issue or 
submit a pull request on GitHub. Bug fixes, new features, performance improvements!!.