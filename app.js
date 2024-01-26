const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const multer = require('multer');
const helmet = require('helmet');

const User = require('./models/user');
const Product = require('./models/product');

const MONGODB_URI = `mongodb+srv://ssk942016:VM47hCDcF3esfbrE@cluster0.4t8oxty.mongodb.net/`;

const app = express();

const store = new MongoDBStore({
    uri: MONGODB_URI,
    collection: 'sessions', // specify a collection name
    expires: 1000 * 60 * 60 * 8
});

const csrfProtection = csrf();

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');
const errorController = require('./controllers/error');

app.use(helmet());

const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'files');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now().toString() + '-' + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    const fileTypes = ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/x-m4a', 'audio/x-m4p', 'audio/x-m4b', 'video/mp4', 'video/webm', 'video/ogg', 'video/x-m4a', 'video/x-m4p', 'video/x-m4b'];
    if (fileTypes.find(type => type === file.mimetype)) {
        cb(null, true);
    } else {
        cb(null, false);
    }
};

app.use(bodyParser.urlencoded({ extended: false }));

app.use(
    multer({
        storage: fileStorage,
        fileFilter: fileFilter,
        limits: {
            fileSize: 50 * 1024 * 1024, // Set the maximum file size (in bytes) - here it's set to 50 MB
        },
    }).single('audio')
);

// ... rest of your code

app.use(express.static(path.join(__dirname, 'public')));
app.use('/files', express.static(path.join(__dirname, 'files')));
app.use(session({ secret: 'sbdkbdkb', cookie: { maxAge: 1000 * 60 * 60 * 8 }, resave: false, saveUninitialized: false, store: store }));
app.use(csrfProtection);

app.use((req, res, next) => {
    res.locals.isAuthenticated = req.session.isLoggedIn || false;
    res.locals.csrfToken = req.csrfToken();
    next();
});

app.use((req, res, next) => {
    if (!req.session.user) {
        return next();
    }
    User.findById(req.session.user._id).then(user => {
        if (!user) {
            return next();
        }
        req.user = user;
        next();
    }).catch(err => {
        err.statusCode = 500;
        err.message = "Could not find the user!"
        next(err);
    });
});

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.use(errorController.get404);

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

mongoose.connect(MONGODB_URI, { useUnifiedTopology: true, useNewUrlParser: true })
    .then(result => {
        console.log('Connected to MongoDB');
    })
    .catch(err => {
        console.log(err);
    });
