# How to Run the Servers

## PowerShell Execution Policy Issue

If you're getting the execution policy error, here are solutions:

### Solution 1: Set Execution Policy for Current Session (Recommended)
Run this command in PowerShell **before** running npm:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force
```

Then run your npm commands normally:
```powershell
cd backend
npm run dev
```

### Solution 2: Use Command Prompt (CMD) Instead
Open **Command Prompt** (cmd.exe) instead of PowerShell:

```cmd
cd backend
npm run dev
```

### Solution 3: Bypass for Single Command
Run npm with bypass:

```powershell
powershell -ExecutionPolicy Bypass -Command "cd backend; npm run dev"
```

### Solution 4: Use Node Directly
You can also run the server directly with node:

```powershell
cd backend
node server.js
```

(Note: This won't auto-reload on changes like nodemon does)

## Running Both Servers

### Terminal 1 - Backend:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force
cd backend
npm run dev
```

### Terminal 2 - Frontend:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force
cd frontend
npm run dev
```

## Permanent Fix (Requires Admin)

If you want to permanently allow scripts (requires Administrator PowerShell):

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

This only affects your user account and is safer than changing system-wide policy.

