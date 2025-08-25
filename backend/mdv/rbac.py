from __future__ import annotations

from .models import Role

# Convenience role groups
ALL_STAFF = (Role.admin, Role.supervisor, Role.operations, Role.logistics)
FULFILLMENT_STAFF = (Role.admin, Role.supervisor, Role.operations)
LOGISTICS_STAFF = (Role.admin, Role.supervisor, Role.logistics)
SUPERVISORS = (Role.admin, Role.supervisor)
ADMINS = (Role.admin,)

