const express = require('express')
// var RedditAPI = require('reddit-wrapper-v2');
const path = require('path')
var urls = require('url');
var bodyParser = require('body-parser');
const { JSDOM } = require('jsdom');
const MongoClient = require('mongodb').MongoClient;
var RedditApi = require('reddit-oauth');
const request = require('request');
var query = { };


let app = express()
app.use(express.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.set('views', path.join(__dirname, '/views'));
app.use(express.static(path.join(__dirname, '/Public')));


const url = "mongodb+srv://daksh:daksh@cluster0.iklx7.mongodb.net/reddit?retryWrites=true&w=majority";
var reddit = new RedditApi({
    app_id: 'RdLM98XRxdKD2g',
    app_secret: 'gxhzXN0LZgvd39-0OH-A63f2AXo',
    redirect_uri: 'https://app-reddit.herokuapp.com/main'
});

var user_name ;
var redditConn;
var is_auth = false;


// Set Views

app.set("views", "./views");
app.set("view engine", "ejs");



// Get Api calls
app.get('/' , (req,res) =>{
  is_auth = false; // not authenticated
  res.redirect('login');
})

// Login Page
app.get("/login", (req, res) => {
  is_auth = false; // not authenticated
  res.render("login" , {message: req.message});
});

//
app.post("/login", (req, res) => {

  is_auth = false; // not authenticated
  res.redirect(reddit.oAuthUrl('Random', 'read'));
});


app.get('/main', (req,res)=>{
  var url = new URL(req.url, `http://${req.headers.host}`);
  var c = url.searchParams.get("code");
  query = {state: 'Random' , code: c}

  reddit.oAuthTokens(
    'Random',
    query,
    function (success) {
        // Print the access and refresh tokens we just retrieved
        console.log(reddit.access_token);
        console.log(reddit.refresh_token);
        if(reddit.access_token!=null)
        {
        is_auth = true;
        res.redirect('/home');
        load_data();
        }
        else {
          res.render("login" , {message: "Unable to Login ! Try Again"});
        }
    }
  );


})



app.get('/home', (req,res)=>{
  if(is_auth)
  res.render('main');
  else {
    res.render("login" , {message: "Unautherized Access ! Try Again"});
  }
})

app.get('/user_posts', (req,res)=>{
  if(is_auth) //if user is authenticated
  {
      //loading main screen
        getposts().then(post => {
        res.render('user_post' , {posts: post })
      })
    }
  else
  {
    //unautherized access
    res.render("login" , {message: "Unautherized access not allowed ! Please Login !!"});
  }
})

app.get('/posts_links', (req,res)=>{
  if(is_auth) //if user is authenticated
  {
      //loading main screen
        getposts_links().then(post_links => {
        res.render('post_links' , {posts_link: post_links })
      })
    }
  else
  {
    //unautherized access
    res.render("login" , {message: "Unautherized access not allowed ! Please Login !!"});
  }
})

app.get('/authors', (req,res)=>{
  if(is_auth) //if user is authenticated
  {
      //loading main screen
        getauthor().then(author => {
        res.render('authors' , {author: author })
      })
    }
  else
  {
    //unautherized access
    res.render("login" , {message: "Unautherized access not allowed ! Please Login !!"});
  }
})

app.get('/domains', (req,res)=>{
  if(is_auth) //if user is authenticated
  {
      //loading main screen
        getdomain().then(domain => {
        res.render('domains' , {domains: domain })
      })
    }
  else
  {
    //unautherized access
    res.render("login" , {message: "Unautherized access not allowed ! Please Login !!"});
  }
})


async function getposts() {
      let db = await MongoClient.connect(url)
      var dbo = db.db("reddit");
      var query_post = { username: user_name };
      var post = await dbo.collection("posts").find(query_post).sort({'_id':-1}).toArray(); //users post
      return await post
}

async function getposts_links() {
      let db = await MongoClient.connect(url)
      var dbo = db.db("reddit");
      var query_link = { link: { $ne : null } };
      var link_post = await dbo.collection("posts").find(query_link).sort({'_id':-1}).toArray(); //users posts with link
      return await link_post
}

async function getauthor() {
      let db = await MongoClient.connect(url)
      var dbo = db.db("reddit");
      var mysort = { count: -1 };
      var top_author = await dbo.collection("authon_link").find().sort(mysort).limit(20).toArray(); // top 20 authors who shared most links
      return await top_author
}

async function getdomain() {
      let db = await MongoClient.connect(url)
      var dbo = db.db("reddit");
      var mysort = { count: -1 };
      var top_domain = await dbo.collection("domains").find().sort(mysort).limit(20).toArray(); // top 20 domains
      return await top_domain
}




// loading user data to mongodb database
async function load_data()
{
  reddit.get(
    '/best' , {limit : 100},
    async function (error, response, body) {

    // var myJSON = await JSON.stringify(body);
    var data = JSON.parse(body)
    // console.log(data)
    var jsonArr = [];
    var len = data.data.dist
    console.log(len)
    MongoClient.connect(url, async function(err, db) {
        if (err) throw err;
        var dbo = db.db("reddit");
        for(var i = 0 ; i < len ; i++)
        {
            //Extracting link and domains if present
            var domain = [];
            var link = replaceURLWithHTMLLinks(data.data.children[i].data.selftext)
            if(link)
            {
              for(var j = 0 ; j <link.length; j++)
                domain.push(urls.parse(link[j]).hostname)
            }
            else {
              domain = null
            }
            jsonArr = {
            username: user_name,
            selftext: data.data.children[i].data.selftext,
            title: data.data.children[i].data.title,
            id: data.data.children[i].data.id,
            author: data.data.children[i].data.author,
            subreddit_name_prefixed: data.data.children[i].data.subreddit_name_prefixed,
            link: link,
            domain: domain
            }
            var x1;
            //update the post in database if not already present
            var x = await dbo.collection("posts").updateOne(
              {id: data.data.children[i].data.id},
             { $setOnInsert: jsonArr },
             { upsert: true })
               x1 = x.upsertedCount
               //if document is not already in database and have link update domains and author count
            if(x1!=0 && domain!=null)
            {
              update(dbo,domain)
            }
            if(x1!=0 && link!=null)
            {
              update_auth(dbo,link.length, data.data.children[i].data.author)
            }
          }
      });
  })

  return 1;
}

// Extract links from text
function replaceURLWithHTMLLinks(text)
  {
    var exp = (/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig);
    return text.match(exp);
  }

//update domains share count
async function update(dbo , domain)
{
  for(j = 0 ; j < domain.length ; j++)
  {
    await dbo.collection("domains").updateOne(
      {id : domain[j]},
      { $inc: { count: 1 } },
      {upsert: true},
       );
  }
  return 1
}

//update authors link sharing count
async function update_auth(dbo , link_len , author)
{

    await dbo.collection("authon_link").updateOne(
      {id : author},
      { $inc: { count: link_len } },
      {upsert: true},
       );

  return 1
}

// Handle 404 - Keep this as a last route
app.use(function(req, res, next) {
    res.redirect('login')
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Listening at 3000 `)
})
