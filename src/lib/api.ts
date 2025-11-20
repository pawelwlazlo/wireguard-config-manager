/**
 * API client wrapper with retry logic and JSON parsing
 */

import type { 
  UserDto, 
  PeerDto, 
  Page, 
  UpdatePeerCommand, 
  PeerRowVM, 
  AssignPeerCommand, 
  PeerStatus,
  UpdateUserCommand,
  ResetPasswordResponse,
  AuditDto,
  AuditEvent,
  ConfigDto
} from "@/types";

interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}

class ApiClient {
  private baseUrl = "/api/v1";

  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit = {},
    retries = 3
  ): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          ...options,
          credentials: "same-origin", // Include cookies in same-origin requests
          headers: {
            "Content-Type": "application/json",
            ...options.headers,
          },
        });

        if (response.status === 401) {
          // Redirect to login on unauthorized
          window.location.href = "/login?expired=true";
          throw new Error("Unauthorized");
        }

        if (response.status === 403) {
          // Forbidden - insufficient permissions
          throw new Error("You do not have permission to access this resource");
        }

        if (!response.ok) {
          const error: ApiError = await response.json();
          throw new Error(error.message || "API request failed");
        }

        return await response.json();
      } catch (error) {
        if (i === retries - 1) throw error;
        // Wait before retry (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }

    throw new Error("Max retries exceeded");
  }

  async getUser(): Promise<UserDto> {
    return this.fetchWithRetry<UserDto>(`${this.baseUrl}/users/me`);
  }

  async getPeers(status?: "active" | "inactive"): Promise<Page<PeerDto>> {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    
    return this.fetchWithRetry<Page<PeerDto>>(
      `${this.baseUrl}/peers?${params.toString()}`
    );
  }

  async claimPeer(): Promise<PeerDto> {
    return this.fetchWithRetry<PeerDto>(`${this.baseUrl}/peers/claim`, {
      method: "POST",
    });
  }

  async updatePeer(id: string, data: UpdatePeerCommand): Promise<PeerDto> {
    return this.fetchWithRetry<PeerDto>(`${this.baseUrl}/peers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async revokePeer(id: string): Promise<void> {
    await fetch(`${this.baseUrl}/peers/${id}`, {
      method: "DELETE",
    });
  }

  async downloadPeer(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/peers/${id}/download`, {
        method: "GET",
        credentials: "same-origin",
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login?expired=true";
          return;
        }
        throw new Error("Failed to download peer configuration");
      }

      // Get the filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `peer-${id.substring(0, 8)}.conf`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Get the blob and create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading peer config:", error);
      throw error;
    }
  }

  // Admin endpoints
  async getAdminPeers(filters?: {
    status?: PeerStatus;
    owner?: string;
    page?: number;
    size?: number;
  }): Promise<Page<PeerRowVM>> {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.owner) params.set("owner", filters.owner);
    if (filters?.page) params.set("page", filters.page.toString());
    if (filters?.size) params.set("size", filters.size.toString());

    return this.fetchWithRetry<Page<PeerRowVM>>(
      `${this.baseUrl}/admin/peers?${params.toString()}`
    );
  }

  async assignPeer(peerId: string, command: AssignPeerCommand): Promise<PeerDto> {
    return this.fetchWithRetry<PeerDto>(
      `${this.baseUrl}/admin/peers/${peerId}/assign`,
      {
        method: "POST",
        body: JSON.stringify(command),
      }
    );
  }

  async revokeAdminPeer(peerId: string): Promise<void> {
    await fetch(`${this.baseUrl}/admin/peers/${peerId}`, {
      method: "DELETE",
    });
  }

  // Admin users endpoints
  async getAdminUsers(filters?: {
    status?: string;
    domain?: string;
    role?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<Page<UserDto>> {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.domain) params.set("domain", filters.domain);
    if (filters?.role) params.set("role", filters.role);
    if (filters?.page) params.set("page", filters.page.toString());
    if (filters?.size) params.set("size", filters.size.toString());
    if (filters?.sort) params.set("sort", filters.sort);

    return this.fetchWithRetry<Page<UserDto>>(
      `${this.baseUrl}/admin/users?${params.toString()}`
    );
  }

  async updateAdminUser(userId: string, command: UpdateUserCommand): Promise<UserDto> {
    return this.fetchWithRetry<UserDto>(
      `${this.baseUrl}/admin/users/${userId}`,
      {
        method: "PATCH",
        body: JSON.stringify(command),
      }
    );
  }

  async resetUserPassword(userId: string): Promise<ResetPasswordResponse> {
    return this.fetchWithRetry<ResetPasswordResponse>(
      `${this.baseUrl}/admin/users/${userId}/reset-password`,
      {
        method: "POST",
      }
    );
  }

  // Admin audit log endpoints
  async getAuditLog(filters?: {
    event_type?: AuditEvent;
    from?: Date;
    to?: Date;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<Page<AuditDto>> {
    const params = new URLSearchParams();
    if (filters?.event_type) params.set("event_type", filters.event_type);
    if (filters?.from) params.set("from", filters.from.toISOString());
    if (filters?.to) params.set("to", filters.to.toISOString());
    if (filters?.page) params.set("page", filters.page.toString());
    if (filters?.size) params.set("size", filters.size.toString());
    if (filters?.sort) params.set("sort", filters.sort);

    return this.fetchWithRetry<Page<AuditDto>>(
      `${this.baseUrl}/admin/audit?${params.toString()}`
    );
  }

  // Admin config endpoint
  async getConfig(): Promise<ConfigDto> {
    return this.fetchWithRetry<ConfigDto>(`${this.baseUrl}/admin/config`);
  }
}

export const api = new ApiClient();

