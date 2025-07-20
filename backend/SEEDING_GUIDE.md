# Database Seeding Guide

This guide explains the different seeding scripts available and when to use them.

## 📁 Available Scripts

### 1. `seed.js` - Main Content Seeder
**What it does:**
- Resets modules and chapters (content only)
- **Preserves** user data (bookmarks, progress, notes, reviews)
- Adds new modules with categories, difficulty levels, and tags

**When to use:**
- When you want to update/add new learning content
- When you want to reset the content structure
- **Safe to run** - won't delete user data

**Usage:**
```bash
node seed.js
```

### 2. `seedBookmarks.js` - Sample Bookmarks
**What it does:**
- Adds sample bookmarks for testing
- Only adds bookmarks if they don't already exist
- Uses test user ID: `test-user-123`

**When to use:**
- When you want sample bookmarks for testing
- When demonstrating the app to users
- **Safe to run multiple times** - won't create duplicates

**Usage:**
```bash
node seedBookmarks.js
```



## 🔄 Typical Workflow

### For Development/Testing:
```bash
# 1. Reset content and add new modules
node seed.js

# 2. Add sample bookmarks (optional)
node seedBookmarks.js


```

### For Production Updates:
```bash
# Only reset content, preserve all user data
node seed.js
```

## 🛡️ Data Protection

The updated seeding system ensures:
- ✅ **User bookmarks are preserved**

- ✅ **User notes are preserved**
- ✅ **User reviews are preserved**
- ✅ **User onboarding data is preserved**
- ✅ **Recently viewed data is preserved**

Only content (modules and chapters) gets reset when running `seed.js`.

## 🧪 Test User

All sample data uses the test user ID: `test-user-123`

You can use this ID to:
- View sample bookmarks

- Test features without affecting real users

## ⚠️ Important Notes

1. **Always backup your database** before running any seeding scripts
2. **Test on development environment** first
3. **Check the console output** to see what was added/preserved
4. **User data is never deleted** by the main seed script

## 🔧 Customization

You can modify the scripts to:
- Add more modules/chapters
- Change categories and difficulty levels
- Add different types of sample data
- Use different test user IDs

Just make sure to preserve the data protection logic! 