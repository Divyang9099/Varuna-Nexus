const service      = require('./estimation.service');
const costEngine   = require('./costEngine.service');
const exportService = require('./export.service');
const { success }  = require('../../core/utils/response');

exports.createEstimation = async (req, res, next) => {
  try {
    const cost = costEngine.calculate(req.body);
    const data = await service.createEstimation(req.body, cost, req.user.id);
    res.status(201).json(success(data, 'Estimation created', 201));
  } catch (err) {
    next(err);
  }
};

exports.getEstimations = async (req, res, next) => {
  try {
    const data = await service.getEstimations(req.user);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
};

exports.getEstimationById = async (req, res, next) => {
  try {
    const data = await service.getEstimationById(req.params.id);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
};

exports.updateEstimation = async (req, res, next) => {
  try {
    const cost = costEngine.calculate(req.body);
    const data = await service.updateEstimation(req.params.id, req.body, cost);
    res.json(success(data, 'Estimation updated'));
  } catch (err) {
    next(err);
  }
};

exports.deleteEstimation = async (req, res, next) => {
  try {
    await service.deleteEstimation(req.params.id);
    res.json(success(null, 'Estimation deleted'));
  } catch (err) {
    next(err);
  }
};

exports.cloneEstimation = async (req, res, next) => {
  try {
    const data = await service.cloneEstimation(req.params.id, req.user.id);
    res.status(201).json(success(data, 'Estimation cloned', 201));
  } catch (err) {
    next(err);
  }
};

exports.exportExcel = async (req, res, next) => {
  try {
    const file = await exportService.generateExcel(req.params.id);
    res.download(file);
  } catch (err) {
    next(err);
  }
};

exports.exportPDF = async (req, res, next) => {
  try {
    const file = await exportService.generatePDF(req.params.id);
    res.download(file);
  } catch (err) {
    next(err);
  }
};
