const env = typeof process !== "undefined" ? process.env : {};

export const API_BASE_URL = (
  env.EXPO_PUBLIC_API_BASE_URL ||
  env.NEXT_PUBLIC_API_BASE_URL ||
  "https://backend-compras-fit.vercel.app"
).replace(/\/+$/, "");

export const apiConfigured = Boolean(API_BASE_URL);

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly details?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH";
  token?: string;
  body?: unknown;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!API_BASE_URL) throw new ApiError("URL da API não configurada", 0);

  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const raw = await response.text();
  let data: unknown = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }

  if (!response.ok) {
    const message = typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
      ? data.error
      : `Falha na API (${response.status})`;
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

export type BackendRecipe = {
  id: string;
  name: string;
  servings: number;
  vegetarian: boolean;
  ingredients: { productId: string; name: string; quantity: number; unit: string | null }[];
};

export type BackendProduct = {
  id: string;
  name: string;
  category: string;
  unit: string;
  packageSize: number;
  price: { value: number; store: string; updatedAt: string } | null;
};

export type BackendShoppingItem = {
  id: string;
  productId: string;
  name: string;
  category: string;
  unit: string;
  quantityNeeded: number;
  packageSize: number;
  packages: number;
  leftover: number;
  unitPrice: number;
  subtotal: number;
  purchased: boolean;
};

export type BackendPlanning = {
  id: string;
  createdAt: string;
  params: {
    budget: number;
    periodDays: number;
    people: number;
    mealsPerDay: number;
    buyingPreference: "lowest_price" | "variety";
    vegetarian: boolean;
    recipeIds?: string[];
  };
  budget: number;
  total: number;
  difference: number;
  fitsBudget: boolean;
  meals: { day: number; slot: number; recipeId: string; recipeName: string }[];
  shoppingList: { items: BackendShoppingItem[]; total: number };
};

export async function loadBackendCatalog() {
  const [products, recipes] = await Promise.all([
    apiRequest<BackendProduct[]>("/api/produtos"),
    apiRequest<BackendRecipe[]>("/api/receitas"),
  ]);
  return { products, recipes };
}

export function createBackendPlanning(input: {
  budget: number;
  periodDays: number;
  people: number;
  mealsPerDay: number;
  buyingPreference: "lowest_price" | "variety";
  vegetarian: boolean;
  recipeIds?: string[];
}, token: string) {
  return apiRequest<BackendPlanning>("/api/planejamento", { method: "POST", token, body: input });
}

export function updateBackendShoppingItem(
  planningId: string,
  itemId: string,
  purchased: boolean,
  token: string,
) {
  return apiRequest<BackendShoppingItem>(`/api/planejamento/${planningId}/itens/${itemId}`, {
    method: "PATCH",
    token,
    body: { purchased },
  });
}
