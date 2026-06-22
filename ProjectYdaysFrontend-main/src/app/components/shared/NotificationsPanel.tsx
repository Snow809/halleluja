import { CheckCheck, X } from "lucide-react";
import { api } from "../../api/client";
import { keys, useNotifications } from "../../api/queries";
import { useAppContext } from "../../contexts/AppContext";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../contexts/AuthContext";

export function NotificationsPanel() {
  const { user } = useAuth();
  const { toggleNotifications, setIsNotificationsViewOpen } = useAppContext();
  const query = useNotifications(user?.userId);
  const client = useQueryClient();
  const notifications = query.data ?? [];

  const markAll = async () => {
    await api.patch("/notifications/read-all");
    await client.invalidateQueries({ queryKey: keys.notifications });
  };

  return (
    <div className="fixed right-4 sm:right-8 top-20 z-50 w-[min(380px,calc(100vw-2rem))] rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border dark:border-slate-800">
      <div className="p-4 flex justify-between border-b dark:border-slate-800">
        <h3 className="font-bold">Notifications</h3>
        <button onClick={toggleNotifications}><X size={18} /></button>
      </div>
      <div className="max-h-96 overflow-y-auto p-3 space-y-2">
        {notifications.slice(0, 8).map((item) => (
          <button
            key={item.id}
            onClick={async () => {
              if (!item.readAt) await api.patch(`/notifications/${item.id}/read`);
              await client.invalidateQueries({ queryKey: keys.notifications });
            }}
            className={`w-full text-left p-3 rounded-xl ${item.readAt ? "bg-slate-50 dark:bg-slate-800/40" : "bg-blue-50 dark:bg-blue-900/20"}`}
          >
            <div className="font-semibold text-sm">{item.title}</div>
            <div className="text-xs text-slate-500 mt-1">{item.message}</div>
          </button>
        ))}
        {!query.isLoading && notifications.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">Aucune notification.</p> : null}
      </div>
      <div className="p-3 border-t dark:border-slate-800 flex gap-2">
        <button onClick={markAll} className="flex-1 rounded-xl border py-2 text-sm flex justify-center gap-2"><CheckCheck size={16} /> Tout lire</button>
        <button onClick={() => { setIsNotificationsViewOpen(true); toggleNotifications(); }} className="flex-1 rounded-xl bg-blue-600 text-white py-2 text-sm">Tout voir</button>
      </div>
    </div>
  );
}
