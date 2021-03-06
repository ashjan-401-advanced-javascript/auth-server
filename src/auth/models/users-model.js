'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
require('dotenv').config();

const SECRET = process.env.SECRET || 'ash';

/**
 * @param Schema Users with the same structure as the schema
 * @method pre hashing a password before saving a new user
 * @method generateToken creates a new token for a user
 * @method authenticate checks if the user is valid
 * @method list returns all Users from the db
 */

const users = mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  email: { type: String },
  fullname: { type: String },
  role: { type: String, default: 'user', enum: ['admin', 'editor', 'writer', 'user'] },
});

users.pre('save', async function (next) {
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (e) {
    throw Error('Did not save');
  }
});

users.statics.authenticate = function (username, password) {
  let query = { username: username };
  return this.findOne(query)
    .then(user => user && user.comparePassword(password))
    .catch(console.error);
};

users.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password).then(valid => (valid ? this : null));
};

users.methods.generateToken = async function () {
  const token = await jwt.sign({ username: this.username }, SECRET);
  return token;

};

users.statics.authenticateToken = async function (token) {
  try {
    let validToken = jwt.verify(token, SECRET);
    let validUser = await this.findOne({ username: validToken.username });

    if (validUser) {
      return Promise.resolve({
        user: validUser,
      });
    } else {
      return Promise.reject();
    }
  } catch (e) {
    return Promise.reject();
  }

};

users.statics.list = async function () {
  let allUsers = await this.find({});
  return allUsers;
};

users.statics.can = async function (role, action) {
  const actions = {
    'admin': ['read', 'create', 'update', 'delete'],
    'editor': ['read', 'update'],
    'writer': ['read', 'create'],
    'user': ['read'],
  };
  if (actions[role].includes(action)) {
    return true;
  } return false;
};


module.exports = mongoose.model('users', users);
