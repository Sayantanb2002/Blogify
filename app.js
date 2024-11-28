const express = require("express");
const app = express();
const userModel = require("./models/user");
const postModel = require("./models/post");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const user = require("./models/user");

const Secret_Key = "DomainExpansion";

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", async (req, res) => {});

app.get("/test" , async (req , res) => {
  res.render("test");
})

app.get("/login", async (req, res) => {
  res.render("login");
});

app.get("/create", async (req, res) => {
  res.render("index");
});

app.post("/post", isLoggedIn, async (req, res) => {
  let data = await userModel.findOne({ email: req.user.email });
  let { content } = req.body;
  
  let post = await postModel.create({
    user: data._id,
    content
  });

  data.posts.push(post._id);
  await data.save();
  res.redirect('/profile')
});

app.get("/profile", isLoggedIn, async (req, res) => {
    let data = await userModel.findOne({ email: req.user.email }).populate("posts");
    res.render("profile", { data });
});

app.get("/like/:id", isLoggedIn, async (req, res) => {
    let post = await postModel.findOne({ _id: req.params.id }).populate("user");

    if(post.likes.indexOf(req.user.userid) === -1){
        post.likes.push(req.user.userid);
    }
    else{
        post.likes.splice(post.likes.indexOf(req.user.userid) , 1);
    }

    await post.save();
    res.redirect("/profile");
});

app.get("/edit/:id", isLoggedIn, async (req, res) => {
    let post = await postModel.findOne({ _id: req.params.id }).populate("user");

    res.render('edit' , { post })
});

app.post("/update/:id", isLoggedIn, async (req, res) => {
    let post = await postModel.findOneAndUpdate({ _id: req.params.id } , {content: req.body.content});

    res.redirect('/profile');
});

app.post("/register", async (req, res) => {
  let { email, password, username, name, age } = req.body;
  let user = await userModel.findOne({ email });
  if (user) return res.status(500).send("User Already Registered");

  // Encrypting the password using Bcrypt
  // Authentication using JWT -> by creating tokkens storing in cookies
  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(password, salt, async (err, hash) => {
      let user = await userModel.create({
        username,
        email,
        name,
        age,
        password: hash,
      });

      let token = jwt.sign({ email: email, userid: user._id }, Secret_Key);
      res.cookie("token", token);
      res.redirect("/login");
    });
  });
});

app.post("/login", async (req, res) => {
  let { email, password } = req.body;

  let user = await userModel.findOne({ email });
  if (!user) return res.status(404).send("SomeThing Went Wrong");

  bcrypt.compare(password, user.password, (err, result) => {
    if (result) {
      let token = jwt.sign({ email: email, userid: user._id }, Secret_Key);
      res.cookie("token", token);
      res.status(200).redirect("/profile");
    } else res.redirect("/login");
  });
});

app.get("/logout", async (req, res) => {
  res.cookie("token", "");
  res.redirect("/login");
});

// middleware -> for creating protected routes
function isLoggedIn(req, res, next) {
  if (req.cookies.token === "") res.redirect("/login");
  else {
    let data = jwt.verify(req.cookies.token, Secret_Key);
    req.user = data;
    next();
  }
}

app.listen(3000, (err) => console.log("Connected on PORT: 3000"));
