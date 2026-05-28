const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'virtual-lab-super-secret-key';

module.exports = function(req, res, next) {
  // Grab the token from the Auth header
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  // No token means they are not logged in, boot them out
  if (!token) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }

  // Try to verify and decode the token
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // holds userId and username
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};
