import api from "./client";

export type AssetStatus =
  | "AVAILABLE"
  | "ALLOCATED"
  | "RESERVED"
  | "UNDER_MAINTENANCE"
  | "LOST"
  | "RETIRED"
  | "DISPOSED";

export type Asset = {
  id: string;
  assetTag: string;
  name: string;
  categoryId: string;
  category?: { id: string; name: string };
  serialNumber: string;
  acquisitionDate: string;
  cost: number;
  condition: string;
  location: string;
  status: AssetStatus;
  isBookable: boolean;
  photoUrl?: string | null;
};

export type AssetFilters = {
  q?: string;
  category?: string;
  status?: string;
  location?: string;
};

export async function fetchAssets(filters: AssetFilters = {}): Promise<Asset[]> {
  const { data } = await api.get("/api/assets", { params: filters });
  return data.data.assets;
}

export async function fetchAsset(id: string) {
  const { data } = await api.get(`/api/assets/${id}`);
  return data.data.asset;
}

export type CreateAssetInput = {
  name: string;
  categoryId: string;
  serialNumber: string;
  acquisitionDate: string;
  cost: number;
  condition: string;
  location: string;
  isBookable?: boolean;
};

export async function createAsset(input: CreateAssetInput): Promise<Asset> {
  const { data } = await api.post("/api/assets", input);
  return data.data.asset;
}
