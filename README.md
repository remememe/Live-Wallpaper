# Live Background Plugin  

Live Background Plugin helps you customize Obsidian’s appearance
by adding animated or static backgrounds to your notes.

## Features
- **Supports videos (MP4, WebM), GIFs, and images** — use your own files or choose from built-in templates
- **Wallpaper history** — easily switch back to previously used wallpapers
- **Full-resolution wallpapers** — allows you to use images in their original size without downscaling 
- **Reposition** — adjust the size and placement of your background
- **Customizable effects:**
  - Opacity (0–80%)
  - Blur (0–20px)
  - Brightness
  - Adjustable playback speed *(videos only)*
- **Low CPU usage** — optimized for smooth performance

> **Important:** In this version, the old `wallpaper` folder has been replaced with a new `wallpapers` folder.  
> Any unused files in the old folder **may have been automatically removed** during the migration process.

## Scheduled Themes

- **Day/Night Mode**  
  Automatically switch between two wallpapers based on local time (default: 8 AM / 8 PM).  
  You can configure the exact time ranges in the plugin settings.

- **Weekly Mode**  
  Assign a different wallpaper for each day of the week.  
  Wallpapers are automatically changed based on the current weekday.

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

  > **Note:** The built-in CSS editor has been removed in recent versions of the plugin to prevent accidental overwriting of user styles during updates. For full control, please use the snippet method described above.
- **Modal Background Effects**
  Customize how modals look when advanced options are enabled.
  - Choose from blur, dim, or combined effects
  - Adjust blur intensity and dim opacity with sliders
  
  ---

  ### Optional: UI-based CSS customization

  If you're looking for a graphical interface to tweak theme/plugin variables, try these community plugins:
  
  - **Style Settings**
  - **CSS Snippets**

  > **Tip:** You may need to use developer tools (Ctrl + Shift + I) to inspect selectors and variables in your theme.


---

## Installation  
## From Git
1. Download the latest release from the Releases page.
2. Copy the files `main.js`, `manifest.json`, and `styles.css` to the following directory:
   `/plugins/live-wallpaper/`  

---

## From within Obsidian
You can also install the plugin directly through the Community Plugins section in Obsidian.

![](https://github.com/remememe/Live-Wallpaper/blob/main/Assets/sc4.png)
![](https://github.com/remememe/Live-Wallpaper/blob/main/Assets/sc2.png)
![](https://github.com/remememe/Live-Wallpaper/blob/main/Assets/sc1.gif)
![](https://github.com/remememe/Live-Wallpaper/blob/main/Assets/sc3.png)


**Dark Theme Recommended**  

*Requires version 1.1.0+ and works on both desktop (Windows/macOS/Linux) and mobile*

> **Note:** The plugin now supports mobile devices in addition to desktop platforms.

## Contribution

Contributions are welcome! If you'd like to help improve the plugin whether by fixing bugs, adding new features, or optimizing performance feel free to:

- Open an issue if you find a bug or have a suggestion
- Submit a pull request on GitHub

### Getting Started with Development

```bash
git clone https://github.com/remememe/Live-Wallpaper.git
cd Live-Wallpaper
npm install
npm run build
```

Your contributions are greatly appreciated!!