const express = require('express')
var RedditAPI = require('reddit-wrapper-v2');
const path = require('path')
var urls = require('url');
var bodyParser = require('body-parser');
const { JSDOM } = require('jsdom');
const MongoClient = require('mongodb').MongoClient;


let app = express()
app.use(express.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.set('views', path.join(__dirname, '/views'));
app.use(express.static(path.join(__dirname, '/Public')));


const url = "mongodb+srv://daksh:daksh@cluster0.iklx7.mongodb.net/reddit?retryWrites=true&w=majority";

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

  redditConn = new RedditAPI({
          // Options for Reddit Wrapper
          username: req.body.name,
          password: req.body.password,
          app_id: '5NdgfUw2gYB8rg',
          api_secret: 'BJUhmTJCVUo-iR39EOGITj-CBso',
          user_agent: 'https://www.reddit.com/',
          retry_on_wait: true,
          retry_on_server_error: 5,
          retry_delay: 1,
          logs: true
      });
      redditConn.api.get_token()
      .then(async function(token) {
        if (token !== 'undefined undefined')
        {
          //User Logged in
            console.log("success")
            user_name = req.body.name
            is_auth = true;
            load_data() //loading data
            res.redirect('/main') //main page
        }
        else {
          // Incorrect Id password
          console.log("Invalid Id-Password")
          res.render("login" , {message: "Invalid ID-Password ! Try Again !!"}); //Returning back to login page

            }
        })
      .catch(function(err) {
      })


});


app.get('/main', (req,res)=>{
  if(is_auth) //if user is authenticated
  {
      //loading main screen
      getposts().then(post => {
        res.render('main' , {posts: post[0] , author:post[3] , domains: post[2] , posts_link:post[1]})
      })
    }
  else
  {
    //unautherized access
    res.render("login" , {message: "Unautherized access not allowed ! Please Login !!"});
  }
})

// loading posts data from the mongodb
async function getposts() {
      let db = await MongoClient.connect(url)
      var dbo = db.db("reddit");
      var query_post = { username: user_name };
      var query_link = { link: { $ne : null } };
      var mysort = { count: -1 };
      var post = await dbo.collection("posts").find(query_post).sort({'_id':-1}).toArray(); //users post
      var link_post = await dbo.collection("posts").find(query_link).sort({'_id':-1}).toArray(); //users posts with link
      var top_domain = await dbo.collection("domains").find().sort(mysort).limit(20).toArray(); // top 20 domains
      var top_author = await dbo.collection("authon_link").find().sort(mysort).limit(20).toArray(); // top 20 authors who shared most links
      return await [post , link_post , top_domain ,top_author ]
}


// loading user data to mongodb database
async function load_data()
{
  redditConn.api.get('/best' , {limit : 100})
.then(function(response) {
    let responseCode = response[0];
    let responseData = response[1];
    var myJSON = JSON.stringify(responseData);
    var data = JSON.parse(myJSON)
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
  .catch(function(err) {
      return console.error("api request failed: " + err)
  });
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
