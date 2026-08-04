const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Helper to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Helper to extract clean error messages from Mongoose errors
const parseMongooseError = (error) => {
  // Duplicate key (e.g. email already registered)
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue || {})[0] || 'field';
    return `An account with this ${field} already exists.`;
  }
  // Validation errors — join all field messages
  if (error.name === 'ValidationError') {
    return Object.values(error.errors)
      .map((e) => e.message)
      .join(' ');
  }
  return error.message || 'An unexpected server error occurred.';
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res) => {
  try {
    const { ownerName, email, password, shopName, shopCategory, phone } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create user
    const user = await User.create({
      ownerName,
      email,
      password,
      shopName,
      shopCategory,
      phone,
    });

    if (user) {
      res.status(201).json({
        token: generateToken(user._id),
        user: {
          id: user._id,
          ownerName: user.ownerName,
          email: user.email,
          shopName: user.shopName,
          shopCategory: user.shopCategory,
          phone: user.phone,
        },
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Register Error:', error);
    const status = error.code === 11000 || error.name === 'ValidationError' ? 400 : 500;
    res.status(status).json({ message: parseMongooseError(error) });
  }
};

// @desc    Authenticate a user & get token
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide both email and password' });
    }

    // Find user
    const user = await User.findOne({ email });

    // Validate credentials
    if (user && (await user.comparePassword(password))) {
      res.json({
        token: generateToken(user._id),
        user: {
          id: user._id,
          ownerName: user.ownerName,
          email: user.email,
          shopName: user.shopName,
          shopCategory: user.shopCategory,
          phone: user.phone,
        },
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: parseMongooseError(error) });
  }
};

// @desc    Get user profile (protected)
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (user) {
      res.json({
        id: user._id,
        ownerName: user.ownerName,
        email: user.email,
        shopName: user.shopName,
        shopCategory: user.shopCategory,
        phone: user.phone,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({ message: 'Server error fetching user profile' });
  }
};
