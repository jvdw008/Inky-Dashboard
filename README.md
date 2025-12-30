## Inky – An E-Ink To-Do List / RSS Feed / Photo Viewer

I created this silly little project to run on a **Raspberry Pi Zero W** with a **Waveshare E-Ink display**.

The goal was to have something **always visible** on my desk - showing today’s to-dos - without needing to open apps or unlock devices. Along the way, it turned into a small but surprisingly capable E-Ink dashboard.

---

## What’s the point?

I use **Joplin** to manage my to-do lists and daily tasks. I wanted a way to see today’s list at a glance instead of opening the Joplin app repeatedly.

At the same time, I was curious about E-Ink displays and wanted a practical excuse to learn more about:
- Node.js
- Hardware-driven UIs
- Image processing for E-Ink screens

To keep the device from feeling boring, I added:
- An **RSS feed viewer**
- A **slideshow mode** for uploaded images

### Inky is intentionally:
- Simple
- Hackable
- Opinionated

It's built to be **useful first**, not generic - and assumes you're comfortable tweaking paths and services to match your setup.

---
## Requirements
### Hardware
- **Raspberry Pi Zero W** (or compatible Raspberry Pi)
- **Waveshare E-Ink display**<br>
(this project currently assumes Waveshare libraries - other displays will require code changes)
- MicroSD card (8GB+ recommended)
- Network access (Wi-Fi or Ethernet)

---
### Software
- **Raspberry Pi OS** (Lite recommended)
- **Node.js 18.x LTS ** (Node 20 may work, but 18 is known-good)
- **npm** (comes with Node.js)
- **Git**
- Optional but recommended:<br>
`pm2` or systemd service (example included)
---
## How it looks and works

### E-Ink display

At the top of the display is a **status bar** showing:
- The URL for the settings portal
- The current date and time (since last refresh)
- The device IP address

Below the status bar:
- **Left side**: up to 6 to-do items from Joplin
- **Right side**:
  - RSS feed (default)
  - OR slideshow images (selectable via portal)

Slideshow mode rotates through uploaded images at the configured refresh interval.

---

### Settings Portal

The settings portal can be accessed from any browser on the same network.

It allows you to:
- Set or change the **RSS feed URL**
- View a **live RSS preview**
- Toggle **Display Mode** (RSS or Slideshow)
- Upload images for slideshow mode
- Set the **refresh interval** (5 minutes - 3 hours)
- Manually refresh the display
- Reboot the device remotely

After making changes, click **Save & Refresh** to persist settings across reboots.

---

### Status Indicators

The portal shows live system health:
- **Network** – DNS connectivity
- **RSS** – feed availability (live / cached / unavailable)
- **Joplin** – live or cached backup status

Scheduler status shows:
- Last run
- Last successful update
- Any recent errors

---

### Slideshow Management

When Slideshow mode is active:
- Uploaded images are listed in the right-hand column
- The currently displayed image is highlighted
- Images can be deleted directly from the portal

Uploaded images are automatically:
- Rotated if needed
- Resized to fit the display
- Converted to greyscale
- Dithered using Floyd–Steinberg for best E-Ink quality

---

## Joplin integration (important)

This project **does not use Joplin Server**.

My setup is slightly unusual:
- Joplin runs on another machine
- Automatic backups run every hour
- The backup folder is shared via **Samba**
- Inky mounts the share and reads today’s to-do list

Inky is **read-only** with respect to Joplin.  
You still manage tasks inside the Joplin app itself.

**You will almost certainly need to adjust:**
- `services/joplinService.js`
- `services/testJoplin.js`
- The Samba mount path
- `JOPLIN_PATH` inside the service code

**A helper script exists to test parsing:**
`node services/testJoplin.js`

---
## Node.js version
### This project was developed and tested with:
`node v18.x`<br>
`nmp 9+`

If you don’t have Node installed, the recommended approach on Raspberry Pi is:

```
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify installation:
```
node -v
npm -v
```

## Dependancies (installed via npm)
All runtime dependencies are defined in package.json and installed automatically via:<br>
`npm install`<br>

This includes:
- express – API and settings portal
- multer – image uploads
- sharp – image rotation, resizing, greyscale + dithering
- cors / body-parser
- RSS parsing libraries
- Waveshare E-Ink display support (via local display module)
<br><br>No global npm packages are required.
---
## Installation & First Run

1. Clone the repository<br>
```
git clone https://github.com/jvdw008/inky.git
cd inky
```
2. Install dependancies<br>
```
npm install
```
4. Adjust project-specific configuration<br>
- Update display code if using a different E-Ink manufacturer
- Update Joplin paths and Samba mount locations (see notes below)
- Update username in `server/start_scheduler.sh`
5. Start Inky<br>
```
cd server
node index.js
```
6. Expected behaviour<br>
- E-Ink display shows **“Inky booting…”**
- After a few seconds, the homepage renders
- Terminal shows scheduler startup messages
7. Open the Settings Portal<br>
- URL is shown on the E-Ink display
- Open it from any browser on the same network
 ---
##  Running on Boot (Optional)
 `server/start_scheduler.sh`
 
This is used by the `inky-dashboard` systemd service.

You **must**:
- Change the username inside this file
- Adjust paths if you cloned the repo elsewhere
---
## Known Limitations
- Display code is **Waveshare-specific**
- Joplin integration is **read-only**
- Designed for **local network use only**
- No authentication on the settings portal (LAN-only assumed)

---
## License

MIT License

Copyright (c) [2025] [Jaco van der Walt]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
