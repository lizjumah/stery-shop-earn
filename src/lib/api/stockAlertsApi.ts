import { API_BASE, getAdminHeaders } from "./client";

export interface StockAlert {
  id: string;
  product_id: string;
  product_name?: string;
  alert_type: "low_stock" | "out_of_stock";
  threshold?: number;
  threshold_quantity?: number;
  status: "active" | "resolved";
  created_at: string;
  resolved_at?: string | null;
  current_stock?: number | null;
}

interface StockAlertsResponse {
  success: boolean;
  alerts: any[];
  count: number;
}

interface StockAlertResponse {
  success: boolean;
  message: string;
  alert: any;
}

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {

  const response = await fetch(`${API_BASE}${path}`, {

    headers: {
      ...getAdminHeaders(),
      ...(options?.headers || {}),
    },

    ...options,
  });

  if (!response.ok) {

    let message = "Request failed";

    try {
      const errorData = await response.json();
      message =
        errorData.message ||
        errorData.error ||
        message;
    } catch {}

    throw new Error(message);
  }

  return response.json();
}

function mapAlert(alert: any): StockAlert {

  return {

    id: alert.id,

    product_id: alert.product_id,

    product_name:
      alert.products?.name ||
      alert.product_name ||
      "Unknown Product",

    alert_type:
      alert.alert_type || "low_stock",

    threshold:
      alert.threshold_quantity,

    threshold_quantity:
      alert.threshold_quantity,

    status:
      alert.status,

    created_at:
      alert.created_at,

    resolved_at:
      alert.resolved_at ?? null,

    current_stock:
      alert.current_stock ?? null,
  };
}

export async function getStockAlerts(
  status?: string
): Promise<StockAlert[]> {

  const response =
    await apiRequest<StockAlertsResponse>(
      "/api/admin/stock-alerts"
    );

  let alerts =
    (response.alerts || [])
    .map(mapAlert);

  if (status) {

    alerts =
      alerts.filter(
        alert =>
        alert.status === status
      );

  }

  return alerts;
}

export async function createStockAlert(
  payload: {
    product_id: string;
    alert_type: "low_stock" | "out_of_stock";
    threshold: number;
  }
): Promise<StockAlert> {

  const response =
    await apiRequest<StockAlertResponse>(
      "/api/admin/stock-alerts",
      {

        method: "POST",

        body: JSON.stringify({

          product_id:
            payload.product_id,

          threshold_quantity:
            payload.threshold,

          alert_type:
            payload.alert_type,

          status: "active",

        }),
      }
    );

  return mapAlert(response.alert);
}

export async function resolveStockAlert(
  id: string
): Promise<StockAlert> {

  const response =
    await apiRequest<StockAlertResponse>(
      `/api/admin/stock-alerts/${id}`,
      {

        method: "PUT",

        body: JSON.stringify({
          status: "resolved",
        }),
      }
    );

  return mapAlert(response.alert);
}