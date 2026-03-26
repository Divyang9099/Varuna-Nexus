const Joi = require('joi');

exports.createProjectSchema = Joi.object({
  name: Joi.string().required(),
  client_name: Joi.string().required(),
  project_type: Joi.string().required(),
  state: Joi.string().required(),
  district: Joi.string().required(),
  status: Joi.string().valid('enquiry','confirmed','in_progress','post_processing','delivered','on_hold','cancelled').default('enquiry')
});

exports.updateProjectSchema = Joi.object({
  name: Joi.string(),
  client_name: Joi.string(),
  project_type: Joi.string(),
  state: Joi.string(),
  district: Joi.string(),
  status: Joi.string().valid('enquiry','confirmed','in_progress','post_processing','delivered','on_hold','cancelled')
});
