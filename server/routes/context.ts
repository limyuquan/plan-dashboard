import type { ConfigStore } from '../config'
import type { Docs } from '../docs'
import type { Routes } from '../http'

export type Ctx = { config: ConfigStore; docs: Docs }
export type ApiRoutes = Routes<Ctx>
