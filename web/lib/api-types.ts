import type { paths } from "./generated/api";

export type ProductListResponse = paths["/api/products"]["get"]["responses"]["200"]["content"]["application/json"];
export type ProductResponse = paths["/api/products/{idOrSlug}"]["get"]["responses"]["200"]["content"]["application/json"];
export type CartResponse = paths["/api/cart/{cart_id}"]["get"]["responses"]["200"]["content"]["application/json"];
export type CheckoutInitResponse = paths["/api/checkout/init"]["post"]["responses"]["200"]["content"]["application/json"];
export type ShippingEstimateResponse = paths["/api/shipping/calculate"]["get"]["responses"]["200"]["content"]["application/json"];
// export type OrderListResponse = paths["/api/orders"]["get"]["responses"]["200"]["content"]["application/json"];
// export type OrderResponse = paths["/api/orders/{order_id}"]["get"]["responses"]["200"]["content"]["application/json"];

