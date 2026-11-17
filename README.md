# Aera

An AI-powered architectural visualization application that transforms 2D floor plans into photorealistic 3D renders.

## Overview

Aera is a web application that uses AI to transform 2D architectural floor plans into 3D visualizations, allowing users to explore and manage their architectural design concepts.

Built with React, TypeScript, and Puter.js, Aera integrates AI-powered image generation with authentication, cloud storage, and serverless infrastructure.

The application also features a project visibility system and individual public portfolios, giving users control over how their projects are accessed and shared.

## Development Status

Aera is currently under active development. Core functionality
is implemented, with further UI improvements and AI generation
enhancements planned.

## Features

### AI-Powered Visualization
- Upload 2D floor plans and generate AI-powered 3D architectural renders.
- Uses **Gemini 3.1 Flash Image** through Puter.js for image generation.
- Compare original floor plans with generated renders using an interactive before-and-after slider.
- Refined generation prompts to improve consistency and alignment between uploaded floor plans and generated renders.

### Project Management & Visibility
- Create and manage individual visualization projects.
- Choose between three project visibility levels:
  - **Public:** Projects are discoverable through the user's public portfolio or project link and accessible to anyone, with or without an account.
  - **Unlisted:** Projects are accessible only through a unique shareable link.
  - **Private:** Projects are accessible only to their owner.
- Confirmation prompts when changing a project to a more discoverable visibility level.
- Automatic revocation of previously generated sharing links when changing a project to a less discoverable visibility level.

### Public User Portfolios
- Individual portfolio pages displaying each user's public projects.
- Shareable portfolio links accessible with or without an account.
- Discover portfolios through publicly shared projects and their associated creators.
- Context-aware navigation when moving between portfolio pages and individual project visualizations.

### Project Gallery
- **Example Projects:** A curated collection of administrator-selected projects available to all visitors.
- **Your Projects:** A personal gallery displaying all projects belonging to the signed-in user, regardless of visibility level.

## Tech Stack

| Category | Technologies |
|---|---|
| Frontend | React, TypeScript, React Router |
| Styling | Tailwind CSS |
| Build Tool | Vite |
| AI Image Generation | Gemini 3.1 Flash Image via Puter.js |
| Backend Infrastructure | Puter.js, Puter Serverless Workers |
| Authentication | Puter Authentication |
| Storage | Puter KV Storage, Puter File System |

## Getting Started

### Prerequisites
- Node.js
- npm

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/tt1ffany/aera.git
   ```

2. Navigate into the project directory:

   ```bash
   cd aera
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

### Development

Start the development server:

```bash
npm run dev
```

Open the local URL displayed in your terminal to access the application.

## Resource Considerations

Aera uses Puter's user-pays model, where AI operations and other platform resources are associated with each user's own Puter account.

Available free resources are subject to Puter's usage limits and policies. Users may need to purchase additional resources depending on their usage.

## Planned Improvements

- Redesign the application UI with custom styling.
- Additional AI generation controls for design preferences, including materials, lighting, and furniture styles.
- Iterative render refinement through additional prompts, with generation history.
- Expanded lighting controls for generated visualizations.
- User profile page with Puter resource usage information.

## Acknowledgements

This project was initially developed following [JavaScript Mastery's Build and Deploy a Full-Stack AI App](https://www.youtube.com/watch?v=JiwTGGGIhDs).

The original tutorial provided the foundation for the application's core functionality. Additional features, modifications, and improvements were independently designed and implemented to extend the original application.