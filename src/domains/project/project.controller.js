const service = require('./project.service');
const { success, error } = require('../../core/utils/response');

exports.createProject = async (req, res, next) => {
  try {
    const { name, client_name, project_type } = req.body;
    if (!name || !client_name || !project_type) {
        return res.status(400).json(error('Missing required fields: name, client_name, project_type', 400));
    }
    const data = await service.createProject(req.body, req.user.id);
    res.status(201).json(success(data, 'Project created', 201));
  } catch (err) {
    next(err); // passes error to global error handler
  }
};

exports.getProjects = async (req, res, next) => {
  try {
    const data = await service.getProjects(req.user);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
};

exports.getProjectById = async (req, res, next) => {
  try {
    const data = await service.getProjectById(req.params.id);
    if (!data) {
      return res.status(404).json(error('Project not found', 404));
    }
    res.json(success(data));
  } catch (err) {
    next(err);
  }
};

exports.updateProject = async (req, res, next) => {
  try {
    const data = await service.updateProject(req.params.id, req.body, req.user.id);
    res.json(success(data, 'Project updated successfully'));
  } catch (err) {
    next(err);
  }
};

