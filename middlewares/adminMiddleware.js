// middlewares/adminMiddleware.js
export const authorizeAdmin = (req, res, next) => {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Admins only' });
    }
    next();
  };
  