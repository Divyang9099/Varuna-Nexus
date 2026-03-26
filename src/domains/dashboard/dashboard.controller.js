const service = require('./dashboard.service');
const { success } = require('../../core/utils/response');

exports.getSummary = async (req, res, next) => {
  try {
    const data = await service.getSummary(req.user);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
};

exports.getProjects = async (req, res, next) => {
  try {
    const data = await service.getProjects(req.query, req.user);
    res.json(success(data));
  } catch (err) { next(err); }
};

exports.getProjectDetails = async (req, res, next) => {
  try {
    const data = await service.getProjectDetails(req.params.id);
    res.json(success(data));
  } catch (err) { next(err); }
};

exports.getActivity = async (req, res, next) => {
  try {
    const data = await service.getActivity();
    res.json(success(data));
  } catch (err) {
    next(err);
  }
};

exports.getUtilization = async (req, res, next) => {
  try {
    const data = await service.getUtilization();
    res.json(success(data));
  } catch (err) {
    next(err);
  }
};

exports.getUpcoming = async (req, res, next) => {
  try {
    const data = await service.getUpcoming(req.user);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
};
