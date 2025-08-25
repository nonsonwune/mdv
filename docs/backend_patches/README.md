# Backend Patches: Product Images, Cart Endpoints, Shipping Preview, Auth Login

This folder contains drop-in snippets to add missing backend functionality. Adapt import paths to match your project structure.

Assumptions
- FastAPI + SQLAlchemy + Alembic
- Declarative Base = Base
- Pydantic schemas module present (e.g., schemas/product.py)
- Routers combined (public.py) or split modules (adjust as needed)

How to apply (suggested order)
1) Create ProductImage model + Alembic migration + relationship on Product
2) Update Pydantic schemas to include images[] on Product
3) Update queries to eager-load images (ordered by is_primary desc, sort_order asc)
4) Add cart endpoints (PUT, DELETE, clear)
5) Add shipping preview endpoint
6) Add auth login endpoint

Run: alembic upgrade head after adding migration.

