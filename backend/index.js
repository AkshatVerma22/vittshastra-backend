const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
let db;
const connectDB = async () => {
  try {
    const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
    await client.connect();
    db = client.db('finance_app');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
};

// Initialize database connection
connectDB();

// Middleware to ensure database connection
const ensureDBConnection = async (req, res, next) => {
  if (!db) {
    return res.status(500).json({ 
      error: 'Database connection failed',
      message: 'Database not connected'
    });
  }
  req.db = db;
  next();
};

app.get('/', (req, res) => res.send('Finance Learning API Running'));

// Health check endpoint (no database required)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Server is running'
  });
});

// Test endpoint to check database connection
app.get('/test', ensureDBConnection, async (req, res) => {
  try {
    const collections = await req.db.listCollections().toArray();
    res.json({ 
      message: 'Database connection successful',
      database: req.db.databaseName,
      collections: collections.map(c => c.name),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({ 
      error: 'Database connection failed',
      message: error.message
    });
  }
});

// Get all modules
app.get('/modules', ensureDBConnection, async (req, res) => {
  try {
    const { category } = req.query;
    let filter = {};
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    const modules = await req.db.collection('modules').find(filter).sort({ created_at: -1 }).toArray();
    res.json(modules);
  } catch (error) {
    console.error('Error fetching modules:', error);
    res.status(500).json({ error: 'Failed to fetch modules' });
  }
});

// Get all categories
app.get('/categories', ensureDBConnection, async (req, res) => {
  try {
    const categories = await req.db.query('SELECT DISTINCT category FROM modules');
    res.json(categories.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});



// Get chapters for a module
app.get('/modules/:moduleId/chapters', ensureDBConnection, async (req, res) => {
  try {
    const { moduleId } = req.params;
    const chapters = await req.db.query('SELECT * FROM chapters WHERE module_id = $1', [moduleId]);
    res.json(chapters.rows);
  } catch (error) {
    console.error('Error fetching chapters:', error);
    res.status(500).json({ error: 'Failed to fetch chapters' });
  }
});

// Get all chapters (for admin dashboard)
app.get('/chapters', ensureDBConnection, async (req, res) => {
  try {
    const chapters = await req.db.query('SELECT * FROM chapters');
    res.json(chapters.rows);
  } catch (error) {
    console.error('Error fetching all chapters:', error);
    res.status(500).json({ error: 'Failed to fetch chapters' });
  }
});

// Get a specific chapter with referenced chapter data
app.get('/chapters/:id', ensureDBConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const chapter = await req.db.query('SELECT * FROM chapters WHERE id = $1', [id]);
    
    if (!chapter.rows.length) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    // If chapter has a referenced chapter, fetch its data
    if (chapter.rows[0].referenced_chapter) {
      const referencedChapter = await req.db.query('SELECT * FROM chapters WHERE id = $1', [chapter.rows[0].referenced_chapter]);
      
      if (referencedChapter.rows.length) {
        // Get the module data for the referenced chapter
        const referencedModule = await req.db.query('SELECT * FROM modules WHERE id = $1', [referencedChapter.rows[0].module_id]);
        
        chapter.rows[0].referencedChapterData = {
          ...referencedChapter.rows[0],
          moduleTitle: referencedModule.rows[0]?.title || 'Unknown Module',
          moduleCategory: referencedModule.rows[0]?.category || 'General'
        };
      }
    }

    res.json(chapter.rows[0]);
  } catch (error) {
    console.error('Error fetching chapter:', error);
    res.status(500).json({ error: 'Failed to fetch chapter' });
  }
});



// Get user notes
app.get('/notes', ensureDBConnection, async (req, res) => {
  try {
    const notes = await req.db.query('SELECT * FROM notes');
    res.json(notes.rows);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// Get notes for specific user
app.get('/notes/user/:userId', ensureDBConnection, async (req, res) => {
  try {
    const { userId } = req.params;
    const notes = await req.db.query('SELECT * FROM notes WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    res.json(notes.rows);
  } catch (error) {
    console.error('Error fetching user notes:', error);
    res.status(500).json({ error: 'Failed to fetch user notes' });
  }
});

// Create a new note
app.post('/notes', ensureDBConnection, async (req, res) => {
  try {
    const { userId, moduleId, chapterId, title, topic, content, text, tags } = req.body;
    const note = {
      user_id: userId,
      module_id: moduleId,
      chapter_id: chapterId,
      title,
      topic,
      content: content ?? text ?? '', // always use 'content', fallback to 'text'
      tags: tags || [],
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    const result = await req.db.query('INSERT INTO notes (user_id, module_id, chapter_id, title, topic, content, tags, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *', [
      note.user_id,
      note.module_id,
      note.chapter_id,
      note.title,
      note.topic,
      note.content,
      note.tags,
      note.created_at,
      note.updated_at
    ]);
    res.json({ ...note, id: result.rows[0].id });
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// Update a note
app.put('/notes/:noteId', ensureDBConnection, async (req, res) => {
  try {
    const { noteId } = req.params;
    const { topic, content, text, tags } = req.body;
    const updateData = {
      topic,
      content: content ?? text ?? '', // always use 'content', fallback to 'text'
      tags: tags || [],
      updated_at: new Date(),
    };
    
    await req.db.query(
      'UPDATE notes SET topic = $1, content = $2, tags = $3, updated_at = $4 WHERE id = $5',
      [updateData.topic, updateData.content, updateData.tags, updateData.updated_at, noteId]
    );
    res.json({ success: true, message: 'Note updated' });
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// Delete a note
app.delete('/notes/:noteId', ensureDBConnection, async (req, res) => {
  try {
    const { noteId } = req.params;
    await req.db.query('DELETE FROM notes WHERE id = $1', [noteId]);
    res.json({ success: true, message: 'Note deleted' });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// Get user bookmarks
app.get('/bookmarks', ensureDBConnection, async (req, res) => {
  try {
    const { userId } = req.query;
    let query = {};
    if (userId) {
      query.userId = userId;
    }
    const bookmarks = await req.db.query('SELECT * FROM bookmarks WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    res.json(bookmarks.rows);
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    res.status(500).json({ error: 'Failed to fetch bookmarks' });
  }
});

// Add a bookmark
app.post('/bookmarks', ensureDBConnection, async (req, res) => {
  try {
    const { 
      chapter_id, 
      title, 
      module_id, 
      module_title, 
      chapter_title, 
      category, 
      tags, 
      notes, 
      is_important, 
      user_id 
    } = req.body;
    
    const bookmark = {
      chapter_id,
      title,
      module_id,
      module_title,
      chapter_title,
      category,
      tags: tags || [],
      notes,
      is_important: is_important || false,
      user_id,
      created_at: new Date(),
    };
    
    const result = await req.db.query('INSERT INTO bookmarks (chapter_id, title, module_id, module_title, chapter_title, category, tags, notes, is_important, user_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *', [
      bookmark.chapter_id,
      bookmark.title,
      bookmark.module_id,
      bookmark.module_title,
      bookmark.chapter_title,
      bookmark.category,
      bookmark.tags,
      bookmark.notes,
      bookmark.is_important,
      bookmark.user_id,
      bookmark.created_at
    ]);
    res.json({ ...bookmark, id: result.rows[0].id });
  } catch (error) {
    console.error('Error adding bookmark:', error);
    res.status(500).json({ error: 'Failed to add bookmark' });
  }
});

// Remove a bookmark
app.delete('/bookmarks/:bookmarkId', ensureDBConnection, async (req, res) => {
  try {
    const { bookmarkId } = req.params;
    await req.db.query('DELETE FROM bookmarks WHERE id = $1', [bookmarkId]);
    res.json({ success: true, message: 'Bookmark removed' });
  } catch (error) {
    console.error('Error removing bookmark:', error);
    res.status(500).json({ error: 'Failed to remove bookmark' });
  }
});

// --- REVIEWS API ---
// Get all reviews
app.get('/reviews', ensureDBConnection, async (req, res) => {
  try {
    const reviews = await req.db.query('SELECT * FROM reviews ORDER BY created_at DESC');
    res.json(reviews.rows);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Add a new review
app.post('/reviews', ensureDBConnection, async (req, res) => {
  try {
    const { user_id, user_name, text, rating } = req.body;
    if (!user_id || !user_name || !text || !rating) {
      return res.status(400).json({ error: 'Missing user_id, user_name, text, or rating' });
    }
    const review = {
      user_id,
      user_name,
      text,
      rating,
      created_at: new Date(),
    };
    const result = await req.db.query('INSERT INTO reviews (user_id, user_name, text, rating, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING *', [
      review.user_id,
      review.user_name,
      review.text,
      review.rating,
      review.created_at
    ]);
    res.json({ ...review, id: result.rows[0].id });
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ error: 'Failed to add review' });
  }
});

// Add after reviews endpoints
app.post('/user/onboarding', ensureDBConnection, async (req, res) => {
  try {
    const { user_id, age, domains, experience } = req.body;
    console.log('Received onboarding data:', { user_id, age, domains, experience });
    if (!user_id || !age || !domains || !experience) {
      return res.status(400).json({ error: 'Missing user_id, age, domains, or experience' });
    }
    const userDoc = {
      user_id,
      age,
      domains,
      experience,
      onboarding_completed: true,
      updated_at: new Date(),
    };
    await req.db.query(
      'INSERT INTO users (user_id, age, domains, experience, onboarding_completed, updated_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (user_id) DO UPDATE SET age = $2, domains = $3, experience = $4, onboarding_completed = $5, updated_at = $6',
      [userDoc.user_id, userDoc.age, userDoc.domains, userDoc.experience, userDoc.onboarding_completed, userDoc.updated_at]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving onboarding:', error);
    if (error && error.stack) console.error(error.stack);
    res.status(500).json({ error: 'Failed to save onboarding', details: error?.message });
  }
});

app.get('/user/onboarding/:userId', ensureDBConnection, async (req, res) => {
  try {
    const { user_id } = req.params;
    const userDoc = await req.db.query('SELECT onboarding_completed FROM users WHERE user_id = $1', [user_id]);
    if (!userDoc.rows.length) {
      return res.json({ onboardingCompleted: false });
    }
    res.json({ onboardingCompleted: userDoc.rows[0].onboarding_completed || false });
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    res.status(500).json({ error: 'Failed to check onboarding status' });
  }
});

// Recently viewed modules endpoints
app.get('/user/recently-viewed/:userId', ensureDBConnection, async (req, res) => {
  try {
    const { user_id } = req.params;
    const userDoc = await req.db.query('SELECT recently_viewed_modules FROM users WHERE user_id = $1', [user_id]);
    const recentlyViewed = userDoc.rows[0]?.recently_viewed_modules || [];
    res.json(recentlyViewed);
  } catch (error) {
    console.error('Error fetching recently viewed:', error);
    res.status(500).json({ error: 'Failed to fetch recently viewed modules' });
  }
});

app.post('/user/recently-viewed/:userId', ensureDBConnection, async (req, res) => {
  try {
    const { user_id } = req.params;
    const { recentlyViewed } = req.body;
    
    if (!Array.isArray(recentlyViewed)) {
      return res.status(400).json({ error: 'recentlyViewed must be an array' });
    }
    
    await req.db.query(
      'INSERT INTO users (user_id, recently_viewed_modules, updated_at) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET recently_viewed_modules = $2, updated_at = $3',
      [user_id, recentlyViewed, new Date()]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving recently viewed:', error);
    res.status(500).json({ error: 'Failed to save recently viewed modules' });
  }
});

// Create a new module
app.post('/modules', ensureDBConnection, async (req, res) => {
  try {
    const { title, description, image_url, category, difficulty, estimated_time, tags } = req.body;
    const module = { 
      title, 
      description, 
      image_url, 
      category: category || 'General',
      difficulty: difficulty || 'beginner',
      estimated_time: estimated_time || 30,
      tags: tags || [],
      created_at: new Date(), // Automatically add creation timestamp
      updated_at: new Date()
    };
    const result = await req.db.query('INSERT INTO modules (title, description, image_url, category, difficulty, estimated_time, tags, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *', [
      module.title,
      module.description,
      module.image_url,
      module.category,
      module.difficulty,
      module.estimated_time,
      module.tags,
      module.created_at,
      module.updated_at
    ]);
    res.json({ ...module, id: result.rows[0].id });
  } catch (error) {
    console.error('Error creating module:', error);
    res.status(500).json({ error: 'Failed to create module' });
  }
});

// Update a module
app.put('/modules/:id', ensureDBConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, image_url, category, difficulty, estimated_time, tags } = req.body;
    await req.db.query(
      'UPDATE modules SET title = $1, description = $2, image_url = $3, category = $4, difficulty = $5, estimated_time = $6, tags = $7, updated_at = $8 WHERE id = $9',
      [title, description, image_url, category, difficulty, estimated_time, tags, new Date(), id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating module:', error);
    res.status(500).json({ error: 'Failed to update module' });
  }
});

// Delete a module
app.delete('/modules/:id', ensureDBConnection, async (req, res) => {
  try {
    const { id } = req.params;
    await req.db.query('DELETE FROM modules WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting module:', error);
    res.status(500).json({ error: 'Failed to delete module' });
  }
});

// Create a new chapter for a module
app.post('/modules/:moduleId/chapters', ensureDBConnection, async (req, res) => {
  try {
    const { module_id } = req.params;
    const { title, content, video_url, image_url, referenced_chapter } = req.body;
    const chapter = {
      module_id: module_id,
      title,
      content,
      video_url,
      image_url: image_url || null,
      referenced_chapter: referenced_chapter || null,
    };
    const result = await req.db.query('INSERT INTO chapters (module_id, title, content, video_url, image_url, referenced_chapter) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [
      chapter.module_id,
      chapter.title,
      chapter.content,
      chapter.video_url,
      chapter.image_url,
      chapter.referenced_chapter
    ]);
    res.json({ ...chapter, id: result.rows[0].id });
  } catch (error) {
    console.error('Error creating chapter:', error);
    res.status(500).json({ error: 'Failed to create chapter' });
  }
});

// Update a chapter
app.put('/chapters/:id', ensureDBConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, video_url, image_url, referenced_chapter } = req.body;
    await req.db.query(
      'UPDATE chapters SET title = $1, content = $2, video_url = $3, image_url = $4, referenced_chapter = $5 WHERE id = $6',
      [title, content, video_url, image_url, referenced_chapter, id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating chapter:', error);
    res.status(500).json({ error: 'Failed to update chapter' });
  }
});

// Delete a chapter
app.delete('/chapters/:id', ensureDBConnection, async (req, res) => {
  try {
    const { id } = req.params;
    await req.db.query('DELETE FROM chapters WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting chapter:', error);
    res.status(500).json({ error: 'Failed to delete chapter' });
  }
});

// --- FEEDBACK API ---
// Get all feedback
app.get('/feedback', ensureDBConnection, async (req, res) => {
  try {
    const feedback = await req.db.query('SELECT * FROM feedback ORDER BY created_at DESC');
    res.json(feedback.rows);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// Add a new feedback
app.post('/feedback', ensureDBConnection, async (req, res) => {
  try {
    const { user_id, user_name, user_email, subject, message, rating, category } = req.body;
    if (!user_id || !user_name || !message) {
      return res.status(400).json({ error: 'Missing required fields: user_id, user_name, message' });
    }
    const feedback = {
      user_id,
      user_name,
      user_email: user_email || '',
      subject: subject || 'General Feedback',
      message,
      rating: rating || 0,
      category: category || 'general',
      status: 'new', // new, in-progress, resolved
      created_at: new Date(),
      updated_at: new Date(),
    };
    const result = await req.db.query('INSERT INTO feedback (user_id, user_name, user_email, subject, message, rating, category, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *', [
      feedback.user_id,
      feedback.user_name,
      feedback.user_email,
      feedback.subject,
      feedback.message,
      feedback.rating,
      feedback.category,
      feedback.status,
      feedback.created_at,
      feedback.updated_at
    ]);
    res.json({ ...feedback, id: result.rows[0].id });
  } catch (error) {
    console.error('Error adding feedback:', error);
    res.status(500).json({ error: 'Failed to add feedback' });
  }
});

// Update feedback status (admin only)
app.put('/feedback/:id/status', ensureDBConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['new', 'in-progress', 'resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    await req.db.query(
      'UPDATE feedback SET status = $1, updated_at = $2 WHERE id = $3',
      [status, new Date(), id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating feedback status:', error);
    res.status(500).json({ error: 'Failed to update feedback status' });
  }
});

// Delete feedback (admin only)
app.delete('/feedback/:id', ensureDBConnection, async (req, res) => {
  try {
    const { id } = req.params;
    await req.db.query('DELETE FROM feedback WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));