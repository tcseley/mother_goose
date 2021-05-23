require('dotenv').config();
const express = require('express');
const app = express();
const layouts = require('express-ejs-layouts');
const axios = require('axios');
const flash = require('connect-flash');
const session = require('express-session');
const passport = require('./config/ppConfig');
const isLoggedIn = require('./middleware/isLoggedIn');
const md5 = require('md5');
const methodOverride = require('method-override')
const db = require('./models');
//const { all } = require('sequelize/types/lib/operators');
const path = require('path');
const { response } = require('express');




const publickey = process.env.PUBLIC_KEY;
const privatekey = process.env.PRIVATE_KEY;
const SECRET_SESSION = process.env.SECRET_SESSION;

let ts = new Date().getTime();
const hash = md5(ts + privatekey + publickey);

app.set('view engine', 'ejs');


app.use(methodOverride('_method'));
app.use(require('morgan')('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname + '/public'));
app.use(layouts);
app.use(session({
  secret: SECRET_SESSION,
  resave: false,
  saveUninitialized: true
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
  console.log(res.locals);
  res.locals.alerts = req.flash();
  res.locals.currentUser = req.user;
  next();
});


//////////////////// ***** ROUTES ***** /////////////////////

// GET index
app.get('/', (req, res) => {
  res.render('index');
});

// GET comics index /comics
app.get('/comics', (req, res) => {
    const search = req.query.search;
    const marvelUrl = `https://gateway.marvel.com/v1/public/comics?`
    console.log(search);
    axios.get(marvelUrl, {
        params: {
            ts: ts,
            apikey: publickey,
            hash: hash,
        }
    }).then(response => {
        let data = response.data.data.results;
        console.log(data[1].id);
        let comic;
        let comicImgs = [];
        for (let i = 0; i < data.length; i++) {
            console.log(data[i].images);
            comic = data[i].images;
            comic.map((images) => {
                const comicData = {};
                //console.log(`${images.path}.${images.extension}`);
                comicData.comicImg = `${images.path}.${images.extension}`;
                comicData.id = data[i].id;
                console.log(comicData);
                comicImgs.push(comicData);
            })
        } 
        res.render('comics', { 'data': comicImgs });
    }) 
 });

app.get('/details/:id', async (req, res) => {
    let info;
    const marvelUrl = await `https://gateway.marvel.com/v1/public/comics/${req.params.id}`
    axios.get(marvelUrl, {
        params: {
            ts: ts,
            apikey: publickey,
            hash: hash,
        }
    }).then (response => {
        console.log(response.data.data.results[0]);
        info = response.data.data.results[0]
    }).then(response => {
        console.log(info)
        
        res.render('comicId', { comic: info });
    }).catch(error => {
        console.log(error);
    })
});

app.get('/favorites', (req, res) => {
    const { id, name, email } = req.user.get();
    db.comicbooks.findAll({
      where: { userId: id },
      //include: [db.user]
    })
    .then((favorite) => {
      if (!favorite) throw Error()
        res.render('favorites', { favorites: favorite })
    })
    .catch((error) => {
      console.log(error)
    })
});

//Add to a favorites collection
app.post('/new', isLoggedIn, (req, res) => {
    const { id, name, email } = req.user.get();
    db.comicbooks.create({
        title: req.body.title,
        digitalId: req.body.digitalId,
        creators: req.body.creators,
        series: req.body.series,
        year: req.body.year,
        image: req.body.image,
        description: req.body.description,
        userId: id
    })
    .then((post) => {
    res.redirect('favorites')
    })
})

  //DELETE destroy comicsId  - delete a favorite
app.delete('/delete/:id', isLoggedIn, (req, res) => {
    db.comicbooks.destroy({
        where: { id: req.params.id },
    })
    .then((post) => {
    res.redirect('/favorites')
    })
});

// GET show /comicsId - show all favorites from a user collection
// app.get('/show', isLoggedIn, (req, res) => {
//     const { id, name, email } = req.user.get();
//     db.comicbooks.findAll({
//       where: { id: req.params.id },
//       include: [db.user]
//     })
//     .then((favorite) => {
//       if (!favorite) throw Error()
//       console.log(comicbooks.user)
//       res.render('favorites', {id, name, email}, { favorites: comics })
//     })
//     .catch((error) => {
//       console.log(error)
//     })
//   })

// GET profile index /profile
app.get('/profile', isLoggedIn, (req, res) => {
  const { id, name, email } = req.user.get();
  res.render('profile', {id, name, email} );
});
app.put('/profile', isLoggedIn, (req, res) => {
    const { id, name, email } = req.user.get();
    db.user.update({
        name: req.body.name
        }, {
        where: {
        id: id
        }
       }).then(numRowsChanged=>{
        res.render('profile', {id, name, email} );
       });
});
// // POST create /comicsId
// app.post('/comicId', (req, res) => {
//     db.comicbooks.create({
//       title: req.body.title,
//       image: req.body.image,
//       description: req.body.description
//     })
//     .then((post) => {
//       res.redirect('/comics')
//     })
//   });
  

//DELETE comics destroy /comics/:id
// app.delete('', (req, res) => {
//     res.send('DESTROY comics/:id');
// });


// app.put('/faves', (req, res) => {
//     updated = [];
//     let updateComic;
//     const 


//   // PUT 
//   app.put('/comics:id', (req, res) => {
//     db.comcicbooks.update(
//       req.body,
//       {
//         where: { id: req.params.id }
//       }
//     )
//     .then((updatedRows) => {
//       console.log('success', updatedRows)
//       res.redirect('/comics/' + req.params.id)
//     })
//   })

// // GET profile index /profile
// app.get('/profile', isLoggedIn, (req, res) => {
//       const { id, name, email } = req.user.get();
//       res.render('profile', {id, name, email} );
//     });








app.use('/auth', require('./controllers/auth'));




const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`With great power, comes great responsibility on port ${PORT} `);
});

module.exports = server;