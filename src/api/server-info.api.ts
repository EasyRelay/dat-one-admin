import { api } from "./client";

export interface ExtServerInfo {
  /**
   * False on the deployed server. Destructive billing actions (delete a
   * payment, change its status) are refused there, so the panel hides them
   * rather than offering a button that always fails.
   */
  devMode: boolean;
  /** Whether the server has a Stripe key at all. */
  stripeConfigured: boolean;
}

export async function getServerInfo(): Promise<ExtServerInfo> {
  const { data } = await api.get<ExtServerInfo>("/ext-admin/server-info");
  return data;
}
