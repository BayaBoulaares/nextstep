const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

export interface VmRequest {
  vmName: string;
  cpuCores: number;
  ramGb: number;
  diskGb: number;
  osImage: string;
}

export interface VmResponse {
  id: string;
  name: string;
  namespace: string;
  status: "EN_ATTENTE" | "EN_LIGNE" | "ARRETEE" | "ERREUR";
  cpuCores: number;
  ramGb: number;
  diskGb: number;
  osImage: string;
  createdAt: string;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const { getSession } = await import("next-auth/react");
  const session = await getSession();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${(session as any)?.accessToken ?? ""}`,
  };
}

export const vmApi = {
  create: async (data: VmRequest): Promise<VmResponse> => {
    const res = await fetch(`${API_BASE}/api/vms/create`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  list: async (): Promise<VmResponse[]> => {
    const res = await fetch(`${API_BASE}/api/vms`, {
      headers: await getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  start: async (name: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/api/vms/${name}/start`, {
      method: "POST",
      headers: await getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
  },

  stop: async (name: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/api/vms/${name}/stop`, {
      method: "POST",
      headers: await getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
  },

  delete: async (name: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/api/vms/${name}`, {
      method: "DELETE",
      headers: await getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
  },
};

export const OS_IMAGES = [
  {
    value: "kubevirt/fedora-cloud-container-disk-demo:latest",
    label: "Fedora 38",
    icon: "🎩",
  },
  {
    value: "kubevirt/ubuntu-container-disk-demo:latest",
    label: "Ubuntu 22.04",
    icon: "🟠",
  },
  {
    value: "kubevirt/centos-stream9-container-disk-demo:latest",
    label: "CentOS Stream 9",
    icon: "🐧",
  },
  {
    value: "kubevirt/windows-desktop-container-disk-demo:latest",
    label: "Windows Server 2022",
    icon: "🪟",
  },
];