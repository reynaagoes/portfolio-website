# Reyna Agoes - Personal Portfolio

Personal portfolio website for Muhammad Reyna Athallah Agoes, built as a clean, minimal, and modern multi-page static site to present selected work, personal interests, and contact links.

Education: Institut Teknologi Bandung — Sistem dan Teknologi Informasi

## Tech Stack

- HTML
- CSS
- JavaScript
- C
- SQL
- MySQL
- PostgreSQL
- Git
- GitHub
- GitHub Pages
- Arduino / ESP32
- UI/UX
- Roblox UGC
- GitHub Actions

## Main Features

- Standalone voxel-inspired opening page with loading animation in `index.html`
- Multi-page portfolio with a standalone intro page and separate Home, About, Projects, and Contact pages
- Clean layout with strong typography, generous whitespace, and responsive behavior
- Homepage profile photo card and languages / tools sections on Home and About
- Seven project cards with screenshots
- Dark and light mode toggle with saved preference in `localStorage`
- Active navigation state based on the current page filename
- Static deployment workflow for GitHub Pages

## Page Structure

- Intro / opening world: `index.html`
- Home: `home.html`
- About: `about.html`
- Projects: `projects.html`
- Contact: `contact.html`

The GitHub Pages root opens `index.html`, which now serves as the intro / opening experience. The main portfolio homepage is available at `home.html`. The older `intro.html` file can remain as a backup copy of the intro page.

## Selected Works

- CuanSampah Platform
- IoT Focus Monitoring
- Company Profile Website
- Food Planner
- Sushimate Game
- Algorithm Programming Project
- Roblox UGC

## Project Links

- CuanSampah Platform: `https://sampahkita.vercel.app/login`
- Roblox UGC: `https://www.roblox.com/communities/3579419/Rare-Clothes-Group#!/store`

## Run Locally

1. Clone this repository.
2. Open the project folder.
3. Open `index.html` directly in your browser to review the opening experience.
4. Open `home.html` directly in your browser to review the main homepage.
5. Open `about.html`, `projects.html`, and `contact.html` to review the full multi-page experience.

## Deploy to GitHub Pages

1. Push the project to the `main` branch.
2. Open the repository on GitHub.
3. Go to `Settings > Pages`.
4. Set the source to `GitHub Actions`.
5. Wait for the workflow to finish and open the published GitHub Pages URL.

## CI/CD

Push to branch `main` will trigger GitHub Actions and deploy the website automatically to GitHub Pages.

## Deployment Demo Steps

1. Open the live website.
2. Open the GitHub repository.
3. Change the text `Currently building better digital experiences.` in `home.html`.
4. Commit and push the change to branch `main`.
5. Open the `Actions` tab and wait for the workflow to finish.
6. Refresh the live website and confirm the update is visible.
