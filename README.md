#  App Reddit
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/1ac554483fac462797ffa5a8b9adf2fa?style=flat-square)]()
[![Build Status](https://api.travis-ci.org/fossasia/badgeyay.svg?branch=development&style=flat-square)]()


The App is like a smaller version of Reddit app which can perform following functions:
-
  - Lets user login with Reddit
  - Stores all posts in MongoDB  
  - Display posts containing links
  - Display List of Top Domains that have been shared so far
  - Display the User who shared maximum URLs.

Link to the application - [App Reddit](https://app-reddit.herokuapp.com/)

## Technology

- Framework
    - Nodejs
    - Expressjs
    
- Database
     - MongoDB

- Frontend
    - HTML 5
    - CSS 3

- APIs
    - Reddit-Oauth

## Pre-requisites (to run App locally)
- Nodejs
- Reddit Developer Credentials
- MongoDB database

## How To Use
1. Clone the repository

git clone https://github.com/DakshDB/app_reddit
```
2. Generate **APP_ID** and **APP_SECRET** from reddit dev page
```

3. Enter **Database credentials** .

4. Install the dependenies
```sh
npm install
```
5. **Run** the server on local host.
```sh 
npm start
```
# Project Structure

├───Public
│   ├───css
│   │       main.css
│   │       style.css
│   │
│   └───img
│           reddit1.jpg
│
└───views
│        authors.ejs
│        domains.ejs
│        login.ejs
│        main.ejs
│        post_links.ejs
│        user_post.ejs
│
└────app.js
└────package.json
└────package-lock.json
└────README.md
