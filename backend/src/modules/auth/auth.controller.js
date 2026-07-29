const authService = require('./auth.service');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await authService.login(email, password);

    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 90 * 24 * 60 * 60 * 1000 // 90 days
    });

    user.password = undefined; // Do not send password back

    res.status(200).json({
      success: true,
      token,
      user
    });
  } catch (error) {
    next(error);
  }
};

const logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);
    user.password = undefined;
    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  logout,
  getMe
};
