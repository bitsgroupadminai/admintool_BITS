import { useCallback, useEffect, useState } from 'react';

import { PhoneCall, Ticket, Users, Timer, MapPin, PlayCircle, XCircle } from 'lucide-react';

import { toast } from 'sonner';

import { DashboardLayout } from '@/components/layouts/DashboardLayout';

import { Select } from '@/components/ui/select';

import { QueueBoardSkeleton } from '@/components/skeletons';
import { QueuePriorityBadge, QueuePrioritySelect } from '@/components/queue/QueuePriorityControls';

import { queueApi } from '@/api/operations.api';

import { useSocketEvent } from '@/contexts/SocketContext';

import { WS_EVENTS } from '@/lib/socket';



function TicketCard({ ticket, loading, counters, onCall, onServing, onComplete, onCancel, onPriorityRefresh }) {

  const statusLabel = ticket.status.replace(/_/g, ' ');



  return (

    <div className="rounded-xl border border-[#E2EEE8] bg-white p-4">

      <div className="flex flex-wrap items-start justify-between gap-3">

        <div>

          <p className="text-sm font-bold text-[#052E1C]">Ticket #{ticket.ticketNumber}</p>

          <p className="mt-1 text-sm text-[#4B6358]">{ticket.applicantName}</p>

          <p className="mt-1 text-xs capitalize text-[#6B7280]">{statusLabel}</p>
          <QueuePriorityBadge ticket={ticket} />
          {ticket.priorityReason ? (
            <p className="mt-1 text-xs text-[#4B6358]">{ticket.priorityReason}</p>
          ) : null}
          {ticket.position ? (

            <p className="mt-2 text-xs font-semibold text-[#0A6640]">Queue position {ticket.position}</p>

          ) : null}

          {ticket.estimatedWaitLabel && ticket.status === 'waiting' ? (

            <p className="mt-1 inline-flex items-center gap-1 text-xs text-[#4B6358]">

              <Timer className="h-3 w-3" />

              {ticket.estimatedWaitLabel}

            </p>

          ) : null}

          {ticket.counterLabel ? (

            <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#0A6640]">

              <MapPin className="h-3 w-3" />

              {ticket.counterLabel}

            </p>

          ) : null}

        </div>

        <div className="flex flex-wrap items-center gap-2">
          <QueuePrioritySelect ticket={ticket} disabled={loading} onUpdated={() => onPriorityRefresh?.()} />
          {ticket.status === 'waiting' ? (
            <>

              {counters.length > 1 ? (

                counters.map((counter) => (

                  <button

                    key={counter.id}

                    type="button"

                    disabled={loading}

                    onClick={() => onCall(ticket.id, counter.id)}

                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#0A6640] px-3 text-xs font-semibold text-white hover:bg-[#084F31] disabled:opacity-60"

                  >

                    <PhoneCall className="h-3.5 w-3.5" />

                    {counter.label}

                  </button>

                ))

              ) : (

                <button

                  type="button"

                  disabled={loading}

                  onClick={() => onCall(ticket.id, counters[0]?.id)}

                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#0A6640] px-3 text-xs font-semibold text-white hover:bg-[#084F31] disabled:opacity-60"

                >

                  <PhoneCall className="h-3.5 w-3.5" />

                  Call

                </button>

              )}

              <button

                type="button"

                disabled={loading}

                onClick={() => onCancel(ticket.id)}

                className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#FECACA] bg-white px-3 text-xs font-semibold text-[#B91C1C] disabled:opacity-60"

              >

                <XCircle className="h-3.5 w-3.5" />

                Cancel

              </button>

            </>

          ) : null}

          {ticket.status === 'called' ? (

            <>

              <button

                type="button"

                disabled={loading}

                onClick={() => onServing(ticket.id)}

                className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#C4E8D4] bg-[#F0FAF5] px-3 text-xs font-semibold text-[#0A6640] disabled:opacity-60"

              >

                <PlayCircle className="h-3.5 w-3.5" />

                Start serving

              </button>

              <button

                type="button"

                disabled={loading}

                onClick={() => onComplete(ticket.id)}

                className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#C4E8D4] bg-white px-3 text-xs font-semibold text-[#0A6640] disabled:opacity-60"

              >

                Complete

              </button>

            </>

          ) : null}

          {ticket.status === 'serving' ? (

            <button

              type="button"

              disabled={loading}

              onClick={() => onComplete(ticket.id)}

              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#C4E8D4] bg-[#F0FAF5] px-3 text-xs font-semibold text-[#0A6640] disabled:opacity-60"

            >

              Complete

            </button>

          ) : null}

        </div>

      </div>

    </div>

  );

}



export function StaffQueueBoardPage() {

  const [offerings, setOfferings] = useState([]);

  const [selectedOfferingId, setSelectedOfferingId] = useState('');

  const [tickets, setTickets] = useState([]);

  const [stats, setStats] = useState(null);

  const [loading, setLoading] = useState(false);

  const [loadingBoard, setLoadingBoard] = useState(false);



  useEffect(() => {

    queueApi

      .listOfferings()

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

      setStats(null);

      return;

    }

    setLoadingBoard(true);

    try {

      const [boardRes, statsRes] = await Promise.all([

        queueApi.getOfferingBoard(offeringId),

        queueApi.getOfferingStats(offeringId),

      ]);

      setTickets(boardRes.data.data.tickets ?? []);

      setStats(statsRes.data.data.stats ?? null);

    } catch (err) {

      setTickets([]);

      setStats(null);

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



  const selectedOffering = offerings.find((item) => item.id === selectedOfferingId);

  const counters = stats?.counters?.length

    ? stats.counters

    : [{ id: 'default', label: 'Counter' }];



  const runAction = async (action, ticketId, counterId) => {

    setLoading(true);

    try {

      if (action === 'call') {

        await queueApi.callTicket(ticketId, counterId);

        toast.success('Student called');

      } else if (action === 'serving') {

        await queueApi.startServing(ticketId);

        toast.success('Now serving');

      } else if (action === 'complete') {

        await queueApi.completeTicket(ticketId);

        toast.success('Ticket completed');

      } else if (action === 'cancel') {

        await queueApi.cancelTicket(ticketId);

        toast.success('Ticket cancelled');

      } else if (action === 'call-next') {

        await queueApi.callNext(selectedOfferingId, counterId);

        toast.success('Next student called');

      }

      await loadBoard(selectedOfferingId);

    } catch (err) {

      toast.error(err.message || 'Action failed');

    } finally {

      setLoading(false);

    }

  };



  const waitingCount = stats?.waiting ?? tickets.filter((item) => item.status === 'waiting').length;



  return (

    <DashboardLayout

      title="Walk-in queue"

      subtitle="Call students in order, assign counters, and track live wait times"

    >

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



          <div className="mt-5 space-y-3">

            <div className="rounded-xl border border-[#C4E8D4] bg-[#F0FAF5] p-4">

              <div className="flex items-center gap-2">

                <Users className="h-4 w-4 text-[#0A6640]" />

                <p className="text-sm font-semibold text-[#052E1C]">Waiting now</p>

              </div>

              <p className="mt-2 text-3xl font-bold text-[#0A6640]">{waitingCount}</p>

              {stats ? (

                <p className="mt-1 text-xs text-[#4B6358]">

                  {stats.spotsRemaining} spots left · capacity {stats.capacity}

                </p>

              ) : null}

            </div>



            {stats?.avgWaitLabel ? (

              <div className="rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] p-4">

                <div className="flex items-center gap-2">

                  <Timer className="h-4 w-4 text-[#0A6640]" />

                  <p className="text-sm font-semibold text-[#052E1C]">Est. wait for new join</p>

                </div>

                <p className="mt-2 text-lg font-bold text-[#0A6640]">{stats.avgWaitLabel}</p>

                <p className="mt-1 text-xs text-[#4B6358]">

                  {stats.processingRatePerHour}/hr × {counters.length} counter{counters.length === 1 ? '' : 's'}

                </p>

              </div>

            ) : null}

          </div>



          {counters.length > 1 ? (

            <div className="mt-5 space-y-2">

              <p className="text-xs font-bold uppercase tracking-wide text-[#4B6358]">Call next to</p>

              {counters.map((counter) => (

                <button

                  key={counter.id}

                  type="button"

                  disabled={loading || !selectedOfferingId || waitingCount === 0}

                  onClick={() => runAction('call-next', null, counter.id)}

                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#0A6640] text-sm font-semibold text-white hover:bg-[#084F31] disabled:opacity-60"

                >

                  <PhoneCall className="h-4 w-4" />

                  {counter.label}

                </button>

              ))}

            </div>

          ) : (

            <button

              type="button"

              disabled={loading || !selectedOfferingId || waitingCount === 0}

              onClick={() => runAction('call-next', null, counters[0]?.id)}

              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0A6640] text-sm font-semibold text-white hover:bg-[#084F31] disabled:opacity-60"

            >

              <PhoneCall className="h-4 w-4" />

              Call next student

            </button>

          )}



          {selectedOffering?.queueConfig?.counters?.length ? (

            <p className="mt-4 text-xs text-[#6B7280]">

              Active counters: {selectedOffering.queueConfig.counters.filter((c) => c.active !== false).map((c) => c.label).join(', ')}

            </p>

          ) : null}

        </div>



        <div className="rounded-2xl border border-[#E2EEE8] bg-white p-6 shadow-sm">

          <div className="flex items-center gap-2">

            <Ticket className="h-5 w-5 text-[#0A6640]" />

            <h2 className="text-lg font-bold text-[#052E1C]">Live queue board</h2>

          </div>

          <p className="mt-1 text-sm text-[#4B6358]">

            Students appear here after joining. Assign a counter when calling them.

          </p>



          {loadingBoard ? (

            <QueueBoardSkeleton />

          ) : tickets.length === 0 ? (

            <p className="mt-6 rounded-xl border border-dashed border-[#C4E8D4] bg-[#F9FCFB] px-4 py-8 text-center text-sm text-[#4B6358]">

              No one is waiting in this queue right now.

            </p>

          ) : (

            <div className="mt-6 space-y-3">

              {tickets.map((ticket) => (

                <TicketCard

                  key={ticket.id}

                  ticket={ticket}

                  loading={loading}

                  counters={counters}

                  onCall={(id, counterId) => runAction('call', id, counterId)}

                  onServing={(id) => runAction('serving', id)}

                  onComplete={(id) => runAction('complete', id)}

                  onCancel={(id) => runAction('cancel', id)}
                  onPriorityRefresh={() => loadBoard(selectedOfferingId)}
                />

              ))}

            </div>

          )}

        </div>

      </div>

    </DashboardLayout>

  );

}


