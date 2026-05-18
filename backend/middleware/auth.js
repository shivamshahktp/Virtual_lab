const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'virtual-lab-super-secret-key';

module.exports = function(req, res, next) {
  // Get token from header
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  // Check if no token
  if (!token) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId, username }
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};
