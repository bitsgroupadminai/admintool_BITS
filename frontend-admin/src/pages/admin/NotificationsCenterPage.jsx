import { useCallback, useEffect, useMemo, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import {

  Bell,

  BellRing,

  CalendarDays,

  CheckCheck,

  Megaphone,

  RefreshCw,

  Send,

  Ticket,

  UserPlus,

  AlertTriangle,

  FileText,

  Settings,

} from 'lucide-react';

import { toast } from 'sonner';

import { AdminLayout } from '@/components/layouts/AdminLayout';

import { BroadcastAnnouncementForm } from '@/components/notifications/BroadcastAnnouncementForm';

import { notificationsApi } from '@/api/notifications.api';

import {

  AUDIENCE_LABELS,

  BROADCAST_CATEGORY_OPTIONS,

  formatRelativeTime,

  NOTIFICATION_TYPE_META,

} from '@/constants/notifications.constants';



const TYPE_ICONS = {

  assignment: UserPlus,

  status: FileText,

  sla_breach: AlertTriangle,

  queue: Ticket,

  appointment: CalendarDays,

  system: Settings,

  announcement: Megaphone,

};



function NotificationIcon({ type, unread }) {

  const Icon = TYPE_ICONS[type] ?? Bell;

  return (

    <span

      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${

        unread

          ? 'border-[#C4E8D4] bg-gradient-to-br from-[#D1FAE5] to-[#A7F3D0] text-[#0A6640]'

          : 'border-[#E2EEE8] bg-[#F9FCFB] text-[#4B6358]'

      }`}

    >

      <Icon className="h-5 w-5" strokeWidth={2} />

    </span>

  );

}



export function NotificationsCenterPage() {

  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);

  const [broadcasts, setBroadcasts] = useState([]);

  const [loading, setLoading] = useState(true);

  const [broadcastsLoading, setBroadcastsLoading] = useState(true);

  const [filter, setFilter] = useState('all');



  const unreadCount = notifications.filter((n) => !n.read).length;



  const loadInbox = useCallback(async () => {

    try {

      const { data } = await notificationsApi.list({ limit: 50 });

      setNotifications(data.data.notifications ?? []);

    } catch {

      setNotifications([]);

    } finally {

      setLoading(false);

    }

  }, []);



  const loadBroadcasts = useCallback(async () => {

    setBroadcastsLoading(true);

    try {

      const { data } = await notificationsApi.listBroadcasts({ limit: 8 });

      setBroadcasts(data.data.broadcasts ?? []);

    } catch {

      setBroadcasts([]);

    } finally {

      setBroadcastsLoading(false);

    }

  }, []);



  useEffect(() => {

    loadInbox();

    loadBroadcasts();

  }, [loadInbox, loadBroadcasts]);



  const visibleNotifications = useMemo(() => {

    if (filter === 'unread') return notifications.filter((item) => !item.read);

    return notifications;

  }, [filter, notifications]);



  const markAllRead = async () => {

    try {

      await notificationsApi.markAllRead();

      toast.success('All notifications marked read');

      await loadInbox();

    } catch (err) {

      toast.error(err.message || 'Failed to mark read');

    }

  };



  const handleNavigate = async (notification) => {

    if (!notification.read) {

      try {

        await notificationsApi.markRead(notification.id);

        setNotifications((current) =>

          current.map((item) =>

            item.id === notification.id ? { ...item, read: true } : item,

          ),

        );

      } catch {

        /* ignore */

      }

    }

    if (notification.link) navigate(notification.link);

  };



  const categoryLabel = (value) =>

    BROADCAST_CATEGORY_OPTIONS.find((item) => item.value === value)?.label ?? value;



  return (

    <AdminLayout>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">

        <div className="mb-8 overflow-hidden rounded-2xl border border-[#C4E8D4] bg-gradient-to-br from-[#F0FAF5] via-white to-[#F9FCFB] shadow-[0_4px_24px_rgba(10,102,64,0.08)]">

          <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">

            <div>

              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#10B981]">

                Communication hub

              </p>

              <h1 className="text-2xl font-bold tracking-tight text-[#052E1C] sm:text-3xl">

                Notifications

              </h1>

              <p className="mt-2 max-w-2xl text-sm text-[#4B6358]">

                Review institute activity, send announcements to staff or students, and keep everyone

                informed about deadlines, holidays, and events.

              </p>

            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">

              <div className="rounded-xl border border-[#C4E8D4] bg-white/80 px-4 py-3">

                <p className="text-[10px] font-bold uppercase tracking-wide text-[#10B981]">Unread</p>

                <p className="mt-1 text-2xl font-bold text-[#052E1C]">{unreadCount}</p>

              </div>

              <div className="rounded-xl border border-[#E2EEE8] bg-white/80 px-4 py-3">

                <p className="text-[10px] font-bold uppercase tracking-wide text-[#10B981]">Inbox</p>

                <p className="mt-1 text-2xl font-bold text-[#052E1C]">{notifications.length}</p>

              </div>

              <div className="col-span-2 rounded-xl border border-[#E2EEE8] bg-white/80 px-4 py-3 sm:col-span-1">

                <p className="text-[10px] font-bold uppercase tracking-wide text-[#10B981]">Sent</p>

                <p className="mt-1 text-2xl font-bold text-[#052E1C]">{broadcasts.length}</p>

              </div>

            </div>

          </div>

        </div>



        <div className="grid gap-6 xl:grid-cols-5">

          <section className="xl:col-span-3">

            <div className="overflow-hidden rounded-2xl border border-[#E2EEE8] bg-white shadow-[0_4px_24px_rgba(10,102,64,0.06)]">

              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2EEE8] px-5 py-4">

                <div className="flex items-center gap-2">

                  <button

                    type="button"

                    onClick={() => setFilter('all')}

                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${

                      filter === 'all'

                        ? 'bg-[#0A6640] text-white'

                        : 'text-[#4B6358] hover:bg-[#F0FAF5]'

                    }`}

                  >

                    All

                  </button>

                  <button

                    type="button"

                    onClick={() => setFilter('unread')}

                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${

                      filter === 'unread'

                        ? 'bg-[#0A6640] text-white'

                        : 'text-[#4B6358] hover:bg-[#F0FAF5]'

                    }`}

                  >

                    Unread {unreadCount > 0 ? `(${unreadCount})` : ''}

                  </button>

                </div>

                <div className="flex items-center gap-2">

                  <button

                    type="button"

                    onClick={loadInbox}

                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#C4E8D4] text-[#0A6640] hover:bg-[#F0FAF5]"

                    aria-label="Refresh inbox"

                  >

                    <RefreshCw className="h-4 w-4" />

                  </button>

                  {unreadCount > 0 ? (

                    <button

                      type="button"

                      onClick={markAllRead}

                      className="inline-flex items-center gap-2 rounded-xl border border-[#C4E8D4] bg-white px-3 py-2 text-xs font-semibold text-[#0A6640] transition hover:bg-[#F0FAF5]"

                    >

                      <CheckCheck className="h-3.5 w-3.5" />

                      Mark all read

                    </button>

                  ) : null}

                </div>

              </div>



              {loading ? (

                <p className="px-5 py-12 text-sm text-[#4B6358]">Loading your inbox...</p>

              ) : visibleNotifications.length === 0 ? (

                <div className="px-5 py-16 text-center">

                  <BellRing className="mx-auto h-10 w-10 text-[#A8BDB5]" />

                  <p className="mt-4 text-sm font-semibold text-[#052E1C]">

                    {filter === 'unread' ? 'No unread notifications' : 'Your inbox is clear'}

                  </p>

                  <p className="mt-1 text-sm text-[#4B6358]">

                    System updates about requests, assignments, and SLA alerts will appear here.

                  </p>

                </div>

              ) : (

                <ul className="divide-y divide-[#F3F4F6]">

                  {visibleNotifications.map((notification) => {

                    const typeMeta = NOTIFICATION_TYPE_META[notification.type] ?? NOTIFICATION_TYPE_META.system;

                    return (

                      <li key={notification.id}>

                        <button

                          type="button"

                          onClick={() => handleNavigate(notification)}

                          className={`flex w-full gap-4 px-5 py-4 text-left transition hover:bg-[#F9FCFB] ${

                            notification.read ? 'bg-white' : 'bg-[#F0FAF5]/70'

                          }`}

                        >

                          <NotificationIcon type={notification.type} unread={!notification.read} />

                          <div className="min-w-0 flex-1">

                            <div className="flex flex-wrap items-start justify-between gap-2">

                              <div className="min-w-0">

                                <p className="font-semibold text-[#052E1C]">{notification.title}</p>

                                <span

                                  className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${typeMeta.tone}`}

                                >

                                  {typeMeta.label}

                                </span>

                              </div>

                              <div className="flex shrink-0 items-center gap-2">

                                <span className="text-[11px] text-[#9CA3AF]">

                                  {formatRelativeTime(notification.createdAt)}

                                </span>

                                {!notification.read ? (

                                  <span className="h-2 w-2 rounded-full bg-[#0A6640]" />

                                ) : null}

                              </div>

                            </div>

                            {notification.body ? (

                              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#4B6358]">

                                {notification.body}

                              </p>

                            ) : null}

                          </div>

                        </button>

                      </li>

                    );

                  })}

                </ul>

              )}

            </div>

          </section>



          <aside className="space-y-6 xl:col-span-2">

            <section className="overflow-hidden rounded-2xl border border-[#C4E8D4] bg-white shadow-[0_4px_24px_rgba(10,102,64,0.07)]">

              <div className="flex items-center gap-3 border-b border-[#E2EEE8] bg-gradient-to-r from-[#F0FAF5] to-white px-5 py-4">

                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0A6640] text-white">

                  <Send className="h-4 w-4" />

                </span>

                <div>

                  <h2 className="text-base font-bold text-[#052E1C]">Send announcement</h2>

                  <p className="text-xs text-[#4B6358]">

                    Broadcast to all staff, all students, or one person

                  </p>

                </div>

              </div>

              <div className="p-5">

                <BroadcastAnnouncementForm

                  onSent={() => {

                    loadBroadcasts();

                  }}

                />

              </div>

            </section>



            <section className="overflow-hidden rounded-2xl border border-[#E2EEE8] bg-white shadow-sm">

              <div className="flex items-center gap-3 border-b border-[#E2EEE8] px-5 py-4">

                <Megaphone className="h-5 w-5 text-[#0A6640]" />

                <div>

                  <h2 className="text-sm font-bold text-[#052E1C]">Recently sent</h2>

                  <p className="text-xs text-[#4B6358]">Announcements delivered from admin</p>

                </div>

              </div>

              <div className="divide-y divide-[#F3F4F6]">

                {broadcastsLoading ? (

                  <p className="px-5 py-8 text-sm text-[#4B6358]">Loading sent announcements...</p>

                ) : broadcasts.length === 0 ? (

                  <p className="px-5 py-8 text-sm text-[#4B6358]">

                    No announcements sent yet. Use the form above to notify your institute.

                  </p>

                ) : (

                  broadcasts.map((broadcast) => (

                    <div key={broadcast.broadcastId} className="px-5 py-4">

                      <div className="flex flex-wrap items-start justify-between gap-2">

                        <p className="font-semibold text-[#052E1C]">{broadcast.title}</p>

                        <span className="rounded-full border border-[#C4E8D4] bg-[#F0FAF5] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0A6640]">

                          {AUDIENCE_LABELS[broadcast.audience] ?? broadcast.audience}

                        </span>

                      </div>

                      <p className="mt-1 line-clamp-2 text-sm text-[#4B6358]">{broadcast.body}</p>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[#6B7280]">

                        <span>{categoryLabel(broadcast.category)}</span>

                        <span>·</span>

                        <span>

                          {broadcast.recipientCount} recipient

                          {broadcast.recipientCount !== 1 ? 's' : ''}

                        </span>

                        <span>·</span>

                        <span>{formatRelativeTime(broadcast.createdAt)}</span>

                      </div>

                    </div>

                  ))

                )}

              </div>

            </section>

          </aside>

        </div>

      </div>

    </AdminLayout>

  );

}


