/**
 * App-wide constants — single source of truth for enums
 */

module.exports = {
  ROLES: ['admin', 'project_manager', 'pilot'],

  PROJECT_STATUS: [
    'enquiry', 'confirmed', 'in_progress',
    'post_processing', 'delivered', 'on_hold', 'cancelled',
  ],

  PIPELINE_STAGE: [
    'enquiry', 'proposal', 'negotiation',
    'verbal_confirmation', 'lost', 'converted',
  ],

  PILOT_STATUS: ['active', 'inactive', 'on_leave'],

  DRONE_STATUS: ['active', 'maintenance', 'retired'],

  DELIVERABLE_STATUS: ['pending', 'uploaded', 'approved'],

  EVENT_TYPES: ['project', 'pipeline', 'expo', 'training', 'maintenance', 'leave'],

  RESOURCE_TYPES: ['pilot', 'drone', 'all'],
};
