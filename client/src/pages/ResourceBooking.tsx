import { useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Empty,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { AxiosError } from "axios";
import dayjs, { type Dayjs } from "dayjs";
import {
  cancelBooking,
  createBooking,
  fetchBookableResources,
  fetchBookings,
  rescheduleBooking,
  type Booking,
  type BookingConflict,
} from "../api/bookings";
import StatusBadge from "../components/StatusBadge";

const { RangePicker } = DatePicker;

// API error body for a 409 slot clash.
type ConflictBody = { error: string; conflict?: BookingConflict };

// What the conflict banner needs: the slot the user asked for and the booking
// it clashed with.
type ConflictView = {
  requestedStart: string;
  requestedEnd: string;
  conflict: BookingConflict;
};

function fmtRange(start: string, end: string): string {
  const s = dayjs(start);
  const e = dayjs(end);
  const sameDay = s.isSame(e, "day");
  return `${s.format("MMM D, HH:mm")}–${e.format(sameDay ? "HH:mm" : "MMM D, HH:mm")}`;
}

// A stored booking is UPCOMING or CANCELLED; ONGOING/COMPLETED are derived from
// the clock at view time so the badge stays accurate without a scheduler.
function displayStatus(b: Booking): string {
  if (b.status === "CANCELLED") return "CANCELLED";
  const now = dayjs();
  if (now.isBefore(b.startTime)) return "UPCOMING";
  if (now.isBefore(b.endTime)) return "ONGOING";
  return "COMPLETED";
}

export default function ResourceBooking() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const [resourceId, setResourceId] = useState<string | undefined>();
  const [slot, setSlot] = useState<[Dayjs, Dayjs] | null>(null);
  const [conflict, setConflict] = useState<ConflictView | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Booking | null>(null);

  const { data: resources = [] } = useQuery({
    queryKey: ["bookable-resources"],
    queryFn: fetchBookableResources,
  });

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings", resourceId],
    queryFn: () => fetchBookings(resourceId),
    enabled: !!resourceId,
  });

  const createMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      message.success("Booking confirmed");
      setSlot(null);
      setConflict(null);
      queryClient.invalidateQueries({ queryKey: ["bookings", resourceId] });
    },
    onError: (err: AxiosError<ConflictBody>, variables) => {
      const body = err.response?.data;
      if (err.response?.status === 409 && body?.conflict) {
        setConflict({
          requestedStart: variables.startTime,
          requestedEnd: variables.endTime,
          conflict: body.conflict,
        });
      } else {
        message.error(body?.error ?? "Could not create the booking");
      }
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelBooking,
    onSuccess: () => {
      message.success("Booking cancelled");
      queryClient.invalidateQueries({ queryKey: ["bookings", resourceId] });
    },
    onError: () => message.error("Could not cancel the booking"),
  });

  const rescheduleMutation = useMutation({
    mutationFn: (vars: { id: string; startTime: string; endTime: string }) =>
      rescheduleBooking(vars.id, {
        startTime: vars.startTime,
        endTime: vars.endTime,
      }),
    onSuccess: () => {
      message.success("Booking rescheduled");
      setRescheduleTarget(null);
      queryClient.invalidateQueries({ queryKey: ["bookings", resourceId] });
    },
    onError: (err: AxiosError<ConflictBody>) => {
      const body = err.response?.data;
      message.error(
        err.response?.status === 409
          ? "New slot overlaps another booking"
          : body?.error ?? "Could not reschedule the booking"
      );
    },
  });

  function handleBook() {
    if (!resourceId) {
      message.warning("Pick a resource first");
      return;
    }
    if (!slot) {
      message.warning("Pick a start and end time");
      return;
    }
    setConflict(null);
    createMutation.mutate({
      resourceId,
      startTime: slot[0].toISOString(),
      endTime: slot[1].toISOString(),
    });
  }

  const columns: ColumnsType<Booking> = useMemo(
    () => [
      {
        title: "Start",
        dataIndex: "startTime",
        render: (t: string) => dayjs(t).format("MMM D, HH:mm"),
        sorter: (a, b) =>
          dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf(),
        defaultSortOrder: "ascend",
      },
      {
        title: "End",
        dataIndex: "endTime",
        render: (t: string) => dayjs(t).format("MMM D, HH:mm"),
      },
      {
        title: "Booked by",
        dataIndex: ["bookedBy", "name"],
        render: (_, b) => b.bookedBy?.name ?? "—",
      },
      {
        title: "Status",
        key: "status",
        width: 140,
        render: (_, b) => <StatusBadge status={displayStatus(b)} />,
      },
      {
        title: "",
        key: "actions",
        width: 190,
        render: (_, b) => {
          const done = b.status === "CANCELLED" || dayjs().isAfter(b.endTime);
          if (done) return null;
          return (
            <Space>
              <Button size="small" onClick={() => setRescheduleTarget(b)}>
                Reschedule
              </Button>
              <Popconfirm
                title="Cancel this booking?"
                onConfirm={() => cancelMutation.mutate(b.id)}
                okText="Cancel booking"
                cancelText="Keep"
              >
                <Button size="small" danger>
                  Cancel
                </Button>
              </Popconfirm>
            </Space>
          );
        },
      },
    ],
    [cancelMutation]
  );

  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Resource Booking
      </Typography.Title>

      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Card size="small">
          <Space wrap align="end" size="middle">
            <div>
              <Typography.Text type="secondary" style={{ display: "block" }}>
                Resource
              </Typography.Text>
              <Select
                placeholder="Select a bookable resource"
                style={{ width: 260 }}
                value={resourceId}
                onChange={(id) => {
                  setResourceId(id);
                  setConflict(null);
                }}
                options={resources.map((r) => ({
                  value: r.id,
                  label: `${r.name} (${r.assetTag})`,
                }))}
                notFoundContent="No bookable resources"
              />
            </div>
            <div>
              <Typography.Text type="secondary" style={{ display: "block" }}>
                Time slot
              </Typography.Text>
              <RangePicker
                showTime={{ format: "HH:mm", minuteStep: 15 }}
                format="MMM D, HH:mm"
                value={slot ?? undefined}
                onChange={(v) => setSlot(v as [Dayjs, Dayjs] | null)}
                disabled={!resourceId}
              />
            </div>
            <Button
              type="primary"
              onClick={handleBook}
              loading={createMutation.isPending}
              disabled={!resourceId}
            >
              Book slot
            </Button>
          </Space>

          {conflict && (
            <Alert
              type="error"
              showIcon
              style={{ marginTop: 16, borderStyle: "dashed" }}
              message="Slot unavailable"
              description={
                <>
                  Your slot{" "}
                  <strong>
                    {fmtRange(conflict.requestedStart, conflict.requestedEnd)}
                  </strong>{" "}
                  overlaps {conflict.conflict.bookedBy.name}'s booking{" "}
                  <strong>
                    {fmtRange(
                      conflict.conflict.startTime,
                      conflict.conflict.endTime
                    )}
                  </strong>
                  . Pick a slot that starts after it ends.
                </>
              }
              closable
              onClose={() => setConflict(null)}
            />
          )}
        </Card>

        <Card
          size="small"
          title={
            resourceId
              ? "Bookings for this resource"
              : "Select a resource to see its bookings"
          }
        >
          {resourceId ? (
            <Table
              rowKey="id"
              size="small"
              loading={isLoading}
              columns={columns}
              dataSource={bookings}
              pagination={{ pageSize: 8, showSizeChanger: false }}
            />
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={null} />
          )}
        </Card>
      </Space>

      <RescheduleModal
        booking={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onSubmit={(startTime, endTime) =>
          rescheduleTarget &&
          rescheduleMutation.mutate({
            id: rescheduleTarget.id,
            startTime,
            endTime,
          })
        }
        loading={rescheduleMutation.isPending}
      />
    </div>
  );
}

function RescheduleModal({
  booking,
  onClose,
  onSubmit,
  loading,
}: {
  booking: Booking | null;
  onClose: () => void;
  onSubmit: (startTime: string, endTime: string) => void;
  loading: boolean;
}) {
  const [slot, setSlot] = useState<[Dayjs, Dayjs] | null>(null);

  return (
    <Modal
      title="Reschedule booking"
      open={!!booking}
      onCancel={onClose}
      confirmLoading={loading}
      okText="Reschedule"
      okButtonProps={{ disabled: !slot }}
      onOk={() => slot && onSubmit(slot[0].toISOString(), slot[1].toISOString())}
      destroyOnClose
      afterClose={() => setSlot(null)}
    >
      <Typography.Paragraph type="secondary">
        {booking
          ? `Current slot: ${fmtRange(booking.startTime, booking.endTime)}`
          : ""}
      </Typography.Paragraph>
      <RangePicker
        showTime={{ format: "HH:mm", minuteStep: 15 }}
        format="MMM D, HH:mm"
        style={{ width: "100%" }}
        value={slot ?? undefined}
        onChange={(v) => setSlot(v as [Dayjs, Dayjs] | null)}
      />
    </Modal>
  );
}
