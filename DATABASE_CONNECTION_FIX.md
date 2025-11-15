# Database Connection Troubleshooting Guide

## 🔴 Current Issue

**Error:** `getaddrinfo ENOTFOUND db.simpcbryarzgvbmdingd.supabase.co`

**What this means:** Your computer cannot resolve the Supabase hostname. This is a DNS issue.

**Status:**
- ✅ Supabase project: ACTIVE (green)
- ✅ Server: RUNNING on port 3001
- ✅ Connection string format: CORRECT
- ✅ Password: CORRECT (`Dave414!`)
- ❌ DNS Resolution: **FAILING**

---

## 🔧 Try These Solutions

### ✨ Solution 1: Use Connection Pooling (TRY THIS FIRST!)

Connection pooling often fixes DNS issues.

**Steps:**
1. Go to Supabase dashboard → **Settings** → **Database**
2. Look for **"Connection Pooling"** section (separate from Connection Parameters)
3. Do you see a connection string with port `6543` or hostname containing `pooler.supabase.com`?
4. If YES:
   - Copy that connection string
   - Replace `[YOUR-PASSWORD]` with `Dave414!`
   - Update `backend/.env` with the new string
   - Restart backend: `npm run dev`
   - Test: `node test-connection.js`

---

### Solution 2: Change DNS to Google DNS

Your DNS server might not be able to resolve Supabase.

**Steps:**
1. Open **Control Panel** → **Network and Internet** → **Network Connections**
2. Right-click your network → **Properties**
3. Select **Internet Protocol Version 4 (TCP/IPv4)** → **Properties**
4. Choose "Use the following DNS server addresses":
   - Preferred: `8.8.8.8`
   - Alternate: `8.8.4.4`
5. Click OK
6. Open **Command Prompt (Admin)** and run:
   ```
   ipconfig /flushdns
   ```
7. Test: `ping db.simpcbryarzgvbmdingd.supabase.co`

---

### Solution 3: Check Firewall

Your firewall might be blocking Supabase.

**Steps:**
1. Open **Windows Security** → **Firewall & network protection**
2. Temporarily disable for Private network
3. Test: `cd backend && node test-connection.js`
4. If it works, add Node.js exception to firewall

---

### Solution 4: Try Different Network

**Are you on work/school/corporate network?**

- Try mobile hotspot or home network
- Corporate networks often block cloud databases

---

## 🧪 Test Commands

```bash
# Test DNS resolution
ping db.simpcbryarzgvbmdingd.supabase.co

# Test database connection
cd backend
node test-connection.js

# Restart server
npm run dev
```

**Success looks like:**
```
✅ Connection successful!
✅ Found tables: users, layouts, warehouse_elements
```

---

## 📝 What We Know

- ✅ Supabase project is active
- ✅ Connection string is correct
- ✅ Password is correct
- ❌ **DNS cannot resolve the hostname**

**Most likely cause:** DNS server issue or network restriction

**Best solution:** Try Connection Pooling (Solution 1) first!

