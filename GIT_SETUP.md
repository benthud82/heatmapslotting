# Git Configuration Setup

## Setting Git User Name and Email

To configure git, use these commands:

### Set User Name:
```powershell
git config --global user.name "Your Name"
```

### Set User Email:
```powershell
git config --global user.email "your.email@example.com"
```

### Verify Configuration:
```powershell
git config --global user.name
git config --global user.email
```

## Common Issues

### Issue: "error: invalid key" or syntax error
**Solution:** Make sure to use quotes around names with spaces:
```powershell
git config --global user.name "John Doe"
```

### Issue: Permission denied
**Solution:** Run PowerShell as Administrator, or use `--local` instead of `--global`:
```powershell
git config --local user.name "Your Name"
git config --local user.email "your.email@example.com"
```

### Issue: Git not found
**Solution:** Make sure Git is in your PATH. Restart terminal after installing Git.

## For This Project Only (Local Config)

If you want to set git config only for this project (not globally):

```powershell
cd C:\xampp\htdocs\heatmapslotting
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

## Initialize Git Repository (If Not Already Done)

```powershell
cd C:\xampp\htdocs\heatmapslotting
git init
```

## What Values Should I Use?

- **user.name**: Your full name or username (e.g., "John Doe" or "johndoe")
- **user.email**: Your email address (can be any email, doesn't need to match GitHub account)

## Quick Setup

Replace "Your Name" and "your.email@example.com" with your actual values:

```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
git config --global --list
```



