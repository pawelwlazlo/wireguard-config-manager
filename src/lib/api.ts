/**
 * API client wrapper with retry logic and JSON parsing
 */

import type { UserDto, PeerDto, Page, UpdatePeerCommand } from "@/types";

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
          headers: {
            "Content-Type": "application/json",
            ...options.headers,
          },
        });

        if (response.status === 401) {
          // Redirect to login on unauthorized
          window.location.href = "/login";
          throw new Error("Unauthorized");
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

  downloadPeer(id: string): void {
    window.location.href = `${this.baseUrl}/peers/${id}/download`;
  }
}

export const api = new ApiClient();

