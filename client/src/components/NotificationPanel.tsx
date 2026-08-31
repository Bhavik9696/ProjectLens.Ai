import React, { useRef, useEffect } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  Check,
  Trash2,
  X,
} from 'lucide-react';

const TYPE_CONFIG = {
  success: { icon: CheckCircle2, color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
  warning: { icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  info:    { icon: Info,         color: 'var(--accent)', bg: 'rgba(214,255,63,0.06)', border: 'rgba(214,255,63,0.15)' },
  error:   { icon: XCircle,      color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
};

function formatTime(date: Date) {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (tab: string) => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose, onNavigate }) => {
  const { notifications, unreadCount, markRead, markAllRead, clearAll } = useNotifications();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  return (
    <div className="relative" ref={panelRef}>
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border shadow-2xl z-50 overflow-hidden"
          style={{
            background: 'var(--panel)',
            borderColor: 'rgba(214,255,63,0.15)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3.5 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <span className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'var(--accent)', color: '#000' }}
                >
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  title="Mark all as read"
                  className="text-[11px] font-semibold px-2 py-1 rounded-lg transition-colors cursor-pointer"
                  style={{ color: 'var(--accent)' }}
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  title="Clear all"
                  className="text-[11px] px-2 py-1 rounded-lg transition-colors cursor-pointer"
                  style={{ color: 'var(--text-5)' }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={onClose}
                className="px-2 py-1 rounded-lg cursor-pointer"
                style={{ color: 'var(--text-5)' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Bell className="w-8 h-8 mx-auto" style={{ color: 'var(--text-5)' }} />
                <p className="text-sm" style={{ color: 'var(--text-5)' }}>
                  No notifications yet
                </p>
                <p className="text-xs" style={{ color: 'var(--text-6)' }}>
                  Events like analysis completions and alerts will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const cfg = TYPE_CONFIG[notif.type];
                const Icon = cfg.icon;
                return (
                  <button
                    key={notif.id}
                    onClick={() => {
                      markRead(notif.id);
                      if (notif.tab && onNavigate) {
                        onNavigate(notif.tab);
                        onClose();
                      }
                    }}
                    className="w-full flex items-start gap-3 px-4 py-3.5 text-left border-b transition-all cursor-pointer"
                    style={{
                      borderColor: 'var(--border)',
                      background: notif.read ? 'transparent' : 'rgba(214,255,63,0.02)',
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border mt-0.5"
                      style={{ background: cfg.bg, borderColor: cfg.border }}
                    >
                      <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className="text-xs font-bold leading-tight"
                          style={{ color: notif.read ? 'var(--text-3)' : 'var(--text-1)' }}
                        >
                          {notif.title}
                        </span>
                        {!notif.read && (
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                            style={{ background: 'var(--accent)' }}
                          />
                        )}
                      </div>
                      <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-5)' }}>
                        {notif.message}
                      </p>
                      <span className="text-[10px] font-mono mt-1 block" style={{ color: 'var(--text-6)' }}>
                        {formatTime(notif.timestamp)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Bell button with badge — exported so Navbar can use it standalone
export const NotificationBell: React.FC<{
  unreadCount: number;
  onClick: () => void;
}> = ({ unreadCount, onClick }) => (
  <button
    id="notification-bell-btn"
    onClick={onClick}
    title="Notifications"
    className="relative inline-flex items-center justify-center w-8 h-8 rounded-lg border transition-all cursor-pointer"
    style={{
      background: 'var(--panel)',
      borderColor: unreadCount > 0 ? 'rgba(214,255,63,0.3)' : 'var(--border-2)',
      color: unreadCount > 0 ? 'var(--accent)' : 'var(--text-4)',
    }}
  >
    <Bell className="w-3.5 h-3.5" />
    {unreadCount > 0 && (
      <span
        className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold font-mono flex items-center justify-center"
        style={{ background: 'var(--accent)', color: '#000' }}
      >
        {unreadCount > 9 ? '9+' : unreadCount}
      </span>
    )}
  </button>
);
