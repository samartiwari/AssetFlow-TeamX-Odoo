import api from "./client";

export type Department = {
  id: string;
  name: string;
  headId: string | null;
  parentId: string | null;
  status: string;
  head: { id: string; name: string } | null;
  parent: { id: string; name: string } | null;
};

export type DirectoryUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  departmentId: string | null;
  department: { id: string; name: string } | null;
};

export type DepartmentInput = {
  name: string;
  headId?: string | null;
  parentId?: string | null;
  status?: string;
};

export async function fetchDepartments(): Promise<Department[]> {
  const res = await api.get("/api/departments");
  return res.data.data;
}

export async function createDepartment(
  input: DepartmentInput
): Promise<Department> {
  const res = await api.post("/api/departments", input);
  return res.data.data;
}

export async function updateDepartment(
  id: string,
  input: Partial<DepartmentInput>
): Promise<Department> {
  const res = await api.patch(`/api/departments/${id}`, input);
  return res.data.data;
}

export async function fetchUsers(): Promise<DirectoryUser[]> {
  const res = await api.get("/api/users");
  return res.data.data;
}

export type Category = {
  id: string;
  name: string;
  customFields: Record<string, unknown> | null;
  _count?: { assets: number };
};

export type CategoryInput = {
  name: string;
  customFields?: Record<string, unknown> | null;
};

export async function fetchCategories(): Promise<Category[]> {
  const res = await api.get("/api/categories");
  return res.data.data;
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const res = await api.post("/api/categories", input);
  return res.data.data;
}

export async function updateCategory(
  id: string,
  input: Partial<CategoryInput>
): Promise<Category> {
  const res = await api.patch(`/api/categories/${id}`, input);
  return res.data.data;
}

export async function updateUserRole(
  id: string,
  role: string
): Promise<DirectoryUser> {
  const res = await api.patch(`/api/users/${id}/role`, { role });
  return res.data.data;
}

export async function updateUser(
  id: string,
  input: { status?: string; departmentId?: string | null; name?: string }
): Promise<DirectoryUser> {
  const res = await api.patch(`/api/users/${id}`, input);
  return res.data.data;
}
