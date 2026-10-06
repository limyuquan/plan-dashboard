import { z } from 'zod'
import { configSchema } from './config'

// The config file's JSON schema, made from the same rules the server checks.
// Committed as schema/config.schema.json, which config files point to with
// "$schema" so editors and agents can check them.
// Every key is optional in the file, since missing ones come from the defaults.
export const configJsonSchema = () => ({
  ...z.toJSONSchema(configSchema, { io: 'input' }),
  required: undefined,
  title: 'Planner config',
  description: 'Settings for Planner: which docs folders to read, and how they are organised.',
})
