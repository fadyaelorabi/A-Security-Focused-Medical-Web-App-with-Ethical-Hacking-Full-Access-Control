import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import bcrypt from 'bcrypt';
import User from '../models/User.js';  // Adjust path
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
    res.status(500).json({ message: 'Server error during signup' });
  }
};

export const login = async (req, res) => {
    try {
      const { username, password, twoFAToken } = req.body;
  
      const user = await User.findOne({ username });
      if (!user) return res.status(401).json({ message: 'Invalid credentials username not found' });
      if (!user.isActive) return res.status(403).json({ message: 'User account disabled' });
  
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) return res.status(401).json({ message: 'Invalid credentials password don match' });
  
      // If 2FA enabled, verify token
      if (user.twoFAEnabled) {
        if (!twoFAToken) return res.status(400).json({ message: '2FA token required' });
  
        const verified = speakeasy.totp.verify({
          secret: user.twoFASecret,
          encoding: 'base32',
          token: twoFAToken,
          window: 1
        });
  
        if (!verified) return res.status(401).json({ message: 'Invalid 2FA token' });
      }
  
      // Generate JWT token
      const payload = { id: user._id, username: user.username, role: user.role };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
  
      // After successful 2FA verification (or if 2FA is not enabled, depending on your logic)
      user.twoFAEnabled = true;
      await user.save();
      res.json({
        message: 'Login successful',
        token,
        user: { id: user._id, username: user.username, role: user.role, email: user.email, twoFAEnabled: user.twoFAEnabled }
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error during login' });
    }
  };
  