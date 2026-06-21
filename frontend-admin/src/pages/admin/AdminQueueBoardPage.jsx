import { useCallback, useEffect, useState } from 'react';
import { Eye, Ticket, Users } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Select } from '@/components/ui/select';
import { QueueBoardSkeleton } from '@/components/skeletons';
import { adminOperationsApi } from '@/api/operations.api';
import { useSocketEvent } from '@/contexts/SocketContext';
import { WS_EVENTS } from '@/lib/socket';

function MonitorTicketCard({ ticket }) {
  const statusLabel = ticket.status.replace(/_/g, ' ');

  return (
    <div className="rounded-xl border border-[#E2EEE8] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#052E1C]">Ticket #{ticket.ticketNumber}</p>
          <p className="mt-1 text-sm text-[#4B6358]">{ticket.applicantName}</p>
          <p className="mt-1 text-xs capitalize text-[#6B7280]">{statusLabel}</p>
          {ticket.position ? (
            <p className="mt-2 text-xs font-semibold text-[#0A6640]">Queue position {ticket.position}</p>
          ) : null}
        </div>
        <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#E2EEE8] bg-[#F9FCFB] px-3 text-xs font-semibold text-[#4B6358]">
          <Eye className="h-3.5 w-3.5" />
          Monitor only
        </span>
      </div>
    </div>
  );
}

export function AdminQueueBoardPage() {
  const [offerings, setOfferings] = useState([]);
  const [selectedOfferingId, setSelectedOfferingId] = useState('');
  const [tickets, setTickets] = useState([]);
  const [loadingBoard, setLoadingBoard] = useState(false);

  useEffect(() => {
    adminOperationsApi
      .listQueueOfferings()
      .then(({ data }) => {
        const items = data.data.offerings ?? [];
        setOfferings(items);
        if (items[0]?.id) {
          setSelectedOfferingId(items[0].id);
        }
      })
      .catch(() => setOfferings([]));
  }, []);

  const loadBoard = useCallback(async (offeringId) => {
    if (!offeringId) {
      setTickets([]);
      return;
    }
    setLoadingBoard(true);
    try {
      const { data } = await adminOperationsApi.getQueueBoard(offeringId);
      setTickets(data.data.tickets ?? []);
    } catch (err) {
      setTickets([]);
      toast.error(err.message || 'Could not load queue board');
    } finally {
      setLoadingBoard(false);
    }
  }, []);

  useEffect(() => {
    loadBoard(selectedOfferingId);
  }, [selectedOfferingId, loadBoard]);

  useSocketEvent(
    WS_EVENTS.QUEUE_UPDATED,
    ({ offeringId }) => {
      if (!selectedOfferingId) return;
      if (offeringId && offeringId !== selectedOfferingId) return;
      loadBoard(selectedOfferingId);
    },
    [selectedOfferingId, loadBoard],
  );

  const waitingCount = tickets.filter((item) => item.status === 'waiting').length;
  const calledCount = tickets.filter((item) => ['called', 'serving'].includes(item.status)).length;

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#10B981]">
            Operations monitoring
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#052E1C]">Live queue board</h1>
          <p className="mt-2 max-w-3xl text-sm text-[#4B6358]">
            Monitor walk-in queue activity across service options. Staff handle calling students from
            their queue board.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-[#E2EEE8] bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#10B981]">
              Service option
            </p>
            <Select
              value={selectedOfferingId}
              onChange={setSelectedOfferingId}
              placeholder="Choose a queue service"
              options={offerings.map((offering) => ({
                value: offering.id,
                label: `${offering.serviceName} · ${offering.name}`,
              }))}
              className="mt-3"
            />

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-xl border border-[#C4E8D4] bg-[#F0FAF5] p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#0A6640]" />
                  <p className="text-sm font-semibold text-[#052E1C]">Waiting</p>
                </div>
                <p className="mt-2 text-3xl font-bold text-[#0A6640]">{waitingCount}</p>
              </div>
              <div className="rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] p-4">
                <p className="text-sm font-semibold text-[#052E1C]">In progress</p>
                <p className="mt-2 text-3xl font-bold text-[#052E1C]">{calledCount}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E2EEE8] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-[#0A6640]" />
              <h2 className="text-lg font-bold text-[#052E1C]">Live tickets</h2>
            </div>
            <p className="mt-1 text-sm text-[#4B6358]">
              Updates automatically when staff call or complete tickets.
            </p>

            {loadingBoard ? (
              <QueueBoardSkeleton />
            ) : tickets.length === 0 ? (
              <p className="mt-6 rounded-xl border border-dashed border-[#C4E8D4] bg-[#F9FCFB] px-4 py-8 text-center text-sm text-[#4B6358]">
                No active queue tickets for this service option.
              </p>
            ) : (
              <div className="mt-6 space-y-3">
                {tickets.map((ticket) => (
                  <MonitorTicketCard key={ticket.id} ticket={ticket} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
