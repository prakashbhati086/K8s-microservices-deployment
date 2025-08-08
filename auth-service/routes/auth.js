const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt'); // You'll need to install this: npm install bcrypt
const User = require('../User'); // Assuming you have a User model

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        service: 'auth-service',
        timestamp: new Date().toISOString()
    });
});

// User Registration/Signup (matching your frontend expectation)
router.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username, email, and password are required' 
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }] 
        });
        
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'User already exists with this email or username' 
            });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create new user
        const newUser = new User({
            username,
            email,
            password: hashedPassword
        });

        await newUser.save();

        console.log(`✅ User registered successfully: ${username}`);
        
        res.status(201).json({ 
            success: true, 
            message: 'User created successfully',
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email
            }
        });

    } catch (error) {
        console.error('❌ Signup error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Signup failed', 
            error: error.message 
        });
    }
});

// User Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validation
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and password are required' 
            });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid email or password' 
            });
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid email or password' 
            });
        }

        // Set session (if using sessions)
        req.session.userId = user._id;
        req.session.username = user.username;

        console.log(`✅ User logged in: ${user.username}`);

        res.json({ 
            success: true, 
            message: 'Login successful',
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Login failed', 
            error: error.message 
        });
    }
});

// Keep register as alias for signup (backwards compatibility)
router.post('/register', (req, res) => {
    // Redirect to signup handler
    router.handle(Object.assign(req, { method: 'POST', url: '/signup' }), res);
});

// Logout endpoint
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'Logout failed' 
            });
        }
        res.json({ 
            success: true, 
            message: 'Logout successful' 
        });
    });
});

// Get current user (if logged in)
router.get('/me', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ 
            success: false, 
            message: 'Not authenticated' 
        });
    }
    
    res.json({ 
        success: true, 
        user: {
            id: req.session.userId,
            username: req.session.username
        }
    });
});

module.exports = router;
