import { Card, Tabs, Typography } from "antd";
import DepartmentsTab from "../components/orgSetup/DepartmentsTab";
import CategoriesTab from "../components/orgSetup/CategoriesTab";
import DirectoryTab from "../components/orgSetup/DirectoryTab";

export default function OrganizationSetup() {
  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Organization Setup
      </Typography.Title>
      <Card>
        <Tabs
          items={[
            {
              key: "departments",
              label: "Departments",
              children: <DepartmentsTab />,
            },
            {
              key: "categories",
              label: "Categories",
              children: <CategoriesTab />,
            },
            {
              key: "directory",
              label: "Employee Directory",
              children: <DirectoryTab />,
            },
          ]}
        />
      </Card>
    </div>
  );
}
