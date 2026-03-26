const service = require('./drone.service');
const { success } = require('../../core/utils/response');

exports.createDrone = async (req, res, next) => {
  try {
    const data = await service.createDrone(req.body);
    res.status(201).json(success(data, 'Drone created', 201));
  } catch (err) { next(err); }
};

exports.getDrones = async (req, res, next) => {
  try {
    res.json(success(await service.getDrones()));
  } catch (err) { next(err); }
};

exports.getDroneById = async (req, res, next) => {
  try {
    res.json(success(await service.getDroneById(req.params.id)));
  } catch (err) { next(err); }
};

exports.updateDrone = async (req, res, next) => {
  try {
    res.json(success(await service.updateDrone(req.params.id, req.body), 'Drone updated'));
  } catch (err) { next(err); }
};

exports.deleteDrone = async (req, res, next) => {
  try {
    await service.deleteDrone(req.params.id);
    res.json(success(null, 'Drone deleted'));
  } catch (err) { next(err); }
};
