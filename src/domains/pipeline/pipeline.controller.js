const service = require('./pipeline.service');
const conversion = require('./conversion.service');
const { success } = require('../../core/utils/response');

exports.createPipeline = async (req, res, next) => {
  try {
    const data = await service.createPipeline(req.body, req.user.id);
    res.status(201).json(success(data, 'Pipeline created', 201));
  } catch (err) {
    next(err);
  }
};

exports.getPipelines = async (req, res, next) => {
  try {
    const data = await service.getPipelines();
    res.json(success(data));
  } catch (err) { next(err); }
};

exports.getCalendarView = async (req, res, next) => {
  try {
    const data = await service.getCalendarView(req.query);
    res.json(success(data));
  } catch (err) { next(err); }
};

exports.getPipelineById = async (req, res, next) => {
  try {
    const data = await service.getPipelineById(req.params.id);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
};

exports.updatePipeline = async (req, res, next) => {
  try {
    const data = await service.updatePipeline(req.params.id, req.body, req.user.id);
    res.json(success(data, 'Pipeline updated'));
  } catch (err) {
    next(err);
  }
};

exports.deletePipeline = async (req, res, next) => {
  try {
    await service.deletePipeline(req.params.id);
    res.json(success(null, 'Pipeline deleted'));
  } catch (err) {
    next(err);
  }
};

exports.updateStage = async (req, res, next) => {
  try {
    const data = await service.updateStage(req.params.id, req.body.stage, req.user.id);
    res.json(success(data, 'Stage updated'));
  } catch (err) {
    next(err);
  }
};

exports.convertToProject = async (req, res, next) => {
  try {
    const data = await conversion.convertToProject(req.params.id, req.user.id);
    res.json(success(data, 'Successfully converted pipeline to project'));
  } catch (err) {
    next(err);
  }
};
