const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/newsAggregator');

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  preferences: [String], // Array of categories
  savedNews: [
    {
      title: String,
      link: String,
      description: String,
      pubDate: String,
      source: String,
      image: String,
      content: String,
    }
  ], // Array of saved news
});


const User = mongoose.model('User', userSchema);

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const secret = 'nvklxcvdndsvsjdvm';




const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const xml2js = require('xml2js');
const path = require('path');
const WebSocket = require('ws');
const app = express();
const port = 4000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const rssUrls = {
  general: [
    'https://feeds.feedburner.com/ndtvnews-top-stories',
    'https://feeds.feedburner.com/ndtvnews-trending-news',
    'https://timesofindia.indiatimes.com/rssfeedstopstories.cms',
    'https://timesofindia.indiatimes.com/rssfeedmostrecent.cms'
  ],
  movies: [
    'https://feeds.feedburner.com/ndtvmovies-latest',
    'https://timesofindia.indiatimes.com/rssfeeds/1081479906.cms'
  ],
  tech: [
    'https://feeds.feedburner.com/gadgets360-latest',
    'https://timesofindia.indiatimes.com/rssfeeds/66949542.cms'
  ],
  business: [
    'https://feeds.feedburner.com/ndtvprofit-latest',
    'https://timesofindia.indiatimes.com/rssfeeds/1898055.cms'
  ]
};


const parseXML = async (url) => {
  const response = await axios.get(url);
  const result = await xml2js.parseStringPromise(response.data);
  return result;
};

const extractImageFromHTML = (html) => {
  const imgTagRegex = /<img[^>]+src="([^">]+)"/;
  const match = imgTagRegex.exec(html);
  return match ? match[1] : null;
};

const fetchNews = async (urls) => {
  const newsPromises = urls.map(async (url) => {
    try {
      const rssData = await parseXML(url);
      const items = rssData.rss.channel[0].item;
      return items.map(item => {
        const description = item.description[0];
        const content = item['content:encoded'] ? item['content:encoded'][0] : description;
        const image = item.enclosure ? item.enclosure[0].$.url : extractImageFromHTML(content) || extractImageFromHTML(description);

        return {
          title: item.title[0],
          link: item.link[0],
          description: description,
          pubDate: item.pubDate[0],
          source: rssData.rss.channel[0].title[0],
          image: image,
          content: content
        };
      });
    } catch (error) {
      console.error(`Error fetching news from ${url}:`, error);
      return [];
    }
  });

  const newsArray = await Promise.all(newsPromises);
  return newsArray.flat();
};

app.get('/api/news', async (req, res) => {
  const { category } = req.query;
  const urls = rssUrls[category] || rssUrls.general;

  try {
    const news = await fetchNews(urls);
    res.json(news);
  } catch (error) {
    res.status(500).send('Error fetching news');
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.post('/api/signup', async (req, res) => {
  const { email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, password: hashedPassword, preferences: [] });
    await newUser.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Error creating user' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (user && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign({ userId: user._id }, secret, { expiresIn: '1h' });
      res.json({ token, preferences: user.preferences });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/preferences', async (req, res) => {
  const { token, preferences } = req.body;

  try {
    const decoded = jwt.verify(token, secret);
    await User.findByIdAndUpdate(decoded.userId, { preferences });
    res.json({ message: 'Preferences updated' });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});
app.get('/api/preferred-news', async (req, res) => {
  const { token } = req.query;
  try {
    const user = await User.findById(token);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const urls = user.preferences.flatMap((category) => rssUrls[category] || []);
    const news = await fetchNews(urls);
    res.json(news);
  } catch (error) {
    console.error('Error fetching preferred news:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/save-news', async (req, res) => {
  const { token, news } = req.body;

  try {
    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    user.savedNews.push(news);
    await user.save();
    res.json({ message: 'News saved successfully' });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

app.get('/api/saved-news', async (req, res) => {
  const { token } = req.query;

  try {
    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json(user.savedNews);
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

app.delete('/api/delete-news', async (req, res) => {
  const { token, newsId } = req.body;

  try {
    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    user.savedNews = user.savedNews.filter((_, index) => index != newsId);
    await user.save();
    res.json({ message: 'News deleted successfully' });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});


const server = app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

const wss = new WebSocket.Server({ server });

const sendUpdates = async (ws) => {
  const categories = Object.keys(rssUrls);
  for (const category of categories) {
    const news = await fetchNews(rssUrls[category]);
    ws.send(JSON.stringify({ category, news }));
  }
};

wss.on('connection', (ws) => {
  console.log('Client connected');
  
  const interval = setInterval(() => sendUpdates(ws), 60000);
  
  ws.on('message', (message) => {
    console.log('Received message:', message);
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    clearInterval(interval);
  });

  sendUpdates(ws);
});
