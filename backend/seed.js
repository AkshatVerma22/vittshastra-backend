const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const client = new MongoClient(uri);

const MODULE_TITLES = [
  'Investing Basics',
  'Crypto Fundamentals',
  'Real Estate 101',
  'Stock Market Mastery',
  'Personal Finance Hacks',
  'Business Growth',
  'Trading Strategies',
  'Retirement Planning',
  'Wealth Building',
  'Financial Freedom',
];

const CHAPTER_TITLES = [
  'Introduction',
  'Key Concepts',
  'Case Study',
  'Practical Tips',
  'Summary',
  'Quiz',
];

const MODULE_IMAGES = [
  'https://images.pexels.com/photos/210990/pexels-photo-210990.jpeg',
  'https://images.pexels.com/photos/669365/pexels-photo-669365.jpeg',
  'https://images.pexels.com/photos/164527/pexels-photo-164527.jpeg',
  'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg',
  'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg',
  'https://images.pexels.com/photos/4386375/pexels-photo-4386375.jpeg',
  'https://images.pexels.com/photos/4386366/pexels-photo-4386366.jpeg',
  'https://images.pexels.com/photos/4386370/pexels-photo-4386370.jpeg',
  'https://images.pexels.com/photos/4386368/pexels-photo-4386368.jpeg',
  'https://images.pexels.com/photos/4386367/pexels-photo-4386367.jpeg',
];

async function seed() {
  try {
    await client.connect();
    const db = client.db('finance');
    
    // Build the list of modules to seed
    const modulesToSeed = MODULE_TITLES.map((title, i) => ({
      title,
      description: `Learn about ${title}`,
      imageUrl: MODULE_IMAGES[i % MODULE_IMAGES.length],
      difficulty: ['beginner', 'intermediate', 'advanced'][Math.floor(Math.random()*3)],
      estimatedTime: 30 + Math.floor(Math.random()*60),
      category: ['Investing', 'Trading', 'Crypto', 'Real Estate', 'Business'][i%5],
      tags: [],
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
    }));

    // Upsert modules by title
    const moduleIdMap = {};
    for (const module of modulesToSeed) {
      const result = await db.collection('modules').findOneAndUpdate(
        { title: module.title },
        { $set: module },
        { upsert: true, returnDocument: 'after' }
      );
      if (result && result.value) {
        moduleIdMap[module.title] = result.value._id;
      } else {
        // If upsert didn't return a document, find it by title
        const existingModule = await db.collection('modules').findOne({ title: module.title });
        if (existingModule) {
          moduleIdMap[module.title] = existingModule._id;
        }
      }
    }

    // Remove modules not in the seed list
    const seedTitles = modulesToSeed.map(m => m.title);
    await db.collection('modules').deleteMany({ title: { $nin: seedTitles } });

    // Build chapters for each module
    for (const module of modulesToSeed) {
      const moduleId = moduleIdMap[module.title];
      const chaptersToSeed = [];
      for (let j = 0; j < 4 + Math.floor(Math.random()*3); j++) {
        chaptersToSeed.push({
          moduleId,
          title: CHAPTER_TITLES[j % CHAPTER_TITLES.length] + ' ' + (j+1),
          content: `Content for ${module.title} - Chapter ${j+1}`,
          order: j+1,
        });
      }
      // Upsert chapters by moduleId+title
      const chapterTitles = chaptersToSeed.map(ch => ch.title);
      for (const chapter of chaptersToSeed) {
        await db.collection('chapters').findOneAndUpdate(
          { moduleId, title: chapter.title },
          { $set: chapter },
          { upsert: true }
        );
      }
      // Remove chapters not in the seed list for this module
      await db.collection('chapters').deleteMany({ moduleId, title: { $nin: chapterTitles } });
    }

    console.log('Seeded modules and chapters with ID preservation! User data preserved.');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

seed(); 