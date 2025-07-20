const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';

async function seedDatabase() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('finance_app');
    
    console.log('Connected to MongoDB');
    
    // Clear existing data
    await db.collection('modules').deleteMany({});
    await db.collection('chapters').deleteMany({});
    
    // Insert modules
    const modules = [
      {
        title: 'Crypto Basics',
        description: 'Learn the fundamentals of cryptocurrency and blockchain technology',
        image_url: 'https://example.com/crypto.jpg',
        category: 'Cryptocurrency',
        difficulty: 'beginner',
        estimated_time: 30,
        tags: ['crypto', 'blockchain', 'bitcoin'],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Trading Fundamentals',
        description: 'Master the basics of trading and investment strategies',
        image_url: 'https://example.com/trading.jpg',
        category: 'Trading',
        difficulty: 'intermediate',
        estimated_time: 45,
        tags: ['trading', 'investment', 'stocks'],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Real Estate Investment',
        description: 'Explore real estate investment opportunities and strategies',
        image_url: 'https://example.com/realestate.jpg',
        category: 'Real Estate',
        difficulty: 'advanced',
        estimated_time: 60,
        tags: ['real estate', 'investment', 'property'],
        created_at: new Date(),
        updated_at: new Date()
      }
    ];
    
    const modulesResult = await db.collection('modules').insertMany(modules);
    console.log('Modules inserted:', modulesResult.insertedCount);
    
    // Insert chapters for each module
    const chapters = [
      // Crypto Basics chapters
      {
        module_id: modulesResult.insertedIds[0],
        title: 'What is Cryptocurrency?',
        content: 'Cryptocurrency is a digital or virtual currency that uses cryptography for security...',
        order_num: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        module_id: modulesResult.insertedIds[0],
        title: 'Blockchain Technology',
        content: 'Blockchain is a distributed ledger technology that enables secure, transparent transactions...',
        order_num: 2,
        created_at: new Date(),
        updated_at: new Date()
      },
      // Trading Fundamentals chapters
      {
        module_id: modulesResult.insertedIds[1],
        title: 'Introduction to Trading',
        content: 'Trading involves buying and selling financial instruments...',
        order_num: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        module_id: modulesResult.insertedIds[1],
        title: 'Risk Management',
        content: 'Proper risk management is crucial for successful trading...',
        order_num: 2,
        created_at: new Date(),
        updated_at: new Date()
      },
      // Real Estate chapters
      {
        module_id: modulesResult.insertedIds[2],
        title: 'Real Estate Markets',
        content: 'Understanding real estate markets and trends...',
        order_num: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        module_id: modulesResult.insertedIds[2],
        title: 'Investment Strategies',
        content: 'Different strategies for real estate investment...',
        order_num: 2,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];
    
    const chaptersResult = await db.collection('chapters').insertMany(chapters);
    console.log('Chapters inserted:', chaptersResult.insertedCount);
    
    console.log('Database seeded successfully!');
    
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await client.close();
  }
}

seedDatabase(); 