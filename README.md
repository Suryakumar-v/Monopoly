# Setup Instructions

## Prerequisites
You need to install **Node.js** to run this application.
1. Download and install from [nodejs.org](https://nodejs.org/).
2. Verify installation by running `node -v` and `npm -v` in your terminal.

## How to Run

### 1. Install Dependencies
Open a terminal in the project root (`e:\AntiGrav`) and run:
```bash
npm install
npm install --workspace=server
npm install --workspace=client
```

### 2. Run the Game
```bash
npm run dev
```
This will start both the backend server (port 3001) and the frontend client (port 5173).
