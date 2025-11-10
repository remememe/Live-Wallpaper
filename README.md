# Live Background Plugin  

Live Background Plugin helps you customize Obsidian’s appearance
by adding animated or static backgrounds to your notes.

> **Supported file formats:** `.jpg`, `.jpeg`, `.png`, `.gif`, `.mp4`, `.webm`, `.avif`

---

## Features

### General
- **Configurations** two types of settings are available:  
  - *Global configuration* applies to all wallpapers  
  - *Individual configuration* applies to each wallpaper separately  
- **Reposition** adjusts the size and placement of your background  
- **Visual Effects** adjust opacity, blur, brightness, contrast, etc 
- **Wallpaper History** lets you easily switch back to previously used wallpapers  
- **Full-Resolution Wallpapers** use images in their original size without downscaling  
- **Reset Options** reset all settings to default for the current or global configuration (all settings in the General section)

> **Important:** In this version, the old `wallpaper` folder has been replaced with a new `wallpapers` folder.  
> Any unused files in the old folder **may have been automatically removed** during the migration process.

---

## Scheduled Themes

- **Day/Night Mode**  
  Automatically switch between two wallpapers based on local time (default: 8 AM / 8 PM).  
  You can configure the exact time ranges in the plugin settings.

- **Weekly Mode**  
  Assign a different wallpaper for each day of the week.  
  Wallpapers are automatically changed based on the current weekday.

---

## Transparency settings
*Advanced customization may require CSS knowledge.*

- **Advanced Transparency**  
  Define CSS selectors and override theme variables to control transparency.
  This helps the wallpaper appear behind the interface without making the text hard to read.
  - Define CSS selectors and override theme variables, for example:  
    - `--background-primary`  
    - `--col-bckg-mainpanels`  
- **Custom Background Color**  
  - Pick any color to use in the plugin’s styling logic  

  > **Note:** The built-in CSS editor has been removed in recent versions of the plugin to prevent accidental overwriting of user styles during updates. For full control, please use the snippet method described above.
  
- **Modal Background Effects**
  Customize how modals look.
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