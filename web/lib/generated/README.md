# Generated API types

This folder is for types generated from the OpenAPI spec (docs/api-contracts.yaml).

Generate types:

npm run types:api

This will create api.d.ts that you can import:

import type { paths } from "../generated/api";

Then you can use helper types like:
- paths["/api/products"]["get"]["responses"]["200"]["content"]["application/json"]

Recommendation: create small wrappers in lib/api-client.ts to map those types to friendly aliases used in components.

