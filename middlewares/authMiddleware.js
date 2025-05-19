import jwt from 'jsonwebtoken';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;  //  // user will have .id, not ._id , user info decoded from token, including role
    next();//Calls the next middleware or route handler in the Express pipeline.

  });
}

export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {/*If the user's role (extracted from the decoded token in req.user.role) is not in the list of allowed roles, respond with 403 Forbidden and a message "Access denied".*/
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
}



