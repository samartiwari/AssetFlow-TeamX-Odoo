import { Typography, Card } from "antd";

// Temporary screen body used until each module's real UI is built.
export default function PagePlaceholder({
  title,
  note,
}: {
  title: string;
  note?: string;
}) {
  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        {title}
      </Typography.Title>
      <Card>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          {note ?? "This screen is under construction."}
        </Typography.Paragraph>
      </Card>
    </div>
  );
}
