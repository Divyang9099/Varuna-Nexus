const service = require('./pilot.service');
const { success } = require('../../core/utils/response');

exports.createPilot = async (req, res, next) => {
  try {
    const data = await service.createPilot(req.body);
    res.status(201).json(success(data, 'Pilot created', 201));
  } catch (err) { next(err); }
};

exports.getPilots = async (req, res, next) => {
  try {
    res.json(success(await service.getPilots()));
  } catch (err) { next(err); }
};

exports.getPilotById = async (req, res, next) => {
  try {
    res.json(success(await service.getPilotById(req.params.id)));
  } catch (err) { next(err); }
};

exports.updatePilot = async (req, res, next) => {
  try {
    res.json(success(await service.updatePilot(req.params.id, req.body), 'Pilot updated'));
  } catch (err) { next(err); }
};

exports.deletePilot = async (req, res, next) => {
  try {
    await service.deletePilot(req.params.id);
    res.json(success(null, 'Pilot deleted'));
  } catch (err) { next(err); }
};
