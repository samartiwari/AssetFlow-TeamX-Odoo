import { Card, Tabs, Typography } from "antd";
import DepartmentsTab from "../components/orgSetup/DepartmentsTab";

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
              children: (
                <Typography.Paragraph type="secondary">
                  Category management — coming next.
                </Typography.Paragraph>
              ),
            },
            {
              key: "directory",
              label: "Employee Directory",
              children: (
                <Typography.Paragraph type="secondary">
                  Employee directory — coming next.
                </Typography.Paragraph>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
