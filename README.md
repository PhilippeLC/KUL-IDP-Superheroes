# 🦸 KUL IDP Superheroes

Transform the KU Leuven Central Login page into a rotating superhero wallpaper experience powered by Tampermonkey and GitHub.

This repository contains a personal userscript and a collection of superhero wallpapers that replace the default background shown on the KU Leuven Central Login page inside the user's own browser.

> [!IMPORTANT]
> This is an unofficial personal side and hobby project. It is not affiliated with, endorsed by, maintained by, or supported by KU Leuven, Associatie KU Leuven, Art4Campus, Tampermonkey, GitHub, Marvel, DC Comics, or the respective copyright holders.
>
> Use this userscript entirely at your own risk.

---

## 🎨 Why This Project Exists

The KU Leuven Central Login page regularly features artwork from the Art4Campus initiative. Art4Campus showcases creative work by students and staff across the KU Leuven Association and brings art into the daily study and work environment.

This hobby project offers a playful visual alternative for users who would occasionally prefer something different from the standard Art4Campus background. The goal is simply to make the Central Login page a little more varied and fun by displaying a rotating selection of superhero wallpapers.

Learn more on the [Art4Campus 2026 information page](https://associatie.kuleuven.be/p/art4campus/wedstrijd-2026/art4campus-2026-info).

The userscript only changes the background displayed locally in the browser. It does not modify the KU Leuven Identity Provider, the authentication process, login forms, credentials, or KU Leuven systems.

---

## ✨ Features

- 🎲 Shows a random superhero wallpaper when the login page opens
- 🔄 Changes the wallpaper automatically every 15 seconds
- ✨ Uses smooth crossfade transitions without a white screen between images
- 🌑 Applies a subtle dark overlay for a more consistent appearance
- 🦸 Avoids showing wallpapers of the same hero consecutively where possible
- 🖥️ Scales wallpapers automatically for standard, widescreen, and ultrawide displays
- 📦 Retrieves the current wallpaper collection dynamically from the GitHub API
- 💾 Caches the last successfully retrieved complete wallpaper list in the browser
- 🛟 Uses the cached complete list when the GitHub API is temporarily unavailable or rate-limited
- 🖼️ Falls back to five fixed RAW wallpapers when no cache is available
- ➕ Automatically includes newly added JPG, JPEG, PNG, and WebP images after a successful repository refresh
- 🧾 Writes clear source, fallback, and error information to the browser console
- 🎨 Keeps the original IDP background available as the deepest visual fallback

---

## 🎬 How It Works

The userscript runs only on:

```text
https://idp.kuleuven.be/*
```

When the Central Login page opens, the script:

1. Creates two persistent background layers for smooth crossfades.
2. Requests the available wallpaper list from the public GitHub repository API.
3. Identifies each hero from the wallpaper filename.
4. Creates a randomized sequence that avoids consecutive appearances of the same hero where possible.
5. Immediately starts loading a random superhero wallpaper.
6. Preloads each next image before displaying it.
7. Crossfades between the two background layers.
8. Stores a successful complete repository list in the browser's local storage.
9. Uses the local cache or fixed backup selection if the GitHub API cannot be used.
10. Leaves the login form and authentication functionality unchanged.

Wallpapers are displayed with:

```css
background-size: cover;
background-position: center center;
background-repeat: no-repeat;
```

Because `cover` fills the available background area, a small part of an image may be cropped when the image and screen use different aspect ratios. This prevents empty bars and gives the login page a full-screen appearance.

---

## 🛡️ Reliability and Fallback Strategy

The script uses three wallpaper sources in priority order.

### 1. GitHub API

Under normal circumstances, the script requests the current image list from:

```text
https://api.github.com/repos/PhilippeLC/KUL-IDP-Superheroes/contents
```

A successful response provides the complete, current collection. The resulting wallpaper list is stored locally for later use.

### 2. Local browser cache

If the GitHub API is temporarily unavailable, rate-limited, returns an unexpected response, or cannot be reached, the script tries to use the last successfully cached complete wallpaper list.

The cache is stored under:

```text
kul-idp-superheroes-wallpaper-cache-v1
```

A cache older than seven days produces a console warning, but remains usable as a fallback. This allows the slideshow to continue even during a longer API interruption.

> [!NOTE]
> The cache stores the wallpaper list and URLs, not the image files themselves. The images are still loaded from GitHub's raw-content service.

### 3. Five fixed backup wallpapers

On a new browser or device, no local cache may exist yet. If the GitHub API also fails, the script uses this fixed selection:

- `Batman01.jpg`
- `Deadpool01.jpg`
- `Joker01.jpg`
- `Wolverine01.jpg`
- `WonderWoman01.jpg`

These backup images are loaded directly from `raw.githubusercontent.com` and still use the regular crossfade, dark overlay, scaling, and hero-aware rotation.

### GitHub API limits

An unauthenticated GitHub API request may return HTTP `403` or `429` when a rate limit or temporary restriction applies. This can be more noticeable on a shared network where multiple devices appear to GitHub under the same public IP address.

The script does not place a GitHub personal access token in the public userscript. Instead, it automatically falls back to the local cache or fixed backup selection.

---

## 🧾 Console Messages

Open the browser developer tools and select **Console** to see messages beginning with:

```text
[KU IDP Wallpapers]
```

Examples include:

```text
[KU IDP Wallpapers] GitHub API available. The current complete repository list is used.
[KU IDP Wallpapers] Source: GitHub API. 50 wallpapers available.
```

```text
[KU IDP Wallpapers] GitHub API limit or access restriction detected. HTTP 403.
[KU IDP Wallpapers] Switching to the locally cached complete wallpaper list.
```

```text
[KU IDP Wallpapers] No local cache available. Switching to the fixed backup selection of 5 wallpapers.
```

The exact number of wallpapers reported by the console depends on the current repository contents.

---

## 🚀 Installation

### Requirements

Install Tampermonkey for the browser being used:

- [Tampermonkey for Firefox](https://addons.mozilla.org/firefox/addon/tampermonkey/)
- [Tampermonkey for Microsoft Edge](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)
- [Tampermonkey for Google Chrome](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)

### Option 1: Direct installation

Open the userscript using the link below:

[Install the KU Leuven IDP Superheroes userscript](https://raw.githubusercontent.com/PhilippeLC/KUL-IDP-Superheroes/main/ChangeCentraleLoginWallpapers.user.js)

Because the filename ends in `.user.js`, Tampermonkey should recognize it as an installable userscript and display an installation page. Review the script and select **Install**.

### Option 2: Import from URL

If Tampermonkey does not open the installation page automatically:

1. Open the Tampermonkey **Dashboard**.
2. Open the **Utilities** tab.
3. Find **Import from URL**.
4. Paste the following address:

```text
https://raw.githubusercontent.com/PhilippeLC/KUL-IDP-Superheroes/main/ChangeCentraleLoginWallpapers.user.js
```

5. Select **Install**.
6. Confirm that the script is enabled.

> [!NOTE]
> Local-file access is not required. The userscript uses the public GitHub API for repository discovery and GitHub's raw-content service for image delivery.

---

## ✅ Verification

After installation:

1. Open a KU Leuven application that redirects to the Central Login page.
2. Confirm that a random superhero wallpaper appears.
3. Keep the login page open for at least 15 seconds.
4. Confirm that the current wallpaper crossfades into a wallpaper of another hero.
5. Open the Tampermonkey Dashboard and verify that **KU Leuven IDP Superheroes Slideshow** is enabled.
6. Optionally open the browser console and verify which wallpaper source is active.

If the original Art4Campus background remains visible, check that:

- Tampermonkey is enabled.
- The userscript is enabled.
- The current page matches `https://idp.kuleuven.be/*`.
- GitHub and `raw.githubusercontent.com` are reachable from the browser.

---

## ⚙️ Configuration

The main settings are near the top of `ChangeCentraleLoginWallpapers.user.js`.

### Slideshow interval

```javascript
const SLIDESHOW_INTERVAL = 15000;
```

The value is expressed in milliseconds. The default is 15 seconds.

### Crossfade duration

```javascript
const FADE_DURATION = 1500;
```

The default transition lasts 1.5 seconds.

### Dark overlay

```javascript
const OVERLAY_OPACITY = 0.12;
```

Suggested values:

| Value | Appearance |
|------:|------------|
| `0.08` | Very subtle |
| `0.12` | Recommended |
| `0.18` | Noticeably darker |

### Cache warning age

```javascript
const WALLPAPER_CACHE_MAX_AGE =
    7 * 24 * 60 * 60 * 1000;
```

The default warning threshold is seven days. An older cache remains usable as a fallback.

### Fixed backup selection

The emergency wallpaper list is defined in:

```javascript
const FALLBACK_WALLPAPERS = [
    // Five fixed RAW wallpapers
];
```

Keep these files in the repository if they are referenced by the fallback list.

---

## 🖼️ Adding Wallpapers

Upload additional wallpapers to the root of this repository.

Supported formats:

- `.jpg`
- `.jpeg`
- `.png`
- `.webp`

Use a consistent filename containing the hero name followed by a number:

```text
Batman01.jpg
Batman02.jpg
IronMan01.jpg
WonderWoman03.jpg
```

The trailing number is removed when the script identifies the hero:

```text
Batman01.jpg      -> Batman
Batman02.jpg      -> Batman
IronMan01.jpg     -> IronMan
WonderWoman03.jpg -> WonderWoman
```

This naming scheme allows the script to avoid showing the same hero twice in succession where possible.

New supported images are detected after the next successful GitHub API request. The refreshed complete list is then stored in the local browser cache.

> [!IMPORTANT]
> Adding a new image does not update an older cached list until the GitHub API can be reached successfully again. The fixed five-image backup selection is only changed by editing `FALLBACK_WALLPAPERS` in the userscript.

---

## 🦸 Included Characters

The current collection includes wallpapers featuring:

- Batman
- Black Widow
- Captain America
- Deadpool
- Harley Quinn
- Iron Man
- Joker
- Punisher
- Spider-Man
- Supergirl
- Superman
- Thor
- Venom
- Wolverine
- Wonder Woman

---

## 🔄 Userscript Updates

The userscript uses GitHub for its download and update locations:

```javascript
// @downloadURL https://raw.githubusercontent.com/PhilippeLC/KUL-IDP-Superheroes/main/ChangeCentraleLoginWallpapers.user.js
// @updateURL   https://raw.githubusercontent.com/PhilippeLC/KUL-IDP-Superheroes/main/ChangeCentraleLoginWallpapers.user.js
```

When publishing an updated script, also increase the metadata version:

```javascript
// @version 1.7
```

This allows Tampermonkey to distinguish the updated userscript from the installed version.

---

## 📁 Repository Structure

```text
KUL-IDP-Superheroes/
├── Batman01.jpg
├── Batman02.jpg
├── BlackWidow01.jpg
├── Deadpool01.jpg
├── IronMan01.jpg
├── Joker01.jpg
├── Wolverine01.jpg
├── WonderWoman01.jpg
├── ChangeCentraleLoginWallpapers.user.js
└── README.md
```

---

## 🔐 Privacy and Security

The userscript is intended to:

- Run only on the URL defined by its `@match` rule
- Retrieve the public repository contents from the GitHub API
- Load wallpaper images from GitHub's raw-content service
- Store the public wallpaper list and cache timestamp in browser local storage
- Modify only the visual background area of the Central Login page

The userscript is not intended to read, store, modify, or transmit usernames, passwords, authentication codes, or login-form data.

The script does not require local-file access and does not include a GitHub personal access token.

Always review a userscript before installing it. Browser extensions and userscripts execute code in the browser, so only install code that has been inspected and is trusted.

---

## ⚠️ Use at Your Own Risk

This repository is a personal side and hobby project created for experimentation, learning, and entertainment.

The userscript is provided **as is**, without warranties or guarantees of any kind. Use of the script is entirely at the user's own risk. The author is not responsible for browser issues, page-layout problems, loss of functionality, incompatibility, account issues, security-policy conflicts, API restrictions, or any other direct or indirect consequences resulting from its installation or use.

The KU Leuven Identity Provider, browser behavior, Tampermonkey, the GitHub API, GitHub's raw-content service, and the structure of the Central Login page may change. Such changes may cause the userscript to stop working or behave differently.

Disable or remove the userscript immediately if unexpected behavior occurs. The original KU Leuven Central Login background and behavior can be restored by disabling the userscript in Tampermonkey.

This project:

- Is not an official KU Leuven solution
- Is not a replacement for the standard Central Login page
- Is not supported by KU Leuven ICTS or another KU Leuven support service
- Does not provide additional authentication or security functionality
- Should not be presented or distributed as an officially approved customization

---

## ©️ Artwork, Trademarks, and Third-Party Content

This project is not affiliated with, endorsed by, maintained by, or supported by:

- KU Leuven
- Associatie KU Leuven
- Art4Campus
- Tampermonkey
- GitHub
- Marvel
- DC Comics
- The publishers, artists, creators, studios, or respective rights holders of the depicted characters and artwork

Superhero names, character designs, logos, trademarks, wallpaper artwork, and related intellectual property remain the property of their respective owners.

The wallpapers in this repository were sourced from [HDQWalls](https://hdqwalls.com/). Their inclusion in this personal hobby repository does not transfer ownership or grant a license for redistribution or commercial use. Consult the source website and the applicable rights holders for usage conditions.

If a rights holder requests that an image be removed, the image should be removed from the repository.

---

## 🛠️ Troubleshooting

### The original Art4Campus background remains visible

- Confirm that Tampermonkey is enabled.
- Confirm that the userscript is enabled.
- Verify that the page address starts with `https://idp.kuleuven.be/`.
- Reload the login page with `Ctrl+F5`.
- Open the browser console and look for messages beginning with:

```text
[KU IDP Wallpapers]
```

### The console reports HTTP 403 or 429

This indicates that the GitHub API request could not be used, for example because of a temporary rate limit or access restriction.

The script should automatically:

1. Use the locally cached complete wallpaper list when available.
2. Otherwise use the five fixed backup wallpapers.

Review the following console message to confirm the active source:

```text
[KU IDP Wallpapers] Source: local cache.
```

or:

```text
[KU IDP Wallpapers] Source: fixed backup selection.
```

### The latest uploaded wallpapers do not appear

The browser may currently be using a cached repository list. A newer list is stored after the next successful GitHub API response.

### No wallpapers are loaded

Verify that the browser can reach:

```text
https://api.github.com
https://raw.githubusercontent.com
```

Also confirm that the wallpaper filenames use one of the supported extensions.

### Tampermonkey does not show the installation page

Use the **Import from URL** method under **Tampermonkey Dashboard > Utilities**.

### An image does not appear

- Confirm that the image is present in the repository.
- Confirm that the file extension is supported.
- Confirm that the image opens through its GitHub raw-content URL.
- Check the browser console for a loading error.

### Clear the local wallpaper cache

To force the browser to discard the cached repository list, run the following command in the developer console on the Central Login page:

```javascript
localStorage.removeItem("kul-idp-superheroes-wallpaper-cache-v1");
```

Reload the page afterward. If the GitHub API remains unavailable, the script will use the fixed five-image backup selection.

---

## 📄 Code and Image Rights

The userscript source and the wallpaper collection should be treated separately.

No license is granted through this repository for third-party wallpaper artwork, superhero characters, character names, logos, or trademarks. All rights to those materials remain with their respective owners.
