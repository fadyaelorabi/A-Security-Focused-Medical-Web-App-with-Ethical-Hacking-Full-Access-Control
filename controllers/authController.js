import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import bcrypt from 'bcrypt';
import User from '../models/User.js';  // Adjust path
import Log from '../models/Log.js';
import jwt from 'jsonwebtoken';

export const signup = async (req, res) => {
  try {
    const { username, password, email, role } = req.body;

    // Validate role
    const validRoles = ['Admin', 'Doctor', 'Patient'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Check if username/email exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate 2FA secret for all users
    const twoFASecret = speakeasy.generateSecret({
      name: `SecureHealth (${username})`
    });

    const newUser = new User({
      username,
      password: hashedPassword,
      email,
      role,
      twoFASecret: twoFASecret.base32,
      twoFAEnabled: false,
      isActive: true
    });

    await newUser.save();
    // Log user signup
    await Log.create({
      action: 'User Signup',
      userId: newUser._id,
      details: `${username} signed up with role ${role}`,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      timestamp: new Date()
    });

    // Generate QR code for 2FA setup
    const qrCodeUrl = await qrcode.toDataURL(twoFASecret.otpauth_url);

    res.status(201).json({
      message: 'User registered successfully',
      twoFASetup: {
        secret: twoFASecret.base32,
        qrCodeUrl
      }
    });

  } catch (error) {
    console.error(error);
    // Log signup error
    await Log.create({
      action: 'Signup Error',
      details: `Signup failed for ${req.body.username}: ${error.message}`,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      timestamp: new Date()
    });
    res.status(500).json({ message: 'Server error during signup' });
  }
};

export const login = async (req, res) => {
    try {
      const { username, password, twoFAToken } = req.body;
  
      const user = await User.findOne({ username });
      if (!user) {
        // Log user login failure
        await Log.create({
          action: 'Failed Login',
          details: `Login failed – username "${username}" not found`,
          ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          timestamp: new Date()
          
        });
        return res.status(401).json({ message: 'Invalid credentials username not found' });
      }      if (!user.isActive) {
        // Log user login attempt
        await Log.create({
          action: 'Failed Login',
          userId: user._id,
          details: `Login attempt for disabled account "${username}"`,
          ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          timestamp: new Date()
        });
        return res.status(403).json({ message: 'User account disabled' });
      }  
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) return res.status(401).json({ message: 'Invalid credentials password don match' });
  
      // If 2FA enabled, verify token
      if (user.twoFAEnabled) {
        // Log user login attempt
        if (!twoFAToken) {
          await Log.create({
            action: 'Failed 2FA',
            userId: user._id,
            details: `2FA token missing for "${username}"`,
            ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
            timestamp: new Date()
          });
          return res.status(400).json({ message: '2FA token required' });
        }  
        const verified = speakeasy.totp.verify({
          secret: user.twoFASecret,
          encoding: 'base32',
          token: twoFAToken,
          window: 1
        });
  
        if (!verified){
          // Log user login failure
          await Log.create({
            action: 'Failed 2FA',
            userId: user._id,
            details: `Invalid 2FA token for "${username}"`,
            ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
            timestamp: new Date()
          });
          return res.status(401).json({ message: 'Invalid 2FA token' });
          
        } 
      }
  
      // Generate JWT token
      const payload = {  id: user._id.toString(), username: user.username, role: user.role };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
  
      // After successful 2FA verification (or if 2FA is not enabled, depending on your logic)
      user.twoFAEnabled = true;
      await user.save();
      // Log user login success
      await Log.create({
        action: 'User Login',
        userId: user._id,
        details: `${username} logged in successfully`,
        ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        timestamp: new Date()
      });
      res.json({
        message: 'Login successful',
        token,
        user: {  id: user._id.toString(), username: user.username, role: user.role, email: user.email, twoFAEnabled: user.twoFAEnabled }
      });

    } catch (error) {
      console.error(error);
      // Log login error
      await Log.create({
        action: 'Login Error',
        details: `Login failed for ${req.body.username || 'unknown user'}: ${error.message}`,
        ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        timestamp: new Date()
      });
      res.status(500).json({ message: 'Server error during login' });
    }
  };
  