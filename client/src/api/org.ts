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
