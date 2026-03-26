const userService = require('./user.service');
const { success, error } = require('../../core/utils/response');

const getAll = async (_req, res, next) => {
  try {
    const users = await userService.getAllUsers();
    res.json(success(users));
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    res.json(success(user));
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    res.json(success(user, 'User updated'));
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json(error('You cannot delete your own account', 400));
    }
    await userService.deleteUser(req.params.id);
    res.json(success(null, 'User deleted'));
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, update, remove };
