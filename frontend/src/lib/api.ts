const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";
const COST_CONTROL_API = process.env.NEXT_PUBLIC_COST_CONTROL_API_URL || "http://localhost:8080";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    if (typeof window !== "undefined") {
      localStorage.setItem("access_token", token);
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== "undefined") {
      return localStorage.getItem("access_token");
    }
    return null;
  }

  setRefreshToken(token: string) {
    if (typeof window !== "undefined") {
      localStorage.setItem("refresh_token", token);
    }
  }

  getRefreshToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("refresh_token");
    }
    return null;
  }

  clearTokens() {
    this.token = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    }
  }

  private async request<T>(
    url: string,
    options: RequestInit = {},
    baseUrl: string = API_BASE
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${baseUrl}${url}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.clearTokens();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }

    const data = await response.json();
    return data;
  }

  // ─── Auth (via Cost Control API) ───
  async login(email: string, password: string) {
    const res = await this.request<{ access_token: string; refresh_token: string }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
      COST_CONTROL_API
    );
    if (res.success && res.data) {
      this.setToken(res.data.access_token);
      this.setRefreshToken(res.data.refresh_token);
    }
    return res;
  }

  async logout() {
    const refreshToken = this.getRefreshToken();
    await this.request(
      "/api/auth/logout",
      { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) },
      COST_CONTROL_API
    );
    this.clearTokens();
  }

  async getCurrentUser() {
    return this.request<{
      id: number;
      name: string;
      email: string;
      role: string;
    }>("/api/auth/me", {}, COST_CONTROL_API);
  }

  // ─── Invoices (via Invoice Out API) ───
  async getInvoices(params?: { page?: number; limit?: number; status?: string; search?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.status) searchParams.set("status", params.status);
    if (params?.search) searchParams.set("search", params.search);

    const query = searchParams.toString();
    return this.request<any[]>(`/api/invoices${query ? `?${query}` : ""}`);
  }

  async getInvoice(id: number) {
    return this.request<any>(`/api/invoices/${id}`);
  }

  async createInvoice(data: any) {
    return this.request<any>("/api/invoices", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateInvoice(id: number, data: any) {
    return this.request<any>(`/api/invoices/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteInvoice(id: number) {
    return this.request<any>(`/api/invoices/${id}`, { method: "DELETE" });
  }

  async submitInvoice(id: number) {
    return this.request<any>(`/api/invoices/${id}/submit`, { method: "POST" });
  }

  async approveInvoice(id: number) {
    return this.request<any>(`/api/invoices/${id}/approve`, { method: "POST" });
  }

  async rejectInvoice(id: number) {
    return this.request<any>(`/api/invoices/${id}/reject`, { method: "POST" });
  }

  // ─── Dashboard ───
  async getDashboardStats() {
    return this.request<any>("/api/dashboard/stats");
  }

  // ─── Cost Control Master Data ───
  async getProjects() {
    return this.request<any[]>("/api/projects", {}, COST_CONTROL_API);
  }

  async getStakeholders() {
    return this.request<any[]>("/api/master/stakeholders", {}, COST_CONTROL_API);
  }

  async getMasterItems() {
    return this.request<any[]>("/api/master/items", {}, COST_CONTROL_API);
  }
}

export const api = new ApiClient();
export type { ApiResponse };
