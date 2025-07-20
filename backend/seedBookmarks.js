const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function seedBookmarks() {
  try {
    await client.connect();
    const db = client.db('finance');
    
    // Get existing modules and chapters
    const modules = await db.collection('modules').find({}).toArray();
    const chapters = await db.collection('chapters').find({}).toArray();
    
    if (modules.length === 0) {
      console.log('No modules found. Please run the main seed script first.');
      process.exit(1);
    }
    
    // Add sample bookmarks for testing (only if they don't exist)
    const testUserId = 'test-user-123';
    
    for (let i = 0; i < Math.min(3, modules.length); i++) {
      const module = modules[i];
      const moduleChapters = chapters.filter(ch => ch.moduleId.toString() === module._id.toString());
      
      // Add chapter bookmarks
      for (let k = 0; k < Math.min(2, moduleChapters.length); k++) {
        const chapter = moduleChapters[k];
        
        // Check if bookmark already exists
        const existingBookmark = await db.collection('bookmarks').findOne({
          chapterId: chapter._id.toString(),
          userId: testUserId
        });
        
        if (!existingBookmark) {
          const bookmark = {
            chapterId: chapter._id.toString(),
            title: chapter.title,
            moduleId: module._id.toString(),
            moduleTitle: module.title,
            chapterTitle: chapter.title,
            category: 'chapter',
            tags: ['important', 'favorite'],
            notes: `Great chapter about ${chapter.title}`,
            isImportant: k === 0,
            userId: testUserId,
            createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          };
          await db.collection('bookmarks').insertOne(bookmark);
          console.log(`Added bookmark for chapter: ${chapter.title}`);
        }
      }
      
      // Add module bookmark
      const existingModuleBookmark = await db.collection('bookmarks').findOne({
        moduleId: module._id.toString(),
        userId: testUserId,
        category: 'module'
      });
      
      if (!existingModuleBookmark) {
        const moduleBookmark = {
          chapterId: 'module-bookmark',
          title: module.title,
          moduleId: module._id.toString(),
          moduleTitle: module.title,
          category: 'module',
          tags: ['module', 'complete'],
          notes: `Complete module on ${module.title}`,
          isImportant: true,
          userId: testUserId,
          createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        };
        await db.collection('bookmarks').insertOne(moduleBookmark);
        console.log(`Added bookmark for module: ${module.title}`);
      }
    }
    
    console.log('Sample bookmarks added successfully!');
    process.exit(0);
  } catch (e) {
    console.error('Error seeding bookmarks:', e);
    process.exit(1);
  }
}

seedBookmarks(); 