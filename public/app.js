const showLogin = () => {
  document.body.innerHTML = `
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f4f4f4;
        margin: 0;
        padding: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
      }
      .login-form {
        background-color: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        width: 300px;
        text-align: center;
      }
      .login-form h2 {
        margin-bottom: 20px;
        color: #333;
      }
      .login-form input {
        width: 100%;
        padding: 10px;
        margin: 10px 0;
        border: 1px solid #ccc;
        border-radius: 4px;
        box-sizing: border-box;
      }
      .login-form button {
        width: 100%;
        padding: 10px;
        margin-top: 10px;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
      }
      .login-form button:hover {
        background-color: #0056b3;
      }
    </style>
    <div class="login-form">
      <h2>Login / Sign Up</h2>
      <input type="email" id="email" placeholder="Email" required />
      <input type="password" id="password" placeholder="Password" required />
      <button onclick="login()">Login</button>
      <button onclick="signup()">Sign Up</button>
    </div>
  `;
};

  
  const login = async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
  
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  
    const data = await response.json();
    if (response.ok) {
      localStorage.setItem('token', data.token);
      selectPreferences(data.preferences);
    } else {
      alert(data.error);
    }
  };
  
  const signup = async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
  
    const response = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  
    if (response.ok) {
      alert('Signup successful! Please login.');
    } else {
      alert('Signup failed.');
    }
  };
  
  const selectPreferences = (currentPreferences = []) => {
    const categories = ['general', 'movies', 'tech', 'business'];
    document.body.innerHTML = `
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
        }
  
        .preferences {
          background-color: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          width: 300px;
          text-align: center;
        }
  
        .preferences h2 {
          margin-bottom: 20px;
          color: #333;
        }
  
        .preferences label {
          display: block;
          text-align: left;
          margin: 10px 0;
          font-size: 16px;
        }
  
        .preferences input[type="checkbox"] {
          margin-right: 8px;
        }
  
        .preferences button {
          width: 100%;
          padding: 10px;
          margin-top: 15px;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
        }
  
        .preferences button:hover {
          background-color: #0056b3;
        }
      </style>
      <div class="preferences">
        <h2>Select Your Preferences</h2>
        ${categories
          .map(
            (cat) => `
          <label>
            <input type="checkbox" value="${cat}" ${currentPreferences.includes(cat) ? 'checked' : ''} />
            ${cat.charAt(0).toUpperCase() + cat.slice(1)}
          </label>
        `
          )
          .join('')}
        <button onclick="savePreferences()">Save Preferences</button>
      </div>
    `;
  };
  
  
  const fetchPreferredNews = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in first.');
      showLogin();
      return;
    }
  
    const response = await fetch(`/api/preferred-news?token=${token}`);
    const news = await response.json();
    displayNews(news);
  };
  
  // Call `fetchPreferredNews` after saving preferences
  const savePreferences = async () => {
    const selected = Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(
      (input) => input.value
    );
  
    const token = localStorage.getItem('token');
  
    await fetch('/api/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, preferences: selected }),
    });
  
    alert('Preferences saved!');
    fetchPreferredNews(); // Fetch news based on updated preferences
  };
  
  // Optionally call fetchPreferredNews on page load if logged in
  if (localStorage.getItem('token')) {
    fetchPreferredNews();
  } else {
    fetchNews('general'); // Default to general category for unauthenticated users
  }
  
  
  // Fetch news based on the category
const fetchNews = async (category) => {
    const response = await fetch(`/api/news?category=${category}`);
    const news = await response.json();
    displayNews(news);
  };
  
  
  // Display news in cards, only items with images
  const displayNews = (news) => {
    const newsList = document.getElementById('newsList');
    newsList.innerHTML = '';
  
    const newsWithImages = news.filter(item => item.image);
  
    newsWithImages.forEach((item, index) => {
      const newsItem = document.createElement('div');
      newsItem.className = 'news-item';
  
      newsItem.innerHTML = `
        <h2>${item.title}</h2>
        <img src="${item.image}" alt="${item.title}" loading="lazy">
        <p>${item.description}</p>
        <p><small>${item.pubDate}</small></p>
        <button onclick="saveNews(${index})">Save</button>
      `;
  
      newsList.appendChild(newsItem);
    });
  
    window.saveNews = async (index) => {
      const news = newsWithImages[index];
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in first.');
        return;
      }
  
      await fetch('/api/save-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, news }),
      });
  
      alert('News saved successfully!');
    };
  };
  
  
  // Show detailed view of the news
  const showNewsDetails = (news) => {
    const newsDetails = document.getElementById('newsDetails');
  
    newsDetails.innerHTML = `
      <h2>${news.title}</h2>
      <img src="${news.image}" alt="${news.title}" loading="lazy" width="750px" height="750px">
      <p>${news.content}</p>
      <a href="${news.link}" target="_blank">Read more</a>
    `;
  
    newsDetails.style.display = 'block';
  };
  
  // Search news based on input
  const searchNews = () => {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const newsItems = document.querySelectorAll('.news-item');
  
    newsItems.forEach(item => {
      const title = item.querySelector('h2').textContent.toLowerCase();
      const description = item.querySelector('p').textContent.toLowerCase();
  
      if (title.includes(query) || description.includes(query)) {
        item.style.display = 'block';
      } else {
        item.style.display = 'none';
      }
    });
  };
  

  const showSavedNews = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in first.');
      return;
    }
  
    const response = await fetch(`/api/saved-news?token=${token}`);
    const savedNews = await response.json();
  
    document.getElementById('newsList').style.display = 'none'; // Hide main news
    document.getElementById('newsDetails').style.display = 'none';
    const savedNewsList = document.getElementById('savedNewsList');
    savedNewsList.style.display = 'block'; // Show saved news section
  
    savedNewsList.innerHTML = savedNews
      .map(
        (item, index) => `
        <div class="news-item">
          <h2>${item.title}</h2>
          <img src="${item.image}" alt="${item.title}" loading="lazy">
          <p>${item.description}</p>
          <button onclick="deleteNews(${index})">Delete</button>
        </div>
      `
      )
      .join('');
  
    window.deleteNews = async (newsId) => {
      await fetch('/api/delete-news', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newsId }),
      });
  
      alert('News deleted successfully!');
      showSavedNews(); // Refresh saved news
    };

    savedNewsList.innerHTML += `<button onclick="goBackToNews()">Back to News</button>`;

  };
  const goBackToNews = () => {
    document.getElementById('newsList').style.display = 'block';
    document.getElementById('savedNewsList').style.display = 'none';
    document.getElementById('newsDetails').style.display = 'none';
  };  
  // Fetch initial news for the general category on page load
  fetchNews('general');
  